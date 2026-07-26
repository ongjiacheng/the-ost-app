import { Firestore } from "@google-cloud/firestore";
import { field, variable } from "@google-cloud/firestore/pipelines";

import KeyboardArrowUpIcon from "@mui/icons-material/KeyboardArrowUp";
import KeyboardArrowDownIcon from "@mui/icons-material/KeyboardArrowDown";
import PlayCircleIcon from '@mui/icons-material/PlayCircle';
import SyncIcon from "@mui/icons-material/Sync";

import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import Card from "@mui/material/Card";
import CardMedia from "@mui/material/CardMedia";
import Collapse from "@mui/material/Collapse";
import Container from "@mui/material/Container";
import FormControl from "@mui/material/FormControl";
import FormControlLabel from "@mui/material/FormControlLabel";
import IconButton from "@mui/material/IconButton";
import InputLabel from "@mui/material/InputLabel";
import Link from "@mui/material/Link";
import MenuItem from "@mui/material/MenuItem";
import Paper from "@mui/material/Paper";
import Select from "@mui/material/Select";
import Slider from "@mui/material/Slider";
import Stack from "@mui/material/Stack";
import Switch from "@mui/material/Switch";
import Table from "@mui/material/Table";
import TableBody from "@mui/material/TableBody";
import TableCell from "@mui/material/TableCell";
import TableContainer from "@mui/material/TableContainer";
import TableHead from "@mui/material/TableHead";
import TableRow from "@mui/material/TableRow";
import Typography from "@mui/material/Typography";

import { useEffect, useMemo, useRef, useState } from "react";
import { Link as RouterLink } from "react-router";

import type { Route } from "./+types/bus_.$svc";
import type { AltRouteType, BusArrivalType, BusRouteType, BusServiceType, HyperlapseType, TimestampsType, BusMasterType, volumeMap } from "../types";
import { categoryMap, lineMap, occupancyMap, operatorMap, roadNamesMap, stationsMap, typeMap } from "../types";

const db = new Firestore({
    projectId: "the-ost-app",
    databaseId: "the-ost-app"
});

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
    const hyperlapseQuery = await db.collection("hyperlapse")
        .where("ServiceNo", "==", serviceNo)
        .where("ServiceSuffix", "==", serviceSuffix)
        .orderBy("Direction").get();
    const hyperlapses: HyperlapseType[] = hyperlapseQuery.docs.map(doc => ({
        id: doc.id,
        ...doc.data() as HyperlapseType
    }));

    const timestampsQuery = await db.collection("timestamps")
        .where("ServiceNo", "==", serviceNo)
        .where("ServiceSuffix", "==", serviceSuffix)
        .orderBy("Direction").get();
    const timestamps: TimestampsType[] = timestampsQuery.docs.map(doc => ({
        id: doc.id,
        ...doc.data() as TimestampsType
    }));

    const master: BusMasterType = {
        operator: operatorMap[service.at(0)!.Operator],
        category: (service.at(0) !== undefined && service.at(0)!.ServiceNo >= 451 && service.at(0)!.ServiceNo <= 500)
            ? "Limited-Stop"
            : categoryMap[service.at(0)!.Category],
        service: params.svc,
        direction: service.at(0)!.Direction
    }

    return { master, route, service, hyperlapses, timestamps };
}

function BusHyperlapses({ hyperlapses, play }: { hyperlapses: HyperlapseType[], play: { id: string, start: number } | null }) {
    const iframeRefs = useRef<Record<string, HTMLIFrameElement | null>>({});

    useEffect(() => {
        if (!play) return;
        const iframe = iframeRefs.current[play.id];
        if (!iframe) return;
        iframe.src = `https://www.youtube.com/embed/${play.id}?rel=0&autoplay=1&start=${play.start}`;
    }, [play]);

    return (
        <Container>
            <Stack direction={{ xs: "column", md: "row" }} spacing={2} sx={{ alignItems: "stretch" }}>
                {hyperlapses.map(hyperlapse => {
                    const selected = play?.id === hyperlapse.videoId;
                    const src = `https://www.youtube.com/embed/${hyperlapse.videoId}?rel=0${selected ? `&autoplay=1&start=${play.start}` : ""}`;
                    return (
                        <Card key={hyperlapse.videoId} sx={{ flex: 1, width: "100%" }}>
                            <CardMedia
                                component="iframe"
                                ref={video => { iframeRefs.current[hyperlapse.videoId] = video; }}
                                src={src}
                                allow="autoplay; encrypted-media"
                                sx={{ width: "100%", aspectRatio: "16 / 9", border: 0 }}
                            />
                        </Card>
                    );
                })}
            </Stack>
        </Container>
    );
}

