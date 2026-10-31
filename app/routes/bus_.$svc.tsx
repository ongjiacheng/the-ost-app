import KeyboardArrowUpIcon from "@mui/icons-material/KeyboardArrowUp";
import KeyboardArrowDownIcon from "@mui/icons-material/KeyboardArrowDown";
import PlayCircleIcon from '@mui/icons-material/PlayCircle';
import SyncIcon from "@mui/icons-material/Sync";

import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import Card from "@mui/material/Card";
import CardContent from "@mui/material/CardContent";
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
import ToggleButton from "@mui/material/ToggleButton";
import ToggleButtonGroup from "@mui/material/ToggleButtonGroup";
import Typography from "@mui/material/Typography";
import { useTheme } from "@mui/material/styles";

import { useEffect, useRef, useState } from "react";
import { Link as RouterLink } from "react-router";

import type { FeatureCollection, LineString } from 'geojson';
import { AttributionControl, FullscreenControl, GeolocateControl, type GeoJSONSource, LngLatBounds, Map as MapLibreMap, NavigationControl, ScaleControl, setWorkerUrl } from 'maplibre-gl';
import 'maplibre-gl/dist/maplibre-gl.css';
import workerUrl from 'maplibre-gl/dist/maplibre-gl-worker.mjs?worker&url';

import type { Route } from "./+types/bus_.$svc";
import type { BusArrivalType, BusRouteType, BusServiceType, HyperlapseType, BusMasterType, TimecodeType, volumeMap } from "../types";
import { categoryMap, lineMap, occupancyMap, operatorMap, typeMap } from "../types";

export async function loader({ params, request }: Route.LoaderArgs) {
    const busParams = new URLSearchParams({ ServiceNo: params.svc })
    const [routes, services, hyperlapses, maps, timecodes] = await Promise.all(
        ["bus-route", "bus-service", "hyperlapse", "bus-map", "bus-timecodes"].map(api =>
            fetch(new URL(`/api/${api}?${busParams}`, request.url)).then(response => response.json())
        )
    ) as [BusRouteType[], BusServiceType[], HyperlapseType[], FeatureCollection<LineString>, Partial<Record<number, TimecodeType[]>>];

    const master: BusMasterType = {
        operator: operatorMap[services.at(0)!.Operator],
        category: (services.at(0) !== undefined && services.at(0)!.ServiceNo >= 451 && services.at(0)!.ServiceNo <= 500)
            ? "Limited-Stop"
            : categoryMap[services.at(0)!.Category],
        service: params.svc,
        multi: services.at(0)!.LoopDesc.length > 0
    }

    return { master, routes, services, hyperlapses, maps, timecodes };
}

function BusInfo({ service }: { service: BusServiceType }) {
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
                    <TableRow key={service.Direction}>
                        <TableCell align="center">
                            <Typography variant="body1">
                                {service.LoopDesc ? "Loop" : `Direction ${service.Direction}`}
                            </Typography>
                            <Typography variant="body2">
                                {service.LoopDesc
                                    ? `${service.OriginName} ↺ ${service.LoopDesc}`
                                    : `${service.OriginName} → ${service.DestinationName}`}
                            </Typography>
                        </TableCell>
                        <TableCell align="center">
                            <Typography variant="body1">{service.AM_Peak_Freq}</Typography>
                        </TableCell>
                        <TableCell align="center">
                            <Typography variant="body1">{service.AM_Offpeak_Freq}</Typography>
                        </TableCell>
                        <TableCell align="center">
                            <Typography variant="body1">{service.PM_Peak_Freq}</Typography>
                        </TableCell>
                        <TableCell align="center">
                            <Typography variant="body1">{service.PM_Offpeak_Freq}</Typography>
                        </TableCell>
                    </TableRow>
                </TableBody>
            </Table>
        </Container>
    );
}

setWorkerUrl(workerUrl);

