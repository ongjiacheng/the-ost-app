import Container from "@mui/material/Container";
import Stack from "@mui/material/Stack";
import Table from '@mui/material/Table';
import TableBody from '@mui/material/TableBody';
import TableCell from '@mui/material/TableCell';
import TableHead from '@mui/material/TableHead';
import TableRow from '@mui/material/TableRow';
import Typography from '@mui/material/Typography';

import type { Route } from "./+types/bus";
import { db } from "./services/firestore";

type BusRouteType = {
    BusStopCode: string,
    BusStopName: string,
    Direction: number,
    Distance: number,
    Operator: string,
    RoadName: string,
    SAT_FirstBus: string,
    SAT_LastBus: string,
    ServiceNo: number,
    ServiceSuffix: string,
    StopSequence: number,
    SUN_FirstBus: string,
    SUN_LastBus: string,
    WD_FirstBus: string,
    WD_LastBus: string
}

type BusServiceType = {
    AM_Offpeak_Freq: string,
    AM_Peak_Freq: string,
    Category: string,
    DestinationCode: string,
    DestinationName: string,
    Direction: number,
    LoopDesc: string,
    Operator: string,
    OriginCode: string,
    OriginName: string,
    PM_Offpeak_Freq: string,
    PM_Peak_Freq: string,
    ServiceNo: number,
    ServiceSuffix: string
}

type BusStopType = {
    BusStopCode: string,
    Description: string,
    Latitude: number,
    Longitude: number,
    RoadName: string
}

type HyperlapseType = {
    channelTitle: string,
    description: string,
    Direction: number,
    position: number,
    publishedAt: number,
    ServiceNo: number,
    ServiceSuffix: string,
    thumbnails: string,
    title: string,
    videoId: string
}

type MasterType = {
    operator: string,
    category: string,
    service: string,
    direction: number
}

export async function loader({ params }: Route.LoaderArgs) {
    let serviceNo: number, serviceSuffix: string;
    if (/[^0-9]/.test(params.ServiceNo)) {
        serviceSuffix = String(params.ServiceNo.at(-1));
        serviceNo = Number(params.ServiceNo.slice(0, -1));
    } else {
        serviceSuffix = "";
        serviceNo = Number(params.ServiceNo);
    }

    const routeQuery = await db.collection("bus_routes")
        .where("ServiceNo", "==", serviceNo)
        .where("ServiceSuffix", "==", serviceSuffix)
        .orderBy("Direction")
        .orderBy("StopSequence").get();
    let route: BusRouteType[] = routeQuery.docs.map(doc => ({
        ...doc.data() as BusRouteType
    }));
    route = await Promise.all(
        route.map(async stop => {
            const stopQuery = await db.collection("bus_stops")
                .where("BusStopCode", "==", stop.BusStopCode)
                .get();
            const busStop: BusStopType = stopQuery.docs.at(0)?.data() as BusStopType;
            return {
                ...stop,
                BusStopName: busStop.Description,
                RoadName: busStop.RoadName
            };
        })
    );

    const serviceQuery = await db.collection("bus_services")
        .where("ServiceNo", "==", serviceNo)
        .where("ServiceSuffix", "==", serviceSuffix)
        .orderBy("Direction").get();
    let service: BusServiceType[] = serviceQuery.docs.map(doc => ({
        ...doc.data() as BusServiceType
    }));
    service = await Promise.all(
        service.map(async direction => {
            const originQuery = await db.collection("bus_stops")
                .where("BusStopCode", "==", direction.OriginCode)
                .get();
            const destinationQuery = await db.collection("bus_stops")
                .where("BusStopCode", "==", direction.DestinationCode)
                .get();
            const origin: BusStopType = originQuery.docs.at(0)?.data() as BusStopType;
            const destination: BusStopType = destinationQuery.docs.at(0)?.data() as BusStopType;
            return {
                ...direction,
                OriginName: origin.Description,
                DestinationName: destination.Description
            };
        })
    );

    const hyperlapseQuery = await db.collection("hyperlapse")
        .where("ServiceNo", "==", serviceNo)
        .where("ServiceSuffix", "==", serviceSuffix)
        .orderBy("Direction").get();
    const hyperlapse = hyperlapseQuery.docs.map(doc => ({
        id: doc.id,
        ...doc.data() as HyperlapseType
    }));

    const category: Record<string, string> = { "CITY_LINK": "City Direct", "EXPRESS": "Express", "FEEDER": "Feeder", "INDUSTRIAL": "Industrial", "TRUNK": "Trunk" };
    const operator: Record<string, string> = { "SBST": "SBS Transit", "SMRT": "SMRT Buses", "TTS": "Tower Transit", "GAS": "Go-Ahead" };
    const master: MasterType = {
        operator: operator[service.at(0)!.Operator],
        category: (service.at(0) !== undefined && service.at(0)!.ServiceNo >= 451 && service.at(0)!.ServiceNo <= 500)
            ? "Limited-Stop"
            : category[service.at(0)!.Category],
        service: params.ServiceNo,
        direction: service.at(0)!.Direction
    }

    return { master, route, service, hyperlapse };
}