function BusInfo({ service }: { service: BusServiceType[] }) {
    return (
        <Container>
            <Table>
                <TableHead>
                    <TableRow>
                        <TableCell>
                            <Typography align="center" variant="body1">Frequency (minutes)</Typography>
                        </TableCell>
                        <TableCell align="center">
                            <Typography align="center" variant="body1">AM Peak</Typography>
                        </TableCell>
                        <TableCell align="center">
                            <Typography align="center" variant="body1">AM Off Peak</Typography>
                        </TableCell>
                        <TableCell align="center">
                            <Typography align="center" variant="body1">PM Peak</Typography>
                        </TableCell>
                        <TableCell align="center">
                            <Typography align="center" variant="body1">PM Off Peak</Typography>
                        </TableCell>
                    </TableRow>
                </TableHead>
                <TableBody>
                    {service.map(direction =>
                        <TableRow key={direction.Direction}>
                            <TableCell align="center">
                                <Typography variant="body1">
                                    {direction.LoopDesc ? "Loop" : `Direction ${direction.Direction}`}
                                </Typography>
                                <Typography variant="body2">
                                    {direction.LoopDesc
                                        ? `${direction.OriginName} ↺ ${direction.LoopDesc}`
                                        : `${direction.OriginName} → ${direction.DestinationName}`}
                                </Typography>
                            </TableCell>
                            <TableCell align="center">
                                <Typography variant="body1">{direction.AM_Peak_Freq}</Typography>
                            </TableCell>
                            <TableCell align="center">
                                <Typography variant="body1">{direction.AM_Offpeak_Freq}</Typography>
                            </TableCell>
                            <TableCell align="center">
                                <Typography variant="body1">{direction.PM_Peak_Freq}</Typography>
                            </TableCell>
                            <TableCell align="center">
                                <Typography variant="body1">{direction.PM_Offpeak_Freq}</Typography>
                            </TableCell>
                        </TableRow>
                    )}
                </TableBody>
            </Table>
        </Container>
    );
}

function BusJourney({ route, timestamps, hyperlapses }: { route: BusRouteType[], timestamps: TimestampsType[], hyperlapses: HyperlapseType[] }) {
    const [timecode, setTimecode] = useState<{ id: string, start: number } | null>(null);

    const directions = useMemo(() => {
        const direction1 = route.filter(stop => stop.Direction === 1);
        const direction2 = route.filter(stop => stop.Direction === 2);
        return direction2.length > 0 ? [direction1, direction2] : [direction1];
    }, [route]);

    function handlePlay(direction: number, start: number) {
        window.scrollTo({ top: 0, behavior: "smooth" });
        const video = hyperlapses.find(h => h.Direction === direction);
        setTimecode(video ? { id: video.videoId, start } : null);
    }

    return (
        <Container>
            <BusHyperlapses hyperlapses={hyperlapses} play={timecode} />
            <Stack direction={{ xs: "column", md: "row" }} spacing={2} sx={{ alignItems: "flex-start" }}>
                {directions.map((direction, _, arr) => {
                    return (
                        <Table key={direction.at(0)?.Direction}>
                            <TableHead>
                                <TableRow>
                                    <TableCell align="center" colSpan={7}>
                                        <Typography variant="h5">
                                            {arr.length === 1 ? "Loop" : `Direction ${direction.at(0)?.Direction}`}
                                        </Typography>
                                    </TableCell>
                                </TableRow>
                                <TableRow>
                                    <TableCell></TableCell>
                                    <TableCell align="center">#</TableCell>
                                    <TableCell align="center">km</TableCell>
                                    <TableCell align="center">Code</TableCell>
                                    <TableCell align="left" colSpan={2}>Name</TableCell>
                                    <TableCell align="left">Station</TableCell>
                                </TableRow>
                            </TableHead>
                            <TableBody>
                                {direction.map((stop, index) => {
                                    const start = timestamps.find(t => t.Direction === stop.Direction)?.Timestamps.filter(s =>
                                        s.code === stop.BusStopCode
                                    )[direction.slice(0, index + 1).filter(s =>
                                        s.BusStopCode === stop.BusStopCode
                                    ).length - 1]?.time?.[0] ?? 0;
                                    return (
                                        <BusSequence
                                            key={`${stop.ServiceNo}${stop.ServiceSuffix}-${stop.Direction}-${stop.StopSequence}`}
                                            currentStop={stop}
                                            previousStop={direction[index - 1]}
                                            play={() => handlePlay(stop.Direction, start)}
                                        />
                                    );
                                })}
                            </TableBody>
                        </Table>
                    );
                })}
            </Stack>
        </Container>
    );
}

