import KeyboardArrowUpIcon from "@mui/icons-material/KeyboardArrowUp";
import KeyboardArrowDownIcon from "@mui/icons-material/KeyboardArrowDown";
import PlayCircleIcon from '@mui/icons-material/PlayCircle';
import SyncIcon from "@mui/icons-material/Sync";

import Box from "@mui/material/Box";
import Card from "@mui/material/Card";
import CardMedia from "@mui/material/CardMedia";
import Chip from "@mui/material/Chip";
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
import { useColorScheme, useTheme } from "@mui/material/styles";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Link as RouterLink } from "react-router";

import type { FeatureCollection, LineString } from 'geojson';
import { AttributionControl, FullscreenControl, GeolocateControl, type GeoJSONSource, LngLatBounds, Map as MapLibreMap, NavigationControl, Popup, ScaleControl, setWorkerUrl } from 'maplibre-gl';
import 'maplibre-gl/dist/maplibre-gl.css';
import workerUrl from 'maplibre-gl/dist/maplibre-gl-worker.mjs?worker&url';

import type { Route } from "./+types/bus_.$svc";
import type { BusArrivalType, BusStopType, BusServiceType, HyperlapseType, TimecodeType, StatusType, volumeMap } from "../types";
import busPackage from "../assets/bus_package.json";
import busType from "../assets/bus_type.json";
import { lineMap, occupancyMap, typeMap } from "../types";

export function meta({ loaderData }: Route.MetaArgs) {
    return [{ title: [loaderData.pack?.operator, loaderData.category, `Bus Service ${loaderData.serviceNo} | One Stop Transport`].filter(Boolean).join(" ") }];
}

export async function loader({ params, request }: Route.LoaderArgs) {
    const busParams = new URLSearchParams({ ServiceNo: params.svc })
    const [routes, services, hyperlapses, maps, timecodes] = await Promise.all(
        ["bus-route", "bus-service", "hyperlapse", "bus-map", "bus-timecodes"].map(api =>
            fetch(new URL(`/api/${api}?${busParams}`, request.url)).then(async response => {
                if (!response.ok) throw new Response(await response.text(), { status: response.status });
                return response.json();
            })
        )
    ) as [BusStopType[], BusServiceType[], HyperlapseType[], FeatureCollection<LineString>, Partial<Record<number, TimecodeType[]>>];

    return {
        serviceNo: params.svc,
        pack: busPackage.find(pack => pack.services.flat().includes(params.svc)),
        category: busType.find(type => type.services.flat().includes(params.svc))?.type,
        routes, services, hyperlapses, maps, timecodes
    };
}

function BusInfo({ service }: { service: BusServiceType }) {
    return (
        <Table>
            <TableHead>
                <TableRow>
                    <TableCell align="center">
                        <Typography>
                            {service.LoopDesc ? "Loop" : `Direction ${service.Direction}`}
                        </Typography>
                        <Typography variant="body2">
                            {service.LoopDesc
                                ? `${service.OriginName} ↺ ${service.LoopDesc}`
                                : `${service.OriginName} → ${service.DestinationName}`}
                        </Typography>
                    </TableCell>
                    <TableCell align="center">
                        <Typography>AM Peak</Typography>
                    </TableCell>
                    <TableCell align="center">
                        <Typography>AM Off Peak</Typography>
                    </TableCell>
                    <TableCell align="center">
                        <Typography>PM Peak</Typography>
                    </TableCell>
                    <TableCell align="center">
                        <Typography>PM Off Peak</Typography>
                    </TableCell>
                </TableRow>
            </TableHead>
            <TableBody>
                <TableRow>
                    <TableCell align="center">
                        <Typography>Frequency (minutes)</Typography>
                    </TableCell>
                    <TableCell align="center">
                        <Typography>{service.AM_Peak_Freq}</Typography>
                    </TableCell>
                    <TableCell align="center">
                        <Typography>{service.AM_Offpeak_Freq}</Typography>
                    </TableCell>
                    <TableCell align="center">
                        <Typography>{service.PM_Peak_Freq}</Typography>
                    </TableCell>
                    <TableCell align="center">
                        <Typography>{service.PM_Offpeak_Freq}</Typography>
                    </TableCell>
                </TableRow>
            </TableBody>
        </Table>
    );
}

setWorkerUrl(workerUrl);