function BusMap({ map: collection, route, service }: { map: FeatureCollection<LineString>, route: BusRouteType[], service: BusServiceType }) {
    const container = useRef<HTMLDivElement>(null);
    const { palette } = useTheme();

    useEffect(() => {
        const bounds = new LngLatBounds();
        route.forEach(stop => bounds.extend([stop.Longitude, stop.Latitude]));
        collection.features.forEach(f => f.geometry.coordinates.forEach(c => bounds.extend(c as [number, number])));
        const map = new MapLibreMap({
            container: container.current!,
            style: "https://tiles.openfreemap.org/styles/dark",
            bounds,
            fitBoundsOptions: { padding: 50 },
            attributionControl: false
        });
        map.addControl(new AttributionControl({ compact: true }));
        map.addControl(new ScaleControl({ unit: "metric" }), "top-right");
        map.addControl(new NavigationControl({ showZoom: false }), "top-right");
        map.addControl(new GeolocateControl({ positionOptions: { enableHighAccuracy: true }, trackUserLocation: true, showAccuracyCircle: true }), "top-right");
        map.addControl(new FullscreenControl({ container: container.current! }), "top-right");

        map.on("load", () => {
            map.addSource("route", { type: "geojson", data: collection });
            map.addLayer({ id: "route", type: "line", source: "route", paint: { "line-color": "#96D600", "line-width": 4 } });
            const features = route.map(stop => ({ type: "Feature" as const, properties: {}, geometry: { type: "Point" as const, coordinates: [stop.Longitude, stop.Latitude] } }));
            map.addSource("stops", { type: "geojson", data: { type: "FeatureCollection", features } });
            map.addLayer({ id: "stops", type: "circle", source: "stops", minzoom: 10, paint: { "circle-color": "#96D600" } });
            map.addSource("buses", { type: "geojson", data: { type: "FeatureCollection", features: [] } });
            map.addLayer({ id: "buses", type: "circle", source: "buses", paint: { "circle-color": ["get", "color"], "circle-stroke-width": 1, "circle-stroke-color": "#FFFFFF" } });
        });

        let active = true;
        (async () => {
            await map.once("load");
            while (active) {
                const time = new Intl.DateTimeFormat("en-GB", { timeZone: "Asia/Singapore", hour: "2-digit", minute: "2-digit", hourCycle: "h23" }).format(new Date());
                const frequency = "06:30" <= time && time <= "08:30" ? "AM_Peak_Freq" : time <= "17:00" ? "AM_Offpeak_Freq" : time <= "19:00" ? "PM_Peak_Freq" : "PM_Offpeak_Freq";
                const spacing = 0.75 * (Number(service[frequency].match(/\d+/)?.[0]) || 15);
                const dist = route.at(-1)!.Distance;
                const sampled = route.filter((stop, i) =>
                    i === route.length - 2 || Math.floor((dist - stop.Distance) / spacing) != Math.floor((dist - route.at(i - 1)!.Distance) / spacing)
                );

                const arrivals = await Promise.allSettled(sampled.map(stop =>
                    fetch(`/api/bus-arrival?BusStopCode=${stop.BusStopCode}&ServiceNo=${stop.ServiceNo}${stop.ServiceSuffix}`)
                        .then(response => response.ok ? response.json() as Promise<BusArrivalType> : undefined)
                ));

                if (!active) return;
                const unique: { coordinates: [number, number], color: string, sources: Set<number> }[] = [];
                arrivals.forEach((arrival, source) => {
                    const svc = arrival.status === "fulfilled" ? arrival.value?.Services?.[0] : undefined;
                    [svc?.NextBus, svc?.NextBus2, svc?.NextBus3].forEach(bus => {
                        if (!bus) return;
                        const [lng, lat] = [parseFloat(bus.Longitude), parseFloat(bus.Latitude)];
                        const color = bus.Load === "SEA" ? palette.success.dark
                            : bus.Load === "SDA" ? palette.warning.dark
                                : bus.Load === "LSD" ? palette.error.dark
                                    : palette.text.disabled;
                        if (!lng || !lat) return;
                        const match = unique.find(u => !u.sources.has(source) && Math.hypot(u.coordinates[0] - lng, u.coordinates[1] - lat) < 0.001);
                        if (match) match.sources.add(source);
                        else unique.push({ coordinates: [lng, lat], color, sources: new Set([source]) });
                    });
                });

                (map.getSource("buses") as GeoJSONSource).setData({
                    type: "FeatureCollection",
                    features: unique.map(({ coordinates, color }) => ({
                        type: "Feature" as const,
                        properties: { color },
                        geometry: { type: "Point" as const, coordinates }
                    }))
                });
                await new Promise(resolve => setTimeout(resolve, 20_000));
            }
        })();

        return () => {
            active = false;
            map.remove();
        };
    }, [collection, route, service, palette]);

    return (
        <Container sx={{ display: "flex" }}>
            <Paper ref={container} sx={{ flex: 1, minHeight: { xs: "40vh", md: 0 }, overflow: "hidden" }} />
        </Container>
    );
}