function BusSequence({ currentStop, previousStop, play }: { currentStop: BusRouteType, previousStop: BusRouteType, play: () => void }) {
    const [loading, setLoading] = useState(false);
    const [open, setOpen] = useState(false);
    const [arrival, setArrival] = useState<BusArrivalType | null>(null);
    const [altRoutes, setAltRoutes] = useState<AltRouteType[] | null>(null);

    useEffect(() => {
        if (!open) return;

        async function fetchStopData() {
            setLoading(true);
            const arrivalParams = new URLSearchParams({
                BusStopCode: currentStop.BusStopCode,
                ServiceNo: `${currentStop.ServiceNo}${currentStop.ServiceSuffix}`
            });
            const altRoutesParams = new URLSearchParams({
                BusStopCode: currentStop.BusStopCode,
                ServiceNo: String(currentStop.ServiceNo),
                ServiceSuffix: currentStop.ServiceSuffix
            });

            if (!altRoutes) {
                const [arrivalResponse, altRoutesResponse] = await Promise.all([
                    fetch(`/api/bus-arrival?${arrivalParams}`),
                    fetch(`/api/bus-alt-routes?${altRoutesParams}`)
                ]);
                const [arrivalData, altRoutesData] = await Promise.all([
                    arrivalResponse.json() as Promise<BusArrivalType>,
                    altRoutesResponse.json() as Promise<AltRouteType[]>
                ]);
                setArrival(arrivalData);
                setAltRoutes(altRoutesData);
            } else {
                const arrivalResponse = await fetch(`/api/bus-arrival?${arrivalParams}`);
                const arrivalData = await arrivalResponse.json();
                setArrival(arrivalData);
            }
            setLoading(false);
        }
        fetchStopData();
    }, [open, currentStop, altRoutes]);

    function handleDropdown() {
        setOpen(prev => !prev);
    }

    return (<>
        {(!previousStop || previousStop.RoadName !== currentStop.RoadName) &&
            <TableRow>
                <TableCell align="center" colSpan={7}>
                    <Typography variant="body1">
                        {currentStop.RoadName.split(" ").map(word =>
                            roadNamesMap[word] ? roadNamesMap[word] : word
                        ).join(" ")}
                    </Typography>
                </TableCell>
            </TableRow>}
        <TableRow>
            <TableCell>
                <IconButton aria-label="Expand Dropdown" size="small" type="button" onClick={handleDropdown}>
                    {loading ? <SyncIcon /> : open ? <KeyboardArrowUpIcon /> : <KeyboardArrowDownIcon />}
                </IconButton>
                <IconButton aria-label="Play Video" size="small" type="button" onClick={play}>
                    <PlayCircleIcon />
                </IconButton>
            </TableCell>
            <TableCell align="center">{currentStop.StopSequence}</TableCell>
            <TableCell align="center">{currentStop.Distance.toFixed(1)}</TableCell>
            <TableCell align="center">{currentStop.BusStopCode}</TableCell>
            <TableCell align="left" colSpan={2}>{currentStop.BusStopName}</TableCell>
            <TableCell align="left">
                {stationsMap[currentStop.BusStopCode]?.map(([codes, name], i, a) => (
                    <Box key={i}>
                        {codes.split(" ").map((code, j) =>
                            <Typography component="span" key={j} variant="body2" sx={{ color: lineMap[code.slice(0, 2)] ?? "#D7D9DC" }}>
                                {code}{" "}
                            </Typography>
                        )}
                        {`${name}`}
                        {i < a.length - 1 && "\n"}
                    </Box>
                ))}
            </TableCell>
        </TableRow >
        <TableRow>
            <TableCell colSpan={7} sx={{ borderBottom: 0, p: 0 }}>
                <Collapse in={open}>
                    <Container sx={{ p: 1, border: 1, borderColor: "primary.main" }}>
                        {altRoutes && <BusAltRoutes altRoutes={altRoutes} stop={currentStop} />}
                        <BusFirstLast stop={currentStop} />
                        {arrival?.Services[0] && <BusArrival arrival={arrival} />}
                    </Container>
                </Collapse>
            </TableCell>
        </TableRow>
    </>);
}