function BusMap({ map: collection, route, service, timecodes, handlePlay, statuses }: {
    map: FeatureCollection<LineString>,
    route: BusStopType[],
    service: BusServiceType,
    timecodes: Partial<Record<number, TimecodeType[]>>,
    handlePlay: (direction: number, start: number) => void,
    statuses: StatusType[]
}) {
    const container = useRef<HTMLDivElement>(null);
    const mapRef = useRef<MapLibreMap | null>(null);
    const { palette } = useTheme();
    const { mode, systemMode } = useColorScheme();
    const colorMode = mode === "system" ? systemMode : mode;

    useEffect(() => {
        if (!colorMode) return;
        const bounds = new LngLatBounds();
        route.forEach(stop => bounds.extend([stop.Longitude, stop.Latitude]));
        collection.features.forEach(f => f.geometry.coordinates.forEach(c => bounds.extend(c as [number, number])));
        const map = new MapLibreMap({
            container: container.current!,
            style: `https://tiles.openfreemap.org/styles/${colorMode === "dark" ? "dark" : "positron"}`,
            bounds,
            fitBoundsOptions: { padding: 50 },
            attributionControl: false
        });
        mapRef.current = map;
        map.addControl(new AttributionControl({ compact: true }));
        map.addControl(new ScaleControl(), "top-right");
        map.addControl(new NavigationControl({ showZoom: false }), "top-right");
        map.addControl(new GeolocateControl({ positionOptions: { enableHighAccuracy: true }, trackUserLocation: true }), "top-right");
        map.addControl(new FullscreenControl({ container: container.current! }), "top-right");

        map.on("load", () => {
            map.addSource("route", { type: "geojson", data: collection });
            map.addLayer({ id: "route", type: "line", source: "route", paint: { "line-color": "#96D600", "line-width": 4 } });
            const features = route.map((stop, index) => ({
                type: "Feature" as const,
                id: index,
                properties: {
                    start: timecodes[stop.Direction]?.find(s => s.code === stop.BusStopCode)?.time?.[route.slice(0, index + 1).filter(s => s.BusStopCode === stop.BusStopCode).length - 1] ?? 0,
                    distance: stop.Distance.toFixed(1),
                    sequence: stop.StopSequence,
                    code: stop.BusStopCode,
                    name: stop.BusStopName,
                    road: stop.RoadName,
                    stations: stop.StnCode
                        .map((codes, i) => `${codes} ${stop.StnName[i]} Exit ${stop.StnExit[i]}`)
                        .join("\n"),
                    services: stop.AltSvcNo
                        .map((number, i) => [number, stop.AltSvcSuffix[i]] as const)
                        .filter(([number, suffix], i, all) => i === 0 || number !== all[i - 1][0] || suffix !== all[i - 1][1])
                        .map(([number, suffix], i, all) => i === 0 ? `${number}${suffix}` : number === all[i - 1][0] ? `/${suffix}` : ` ${number}${suffix}`)
                        .join("")
                },
                geometry: { type: "Point" as const, coordinates: [stop.Longitude, stop.Latitude] }
            }));
            map.addSource("stops", { type: "geojson", data: { type: "FeatureCollection", features } });
            map.addLayer({
                id: "next-stop", type: "circle", source: "stops", filter: ["==", ["id"], -1],
                paint: { "circle-color": palette.primary.light, "circle-radius": 9 }
            });
            map.addLayer({
                id: "stops", type: "circle", source: "stops",
                paint: {
                    "circle-color": ["case", ["boolean", ["feature-state", "hover"], false], "#FFFFFF", "#96D600"],
                    "circle-radius": ["case", ["boolean", ["feature-state", "hover"], false], 9, 5]
                }
            });
            const popup = new Popup({ closeButton: false, closeOnClick: false, offset: 8 });
            let hoveredStop: string | number | undefined;
            map.on("click", "stops", event => {
                const start = event.features?.[0]?.properties?.start;
                if (typeof start === "number") handlePlay(service.Direction, start);
            });
            map.on("mousemove", "stops", event => {
                const stop = event.features?.[0];
                if (!stop?.properties || stop.id === undefined || hoveredStop === stop.id) return;
                if (hoveredStop !== undefined) map.setFeatureState({ source: "stops", id: hoveredStop }, { hover: false });
                hoveredStop = stop.id;
                map.setFeatureState({ source: "stops", id: hoveredStop }, { hover: true });
                const content = document.createElement("div");
                content.style.cssText = "max-width:280px;font-size:12px;line-height:1.4;color:#222;white-space:pre-line";
                content.append(`#${stop.properties.sequence} ${stop.properties.distance} km ${stop.properties.code}`,
                    Object.assign(document.createElement("strong"), { textContent: `\n${stop.properties.name}` }),
                    Object.assign(document.createElement("em"), { textContent: `\n${stop.properties.road}` }),
                    document.createTextNode([stop.properties.stations, stop.properties.services].filter(Boolean).map(line => `\n${line}`).join("")));
                popup.setLngLat(event.lngLat).setDOMContent(content).addTo(map);
                map.getCanvas().style.cursor = "pointer";
            });
            map.on("mouseleave", "stops", () => {
                if (hoveredStop !== undefined) map.setFeatureState({ source: "stops", id: hoveredStop }, { hover: false });
                hoveredStop = undefined;
                popup.remove();
                map.getCanvas().style.cursor = "";
            });
            map.addSource("buses", { type: "geojson", data: { type: "FeatureCollection", features: [] } });
            map.addLayer({
                id: "buses", type: "circle", source: "buses",
                paint: { "circle-color": ["get", "color"], "circle-radius": 7, "circle-stroke-width": 1, "circle-stroke-color": "#FFFFFF" }
            });
            map.addLayer({
                id: "bus-types", type: "symbol", source: "buses",
                layout: { "text-field": ["get", "type"], "text-size": 7 },
                paint: { "text-color": ["match", ["get", "color"], palette.success.main, "#FFFFFF", palette.error.main, "#FFFFFF", "#000000"] }
            });
        });

        let active = true;
        (async () => {
            await map.once("load");
            while (active) {
                const time = new Intl.DateTimeFormat("en-GB", { timeZone: "Asia/Singapore", hour: "2-digit", minute: "2-digit", hourCycle: "h23" }).format(new Date());
                const frequency = "06:30" <= time && time <= "08:30" ? "AM_Peak_Freq" : time <= "17:00" ? "AM_Offpeak_Freq" : time <= "19:00" ? "PM_Peak_Freq" : "PM_Offpeak_Freq";
                const spacing = 0.75 * Math.min((service[frequency].match(/\d+/g)?.map(Number).reduce((sum, value, _, values) => sum + value / values.length, 0)) ?? 14, 14);
                const dist = route.at(-1)!.Distance;
                const stops = route.slice();
                if (["02099", "03239", "11009", "11379", "22609", "44989", "84299"].includes(stops.at(-1)?.BusStopCode ?? "")) stops.pop();
                const sampled = stops.filter((stop, i) =>
                    i === stops.length - 2 || Math.floor((dist - stop.Distance) / spacing) != Math.floor((dist - stops.at(i - 1)!.Distance) / spacing)
                );

                const arrivals = await Promise.allSettled(sampled.map(stop =>
                    fetch(`/api/bus-arrival?BusStopCode=${stop.BusStopCode}&ServiceNo=${stop.ServiceNo}${stop.ServiceSuffix}`)
                        .then(response => response.ok ? response.json() as Promise<BusArrivalType> : undefined)
                ));

                if (!active) return;
                const unique: { coordinates: [number, number], color: string, type: string, sources: Set<number> }[] = [];
                arrivals.forEach((arrival, source) => {
                    const svc = arrival.status === "fulfilled" ? arrival.value?.Services?.[0] : undefined;
                    [svc?.NextBus, svc?.NextBus2, svc?.NextBus3].forEach(bus => {
                        if (!bus) return;
                        const [lng, lat] = [parseFloat(bus.Longitude), parseFloat(bus.Latitude)];
                        const color = bus.Load === "SEA" ? palette.success.main
                            : bus.Load === "SDA" ? palette.warning.main
                                : bus.Load === "LSD" ? palette.error.main
                                    : palette.text.disabled;
                        if (!lng || !lat) return;
                        const match = unique.find(u => !u.sources.has(source) && Math.hypot(u.coordinates[0] - lng, u.coordinates[1] - lat) < 0.001);
                        if (match) match.sources.add(source);
                        else unique.push({ coordinates: [lng, lat], color, type: bus.Type, sources: new Set([source]) });
                    });
                });

                (map.getSource("buses") as GeoJSONSource).setData({
                    type: "FeatureCollection",
                    features: unique.map(({ coordinates, color, type }) => ({
                        type: "Feature" as const,
                        properties: { color, type },
                        geometry: { type: "Point" as const, coordinates }
                    }))
                });
                await new Promise(resolve => setTimeout(resolve, 20_000));
            }
        })();

        return () => {
            active = false;
            mapRef.current = null;
            map.remove();
        };
    }, [collection, route, service, timecodes, handlePlay, palette, colorMode]);

    useEffect(() => {
        const map = mapRef.current;
        if (!map) return;
        const highlight = () => {
            map.setFilter("next-stop", ["in", ["id"], ["literal", [statuses.indexOf("current"), statuses.indexOf("next")]]]);
            map.setPaintProperty("next-stop", "circle-color", ["case", ["==", ["id"], statuses.indexOf("current")], palette.secondary.main, palette.primary.main]);
            const index = statuses.indexOf("next") >= 0 ? statuses.indexOf("next") : statuses.indexOf("current");
            if (route[index]) {
                const bounds = new LngLatBounds([route[index].Longitude, route[index].Latitude], [route[index].Longitude, route[index].Latitude]);
                if (route[index - 1]) bounds.extend([route[index - 1].Longitude, route[index - 1].Latitude]);
                map.fitBounds(bounds, { padding: 50, maxZoom: 15, duration: 1000 });
            }
        };
        if (map.getLayer("next-stop")) highlight();
        else map.once("load", highlight);
        return () => { map.off("load", highlight); };
    }, [collection, route, service, statuses, timecodes, handlePlay, palette, colorMode]);

    return (
        <Paper ref={container} sx={{ flex: { md: 1 }, minWidth: 0, width: "100%", aspectRatio: { xs: "16 / 9", md: "auto" } }} />
    );
}