function BusHyperlapses({ hyperlapse, play }: { hyperlapse: HyperlapseType, play: { id: string, start: number } | null }) {
    const iframe = useRef<HTMLIFrameElement>(null);

    useEffect(() => {
        if (!play || !iframe.current) return;
        iframe.current.src = `https://www.youtube.com/embed/${play.id}?rel=0&autoplay=1&start=${play.start}`;
    }, [play]);

    return (
        <Container>
            <Card sx={{ width: "100%" }}>
                <CardMedia
                    component="iframe"
                    ref={iframe}
                    src={`https://www.youtube.com/embed/${hyperlapse.videoId}?rel=0${play?.id === hyperlapse.videoId ? `&autoplay=1&start=${play.start}` : ""}`}
                    allow="autoplay; encrypted-media"
                    sx={{ width: "100%", aspectRatio: "16 / 9", border: 0 }}
                />
                <CardContent>
                    Uploaded by {hyperlapse.channelTitle} on {new Date(hyperlapse.publishedAt).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}
                </CardContent>
            </Card>
        </Container>
    );
}

function BusJourney({ route, service, timecodes, handlePlay }: {
    route: BusRouteType[],
    service: BusServiceType,
    timecodes: Partial<Record<number, TimecodeType[]>>,
    handlePlay: (direction: number, start: number) => void
}) {
    return (
        <Container>
            <Table>
                <TableHead>
                    <TableRow>
                        <TableCell align="center" colSpan={7}>
                            <Typography variant="h5">
                                {service.LoopDesc ? "Loop" : `Direction ${service.Direction}`}
                            </Typography>
                        </TableCell>
                    </TableRow>
                    <TableRow>
                        <TableCell></TableCell>
                        <TableCell align="center" sx={{ display: { xs: "none", sm: "table-cell" } }}>#</TableCell>
                        <TableCell align="center">km</TableCell>
                        <TableCell align="center">Code</TableCell>
                        <TableCell align="left" colSpan={2}>Name</TableCell>
                        <TableCell align="left">Station</TableCell>
                    </TableRow>
                </TableHead>
                <TableBody>
                    {route.map((stop, index) => {
                        const start = timecodes[stop.Direction]?.find(s =>
                            s.code === stop.BusStopCode
                        )?.time?.[
                            route.slice(0, index + 1).filter(s =>
                                s.BusStopCode === stop.BusStopCode
                            ).length - 1
                        ] ?? 0;
                        return (
                            <BusSequence
                                key={`${stop.ServiceNo}${stop.ServiceSuffix}-${stop.Direction}-${stop.StopSequence}`}
                                currentStop={stop}
                                previousStop={route[index - 1]}
                                play={() => handlePlay(stop.Direction, start)}
                            />
                        );
                    })}
                </TableBody>
            </Table>
        </Container>
    );
}