function BusAltRoutes({ altRoutes, stop }: { altRoutes: AltRouteType[], stop: BusRouteType }) {
    return (
        <Table>
            <TableBody>
                {stationsMap[stop.BusStopCode] && <TableRow>
                    <TableCell align="center">
                        <Typography variant="body1">Nearby Stations</Typography>
                    </TableCell>
                    <TableCell align="center">
                        {stationsMap[stop.BusStopCode]?.map(([codes, name, exit], i, a) => (
                            <Box key={i}>
                                {codes.split(" ").map((code, j) =>
                                    <Typography component="span" key={j} variant="body2" sx={{ color: lineMap[code.slice(0, 2)] ?? "#D7D9DC" }}>
                                        {code}{" "}
                                    </Typography>
                                )}
                                {`${name} Exit ${exit}`}
                                {i < a.length - 1 && "\n"}
                            </Box>
                        ))}
                    </TableCell>
                </TableRow>}
                {altRoutes.length > 0 && <TableRow>
                    <TableCell align="center">
                        <Typography variant="body1">Other Services</Typography>
                    </TableCell>
                    <TableCell align="center">
                        {altRoutes.filter((route, i, arr) =>
                            i === 0 || route.ServiceNo !== arr[i - 1].ServiceNo || route.ServiceSuffix !== arr[i - 1].ServiceSuffix
                        ).flatMap((route, i, arr) =>
                            i === 0
                                ? [
                                    <Link component={RouterLink} to={`/bus/${route.ServiceNo}${route.ServiceSuffix}`} color="primary.light" underline="hover">
                                        {`${route.ServiceNo}${route.ServiceSuffix}`}
                                    </Link>
                                ]
                                : route.ServiceNo === arr[i - 1].ServiceNo && route.ServiceSuffix !== arr[i - 1].ServiceSuffix
                                    ? [
                                        "/",
                                        <Link component={RouterLink} to={`/bus/${route.ServiceNo}${route.ServiceSuffix}`} color="primary.light" underline="hover">
                                            {route.ServiceSuffix}
                                        </Link>
                                    ]
                                    : [
                                        " ",
                                        <Link component={RouterLink} to={`/bus/${route.ServiceNo}${route.ServiceSuffix}`} color="primary.light" underline="hover">
                                            {`${route.ServiceNo}${route.ServiceSuffix}`}
                                        </Link>
                                    ]
                        )}
                    </TableCell>
                </TableRow>}
            </TableBody>
        </Table>
    );
}

function BusFirstLast({ stop }: { stop: BusRouteType }) {
    return (
        <Table>
            <TableBody>
                <TableRow>
                    <TableCell align="center">Mon-Fri First</TableCell>
                    <TableCell align="center">Mon-Fri Last</TableCell>
                    <TableCell align="center">Sat First</TableCell>
                    <TableCell align="center">Sat Last</TableCell>
                    <TableCell align="center">Sun First</TableCell>
                    <TableCell align="center">Sun Last</TableCell>
                </TableRow>
                <TableRow>
                    <TableCell align="center">{stop.WD_FirstBus}</TableCell>
                    <TableCell align="center">{stop.WD_LastBus}</TableCell>
                    <TableCell align="center">{stop.SAT_FirstBus}</TableCell>
                    <TableCell align="center">{stop.SAT_LastBus}</TableCell>
                    <TableCell align="center">{stop.SUN_FirstBus}</TableCell>
                    <TableCell align="center">{stop.SUN_LastBus}</TableCell>
                </TableRow>
            </TableBody>
        </Table>
    )
}

