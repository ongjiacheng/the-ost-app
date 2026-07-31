import { Firestore } from "@google-cloud/firestore";
import { field } from "@google-cloud/firestore/pipelines";

import type { Route } from "./+types/api.bus-alt-routes";
import type { AltRouteType } from "../types";

const db = new Firestore({
    projectId: "the-ost-app",
    databaseId: "the-ost-app"
});

export async function loader({ request }: Route.LoaderArgs) {
    const busStopCode = new URL(request.url).searchParams.get("BusStopCode") as string;
    const routeQuery = await db.pipeline()
        .collection("bus_routes")
        .where(field("BusStopCode").equal(busStopCode))
        .distinct(field("ServiceNo"), field("ServiceSuffix"))
        .sort(field("ServiceNo").ascending(), field("ServiceSuffix").ascending())
        .execute();

    const route: AltRouteType[] = routeQuery.results.map(
        doc => doc.data() as AltRouteType
    );
    return route;
}