function BusHyperlapses({ hyperlapse, iframe }: { hyperlapse: HyperlapseType, iframe: React.RefObject<HTMLIFrameElement | null> }) {
    return (
        <Card sx={{ flex: { md: 1 }, minWidth: 0, width: "100%" }}>
            <CardMedia
                component="iframe"
                ref={iframe}
                src={`https://www.youtube.com/embed/${hyperlapse.videoId}?rel=0&playsinline=1&enablejsapi=1&mute=1`}
                allow="autoplay; encrypted-media"
                sx={{ aspectRatio: "16 / 9", border: 0 }}
            />
            <Box sx={{ bgcolor: "action.selected", color: "text.secondary", textAlign: "center", p: 0.5 }}>
                Updated {new Date(hyperlapse.publishedAt).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}
            </Box>
        </Card>
    );
}

function BusJourney({ route, timecodes, handlePlay, statuses }: {
    route: BusStopType[],
    service: BusServiceType,
    timecodes: Partial<Record<number, TimecodeType[]>>,
    handlePlay: (direction: number, start: number) => void,
    statuses: StatusType[]
}) {
    const container = useRef<HTMLDivElement>(null);
    const activeStop = useRef<HTMLTableRowElement>(null);
    const activeIndex = statuses.findIndex(status => status === "current" || status === "next");

    useEffect(() => {
        if (!container.current) return;
        if (!activeStop.current) {
            container.current.scrollTop = 0;
        } else {
            container.current.scrollTop += activeStop.current.getBoundingClientRect().top - container.current.getBoundingClientRect().top;
        }
    }, [activeIndex, route]);

    return (
        <TableContainer component={Paper} ref={container} tabIndex={0} role="region" sx={{ maxHeight: "80vh", scrollBehavior: "smooth", mb: 1, bgcolor: "action.hover" }}>
            <Table>
                <TableHead>
                    <TableRow>
                        <TableCell align="center" sx={{ display: { xs: "none", sm: "table-cell" } }}>#</TableCell>
                        <TableCell align="center">km</TableCell>
                        <TableCell align="center">Code</TableCell>
                        <TableCell colSpan={2}>Name</TableCell>
                        <TableCell>Station</TableCell>
                        <TableCell></TableCell>
                    </TableRow>
                </TableHead>
                <TableBody>
                    {route.map((stop, index) => (
                        <BusSequence
                            key={`${stop.ServiceNo}${stop.ServiceSuffix}-${stop.Direction}-${stop.StopSequence}`}
                            currentStop={stop}
                            previousStop={route[index - 1]}
                            status={statuses[index] ?? "later"}
                            activeRef={index === activeIndex ? activeStop : undefined}
                            play={() => handlePlay(stop.Direction,
                                timecodes[stop.Direction]?.find(s => s.code === stop.BusStopCode)?.time?.[
                                route.slice(0, index + 1).filter(s => s.BusStopCode === stop.BusStopCode).length - 1
                                ] ?? 0)}
                        />
                    ))}
                </TableBody>
            </Table>
        </TableContainer>
    );
}

