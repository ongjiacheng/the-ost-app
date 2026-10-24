import type { BusRouteType } from "../types";
import type { Route } from "./+types/api.infobar";

export async function loader({ request }: Route.LoaderArgs) {
    const serviceNo = new URL(request.url).searchParams.get("ServiceNo");
    const direction = Number(new URL(request.url).searchParams.get("Direction"));
    const channel = new URL(request.url).searchParams.get("Channel");

    let infobars = await fetch(
        `https://storage.googleapis.com/the-ost-app/bus/${serviceNo}.json`,
        { headers: { accept: "application/json" } }
    ).then(response => response.ok ? response.json() : null) as BusRouteType[] | null;
    if (!infobars) return "";

    infobars = infobars.filter(i =>
        i.Direction === direction
    );
    infobars.forEach(bar => {
        bar.AltSvc = bar.AltSvcNo
            .map((number, index) => ({ number, suffix: bar.AltSvcSuffix[index] }))
            .filter(({ number, suffix }) => channel !== "TMT" || serviceNo !== `${number}${suffix}`)
            .map(({ number, suffix }, index, services) =>
                index === 0
                    ? `${number}${suffix}`
                    : number !== services[index - 1].number
                        ? ` ${number}${suffix}`
                        : `/${suffix}`
            ).join("");
    });

    switch (channel) {
        case "3449":
            return infobars.map((i, j) => {
                const line1 = `#${j + 1} ${i.Distance.toFixed(1)} km ${i.BusStopName}`;
                const line2 = `${i.RoadName} | ${i.BusStopCode}`.concat(i.StnCode.map((s, k) =>
                    ` | ${s} ${i.StnName[k]} Exit ${i.StnExit[k]}`
                ).join(""));
                const line3 = i.AltSvc;
                return `${line1}\n${line2}\n${line3}\n\n`
            }).join("");
        case "AT":
            return infobars.map((i, j) => {
                const line1 = `#${j + 1}: ${i.Distance.toFixed(1)} km - ${i.BusStopName} (${i.BusStopCode})`;
                const line2 = i.RoadName.concat(i.StnCode.length != 0 ? " ► ".concat(i.StnCode.map((s, k) =>
                    `${s} ${i.StnName[k]} (Exit ${i.StnExit[k]})`
                ).join(", ")) : "");
                const line3 = i.AltSvc;
                return `${line1}\n${line2}\n${line3}\n\n`;
            }).join("");
        case "TE":
            return infobars.map((i, j) => {
                const line1 = `#${j + 1} ${i.Distance.toFixed(1)} km ${i.BusStopCode} ${i.BusStopName}`;
                const line2 = i.RoadName.concat(i.StnCode.map((s, k) =>
                    ` | ${s} ${i.StnName[k]} Exit ${i.StnExit[k]}`
                ).join(""));
                const line3 = i.AltSvc;
                return `${line1}\n${line2}\n${line3}\n\n`;
            }).join("");
        case "TMT":
            return infobars.map((i, j) => {
                const line1 = `#${j + 1} ${i.Distance.toFixed(1)} km ${i.BusStopCode} ${i.BusStopName}`;
                const line2 = i.StnCode.map((s, k) =>
                    `${s} ${i.StnName[k]} Exit ${i.StnExit[k]} | `
                ).join("").concat(i.RoadName);
                const line3 = i.AltSvc;
                return `${line1}\n${line2}\n${line3}\n\n`;
            }).join("");
        default:
            return "";
    }
}