import type { HyperlapseType } from "../types";
import type { Route } from "./+types/api.hyperlapse";

export async function loader({ request }: Route.LoaderArgs) {
    const serviceNo = new URL(request.url).searchParams.get("ServiceNo");
    const data = await fetch(
        `https://storage.googleapis.com/the-ost-app/hyperlapse/${serviceNo}.json`,
        { headers: { accept: "application/json" } }
    ).then(response => response.json()) as HyperlapseType[];
    return data;
}