function BusSequence({ currentStop, previousStop, status, activeRef, play }: { currentStop: BusStopType, previousStop: BusStopType, status: StatusType, activeRef?: React.Ref<HTMLTableRowElement>, play: () => void }) {
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
                    <Typography>{currentStop.RoadName}</Typography>
                </TableCell>
            </TableRow>}
        <TableRow ref={activeRef} sx={{ backgroundColor: { current: "secondary.dark", next: "primary.dark", previous: undefined, later: undefined }[status] }}>
            <TableCell align="center" sx={{ display: { xs: "none", sm: "table-cell" } }}>{currentStop.StopSequence}</TableCell>
            <TableCell align="center">{currentStop.Distance.toFixed(1)}</TableCell>
            <TableCell align="center">{currentStop.BusStopCode}</TableCell>
            <TableCell colSpan={2}>{currentStop.BusStopName}</TableCell>
            <TableCell>
                {currentStop.StnCode?.map((codes, i, a) => (
                    <Box key={i}>
                        {codes.split(" ").map((code, j) =>
                            <Typography component="span" key={j} variant="body2" sx={{ color: lineMap[code.slice(0, 2)] ?? "#999999" }}>
                                {code}{" "}
                            </Typography>
                        )}
                        {i < a.length - 1 && "\n"}
                    </Box>
                ))}
            </TableCell>
            <TableCell align="right" sx={{ whiteSpace: "nowrap" }}>
                <IconButton aria-label="Play Video" size="small" onClick={play}>
                    <PlayCircleIcon />
                </IconButton>
                <IconButton aria-label="Expand Dropdown" aria-expanded={open} size="small" onClick={handleDropdown}>
                    {loading ? <SyncIcon /> : open ? <KeyboardArrowUpIcon /> : <KeyboardArrowDownIcon />}
                </IconButton>
            </TableCell>
        </TableRow >
        <TableRow>
            <TableCell colSpan={7} sx={{ p: 0, borderBottom: 0 }}>
                <Collapse in={open && !loading}>
                    <Container maxWidth={false} sx={{ border: 1, borderColor: "primary.main", p: 0, textAlign: { xs: "center", md: "left" } }}>
                        <Stack direction={{ xs: "column", md: "row" }}>
                            <BusArrival arrival={arrival} />
                            <BusFirstLast stop={currentStop} />
                            <BusAltRoutes stop={currentStop} />
                        </Stack>
                    </Container>
                </Collapse>
            </TableCell>
        </TableRow>
    </>);
}

