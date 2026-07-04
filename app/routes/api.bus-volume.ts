import { Firestore } from "@google-cloud/firestore";

import type { Route } from "./+types/api.bus-alt-routes";

type BusVolumeType = {
    BusStopCode: string,
    BusStopName: string,
    Direction: number,
    Distance: number,
    Operator: string,
    RoadName: string,
    SAT_FirstBus: string,
    SAT_LastBus: string,
    ServiceNo: number,
    ServiceSuffix: string,
    StopSequence: number,
    SUN_FirstBus: string,
    SUN_LastBus: string,
    WD_FirstBus: string,
    WD_LastBus: string
}

const db = new Firestore({
    projectId: "the-ost-app",
    databaseId: "the-ost-app"
});

export async function loader({ request }: Route.LoaderArgs) {
    const busStopCode = new URL(request.url).searchParams.get("BusStopCode") as string;

    const volumeQuery = await db.collection("od_bus").doc(busStopCode).get();
    const volume: BusVolumeType = volumeQuery.data() as BusVolumeType;
    return volume;
}