import { Firestore } from "@google-cloud/firestore";
import { field, variable } from "@google-cloud/firestore/pipelines";

import KeyboardArrowUp from "@mui/icons-material/KeyboardArrowUp";
import KeyboardArrowDown from "@mui/icons-material/KeyboardArrowDown";

import Card from "@mui/material/Card";
import CardMedia from "@mui/material/CardMedia";
import Collapse from "@mui/material/Collapse";
import Container from "@mui/material/Container";
import IconButton from "@mui/material/IconButton";
import Stack from "@mui/material/Stack";
import Table from '@mui/material/Table';
import TableBody from '@mui/material/TableBody';
import TableCell from '@mui/material/TableCell';
import TableHead from '@mui/material/TableHead';
import TableRow from '@mui/material/TableRow';
import Typography from '@mui/material/Typography';

import { useState } from "react";

import type { Route } from "./+types/bus_.$svc";

import roadNames from "../assets/road_names.json";
const roadNamesMap: Record<string, string> = roadNames;
import stations from "../assets/stations.json";
const stationsMap: Record<string, string> = stations;

const db = new Firestore({
    projectId: "the-ost-app",
    databaseId: "the-ost-app"
});

type BusArrivalType = {
    "odata.metadata": string,
    BusStopCode: string,
    Services: {
        ServiceNo: string,
        Operator: string,
        NextBus: {
            OriginCode: string,
            DestinationCode: string,
            EstimatedArrival: string,
            Monitored: number,
            Latitude: string,
            Longitude: string,
            VisitNumber: string,
            Load: string,
            Feature: string,
            Type: string
        },
        NextBus2: BusArrivalType["Services"][number]["NextBus"],
        NextBus3: BusArrivalType["Services"][number]["NextBus"]
    }[];
}

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

type VideoType = {
    channelTitle: string,
    description: string,
    Direction: number,
    position: number,
    publishedAt: string,
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
    if (/[^0-9]/.test(params.svc)) {
        serviceSuffix = String(params.svc.at(-1));
        serviceNo = Number(params.svc.slice(0, -1));
    } else {
        serviceSuffix = "";
        serviceNo = Number(params.svc);
    }

    const routeQuery = await db.pipeline()
        .collection("bus_routes")
        .where(field("ServiceNo").equal(serviceNo))
        .where(field("ServiceSuffix").equal(serviceSuffix))
        .sort(field("Direction").ascending(), field("StopSequence").ascending())
        .define(field("BusStopCode").as("BusStopCode"))
        .addFields(
            db.pipeline()
                .collection("bus_stops")
                .where(field("BusStopCode").equal(variable("BusStopCode")))
                .select("Description", "RoadName")
                .toScalarExpression()
                .as("BusStopInfo")
        )
        .execute();
    const route: BusRouteType[] = routeQuery.results.map(doc => {
        const { BusStopInfo, ...RouteData } = doc.data();
        return {
            BusStopName: BusStopInfo.Description,
            RoadName: BusStopInfo.RoadName,
            ...RouteData
        } as BusRouteType;
    });

    const serviceQuery = await db.pipeline()
        .collection("bus_services")
        .where(field("ServiceNo").equal(serviceNo))
        .where(field("ServiceSuffix").equal(serviceSuffix))
        .sort(field("Direction").ascending())
        .define(field("OriginCode").as("OriginCode"), field("DestinationCode").as("DestinationCode"))
        .addFields(
            db.pipeline()
                .collection("bus_stops")
                .where(field("BusStopCode").equal(variable("OriginCode")))
                .select("Description")
                .toScalarExpression()
                .as("OriginName"),
            db.pipeline()
                .collection("bus_stops")
                .where(field("BusStopCode").equal(variable("DestinationCode")))
                .select("Description")
                .toScalarExpression()
                .as("DestinationName")
        )
        .execute();
    const service: BusServiceType[] = serviceQuery.results.map(
        doc => doc.data() as BusServiceType
    );
    const videoQuery = await db.collection("hyperlapse")
        .where("ServiceNo", "==", serviceNo)
        .where("ServiceSuffix", "==", serviceSuffix)
        .orderBy("Direction").get();
    const videos: VideoType[] = videoQuery.docs.map(doc => ({
        id: doc.id,
        ...doc.data() as VideoType
    }));

    const categoryMap: Record<string, string> = { "CITY_LINK": "City Direct", "EXPRESS": "Express", "FEEDER": "Feeder", "INDUSTRIAL": "Industrial", "TRUNK": "Trunk" };
    const operatorMap: Record<string, string> = { "SBST": "SBS Transit", "SMRT": "SMRT Buses", "TTS": "Tower Transit", "GAS": "Go-Ahead" };
    const master: MasterType = {
        operator: operatorMap[service.at(0)!.Operator],
        category: (service.at(0) !== undefined && service.at(0)!.ServiceNo >= 451 && service.at(0)!.ServiceNo <= 500)
            ? "Limited-Stop"
            : categoryMap[service.at(0)!.Category],
        service: params.svc,
        direction: service.at(0)!.Direction
    }

    return { master, route, service, videos };
}