function BusAltRoutes({ stop }: { stop: BusStopType }) {
    const services = [...new Set(stop.AltSvcNo)].map(number => ({
        number,
        suffixes: [...new Set(stop.AltSvcSuffix.filter((_, index) => stop.AltSvcNo[index] === number))]
    }));
    return (
        <Table sx={{ flex: 2, minWidth: 0, display: "block" }}>
            <TableBody sx={{ display: "flex", flexDirection: { xs: "column-reverse", md: "row-reverse" } }}>
                {stop.StnCode.length > 0 && <TableRow sx={{ display: "block", flex: 1, p: 2.5 }}>
                    <TableCell sx={{ display: "block", border: 0, p: 0, mb: 1 }}>
                        <Typography>Nearby Stations</Typography>
                    </TableCell>
                    <TableCell sx={{ display: "block", border: 0, p: 0 }}>
                        {stop.StnCode?.map((codes, i, a) => (
                            <Box key={i}>
                                {codes.split(" ").map((code, j) =>
                                    <Typography component="span" key={j} variant="body2" sx={{ color: lineMap[code.slice(0, 2)] ?? "#999999" }}>
                                        {code}{" "}
                                    </Typography>
                                )}
                                {`${stop.StnName[i]} Exit ${stop.StnExit[i]}`}
                                {i < a.length - 1 && "\n"}
                            </Box>
                        ))}
                    </TableCell>
                </TableRow>}
                {stop.AltSvcNo.length > 0 && <TableRow sx={{ display: "block", flex: 1, p: 2.5 }}>
                    <TableCell sx={{ display: "block", border: 0, p: 0, mb: 1 }}>
                        <Typography>Other Services</Typography>
                    </TableCell>
                    <TableCell sx={{ display: "block", border: 0, p: 0 }}>
                        <Stack direction="row" sx={{ flexWrap: "wrap", gap: 1 }}>
                            {services.map(({ number, suffixes }) => (
                                <Box key={number} sx={{ whiteSpace: "nowrap" }}>
                                    {suffixes.map((suffix, index) => (
                                        <Link key={suffix} component={RouterLink} to={`/bus/${number}${suffix}`} underline="hover">
                                            {index === 0 ? `${number}${suffix}` : `/${suffix}`}
                                        </Link>
                                    ))}
                                </Box>
                            ))}
                        </Stack>
                    </TableCell>
                </TableRow>}
            </TableBody>
        </Table>
    );
}

