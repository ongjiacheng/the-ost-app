import "dotenv/config";
import type { Route } from "./+types/api.bus-arrival";
import type { BusServiceType } from "../types";

export async function loader({ request }: Route.LoaderArgs) {
    const serviceNo = new URL(request.url).searchParams.get("ServiceNo") as string;
    const serviceParams = new URLSearchParams({ ServiceNo: serviceNo });
    const serviceUrl = new URL(`https://datamall2.mytransport.sg/ltaodataservice/BusServices?${serviceParams}`);
    const response = await fetch(serviceUrl, {
        headers: {
            AccountKey: process.env.DATAMALL_API_KEY as string,
            accept: "application/json"
        }
    });

    const directions = (await response.json()).value as BusServiceType[];

    return await Promise.all(directions.map(async direction => {
        const originCode = direction.OriginCode;
        const destinationCode = direction.DestinationCode;
        const originParams = new URLSearchParams({ BusStopCode: originCode });
        const destinationParams = new URLSearchParams({ BusStopCode: destinationCode });
        const originUrl = new URL(`https://datamall2.mytransport.sg/ltaodataservice/BusStops?${originParams}`);
        const destinationUrl = new URL(`https://datamall2.mytransport.sg/ltaodataservice/BusStops?${destinationParams}`);

        const [originData, destinationData] = await Promise.all([
            fetch(originUrl, {
                headers: {
                    AccountKey: process.env.DATAMALL_API_KEY as string,
                    accept: "application/json"
                }
            }).then(response => response.json()),
            fetch(destinationUrl, {
                headers: {
                    AccountKey: process.env.DATAMALL_API_KEY as string,
                    accept: "application/json"
                }
            }).then(response => response.json())
        ]);

        return {
            ...direction,
            OriginName: originData?.value?.[0]?.Description,
            DestinationName: destinationData?.value?.[0]?.Description
        };
    }));
}