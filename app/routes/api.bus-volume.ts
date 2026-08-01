import { Firestore } from "@google-cloud/firestore";
import { field } from "@google-cloud/firestore/pipelines";

import type { Route } from "./+types/api.bus-alt-routes";
import type { BusVolumeType, volumeMap } from "../types";

const db = new Firestore({
    projectId: "the-ost-app",
    databaseId: "the-ost-app"
});

export async function loader({ request }: Route.LoaderArgs) {
    const origin = new URL(request.url).searchParams.getAll("Origin") as string[];
    const destination = new URL(request.url).searchParams.getAll("Destination") as string[];
    const period = new URL(request.url).searchParams.get("Period") as string;

    const volumeQuery = await db.pipeline()
        .collection("pv_bus")
        .where(field("o").equalAny(origin))
        .where(field("d").equalAny(destination))
        .where(field("p").equal(period))
        .execute();

    const volumes = volumeQuery.results
        .map(doc => doc.data() as BusVolumeType)
        .reduce((acc: volumeMap, pair) => {
            acc[pair.o] = acc[pair.o] || {};
            acc[pair.o][pair.d] = {
                wd: pair.wd,
                we: pair.we
            };
            return acc;
        }, {});

    return volumes;
}