function BusSequence({ currentStop, previousStop, play }: { currentStop: BusRouteType, previousStop: BusRouteType, play: () => void }) {
    const [loading, setLoading] = useState(false);
    const [open, setOpen] = useState(false);
    const [arrival, setArrival] = useState<BusArrivalType | null>(null);

    useEffect(() => {
        if (!open) return;
        async function fetchStopData() {
            setLoading(true);
            const arrivalParams = new URLSearchParams({
                BusStopCode: currentStop.BusStopCode,
                ServiceNo: `${currentStop.ServiceNo}${currentStop.ServiceSuffix}`
            });
            const arrival = await fetch(`/api/bus-arrival?${arrivalParams}`).then(response => response.json());
            setArrival(arrival);
            setLoading(false);
        }
        fetchStopData();
    }, [open, currentStop]);

    function handleDropdown() {
        setOpen(prev => !prev);
    }

    return (<>
        {(!previousStop || previousStop.RoadName !== currentStop.RoadName) &&
            <TableRow>
                <TableCell align="center" colSpan={7}>
                    <Typography variant="body1">{currentStop.RoadName}</Typography>
                </TableCell>
            </TableRow>}
        <TableRow>
            <TableCell sx={{ whiteSpace: "nowrap" }}>
                <IconButton aria-label="Expand Dropdown" size="small" type="button" onClick={handleDropdown}>
                    {loading ? <SyncIcon /> : open ? <KeyboardArrowUpIcon /> : <KeyboardArrowDownIcon />}
                </IconButton>
                <IconButton aria-label="Play Video" size="small" type="button" onClick={play}>
                    <PlayCircleIcon />
                </IconButton>
            </TableCell>
            <TableCell align="center" sx={{ display: { xs: "none", sm: "table-cell" } }}>{currentStop.StopSequence}</TableCell>
            <TableCell align="center">{currentStop.Distance.toFixed(1)}</TableCell>
            <TableCell align="center">{currentStop.BusStopCode}</TableCell>
            <TableCell align="left" colSpan={2}>{currentStop.BusStopName}</TableCell>
            <TableCell align="left">
                {currentStop.StnCode?.map((codes, i, a) => (
                    <Box key={i}>
                        {codes.split(" ").map((code, j) =>
                            <Typography component="span" key={j} variant="body2" sx={{ color: lineMap[code.slice(0, 2)] ?? "#D7D9DC" }}>
                                {code}{" "}
                            </Typography>
                        )}
                        {`${currentStop.StnName[i]}`}
                        {i < a.length - 1 && "\n"}
                    </Box>
                ))}
            </TableCell>
        </TableRow >
        <TableRow>
            <TableCell colSpan={7} sx={{ borderBottom: 0, p: 0 }}>
                <Collapse in={open && !loading}>
                    <Container sx={{ p: 1, border: 1, borderColor: "primary.main" }}>
                        <BusAltRoutes stop={currentStop} />
                        <BusFirstLast stop={currentStop} />
                        {arrival?.Services[0] && <BusArrival arrival={arrival} />}
                    </Container>
                </Collapse>
            </TableCell>
        </TableRow>
    </>);
}