function BusHours({ route }: { route: BusRouteType[] }) {
    const origin = route.filter(stop => stop.StopSequence == 1);
    return (
        <Container>
            <Table>
                <TableHead>
                    <TableRow>
                        <TableCell colSpan={2} rowSpan={2}>
                            <Typography variant="body1">Operating Time (hours)</Typography>
                        </TableCell>
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
                            <TableCell colSpan={2}>
                                {origin.length === 1 ? (
                                    <>
                                        <Typography variant="body1">Loop</Typography>
                                        From {direction.BusStopName}
                                    </>
                                ) : (
                                    <>
                                        <Typography variant="body1">Direction {direction.Direction}</Typography>
                                        From {direction.BusStopName}
                                    </>
                                )}
                            </TableCell>
                            <TableCell>
                                <Typography variant="body1">{direction.WD_FirstBus}</Typography>
                            </TableCell>
                            <TableCell>
                                <Typography variant="body1">{direction.WD_LastBus}</Typography>
                            </TableCell>
                            <TableCell>
                                <Typography variant="body1">{direction.SAT_FirstBus}</Typography>
                            </TableCell>
                            <TableCell>
                                <Typography variant="body1">{direction.SAT_LastBus}</Typography>
                            </TableCell>
                            <TableCell>
                                <Typography variant="body1">{direction.SUN_FirstBus}</Typography>
                            </TableCell>
                            <TableCell>
                                <Typography variant="body1">{direction.SUN_LastBus}</Typography>
                            </TableCell>
                        </TableRow>
                    ))}
                </TableBody>
            </Table>
        </Container>
    );
}

function BusVideos({ videos }: { videos: VideoType[] }) {
    return (
        <Container>
            <Stack direction={{ xs: "column", md: "row" }} spacing={2} sx={{ alignItems: "stretch" }}>
                {videos.map(video => (
                    <Card key={video.videoId} sx={{ flex: 1, width: "100%" }}>
                        <CardMedia
                            component="iframe"
                            src={`https://www.youtube.com/embed/${video.videoId}`}
                            sx={{ width: "100%", aspectRatio: "16 / 9", border: 0 }}
                        />
                    </Card>
                ))}
            </Stack>
        </Container>
    );
}