function BusArrival({ arrival }: { arrival: BusArrivalType }) {
    const timings = [arrival.Services[0].NextBus, arrival.Services[0].NextBus2, arrival?.Services[0].NextBus3];
    return (arrival && (
        <Table>
            <TableBody>
                <TableRow>
                    <TableCell align="center">Next Bus Timing</TableCell>
                    {timings.map(timing => (
                        timing.EstimatedArrival && <TableCell align="center">{timing.EstimatedArrival.slice(11, 19)}</TableCell>
                    ))}
                </TableRow>
                <TableRow>
                    <TableCell align="center">Occupancy (Type)</TableCell>
                    {timings.map(timing => (
                        timing.EstimatedArrival &&
                        <TableCell align="center">
                            <Typography variant="body2" sx={{
                                color: timing.Load === null
                                    ? "text.disabled"
                                    : timing.Load === "SEA"
                                        ? "success.main"
                                        : timing.Load === "SDA"
                                            ? "warning.main"
                                            : timing.Load === "LSD"
                                                ? "error.main"
                                                : "text.disabled"
                            }}>
                                {occupancyMap[timing.Load]}
                            </Typography>
                            {`(${typeMap[timing.Type]})`}
                        </TableCell>
                    ))}
                </TableRow>
            </TableBody>
        </Table>
    ))
}