function BusAltRoutes({ stop }: { stop: BusRouteType }) {
    return (
        <Table>
            <TableBody>
                {stop.StnCode.length > 0 && <TableRow>
                    <TableCell align="center">
                        <Typography variant="body1">Nearby Stations</Typography>
                    </TableCell>
                    <TableCell align="center">
                        {stop.StnCode?.map((codes, i, a) => (
                            <Box key={i}>
                                {codes.split(" ").map((code, j) =>
                                    <Typography component="span" key={j} variant="body2" sx={{ color: lineMap[code.slice(0, 2)] ?? "#D7D9DC" }}>
                                        {code}{" "}
                                    </Typography>
                                )}
                                {`${stop.StnName[i]} Exit ${stop.StnExit[i]}`}
                                {i < a.length - 1 && "\n"}
                            </Box>
                        ))}
                    </TableCell>
                </TableRow>}
                {stop.AltSvcNo.length > 0 && <TableRow>
                    <TableCell align="center">
                        <Typography variant="body1">Bus Services</Typography>
                    </TableCell>
                    <TableCell align="center">
                        {stop.AltSvcNo.filter((svc, i, arr) =>
                            i === 0 || svc !== arr[i - 1] || stop.AltSvcSuffix[i] !== stop.AltSvcSuffix[i - 1]
                        ).flatMap((svc, i, arr) =>
                            i === 0
                                ? [
                                    <Link component={RouterLink} to={`/bus/${svc}${stop.AltSvcSuffix[i]}`} color="primary.light" underline="hover">
                                        {`${svc}${stop.AltSvcSuffix[i]}`}
                                    </Link>
                                ]
                                : svc === arr[i - 1] && stop.AltSvcSuffix[i] !== stop.AltSvcSuffix[i - 1]
                                    ? [
                                        "/",
                                        <Link component={RouterLink} to={`/bus/${svc}${stop.AltSvcSuffix[i]}`} color="primary.light" underline="hover">
                                            {stop.AltSvcSuffix[i]}
                                        </Link>
                                    ]
                                    : [
                                        " ",
                                        <Link component={RouterLink} to={`/bus/${svc}${stop.AltSvcSuffix[i]}`} color="primary.light" underline="hover">
                                            {`${svc}${stop.AltSvcSuffix[i]}`}
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
                        timing.EstimatedArrival && <TableCell align="center">{new Date(timing.EstimatedArrival).toLocaleTimeString()}</TableCell>
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
    const [period, setPeriod] = useState("202609");
    const [day, setDay] = useState(false);
    const [hour, setHour] = useState(new Date().getHours());
    const [weekday, setWeekday] = useState([0, 6].includes(new Date().getDay()) ? false : true);
    const [loading, setLoading] = useState(false);
    const [open, setOpen] = useState(false);
    const [volume, setVolume] = useState<Record<string, volumeMap> | null>(null);

    useEffect(() => {
        if (!open) return;
        if (loading) return;
        if (volume?.[period]) return;

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
    }, [open, period, route, volume, loading]);

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
                                        <MenuItem value="202603">Mar 2026</MenuItem>
                                        <MenuItem value="202606">Jun 2026</MenuItem>
                                        <MenuItem value="202609">Sep 2026</MenuItem>
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
                                <Stack direction="column" spacing={2} sx={{ flex: 1, maxHeight: "100%", maxWidth: "100%", overflow: "auto" }}>
                                    <TableContainer component={Paper}>
                                        <Table>
                                            <TableBody>
                                                <TableRow>
                                                    <TableCell align="center" sx={{ backgroundColor: "background.paper", left: 0, position: "sticky", top: 0, zIndex: 4 }}>↱</TableCell>
                                                    {route.map(destination => (
                                                        <TableCell align="center" key={destination.StopSequence} sx={{ backgroundColor: "background.paper", position: "sticky", top: 0, verticalAlign: "bottom", zIndex: 2 }}>
                                                            <Typography variant="caption">
                                                                {destination.BusStopCode}
                                                            </Typography>
                                                        </TableCell>
                                                    ))}
                                                </TableRow>
                                                {volume?.[period] && route.map((origin, i) => (
                                                    <TableRow key={origin.StopSequence}>
                                                        <TableCell align="right" sx={{ backgroundColor: "background.paper", position: "sticky", whiteSpace: "nowrap", left: 0, zIndex: 1 }}>
                                                            <Typography variant="caption">
                                                                {origin.BusStopName} {origin.BusStopCode}
                                                            </Typography>
                                                        </TableCell>
                                                        {route.map((destination, j) => {
                                                            const trip = volume?.[period]?.[origin.BusStopCode]?.[destination.BusStopCode];
                                                            const commuters = i < j
                                                                ? trip
                                                                    ? day
                                                                        ? (trip[weekday ? "wd" : "we"] ?? []).reduce((acc, val) => acc + val, 0)
                                                                        : (trip[weekday ? "wd" : "we"] ?? [])[hour] ?? 0
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
    loaderData: { master, routes, services, hyperlapses, maps, timecodes }
}: Route.ComponentProps) {
    const [direction, setDirection] = useState(1);
    const route = routes.filter(stop => stop.Direction === direction);
    const service = services.filter(s => s.Direction === direction).at(0)!;
    const hyperlapse = hyperlapses.filter(h => h.Direction === direction).at(0);
    const map = { ...maps, features: maps.features.filter(f => String(f.properties?.direction) === String(direction)) };
    const [timecode, setTimecode] = useState<{ id: string, start: number } | null>(null);

    function handlePlay(direction: number, start: number) {
        window.scrollTo({ top: 0, behavior: "smooth" });
        const video = hyperlapses.find(h => h.Direction === direction);
        setTimecode(video ? { id: video.videoId, start } : null);
    }

    return (
        <Container>
            <Typography variant="h4" sx={{ typography: { md: 'h3' } }}>
                {master.operator} {master.category} Service {master.service}
            </Typography>
            {
                services.some(s => s.Direction === 2) &&
                <ToggleButtonGroup value={direction} size="small" exclusive onChange={(_, value) => value && setDirection(value)}>
                    {services.map(s => (
                        <ToggleButton key={s.Direction} value={s.Direction}>Direction {s.Direction}</ToggleButton>
                    ))}
                </ToggleButtonGroup>
            }
            <Stack direction={{ xs: "column", md: "row" }} sx={{ alignItems: "stretch" }}>
                <BusMap map={map} route={route} service={service} />
                {hyperlapse && <BusHyperlapses hyperlapse={hyperlapse} play={timecode} />}
            </Stack>
            <BusInfo service={service} />
            <BusJourney route={route} service={service} timecodes={timecodes} handlePlay={handlePlay} />
            <BusVolume key={`${master.service}-${direction}`} route={route} />
        </Container>
    );
}
