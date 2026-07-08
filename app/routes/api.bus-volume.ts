import { Firestore } from "@google-cloud/firestore";
import { field } from "@google-cloud/firestore/pipelines";

import type { Route } from "./+types/api.bus-alt-routes";
import type { BusVolumeType, volumeMap } from "../types";

const db = new Firestore({
    projectId: "the-ost-app",
    databaseId: "the-ost-app"
});

export async function loader({ request }: Route.LoaderArgs) {
    const OriginCode = new URL(request.url).searchParams.get("OriginCode") as string;
    const DestinationCodes = new URL(request.url).searchParams.getAll("DestinationCodes") as string[];

    const volumeQuery = await db.pipeline()
        .collection("pv_bus")
        .where(field("o").equal(OriginCode))
        .where(field("d").equalAny(DestinationCodes))
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