function BusHours({ route }: { route: BusRouteType[] }) {
    const origin = route.filter(stop => stop.StopSequence == 1);
    return (
        <Container>
            <Table>
                <TableHead>
                    <TableRow>
                        <TableCell colSpan={2} rowSpan={2}></TableCell>
                        <TableCell colSpan={2}>Weekdays</TableCell>
                        <TableCell colSpan={2}>Saturdays</TableCell>
                        <TableCell colSpan={2}>Sundays / PHs</TableCell>
                    </TableRow>
                    <TableRow>
                        <TableCell>First</TableCell>
                        <TableCell>Last</TableCell>
                        <TableCell>First</TableCell>
                        <TableCell>Last</TableCell>
                        <TableCell>First</TableCell>
                        <TableCell>Last</TableCell>
                    </TableRow>
                </TableHead>
                <TableBody>
                    {origin.map(direction => (
                        <TableRow key={direction.Direction}>
                            <TableCell colSpan={2}>From {direction.BusStopName}</TableCell>
                            <TableCell>{direction.WD_FirstBus}</TableCell>
                            <TableCell>{direction.WD_LastBus}</TableCell>
                            <TableCell>{direction.SAT_FirstBus}</TableCell>
                            <TableCell>{direction.SAT_LastBus}</TableCell>
                            <TableCell>{direction.SUN_FirstBus}</TableCell>
                            <TableCell>{direction.SUN_LastBus}</TableCell>
                        </TableRow>
                    ))}
                </TableBody>
            </Table>
        </Container>
    );
}

function BusFrequency({ service }: { service: BusServiceType[] }) {
    return (
        <Container>
            <Table>
                <TableHead>
                    <TableRow>
                        <TableCell></TableCell>
                        <TableCell>AM Peak</TableCell>
                        <TableCell>AM Off Peak</TableCell>
                        <TableCell>PM Peak</TableCell>
                        <TableCell>PM Off Peak</TableCell>
                    </TableRow>
                </TableHead>
                <TableBody>
                    {service.map(direction => (
                        <TableRow key={direction.Direction}>
                            <TableCell>
                                <Typography variant="body1">Direction {direction.Direction}</Typography>
                                {direction.OriginName} → {direction.DestinationName}</TableCell>
                            <TableCell>{direction.AM_Peak_Freq}</TableCell>
                            <TableCell>{direction.AM_Offpeak_Freq}</TableCell>
                            <TableCell>{direction.PM_Peak_Freq}</TableCell>
                            <TableCell>{direction.PM_Offpeak_Freq}</TableCell>
                        </TableRow>
                    ))}
                </TableBody>
            </Table>
        </Container>
    )
}

function BusJourney({ route }: { route: BusRouteType[] }) {
    const direction1 = route.filter(stop => stop.Direction === 1);
    const direction2 = route.filter(stop => stop.Direction === 2);
    const directions = direction2.length > 0 ? [direction1, direction2] : [direction1];

    return (
        <Container>
            <Stack direction={{ xs: "column", md: "row" }} spacing={2} sx={{alignItems: "flex-start"}}>
                {directions.map(direction =>
                    <Table key={direction.at(0)?.Direction}>
                        <TableHead>
                            <TableRow>
                                <TableCell colSpan={5}>Direction {direction.at(0)?.Direction}</TableCell>
                            </TableRow>
                            <TableRow>
                                <TableCell>#</TableCell>
                                <TableCell>km</TableCell>
                                <TableCell>Code</TableCell>
                                <TableCell>Bus Stop Name</TableCell>
                                <TableCell>Road Name</TableCell>
                            </TableRow>
                        </TableHead>
                        <TableBody>
                            {direction.map(stop => (
                                <TableRow key={stop.StopSequence}>
                                    <TableCell>{stop.StopSequence}</TableCell>
                                    <TableCell>{stop.Distance.toFixed(1)}</TableCell>
                                    <TableCell>{stop.BusStopCode}</TableCell>
                                    <TableCell>{stop.BusStopName}</TableCell>
                                    <TableCell>{stop.RoadName}</TableCell>
                                </TableRow>
                            ))}
                        </TableBody>
                    </Table>
                )}
            </Stack>
        </Container>
    )
}

function Hyperlapse({ hyperlapse }: { hyperlapse: HyperlapseType[] }) {
    return <></>
}

export default function Bus({
    loaderData: { master, route, service, hyperlapse }
}: Route.ComponentProps) {
    return (
        <Container>
            <Typography variant="h6">{master.operator} {master.category} Bus Service {master.service}</Typography>
            <BusHours route={route} />
            <BusFrequency service={service} />
            <BusJourney route={route} />
            <Hyperlapse hyperlapse={hyperlapse} />
        </Container>
    );
}