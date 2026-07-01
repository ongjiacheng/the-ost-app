import "dotenv/config";
import type { Route } from "./+types/api.bus-arrival";

export async function loader({ request }: Route.LoaderArgs) {
    const BusStopCode = new URL(request.url).searchParams.get("BusStopCode") as string;
    const ServiceNo = new URL(request.url).searchParams.get("ServiceNo") as string;

    const params = new URLSearchParams({ BusStopCode, ServiceNo });
    const url = new URL(`https://datamall2.mytransport.sg/ltaodataservice/v3/BusArrival?${params}`);
    const response = await fetch(url, {
        headers: {
            AccountKey: process.env.DATAMALL_API_KEY as string,
            accept: "application/json"
        }
    });
    return await response.json();
}