import { Firestore } from "@google-cloud/firestore";
import { field } from "@google-cloud/firestore/pipelines";

import type { Route } from "./+types/api.train_schedule";
import type { TrainScheduleType } from "../types";

const db = new Firestore({
    projectId: "the-ost-app",
    databaseId: "the-ost-app"
});

export async function loader({ request }: Route.LoaderArgs) {
    const stationCode = new URL(request.url).searchParams.get("Code");
    const trainService = new URL(request.url).searchParams.get("Service");
    const weekDay = new URL(request.url).searchParams.get("Day");

    const scheduleQuery = await db.pipeline()
        .collection("train_schedule")
        .where(field("s").equal(`${stationCode}_${trainService}`))
        .where(field("t").stringContains(`${weekDay}`))
        .sort(field("d").ascending())
        .execute();
    const schedule = scheduleQuery.results.map(doc => doc.data() as TrainScheduleType);
    return schedule.map((stop, i, arr) =>
        (i === 0 || stop.d.slice(0, 2) != arr[i - 1].d.slice(0, 2))
            ? `\n${stop.d.slice(0, 2)} | ${stop.d.slice(3, 5)} `
            : `${stop.d.slice(3, 5)} `
    ).join("").trim();
}