function BusFirstLast({ stop }: { stop: BusStopType }) {
    return (
        <Box sx={{ flex: 1, minWidth: 0, p: 2.5 }}>
            <Typography>First / Last Bus</Typography>
            <Table size="small" aria-label="First and last bus timings">
                <TableHead>
                    <TableRow>
                        <TableCell>Day</TableCell>
                        <TableCell align="center">First</TableCell>
                        <TableCell align="center">Last</TableCell>
                    </TableRow>
                </TableHead>
                <TableBody>
                    {[
                        ["Mon–Fri", stop.WD_FirstBus, stop.WD_LastBus],
                        ["Saturday", stop.SAT_FirstBus, stop.SAT_LastBus],
                        ["Sun / PH", stop.SUN_FirstBus, stop.SUN_LastBus]
                    ].map(([day, first, last]) => (
                        <TableRow key={day}>
                            <TableCell component="th" scope="row">{day}</TableCell>
                            <TableCell align="center">{first}</TableCell>
                            <TableCell align="center">{last}</TableCell>
                        </TableRow>
                    ))}
                </TableBody>
            </Table>
        </Box>
    );
}

function BusArrival({ arrival }: { arrival: BusArrivalType | null }) {
    return (
        <Box sx={{ flex: 1, minWidth: 0, p: 2.5 }}>
            {arrival?.Services[0] ? <BusArrivalTimings arrival={arrival} /> : <Typography>Arrivals Unavailable</Typography>}
        </Box>
    );
}

function BusArrivalTimings({ arrival }: { arrival: BusArrivalType }) {
    const [now] = useState(Date.now);
    const timings = [arrival.Services[0].NextBus, arrival.Services[0].NextBus2, arrival.Services[0].NextBus3];
    return (
        <Box>
            <Typography sx={{ mb: 1 }}>Arrivals</Typography>
            <Stack direction="row" sx={{ justifyContent: "space-between", flexWrap: "wrap", gap: 1 }}>
                {timings.map((timing, i) => timing.EstimatedArrival && (
                    <Box key={i}>
                        <Typography>{Math.max(0, Math.ceil((new Date(timing.EstimatedArrival).getTime() - now) / 60000))} <Typography component="span" variant="caption">min</Typography></Typography>
                        <Box title={typeMap[timing.Type]} sx={{ width: 16, height: 16, my: 1, borderRadius: 1, bgcolor: "text.secondary" }} />
                        <Stack direction="row" spacing={0.5} aria-label={occupancyMap[timing.Load]}>
                            {["SEA", "SDA", "LSD"].map((load, index) => (
                                <Box key={load} sx={{
                                    width: 16, height: 12,
                                    bgcolor: index <= ["SEA", "SDA", "LSD"].indexOf(timing.Load)
                                        ? timing.Load === "SEA"
                                            ? "success.light" : timing.Load === "SDA"
                                                ? "warning.light" : timing.Load === "LSD"
                                                    ? "error.light" : "action.disabled"
                                        : "action.disabled"
                                }} />
                            ))}
                        </Stack>
                    </Box>
                ))}
            </Stack>
        </Box>
    );
}

