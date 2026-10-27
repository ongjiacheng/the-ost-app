import { Storage } from "@google-cloud/storage";
import nearbyStations from "../assets/nearby_stations.json";
import roadNames from "../assets/road_names.json";
import type { BusRouteType, DatamallBusRouteType, DatamallBusStopType } from "../types";
import type { Route } from "./+types/api.bus-update";

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
    const stationsByStop = new Map<string, (typeof nearbyStations)[number][]>();
    for (const station of nearbyStations) {
        const stations = stationsByStop.get(station.BusStopCode) ?? [];
        stations.push(station);
        stationsByStop.set(station.BusStopCode, stations);
    }
    const stopMap = new Map(stops.map(stop => [stop.BusStopCode, {
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
            ...stopMap.get(route.BusStopCode)!,
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
    return files;
}

export async function action({ request }: Route.ActionArgs) {
    if ((await request.formData()).get("secret") !== process.env.DATACALLER_SECRET) return "Invalid password.";
    const [routes, stops] = await Promise.all([
        getDatamall<DatamallBusRouteType>(process.env.DATAMALL_BUS_ROUTES_URL!),
        getDatamall<DatamallBusStopType>(process.env.DATAMALL_BUS_STOPS_URL!),
    ]);
    const bucket = new Storage().bucket("the-ost-app");
    await Promise.all([...buildBusRoutes(routes, stops)].map(([name, data]) => bucket.file(`bus/${name}.json`).save(JSON.stringify(data))));
    await bucket.file("bus/updated.json").save(JSON.stringify(new Date().toISOString()));
    return "Updated data.";
}
