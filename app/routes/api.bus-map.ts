import type { Route } from "./+types/api.bus-map";

export async function loader({ request }: Route.LoaderArgs) {
    const serviceNo = new URL(request.url).searchParams.get("ServiceNo");
    const data = await fetch(
        `https://storage.googleapis.com/the-ost-app/map/${serviceNo}.geojson`
    ).then(response => response.json());
    return data;
}