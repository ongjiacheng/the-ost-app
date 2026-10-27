import { Storage } from "@google-cloud/storage";
import nearbyStations from "../assets/nearby_stations.json";
import roadNames from "../assets/road_names.json";
import type { BusRouteType, DatamallBusRouteType, DatamallBusStopType, HyperlapseType, OpenStreetMapType, YouTubeType } from "../types";
import type { Route } from "./+types/api.bus-update";

async function fetchYouTube(playlistId: string) {
    const endpoint = process.env.YOUTUBE_PLAYLIST_URL;
    const apiKey = process.env.YOUTUBE_API_KEY;
    if (!endpoint || !apiKey) throw new Error("Missing YouTube API configuration.");

    const items: YouTubeType[] = [];
    let pageToken: string | undefined;
    do {
        const url = new URL(endpoint);
        url.searchParams.set("part", "snippet");
        url.searchParams.set("playlistId", playlistId);
        url.searchParams.set("maxResults", "50");
        url.searchParams.set("key", apiKey);
        if (pageToken) url.searchParams.set("pageToken", pageToken);

        const response = await fetch(url);
        if (!response.ok) throw new Error(`Failed to fetch YouTube playlist: ${response.status}`);
        const data: { items?: YouTubeType[]; nextPageToken?: string } = await response.json();
        items.push(...(data.items ?? []));
        pageToken = data.nextPageToken;
    } while (pageToken);

    return items.map(({ snippet }) => ({
        channelTitle: snippet.videoOwnerChannelTitle ?? "",
        position: snippet.position,
        publishedAt: snippet.publishedAt,
        title: snippet.title,
        videoId: snippet.resourceId.videoId,
    }));
}

async function buildBusHyperlapse(bucket: ReturnType<Storage["bucket"]>) {
    const playlistId = process.env.HYPERLAPSE_PLAYLIST_ID;
    if (!playlistId) throw new Error("Missing HYPERLAPSE_PLAYLIST_ID.");
    const videos = await fetchYouTube(playlistId);
    const files = new Map<string, HyperlapseType[]>();

    for (const video of videos) {
        const serviceNo = video.title.match(
            /(?:Trunk|Feeder|Jurong Industrial|Limited-Stop|Express|City Direct|Bus|Route|Service)\s+(\d+[A-Za-z]?)/i
        )?.[1];
        if (!serviceNo) continue;

        const explicitDirection = video.title.match(/Direction\s+(\d+)/i)?.[1];
        const peak = video.title.match(/(Morning|Evening) Peak/i)?.[1].toLowerCase();
        const direction = Number(explicitDirection ?? (peak === "evening" ? "2" : "1"));

        const group = files.get(serviceNo) ?? [];
        group.push({
            ...video,
            ServiceNo: serviceNo,
            Direction: direction,
        });
        files.set(serviceNo, group);
    }

    await Promise.all([...files].map(([serviceNo, data]) =>
        bucket.file(`hyperlapse/${serviceNo}.json`).save(JSON.stringify(data))));
}

async function* fetchOpenStreetMap(ids: number[]) {
    for (const id of ids) {
        const url = `https://api.openstreetmap.org/api/0.6/relation/${id}/full.json`;
        const options = {
            headers: { "User-Agent": "OneStopTransport/1.0" },
        };
        let response = await fetch(url, options);
        if (response.status === 509) {
            await new Promise(resolve => setTimeout(resolve, 10000));
            response = await fetch(url, options);
        }
        console.log(id);
        if (!response.ok) throw new Error(`Failed to download OSM relation ${id}: ${response.status}`);
        const data: { elements: OpenStreetMapType[] } = await response.json();
        const relation = data.elements.find(element => element.type === "relation" && element.id === id);
        if (!relation || relation.type !== "relation") throw new Error(`Missing OSM relation ${id}`);
        yield { relation, elements: data.elements };
    }
}

async function buildBusMap(bucket: ReturnType<Storage["bucket"]>) {
    let rootElements: OpenStreetMapType[] = [];
    for await (const { elements } of fetchOpenStreetMap([1152539])) rootElements = elements;
    const routeIds = new Set(rootElements
        .filter((element): element is Extract<OpenStreetMapType, { type: "relation" }> => element.type === "relation" && element.id !== 1152539)
        .flatMap(relation => relation.members.filter(member => member.type === "relation").map(member => member.ref)));

    const files = new Map<string, { type: string; properties: Record<string, string | number>; geometry: { type: string; coordinates: number[][] } }[]>();
    for await (const { relation: route, elements } of fetchOpenStreetMap([...routeIds])) {
        const id = route.id;
        const nodes = new Map(elements.filter(element => element.type === "node").map(node => [node.id, [node.lon, node.lat]]));
        const ways = new Map(elements.filter(element => element.type === "way").map(way => [way.id, way.nodes]));
        const tags = route.tags;
        if (!tags?.ref) throw new Error(`Missing ref in OSM relation ${id}`);
        const features = files.get(tags.ref) ?? [];
        for (const member of route.members) {
            if (member.type !== "way") continue;
            const way = ways.get(member.ref);
            if (!way) throw new Error(`Missing OSM way ${member.ref} in relation ${id}`);
            const coordinates = way.map(nodeId => {
                const node = nodes.get(nodeId);
                if (!node) throw new Error(`Missing OSM node ${nodeId} in relation ${id}`);
                return node;
            });
            features.push({
                type: "Feature",
                properties: { relation: id, ...tags },
                geometry: { type: "LineString", coordinates },
            });
        }
        files.set(tags.ref, features);
    }
    await Promise.all([...files].map(([name, features]) =>
        bucket.file(`map/${name}.geojson`).save(JSON.stringify({ type: "FeatureCollection", features }))));
}

