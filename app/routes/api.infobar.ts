import { Firestore } from "@google-cloud/firestore";
import { field, variable } from "@google-cloud/firestore/pipelines";

import type { AltRouteType, InfobarType } from "../types";
import type { Route } from "./+types/api.bus-alt-routes";
import { roadNamesMap, stationsMap } from "../types";

const db = new Firestore({
    projectId: "the-ost-app",
    databaseId: "the-ost-app"
});

export async function loader({ request }: Route.LoaderArgs) {
    const serviceNo = Number(new URL(request.url).searchParams.get("ServiceNo"));
    const serviceSuffix = new URL(request.url).searchParams.get("ServiceSuffix");
    const direction = Number(new URL(request.url).searchParams.get("Direction"));
    const channel = new URL(request.url).searchParams.get("Channel");

    const infobarQuery = await db.pipeline()
        .collection("bus_routes")
        .where(field("ServiceNo").equal(serviceNo))
        .where(field("ServiceSuffix").equal(serviceSuffix))
        .where(field("Direction").equal(direction))
        .select("BusStopCode", "Distance")
        .sort(field("Distance").ascending())
        .define(field("BusStopCode").as("BusStopCode"))
        .addFields(
            db.pipeline()
                .collection("bus_stops")
                .where(field("BusStopCode").equal(variable("BusStopCode")))
                .select("Description", "RoadName")
                .toScalarExpression()
                .as("BusStopInfo"),
            db.pipeline()
                .collection("bus_routes")
                .where(field("BusStopCode").equal(variable("BusStopCode")))
                .distinct(field("ServiceNo"), field("ServiceSuffix"))
                .sort(field("ServiceNo").ascending(), field("ServiceSuffix").ascending())
                .select(field("ServiceNo"), field("ServiceSuffix"))
                .toArrayExpression()
                .as("AltRoutesInfo")
        )
        .execute();
    const infobars: InfobarType[] = infobarQuery.results.map(doc => {
        const { AltRoutesInfo, BusStopInfo, ...RouteData } = doc.data() as {
            AltRoutesInfo: AltRouteType[],
            BusStopInfo: { Description: string, RoadName: string },
            BusStopCode: string,
            Distance: number,
        };
        return {
            AltRoutes: AltRoutesInfo.filter(route =>
                channel != "TMT" || serviceNo != route.ServiceNo || serviceSuffix != route.ServiceSuffix
            ).map((route, i, arr) => {
                if (!arr[i - 1] || (arr[i - 1] && arr[i - 1].ServiceNo != route.ServiceNo)) {
                    return ` ${route.ServiceNo}${route.ServiceSuffix}`;
                } else {
                    return `/${route.ServiceSuffix}`
                }
            }).join("").slice(1),
            BusStopName: BusStopInfo.Description,
            RoadName: BusStopInfo.RoadName.split(" ").map(word =>
                roadNamesMap[word] ? roadNamesMap[word] : word
            ).join(" "),
            Stations: stationsMap[RouteData.BusStopCode] ?? [],
            ...RouteData
        } as InfobarType;
    });

    switch (channel) {
        case "3449":
            return infobars.map((i, j) => {
                const line1 = `#${j + 1} ${i.Distance.toFixed(1)} km ${i.BusStopName}`;
                const line2 = `${i.RoadName} | ${i.BusStopCode}`.concat(i.Stations.map(s =>
                    ` | ${s[0]} ${s[1]} Exit ${s[2]}`
                ).join(""));
                const line3 = i.AltRoutes;
                return `${line1}\n${line2}\n${line3}\n\n`
            }).join("");
        case "AT":
            return infobars.map((i, j) => {
                const line1 = `#${j + 1}: ${i.Distance.toFixed(1)} km - ${i.BusStopName} (${i.BusStopCode})`;
                const line2 = i.RoadName.concat(i.Stations.length != 0 ? " ► ".concat(i.Stations.map(s =>
                    `${s[0]} ${s[1]} (Exit ${s[2]})`
                ).join(", ")) : "");
                const line3 = i.AltRoutes;
                return `${line1}\n${line2}\n${line3}\n\n`;
            }).join("");
        case "TE":
            return infobars.map((i, j) => {
                const line1 = `#${j + 1} ${i.Distance.toFixed(1)} km ${i.BusStopCode} ${i.BusStopName}`;
                const line2 = i.RoadName.concat(i.Stations.map(s =>
                    ` | ${s[0]} ${s[1]} Exit ${s[2]}`
                ).join(""));
                const line3 = i.AltRoutes;
                return `${line1}\n${line2}\n${line3}\n\n`;
            }).join("");
        case "TMT":
            return infobars.map((i, j) => {
                const line1 = `#${j + 1} ${i.Distance.toFixed(1)} km ${i.BusStopCode} ${i.BusStopName}`;
                const line2 = i.Stations.map(s =>
                    `${s[0]} ${s[1]} Exit ${s[2]} | `
                ).join("").concat(i.RoadName);
                const line3 = i.AltRoutes;
                return `${line1}\n${line2}\n${line3}\n\n`;
            }).join("");
        default:
            return "";
    }
}