import { Firestore } from "@google-cloud/firestore";
import { and, field, or } from "@google-cloud/firestore/pipelines";

import type { Route } from "./+types/api.bus-alt-routes";

type BusRouteType = {
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
    const serviceNo = new URL(request.url).searchParams.get("ServiceNo") as string;
    const serviceSuffix = new URL(request.url).searchParams.get("ServiceSuffix") as string;

    const routeQuery = await db.pipeline()
        .collection("bus_routes")
        .where(and(field("BusStopCode").equal(busStopCode), or(field("ServiceNo").notEqual(serviceNo), field("ServiceSuffix").notEqual(serviceSuffix))))
        .sort(field("ServiceNo").ascending(), field("ServiceSuffix").ascending(), field("Direction").ascending())
        .execute();

    const route: BusRouteType[] = routeQuery.results.map(
        doc => doc.data() as BusRouteType
    );
    return route;
}