function BusFrequency({ service }: { service: BusServiceType[] }) {
    return (
        <Container>
            <Table>
                <TableHead>
                    <TableRow>
                        <TableCell>
                            <Typography variant="body1">Frequency (minutes)</Typography>
                        </TableCell>
                        <TableCell>AM Peak</TableCell>
                        <TableCell>AM Off Peak</TableCell>
                        <TableCell>PM Peak</TableCell>
                        <TableCell>PM Off Peak</TableCell>
                    </TableRow>
                </TableHead>
                <TableBody>
                    {service.map(direction =>
                        <TableRow key={direction.Direction}>
                            <TableCell>
                                {direction.LoopDesc ? (
                                    <>
                                        <Typography variant="body1">Loop</Typography>
                                        {direction.OriginName} ↺ {direction.LoopDesc}
                                    </>
                                ) : (
                                    <>
                                        <Typography variant="body1">Direction {direction.Direction}</Typography>
                                        {direction.OriginName} → {direction.DestinationName}
                                    </>
                                )}
                            </TableCell>
                            <TableCell>
                                <Typography variant="body1">{direction.AM_Peak_Freq}</Typography>
                            </TableCell>
                            <TableCell>
                                <Typography variant="body1">{direction.AM_Offpeak_Freq}</Typography>
                            </TableCell>
                            <TableCell>
                                <Typography variant="body1">{direction.PM_Peak_Freq}</Typography>
                            </TableCell>
                            <TableCell>
                                <Typography variant="body1">{direction.PM_Offpeak_Freq}</Typography>
                            </TableCell>
                        </TableRow>
                    )}
                </TableBody>
            </Table>
        </Container>
    );
}

function BusJourney({ route }: { route: BusRouteType[] }) {
    const direction1 = route.filter(stop => stop.Direction === 1);
    const direction2 = route.filter(stop => stop.Direction === 2);
    const directions = direction2.length > 0 ? [direction1, direction2] : [direction1];

    return (
        <Container>
            <Stack direction={{ xs: "column", md: "row" }} spacing={2} sx={{ alignItems: "flex-start" }}>
                {directions.map(direction =>
                    <Table key={direction.at(0)?.Direction}>
                        <TableHead>
                            <TableRow>
                                <TableCell colSpan={5}>
                                    <Typography variant="h5">
                                        {directions.length === 1 ? "Loop" : `Direction ${direction.at(0)?.Direction}`}
                                    </Typography>
                                </TableCell>
                            </TableRow>
                            <TableRow>
                                <TableCell></TableCell>
                                <TableCell>#</TableCell>
                                <TableCell>km</TableCell>
                                <TableCell>Code</TableCell>
                                <TableCell>Name</TableCell>
                            </TableRow>
                        </TableHead>
                        <TableBody>
                            {direction.map((stop, index) =>
                                <BusSequence key={stop.StopSequence} currentStop={stop} previousStop={direction[index - 1]} />
                            )}
                        </TableBody>
                    </Table>
                )}
            </Stack>
        </Container>
    );
}

function BusSequence({ currentStop, previousStop }: { currentStop: BusRouteType, previousStop: BusRouteType }) {
    const [open, setOpen] = useState(false);
    const [arrival, setArrival] = useState<BusArrivalType | null>(null);

    async function handleClick(stop: BusRouteType) {
        if (!open) {
            const params = new URLSearchParams({
                BusStopCode: stop.BusStopCode,
                ServiceNo: `${stop.ServiceNo}${stop.ServiceSuffix}`
            });
            const response = await fetch(`/api/bus-arrival?${params}`);
            const data = await response.json() as BusArrivalType;
            setArrival(data);
        }
        setOpen(!open);
    }

    return (<>
        {(!previousStop || previousStop.RoadName !== currentStop.RoadName) &&
            <TableRow>
                <TableCell colSpan={5}>
                    <Typography variant="body1">
                        {currentStop.RoadName.split(" ").map(word =>
                            roadNamesMap[word] ? roadNamesMap[word] : word
                        ).join(" ")}
                    </Typography>
                </TableCell>
            </TableRow>}
        <TableRow>
            <TableCell>
                <IconButton
                    aria-label="Expand"
                    size="small"
                    type="button"
                    onClick={() => handleClick(currentStop)}
                >
                    {open ? <KeyboardArrowUp /> : <KeyboardArrowDown />}
                </IconButton>
            </TableCell>
            <TableCell>{currentStop.StopSequence}</TableCell>
            <TableCell>{currentStop.Distance}</TableCell>
            <TableCell>{currentStop.BusStopCode}</TableCell>
            <TableCell>{currentStop.BusStopName}</TableCell>
        </TableRow>
        <TableRow>
            <TableCell colSpan={6} sx={{ borderBottom: 0, p: 0 }}>
                <Collapse in={open}>
                    <BusFirstLast stop={currentStop} />
                    {arrival?.Services[0] && <BusArrival arrival={arrival} />}
                </Collapse>
            </TableCell>
        </TableRow>
    </>);
}

