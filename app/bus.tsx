import Container from "@mui/material/Container";
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

type MasterType = {
    operator: string,
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
            const busStop: BusStopType = stopQuery.docs[0].data() as BusStopType;
            return {
                ...stop,
                BusStopName: busStop.Description
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
            const originQuery = await db.collection("bus_services")
                .where("OriginCode", "==", direction.OriginCode)
                .get();
            const destinationQuery = await db.collection("bus_services")
                .where("DestinationCode", "==", direction.DestinationCode)
                .get();
            const originName: BusStopType = originQuery.docs[0].data() as BusStopType;
            const destinationName: BusStopType = destinationQuery.docs[0].data() as BusStopType;
            return {
                ...direction,
                OriginName: originName.Description,
                DestinationName: destinationName.Description
            };
        })
    );

    const hyperlapseQuery = await db.collection("hyperlapse")
        .where("ServiceNo", "==", serviceNo)
        .where("ServiceSuffix", "==", serviceSuffix)
        .orderBy("Direction").get();
    const hyperlapse = hyperlapseQuery.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
    }));

    const operator: Record<string, string> = { "SBST": "SBS Transit", "SMRT": "SMRT Buses", "TTS": "Tower Transit", "GAS": "Go-Ahead" };
    const master: MasterType = {
        operator: operator[service[0].Operator],
        service: params.ServiceNo,
        direction: service[0].Direction
    }

    return { master, route, service, hyperlapse };
}

function BusHours({ master, route }: { master: MasterType, route: BusRouteType[] }) {
    const origin = route.filter(stop => stop.StopSequence == 1);
    return (
        <Container>
            <Table>
                <TableHead>
                    <TableRow>
                        <TableCell colSpan={2} rowSpan={2}>{master.service}</TableCell>
                        <TableCell colSpan={2} rowSpan={2}>{master.operator}</TableCell>
                        <TableCell colSpan={2}>Weekdays</TableCell>
                        <TableCell colSpan={2}>Saturdays</TableCell>
                        <TableCell colSpan={2}>Sundays / PHs</TableCell>
                    </TableRow>
                    <TableRow>
                        <TableCell>First Bus</TableCell>
                        <TableCell>Last Bus</TableCell>
                        <TableCell>First Bus</TableCell>
                        <TableCell>Last Bus</TableCell>
                        <TableCell>First Bus</TableCell>
                        <TableCell>Last Bus</TableCell>
                    </TableRow>
                </TableHead>
                <TableBody>
                    {origin.map(
                        direction => (
                            <TableRow key={direction.Direction}>
                                <TableCell colSpan={2}>Direction {direction.Direction}</TableCell>
                                <TableCell colSpan={2}>{direction.BusStopName}</TableCell>
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
                        <TableCell>Period | Frequency</TableCell>
                        <TableCell>AM Peak</TableCell>
                        <TableCell>AM Off Peak</TableCell>
                        <TableCell>PM Peak</TableCell>
                        <TableCell>PM Off Peak</TableCell>
                    </TableRow>
                </TableHead>
                <TableBody>
                    {service.map(
                        direction => (
                            <TableRow key={direction.Direction}>
                                <TableCell>Direction {direction.Direction}</TableCell>
                                <TableCell>{direction.AM_Peak_Freq}</TableCell>
                                <TableCell>{direction.AM_Offpeak_Freq}</TableCell>
                                <TableCell>{direction.PM_Peak_Freq}</TableCell>
                                <TableCell>{direction.PM_Offpeak_Freq}</TableCell>
                            </TableRow>
                        )
                    )}
                </TableBody>
            </Table>
        </Container>
    )
}

export default function Bus({
    loaderData: { master, route, service, hyperlapse }
}: Route.ComponentProps) {
    return (
        <Container>
            <Typography variant="h3">Bus Service {master.service}</Typography>
            <BusHours master={master} route={route} />
            <BusFrequency service={service} />
        </Container>
    );
}