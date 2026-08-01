import { Firestore } from "@google-cloud/firestore";
import { field, variable } from "@google-cloud/firestore/pipelines";

import type { Route } from "./+types/api.bus-alt-routes";
import type { BusRouteType } from "../types";

const db = new Firestore({
    projectId: "the-ost-app",
    databaseId: "the-ost-app"
});

export async function loader({ request }: Route.LoaderArgs) {
    const serviceNo = Number(new URL(request.url).searchParams.get("ServiceNo"));
    const serviceSuffix = new URL(request.url).searchParams.get("ServiceSuffix");

    const routeQuery = await db.pipeline()
        .collection("bus_routes")
        .where(field("ServiceNo").equal(serviceNo))
        .where(field("ServiceSuffix").equal(serviceSuffix))
        .sort(field("Direction").ascending(), field("StopSequence").ascending())
        .define(field("BusStopCode").as("BusStopCode"))
        .addFields(
            db.pipeline()
                .collection("bus_stops")
                .where(field("BusStopCode").equal(variable("BusStopCode")))
                .select("Description", "RoadName")
                .toScalarExpression()
                .as("BusStopInfo")
        )
        .execute();
    const route: BusRouteType[] = routeQuery.results.map(doc => {
        const { BusStopInfo, ...RouteData } = doc.data();
        return {
            BusStopName: BusStopInfo.Description,
            RoadName: BusStopInfo.RoadName,
            ...RouteData
        } as BusRouteType;
    });

    return route;
}