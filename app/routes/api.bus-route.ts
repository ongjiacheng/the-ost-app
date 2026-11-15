import type { BusRouteType, BusStopType } from "../types";
import type { Route } from "./+types/api.bus-route";

export async function loader({ request }: Route.LoaderArgs) {
    const serviceNo = new URL(request.url).searchParams.get("ServiceNo");
    const response = await fetch(`https://storage.googleapis.com/the-ost-app/bus/${serviceNo}.json`);
    if (response.status === 404) return [];
    if (!response.ok) throw new Response("Failed to fetch bus route.", { status: 502 });
    const data: BusRouteType | BusStopType[] = await response.json();
    if (Array.isArray(data)) return data;
    if (!Array.isArray(data?.stops)) throw new Response("Invalid bus route data.", { status: 502 });
    return data.stops;
}