function BusVolume({ route }: { route: BusStopType[] }) {
    const [period, setPeriod] = useState("202609");
    const [day, setDay] = useState(false);
    const [hour, setHour] = useState(new Date().getHours());
    const [weekday, setWeekday] = useState([0, 6].includes(new Date().getDay()) ? false : true);
    const [loading, setLoading] = useState(false);
    const [volume, setVolume] = useState<Record<string, volumeMap> | null>(null);

    useEffect(() => {
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
    }, [period, route, volume, loading]);

    return (
        <Container sx={{ maxHeight: "80vh", display: "flex", flexDirection: "column", overflow: "hidden", mb: 1 }}>
            {loading ? "Loading" : (
                <>
                    <Stack direction="row" spacing={2} sx={{ justifyContent: "center", flexShrink: 0 }}>
                        <FormControl size="small">
                            <InputLabel>Period</InputLabel>
                            <Select value={period} label="Period" onChange={e => setPeriod(e.target.value)}>
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
                        <Stack direction="row" spacing={2} sx={{ p: 2, flexShrink: 0 }}>
                            <Typography id="hour-slider" sx={{ whiteSpace: "nowrap" }}>
                                {`${hour.toString().padStart(2, "0")}:00 – ${hour.toString().padStart(2, "0")}:59`}
                            </Typography>
                            <Slider aria-labelledby="hour-slider" value={hour} max={23}
                                marks valueLabelDisplay="auto" onChange={(_, value) => setHour(value as number)}
                            />
                        </Stack>
                    )}
                    <TableContainer component={Paper} tabIndex={0} role="region" aria-label="Origin-Destination Volumes" sx={{ flex: 1, minHeight: 0, overflow: "auto" }}>
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
                </>
            )}
        </Container>
    )
}