function BusVolume({ route }: { route: BusRouteType[] }) {
    const [period, setPeriod] = useState("202606");
    const [day, setDay] = useState(false);
    const [hour, setHour] = useState(new Date().getHours());
    const [weekday, setWeekday] = useState([0, 6].includes(new Date().getDay()) ? false : true);
    const [loading, setLoading] = useState(false);
    const [open, setOpen] = useState(false);
    const [volume, setVolume] = useState<Record<string, volumeMap> | null>(null);

    useEffect(() => {
        if (!open) return;
        if (volume && volume[period]) return;

        async function fetchVolume() {
            setLoading(true);
            const volumeParams = new URLSearchParams({ Period: period });
            route.forEach(origin => volumeParams.append("Origin", origin.BusStopCode));
            route.forEach(destination => volumeParams.append("Destination", destination.BusStopCode));
            const volumeResponse = await fetch(`/api/bus-volume?${volumeParams}`);
            const volumeData = await volumeResponse.json();
            setVolume(prev => ({ ...(prev ?? {}), [period]: volumeData }));
            setLoading(false);
        }

        fetchVolume();
    }, [open, period, route, volume]);

    const directions = useMemo(() => {
        const direction1 = route.filter(stop => stop.Direction === 1);
        const direction2 = route.filter(stop => stop.Direction === 2);
        return direction2.length > 0 ? [direction1, direction2] : [direction1];
    }, [route]);

    function handleFetch(p: string = period) {
        setPeriod(p);
        setOpen(true);
    }

    return (
        <>
            {loading
                ? "Loading"
                : (open
                    ? (
                        <>
                            <Typography variant="h4">Origin-Destination Volumes</Typography>
                            <Stack direction="row" spacing={2} sx={{ justifyContent: "center" }}>
                                <FormControl size="small">
                                    <InputLabel>Period</InputLabel>
                                    <Select value={period} label="Period" onChange={e => handleFetch(e.target.value)}>
                                        <MenuItem value="202603">March 2026</MenuItem>
                                        <MenuItem value="202606">June 2026</MenuItem>
                                    </Select>
                                </FormControl>
                                <FormControlLabel
                                    control={<Switch checked={weekday} onChange={e => setWeekday(e.target.checked)} />}
                                    label={weekday ? "Weekday" : "Weekend"}
                                />
                                <FormControlLabel
                                    control={<Switch checked={day} onChange={e => setDay(e.target.checked)} />}
                                    label={day ? "By Day" : "By Hour"}
                                />
                            </Stack>
                            {!day && (
                                <Stack direction="row" spacing={2} sx={{ p: 2 }}>
                                    <Typography id="hour-slider" sx={{ whiteSpace: "nowrap" }}>
                                        {`${hour.toString().padStart(2, "0")}:00 – ${hour.toString().padStart(2, "0")}:59`}
                                    </Typography>
                                    <Slider aria-labelledby="hour-slider" value={hour} min={0} max={23} step={1}
                                        marks valueLabelDisplay="auto" onChange={(_, value) => setHour(value as number)}
                                    />
                                </Stack>
                            )}
                            <Stack direction={{ xs: "column", md: "row" }} spacing={2} sx={{ alignItems: "flex-start" }}>
                                {directions.map((direction, _, arr) => (
                                    <Stack direction="column" spacing={2} sx={{ flex: 1, maxHeight: { xs: arr.length === 1 ? "80vh" : "40vh", md: "80vh" }, maxWidth: "100%", overflow: "auto" }}>
                                        <Typography variant="h5">{arr.length === 1 ? "Loop" : `Direction ${direction.at(0)?.Direction}`}</Typography>
                                        <TableContainer component={Paper}>
                                            <Table>
                                                <TableBody>
                                                    <TableRow>
                                                        <TableCell align="center" sx={{ backgroundColor: "background.paper", left: 0, position: "sticky", top: 0, zIndex: 4 }}>↱</TableCell>
                                                        {direction.map(destination => (
                                                            <TableCell align="center" key={destination.StopSequence} sx={{ backgroundColor: "background.paper", position: "sticky", top: 0, verticalAlign: "bottom", zIndex: 2 }}>
                                                                <Typography variant="caption">
                                                                    {destination.BusStopCode}
                                                                </Typography>
                                                            </TableCell>
                                                        ))}
                                                    </TableRow>
                                                    {volume && direction.map((origin, i) => (
                                                        <TableRow key={origin.StopSequence}>
                                                            <TableCell align="right" sx={{ backgroundColor: "background.paper", position: "sticky", whiteSpace: "nowrap", left: 0, zIndex: 1 }}>
                                                                <Typography variant="caption">
                                                                    {origin.BusStopName} {origin.BusStopCode}
                                                                </Typography>
                                                            </TableCell>
                                                            {direction.map((destination, j) => {
                                                                const trip = volume[period][origin.BusStopCode]?.[destination.BusStopCode];
                                                                const commuters = i < j
                                                                    ? trip
                                                                        ? day
                                                                            ? trip[weekday ? "wd" : "we"].reduce((acc, val) => acc + val, 0)
                                                                            : trip[weekday ? "wd" : "we"][hour]
                                                                        : 0
                                                                    : null;
                                                                return (
                                                                    <TableCell align="right" key={destination.StopSequence}>
                                                                        <Typography variant="body2" sx={{
                                                                            color: (commuters === null || commuters === 0)
                                                                                ? "text.disabled"
                                                                                : commuters <= 100
                                                                                    ? "info.main"
                                                                                    : commuters <= 400
                                                                                        ? "success.main"
                                                                                        : commuters <= 1600
                                                                                            ? "warning.main"
                                                                                            : "error.main"
                                                                        }}>
                                                                            {commuters === null ? "-" : commuters}
                                                                        </Typography>
                                                                    </TableCell>
                                                                );
                                                            })}
                                                        </TableRow>
                                                    ))}
                                                </TableBody>
                                            </Table>
                                        </TableContainer>
                                    </Stack>
                                ))}
                            </Stack>
                        </>
                    )
                    : <Button variant="contained" onClick={() => handleFetch()}>Origin-Destination Volumes</Button>
                )
            }
        </>
    )
}

export default function Bus({
    loaderData: { master, route, service, hyperlapses, timestamps }
}: Route.ComponentProps) {
    return (
        <Container>
            <Typography variant="h3">{master.operator} {master.category} Service {master.service}</Typography>
            <BusInfo service={service} />
            <BusJourney route={route} timestamps={timestamps} hyperlapses={hyperlapses} />
            <BusVolume route={route} />
        </Container>
    );
}