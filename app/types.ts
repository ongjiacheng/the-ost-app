export type BusArrivalType = {
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
    }[]
};

export type BusMasterType = {
    operator: string,
    category: string,
    service: string,
    direction: number
};

export type AltRouteType = {
    ServiceNo: number,
    ServiceSuffix: string
};

export type BusRouteType = {
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
};

export type BusServiceType = {
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
};

export type BusVolumeType = {
    p: string,
    o: string,
    d: string,
    wd: number[],
    we: number[]
}

export type HyperlapseType = {
    Direction: number,
    position: number,
    ServiceNo: number,
    ServiceSuffix: string,
    thumbnails: string,
    title: string,
    videoId: string
};

export type TimestampsType = {
    Direction: number,
    ServiceNo: number,
    ServiceSuffix: string,
    Timestamps: {
        code: string,
        time: number[]
    }[]
};

export type VideoType = {
    position: number,
    thumbnails: string,
    title: string,
    videoId: string
}

import roadNames from "./assets/road_names.json";
import stations from "./assets/stations.json";

export const categoryMap: Record<string, string> = {
    "CITY_LINK": "City Direct",
    "EXPRESS": "Express",
    "FEEDER": "Feeder",
    "INDUSTRIAL": "Industrial",
    "TRUNK": "Trunk"
};

export const occupancyMap: Record<string, string> = {
    "SEA": "Low",
    "SDA": "Medium",
    "LSD": "High"
};

export const operatorMap: Record<string, string> = {
    "SBST": "SBS Transit",
    "SMRT": "SMRT Buses",
    "TTS": "Tower Transit",
    "GAS": "Go-Ahead"
};

export const typeMap: Record<string, string> = {
    "SD": "Single",
    "DD": "Double",
    "BD": "Bendy"
};

export const roadNamesMap: Record<string, string> = roadNames;
export const stationsMap: Record<string, string[][]> = stations;
export type volumeMap = Record<string, Record<string, { wd: number[]; we: number[] }>>;

export const lineMap: Record<string, string> = {
    "EW": "#71CE8D",
    "CG": "#71CE8D",
    "NS": "#FC8061",
    "NE": "#C461C8",
    "CC": "#FCD452",
    "DT": "#5BB1Fa",
    "TE": "#B57C4A"
};