function BusFirstLast({ stop }: { stop: BusRouteType }) {
    return (
        <Table>
            <TableBody>
                <TableRow>
                    <TableCell>WD First</TableCell>
                    <TableCell>WD Last</TableCell>
                    <TableCell>Sat First</TableCell>
                    <TableCell>Sat Last</TableCell>
                    <TableCell>Sun First</TableCell>
                    <TableCell>Sun Last</TableCell>
                </TableRow>
                <TableRow>
                    <TableCell>{stop.WD_FirstBus}</TableCell>
                    <TableCell>{stop.WD_LastBus}</TableCell>
                    <TableCell>{stop.SAT_FirstBus}</TableCell>
                    <TableCell>{stop.SAT_LastBus}</TableCell>
                    <TableCell>{stop.SUN_FirstBus}</TableCell>
                    <TableCell>{stop.SUN_LastBus}</TableCell>
                </TableRow>
            </TableBody>
        </Table>
    )
}

function BusArrival({ arrival }: { arrival: BusArrivalType }) {
    const occupancyMap: Record<string, string> = { "SEA": "Low", "SDA": "Medium", "LSD": "High" };
    const typeMap: Record<string, string> = { "SD": "Single Deck", "DD": "Double Deck", "BD": "Bendy" }
    const timing1 = arrival.Services[0].NextBus;
    const timing2 = arrival.Services[0].NextBus2;
    const timing3 = arrival.Services[0].NextBus3;
    return (arrival && (
        <Table>
            <TableBody>
                <TableRow>
                    <TableCell>Next Bus Timing</TableCell>
                    {timing1 && <TableCell>{timing1.EstimatedArrival.slice(11, 19)}</TableCell>}
                    {timing2 && <TableCell>{timing2.EstimatedArrival.slice(11, 19)}</TableCell>}
                    {timing3 && <TableCell>{timing3.EstimatedArrival.slice(11, 19)}</TableCell>}
                </TableRow>
                <TableRow>
                    <TableCell>Occupancy</TableCell>
                    {timing1 && <TableCell>{occupancyMap[timing1.Load]}</TableCell>}
                    {timing2 && <TableCell>{occupancyMap[timing2.Load]}</TableCell>}
                    {timing3 && <TableCell>{occupancyMap[timing3.Load]}</TableCell>}
                </TableRow>
                <TableRow>
                    <TableCell>Type</TableCell>
                    {timing1 && <TableCell>{typeMap[timing1.Type]}</TableCell>}
                    {timing2 && <TableCell>{typeMap[timing2.Type]}</TableCell>}
                    {timing3 && <TableCell>{typeMap[timing3.Type]}</TableCell>}
                </TableRow>
            </TableBody>
        </Table>
    ))
}

export default function Bus({
    loaderData: { master, route, service, videos }
}: Route.ComponentProps) {
    return (
        <Container>
            <Typography variant="h3">{master.operator} {master.category} Service {master.service}</Typography>
            <BusVideos videos={videos} />
            <BusHours route={route} />
            <BusFrequency service={service} />
            <BusJourney route={route} />
        </Container>
    );
}