export default function Bus({
    loaderData: { serviceNo, pack, category, routes, services, hyperlapses, maps, timecodes }
}: Route.ComponentProps) {
    const typeName = busType.find(type => type.services.flat().includes(serviceNo))?.name;
    const { palette } = useTheme();
    const [direction, setDirection] = useState(() => {
        const time = new Date().toLocaleTimeString("en-GB", { timeZone: "Asia/Singapore", hour: "2-digit", minute: "2-digit", hourCycle: "h23" });
        return time >= "12:00" && services.some(s => s.Direction === 2) ? 2 : 1;
    });
    const [journey, setJourney] = useState(false);
    const [volume, setVolume] = useState<string | null>(null);
    const route = useMemo(() => routes.filter(stop => stop.Direction === direction), [routes, direction]);
    const service = services.filter(s => s.Direction === direction).at(0)!;
    const hyperlapse = hyperlapses.filter(h => h.Direction === direction).at(0);
    const map = useMemo(() => ({ ...maps, features: maps.features.filter(f => String(f.properties?.direction) === String(direction)) }), [maps, direction]);
    const iframe = useRef<HTMLIFrameElement>(null);
    const [stopStatuses, setStopStatuses] = useState<{ videoId: string, direction: number, statuses: StatusType[] } | null>(null);
    const statuses = stopStatuses?.videoId === hyperlapse?.videoId && stopStatuses?.direction === direction ? stopStatuses.statuses : [];

    useEffect(() => {
        if (!hyperlapse) return;
        const listen = window.setInterval(() => iframe.current?.contentWindow?.postMessage(JSON.stringify({ event: "listening" }), "https://www.youtube.com"), 1000);
        const onMessage = (event: MessageEvent) => {
            if (event.origin !== "https://www.youtube.com" || event.source !== iframe.current?.contentWindow || typeof event.data !== "string" || !event.data.trimStart().startsWith("{")) return;
            const { event: type, info }: { event?: string, info?: { currentTime?: unknown } } = JSON.parse(event.data);
            const time = info?.currentTime;
            if (type !== "infoDelivery" || typeof time !== "number" || !Number.isFinite(time)) return;
            let nextTime = Infinity, nextIndex: number | null = null;
            const statuses: StatusType[] = [];
            route.forEach((stop, index) => {
                const stopTime = timecodes[direction]?.find(s => s.code === stop.BusStopCode)?.time?.[
                    route.slice(0, index + 1).filter(s => s.BusStopCode === stop.BusStopCode).length - 1
                ];
                statuses.push(stopTime !== undefined && stopTime + 3 <= time ? "previous" : "later");
                if (stopTime !== undefined && stopTime + 3 > time && stopTime < nextTime) {
                    [nextTime, nextIndex] = [stopTime, index];
                }
            });
            if (nextIndex !== null) statuses[nextIndex] = time >= nextTime ? "current" : "next";
            setStopStatuses(previous => previous?.videoId === hyperlapse.videoId && previous.direction === direction &&
                previous.statuses.length === statuses.length && previous.statuses.every((status, index) => status === statuses[index])
                ? previous : { videoId: hyperlapse.videoId, direction, statuses });
        };
        window.addEventListener("message", onMessage);
        return () => {
            window.clearInterval(listen);
            window.removeEventListener("message", onMessage);
        };
    }, [direction, hyperlapse, route, timecodes]);

    const handlePlay = useCallback((_direction: number, start: number) => {
        const target = iframe.current?.contentWindow;
        if (!target) return;
        const send = (func: string, args: unknown[] = []) =>
            target.postMessage(JSON.stringify({ event: "command", func, args }), "https://www.youtube.com");
        send("seekTo", [start, true]);
    }, []);

    return (
        <Box sx={{ pt: 2, textAlign: { xs: "center", md: "left" } }}>
            <Typography component="h1" variant="h3" sx={{ fontWeight: 700 }}>
                Bus Service {serviceNo}
            </Typography>
            <Stack direction={{ xs: "column", md: "row" }} sx={{ alignItems: "center", flexWrap: "wrap", justifyContent: "space-between", gap: 1, mb: 1 }}>
                <Stack direction="row" sx={{ flexWrap: "wrap", gap: 1 }}>
                    {[
                        { label: category, to: `/bus?view=type#${encodeURIComponent(`type-${typeName}`)}` },
                        { label: pack?.name, to: `/bus?view=package#${encodeURIComponent(`package-${pack?.name}`)}` },
                        { label: pack?.operator, to: `/bus?${new URLSearchParams({ view: "package", operator: pack?.operator ?? "" })}` }
                    ].filter(({ label }) => Boolean(label)).map(({ label, to }) => (
                        <Chip key={label} label={label} component={RouterLink} to={to} clickable sx={{ borderRadius: 1, fontSize: "1rem" }} />
                    ))}
                </Stack>
                {
                    services.some(s => s.Direction === 2) &&
                    <Stack direction="row" spacing={1} sx={{ alignItems: "center" }}>
                        <Typography>Direction</Typography>
                        <ToggleButtonGroup aria-label="Direction" sx={{ border: 1, borderColor: "divider", borderRadius: 6, p: 0.5 }} value={direction} size="small" exclusive onChange={(_, value) => {
                            if (value) {
                                setDirection(value);
                                setJourney(false);
                            }
                        }}>
                            {services.map(s => (
                                <ToggleButton key={s.Direction} value={s.Direction} aria-label={`Direction ${s.Direction} to ${s.DestinationName}`} style={{
                                    border: 0, borderRadius: "50%", width: 30, height: 30, padding: 0,
                                    backgroundColor: s.Direction === direction ? palette.primary.main : undefined
                                }}>{s.Direction}</ToggleButton>
                            ))}
                        </ToggleButtonGroup>
                    </Stack>
                }
            </Stack>
            <Stack direction={{ xs: "column", md: "row" }} sx={{ gap: 1, mb: 1 }}>
                <BusMap map={map} route={route} service={service} timecodes={timecodes} handlePlay={handlePlay} statuses={statuses} />
                {hyperlapse && <BusHyperlapses hyperlapse={hyperlapse} iframe={iframe} />}
            </Stack>
            <Stack direction={{ xs: "column", md: "row" }} sx={{ alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: 1, mb: 1 }}>
                <Typography component="h2" variant="h4" sx={{ display: { xs: "none", md: "block" }, fontWeight: 700 }}>{journey ? "Origin-Destination Volumes" : "Route Information"}</Typography>
                <ToggleButtonGroup value={journey} size="small" exclusive onChange={(_, value) => {
                    if (typeof value === "boolean") {
                        setJourney(value);
                        if (value) setVolume(`${serviceNo}-${direction}`);
                    }
                }}>
                    <ToggleButton value={false}>Route Info</ToggleButton>
                    <ToggleButton value={true}>O-D Volumes</ToggleButton>
                </ToggleButtonGroup>
            </Stack>
            <Box sx={{ pb: 2 }}>
                {!journey && <BusJourney route={route} service={service} timecodes={timecodes} handlePlay={handlePlay} statuses={statuses} />}
                {!journey && <BusInfo service={service} />}
                <Box hidden={!journey}>
                    {volume === `${serviceNo}-${direction}` && <BusVolume key={volume} route={route} />}
                </Box>
            </Box>
        </Box>

    );
}