async function fetchDatamall<T>(endpoint: string) {
    const items: T[] = [];
    for (let skip = 0; ; skip += 500) {
        const response = await fetch(`${endpoint}?$skip=${skip}`, {
            headers: { AccountKey: process.env.DATAMALL_API_KEY! },
        });
        const { value } = await response.json();
        if (!value?.length) return items;
        items.push(...value);
    }
}

async function buildBusRoutes(bucket: ReturnType<Storage["bucket"]>) {
    const [routes, stops] = await Promise.all([
        fetchDatamall<DatamallBusRouteType>(process.env.DATAMALL_BUS_ROUTES_URL!),
        fetchDatamall<DatamallBusStopType>(process.env.DATAMALL_BUS_STOPS_URL!),
    ]);
    const stationsByStop = new Map<string, (typeof nearbyStations)[number][]>();
    for (const station of nearbyStations) {
        const stations = stationsByStop.get(station.BusStopCode) ?? [];
        stations.push(station);
        stationsByStop.set(station.BusStopCode, stations);
    }
    const busStops = new Map(stops.map(stop => [stop.BusStopCode, {
        BusStopName: stop.Description,
        Latitude: stop.Latitude,
        Longitude: stop.Longitude,
        RoadName: stop.RoadName.split(/\s+/).map(word => (roadNames as Record<string, string>)[word] ?? word).join(" "),
    }]));

    const busRoutes = new Map<string, Omit<BusRouteType, "AltSvc">>();
    const altRoutes = new Map<string, Map<string, [number, string]>>();
    for (const route of routes) {
        const [, no, suffix] = /^(\d+)([A-Za-z]?)$/.exec(route.ServiceNo) ?? [];
        if (!no) continue;
        const serviceNo = Number(no);
        const stations = stationsByStop.get(route.BusStopCode) ?? [];
        busRoutes.set(`${route.ServiceNo}|${route.Direction}|${route.StopSequence}`, {
            ...route,
            ...busStops.get(route.BusStopCode)!,
            ServiceNo: serviceNo,
            ServiceSuffix: suffix,
            AltSvcNo: [],
            AltSvcSuffix: [],
            StnCode: stations.map(s => s.StnCode),
            StnExit: stations.map(s => s.StnExit),
            StnName: stations.map(s => s.StnName),
        });
        let alt = altRoutes.get(route.BusStopCode);
        if (!alt) altRoutes.set(route.BusStopCode, alt = new Map());
        alt.set(route.ServiceNo, [serviceNo, suffix]);
    }

    const sortedAltRoutes = new Map([...altRoutes].map(([stopCode, altRoutes]) => [
        stopCode,
        [...altRoutes.values()].sort((a, b) => a[0] - b[0] || a[1].localeCompare(b[1])),
    ]));
    const files = new Map<string, Omit<BusRouteType, "AltSvc">[]>();
    for (const row of [...busRoutes.values()].sort((a, b) => a.Direction - b.Direction || a.StopSequence - b.StopSequence)) {
        const alt = sortedAltRoutes.get(row.BusStopCode)!;
        row.AltSvcNo = alt.map(a => a[0]);
        row.AltSvcSuffix = alt.map(a => a[1]);
        const name = `${row.ServiceNo}${row.ServiceSuffix}`;
        const file = files.get(name);
        if (file) file.push(row);
        else files.set(name, [row]);
    }
    await Promise.all([...files].map(([name, data]) => bucket.file(`bus/${name}.json`).save(JSON.stringify(data))));
}

export async function action({ request }: Route.ActionArgs) {
    const formData = await request.formData();
    if (formData.get("secret") !== process.env.DATACALLER_SECRET) return "Invalid password.";
    const bucket = new Storage().bucket("the-ost-app");
    const update = formData.get("update");
    if (update === "upload-timecodes") {
        const file = formData.get("file");
        if (!(file instanceof File) || !/^\d+[A-Za-z]?_[12]\.json$/.test(file.name)) {
            return "Invalid timecode upload.";
        }
        await bucket.file(`timecodes/${file.name}`).save(Buffer.from(await file.arrayBuffer()));
        return `Uploaded ${file.name} to timecodes.`;
    }
    if (update === "hyperlapse") {
        await buildBusHyperlapse(bucket);
        await bucket.file("hyperlapse/updated.json").save(JSON.stringify(new Date().toISOString()));
        return "Updated hyperlapse data.";
    }
    if (update === "map") {
        await buildBusMap(bucket);
        await bucket.file("map/updated.json").save(JSON.stringify(new Date().toISOString()));
        return "Updated map data.";
    }
    if (update === "bus") {
        await buildBusRoutes(bucket);
        await bucket.file("bus/updated.json").save(JSON.stringify(new Date().toISOString()));
        return "Updated bus data.";
    }
    return "Invalid update type.";
}
