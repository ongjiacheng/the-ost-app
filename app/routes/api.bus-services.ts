import "dotenv/config";
import type { Route } from "./+types/api.bus-arrival";
import type { BusServiceType } from "../types";

export async function loader({ request }: Route.LoaderArgs) {
    const headers = {
        AccountKey: process.env.DATAMALL_API_KEY as string,
        accept: "application/json"
    };
    const serviceNo = new URL(request.url).searchParams.get("ServiceNo") as string;
    const serviceParams = new URLSearchParams({ ServiceNo: serviceNo });
    const serviceUrl = new URL(`https://datamall2.mytransport.sg/ltaodataservice/BusServices?${serviceParams}`);
    const service = await fetch(serviceUrl, { headers }).then(response => response.json()).then(data => data.value) as BusServiceType[];

    return await Promise.all(service.map(async direction => {
        const originCode = direction.OriginCode;
        const destinationCode = direction.DestinationCode;
        const originParams = new URLSearchParams({ BusStopCode: originCode });
        const destinationParams = new URLSearchParams({ BusStopCode: destinationCode });
        const originUrl = new URL(`https://datamall2.mytransport.sg/ltaodataservice/BusStops?${originParams}`);
        const destinationUrl = new URL(`https://datamall2.mytransport.sg/ltaodataservice/BusStops?${destinationParams}`);
        const [origin, destination] = await Promise.all([
            fetch(originUrl, { headers }).then(response => response.json()).then(data => data.value),
            fetch(destinationUrl, { headers }).then(response => response.json()).then(data => data.value)
        ]);

        return {
            ...direction,
            OriginName: origin.at(0).Description,
            DestinationName: destination.at(0).Description
        };
    }));
}