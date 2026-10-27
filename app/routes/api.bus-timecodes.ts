import type { TimecodeType } from "../types";
import type { Route } from "./+types/api.bus-timecodes";

export async function loader({ request }: Route.LoaderArgs) {
    const serviceNo = new URL(request.url).searchParams.get("ServiceNo");
    if (!serviceNo || !/^\d+[A-Za-z]?$/.test(serviceNo)) return {};

    const timecodes = await Promise.all([1, 2].map(async direction => {
        const response = await fetch(
            `https://storage.googleapis.com/the-ost-app/timecodes/${serviceNo}_${direction}.json`,
            { headers: { accept: "application/json" } }
        );
        if (!response.ok) return undefined;
        return await response.json() as TimecodeType[];
    }));

    return Object.fromEntries(timecodes.flatMap((data, index) => data ? [[index + 1, data]] : []));
}
