import { Storage } from "@google-cloud/storage";
import nearbyStations from "../assets/nearby_stations.json";
import roadNames from "../assets/road_names.json";
import type { BusRouteType, DatamallBusRouteType, DatamallBusStopType } from "../types";
import type { Route } from "./+types/api.refresh-bus";

async function getDatamall<T>(endpoint: string) {
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

function buildBusRoutes(routes: DatamallBusRouteType[], stops: DatamallBusStopType[]) {
    const names: Record<string, string> = roadNames;
    const stopMap = new Map(stops.map(stop => [stop.BusStopCode, {
        BusStopName: stop.Description,
        Latitude: stop.Latitude,
        Longitude: stop.Longitude,
        RoadName: stop.RoadName.split(/\s+/).map(word => names[word] ?? word).join(" "),
    }]));

    const rows = new Map<string, Omit<BusRouteType, "AltSvc">>();
    const alts = new Map<string, Map<string, [number, string]>>();
    for (const route of routes) {
        const [, no, suffix] = /^(\d+)([A-Za-z]?)$/.exec(route.ServiceNo) ?? [];
        if (!no) continue;
        const stations = nearbyStations.filter(s => s.BusStopCode === route.BusStopCode);
        rows.set(`${route.ServiceNo}|${route.Direction}|${route.StopSequence}`, {
            ...route,
            ...stopMap.get(route.BusStopCode)!,
            ServiceNo: Number(no),
            ServiceSuffix: suffix,
            AltSvcNo: [],
            AltSvcSuffix: [],
            StnCode: stations.map(s => s.StnCode),
            StnExit: stations.map(s => s.StnExit),
            StnName: stations.map(s => s.StnName),
        });
        if (!alts.has(route.BusStopCode)) alts.set(route.BusStopCode, new Map());
        alts.get(route.BusStopCode)!.set(route.ServiceNo, [Number(no), suffix]);
    }

    const files = new Map<string, Omit<BusRouteType, "AltSvc">[]>();
    const sorted = [...rows.values()].sort((a, b) => a.Direction - b.Direction || a.StopSequence - b.StopSequence);
    for (const row of sorted) {
        const alt = [...alts.get(row.BusStopCode)!.values()].sort((a, b) => a[0] - b[0] || a[1].localeCompare(b[1]));
        row.AltSvcNo = alt.map(a => a[0]);
        row.AltSvcSuffix = alt.map(a => a[1]);
        const name = `${row.ServiceNo}${row.ServiceSuffix}`;
        files.set(name, [...files.get(name) ?? [], row]);
    }
    return files;
}

export async function action({ request }: Route.ActionArgs) {
    if ((await request.formData()).get("secret") !== process.env.DATACALLER_SECRET) return "Invalid secret.";
    const [routes, stops] = await Promise.all([
        getDatamall<DatamallBusRouteType>(process.env.DATAMALL_BUS_ROUTES_URL!),
        getDatamall<DatamallBusStopType>(process.env.DATAMALL_BUS_STOPS_URL!),
    ]);
    const bucket = new Storage().bucket("the-ost-app");
    await Promise.all([...buildBusRoutes(routes, stops)].map(([name, data]) => bucket.file(`bus/${name}.json`).save(JSON.stringify(data))));
    await bucket.file("bus/updated.json").save(JSON.stringify(new Date().toISOString()), { metadata: { cacheControl: "no-cache" } });
    return "Bus data refreshed.";
}
