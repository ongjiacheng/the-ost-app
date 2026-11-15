import type { BusRouteType, BusStopType } from "../types";
import type { Route } from "./+types/api.bus-service";

export async function loader({ request }: Route.LoaderArgs) {
    const serviceNo = new URL(request.url).searchParams.get("ServiceNo");
    const response = await fetch(`https://storage.googleapis.com/the-ost-app/bus/${serviceNo}.json`);
    if (response.status === 404) return [];
    if (!response.ok) throw new Response("Failed to fetch bus service.", { status: 502 });
    const data: BusRouteType | BusStopType[] = await response.json();
    if (Array.isArray(data)) throw new Response("Bus data needs to be updated.", { status: 503 });
    if (!Array.isArray(data?.services)) throw new Response("Invalid bus service data.", { status: 502 });
    return data.services;
}
