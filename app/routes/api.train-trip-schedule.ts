import { Firestore } from "@google-cloud/firestore";
import { field } from "@google-cloud/firestore/pipelines";

import type { Route } from "./+types/api.train_schedule";
import type { TrainScheduleType } from "../types";

const db = new Firestore({
    projectId: "the-ost-app",
    databaseId: "the-ost-app"
});

export async function loader({ request }: Route.LoaderArgs) {
    const tripName = new URL(request.url).searchParams.get("Trip");

    const scheduleQuery = await db.pipeline()
        .collection("train_schedule")
        .where(field("t").equal(tripName))
        .sort(field("d").ascending())
        .select(field("a"), field("d"), field("s"))
        .execute();
    const schedule = scheduleQuery.results.map(doc => doc.data() as TrainScheduleType);
    return schedule.map(stop => 
        `${stop.s.split("_")[0].padStart(5, " ")} | ${stop.a} | ${stop.d}`
    ).join("\n")
}