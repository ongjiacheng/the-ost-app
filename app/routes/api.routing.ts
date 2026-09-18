import "dotenv/config";
import type { Route } from "./+types/api.routing";

const oneMapUrl = "https://www.onemap.gov.sg/api/public/routingsvc/route";
const validRouteTypes = new Set(["pt", "walk", "drive", "cycle"]);
const validModes = new Set(["transit", "bus", "rail"]);
const defaultModes = ["transit", "bus", "rail"];
const defaultMaxWalkDistances = ["400", "800", "1200"];
const maxRoutingCombinations = 9;
const maxMergedItineraries = 10;

type RoutingLeg = {
    mode?: string;
    routeId?: string;
    tripId?: string;
    from?: { name?: string; stopCode?: string };
    to?: { name?: string; stopCode?: string };
};

type RoutingItinerary = {
    duration?: number;
    endTime?: number;
    transfers?: number;
    walkTime?: number;
    walkDistance?: number;
    legs?: RoutingLeg[];
    [key: string]: unknown;
};

type RoutingResponse = {
    plan?: {
        from?: unknown;
        to?: unknown;
        itineraries?: RoutingItinerary[];
        [key: string]: unknown;
    };
    [key: string]: unknown;
};

type RoutingCandidate = {
    itinerary: RoutingItinerary;
    mode: string;
    maxWalkDistance: string | null;
};

type RoutingWarning = {
    mode: string;
    maxWalkDistance: string | null;
    status?: number;
    message: string;
};

function jsonError(message: string, status: number) {
    return Response.json({ error: message }, { status });
}

function parseList(searchParams: URLSearchParams, pluralName: string, singularName: string) {
    const values = searchParams.getAll(pluralName)
        .flatMap(value => value.split(","))
        .map(value => value.trim())
        .filter(Boolean);
    if (values.length > 0) return [...new Set(values)];

    const singularValue = searchParams.get(singularName);
    return singularValue ? [singularValue] : [];
}

function getJourneySignature(itinerary: RoutingItinerary) {
    return (itinerary.legs ?? []).map(leg => [
        leg.mode ?? "",
        leg.routeId ?? "",
        leg.tripId ?? "",
        leg.from?.stopCode ?? leg.from?.name ?? "",
        leg.to?.stopCode ?? leg.to?.name ?? ""
    ].join("|")).join(";");
}

function compareCandidates(first: RoutingCandidate, second: RoutingCandidate) {
    const firstItinerary = first.itinerary;
    const secondItinerary = second.itinerary;
    return (firstItinerary.endTime ?? Number.MAX_SAFE_INTEGER) - (secondItinerary.endTime ?? Number.MAX_SAFE_INTEGER)
        || (firstItinerary.duration ?? Number.MAX_SAFE_INTEGER) - (secondItinerary.duration ?? Number.MAX_SAFE_INTEGER)
        || (firstItinerary.transfers ?? Number.MAX_SAFE_INTEGER) - (secondItinerary.transfers ?? Number.MAX_SAFE_INTEGER)
        || (firstItinerary.walkTime ?? Number.MAX_SAFE_INTEGER) - (secondItinerary.walkTime ?? Number.MAX_SAFE_INTEGER)
        || (firstItinerary.walkDistance ?? Number.MAX_SAFE_INTEGER) - (secondItinerary.walkDistance ?? Number.MAX_SAFE_INTEGER);
}

async function fetchOneMapRoute(
    token: string,
    params: URLSearchParams
): Promise<{ response: Response; body: string }> {
    const response = await fetch(`${oneMapUrl}?${params}`, {
        headers: {
            Authorization: token,
            accept: "application/json"
        }
    });
    return { response, body: await response.text() };
}

function buildParams(
    start: string,
    end: string,
    routeType: string,
    options: { date?: string; time?: string; mode?: string; maxWalkDistance?: string | null; numItineraries?: string | null }
) {
    const params = new URLSearchParams({ start, end, routeType });
    if (routeType === "pt") {
        params.set("date", options.date!);
        params.set("time", options.time!);
        params.set("mode", options.mode!);
        if (options.maxWalkDistance) params.set("maxWalkDistance", options.maxWalkDistance);
        if (options.numItineraries) params.set("numItineraries", options.numItineraries);
    }
    return params;
}

function forwardResponse(response: Response, body: string) {
    return new Response(body, {
        status: response.status,
        headers: { "Content-Type": response.headers.get("Content-Type") ?? "application/json" }
    });
}

export async function loader({ request }: Route.LoaderArgs) {
    const token = process.env.ONEMAP_API_TOKEN;
    if (!token) return jsonError("ONEMAP_API_TOKEN is not configured", 500);

    const searchParams = new URL(request.url).searchParams;
    const start = searchParams.get("start");
    const end = searchParams.get("end");
    const routeType = searchParams.get("routeType") ?? "pt";
    const isPublicTransport = routeType === "pt";
    const date = searchParams.get("date");
    const time = searchParams.get("time");
    const modes = parseList(searchParams, "modes", "mode");
    const maxWalkDistances = parseList(searchParams, "maxWalkDistances", "maxWalkDistance");
    const selectedModes = modes.length > 0 ? modes : defaultModes;
    const selectedMaxWalkDistances = maxWalkDistances.length > 0 ? maxWalkDistances : defaultMaxWalkDistances;
    const numItineraries = searchParams.get("numItineraries") ?? "3";

    if (!start || !end) {
        return jsonError("start and end are required", 400);
    }

    if (!validRouteTypes.has(routeType)) {
        return jsonError("routeType must be pt, walk, drive, or cycle", 400);
    }

    if (isPublicTransport && (!date || !time)) {
        return jsonError("start, end, date, and time are required for public transport", 400);
    }

    if (isPublicTransport && selectedModes.some(mode => !validModes.has(mode))) {
        return jsonError("mode must be transit, bus, or rail", 400);
    }

    if (numItineraries !== null && !/^[1-3]$/.test(numItineraries)) {
        return jsonError("numItineraries must be an integer between 1 and 3", 400);
    }

    if (selectedMaxWalkDistances.some(distance => !/^\d+(\.\d+)?$/.test(distance))) {
        return jsonError("maxWalkDistance values must be non-negative numbers", 400);
    }

    if (!isPublicTransport) {
        const result = await fetchOneMapRoute(token, buildParams(start, end, routeType, {}));
        return forwardResponse(result.response, result.body);
    }

    const combinations = selectedModes.flatMap(mode =>
        selectedMaxWalkDistances
            .map(maxWalkDistance => ({ mode, maxWalkDistance }))
    );
    if (combinations.length > maxRoutingCombinations) {
        return jsonError(`at most ${maxRoutingCombinations} routing combinations are allowed`, 400);
    }

    const requests = combinations.map(({ mode, maxWalkDistance }) => {
        const params = buildParams(start, end, routeType, {
            date: date!,
            time: time!,
            mode,
            maxWalkDistance,
            numItineraries
        });
        return fetchOneMapRoute(token, params).then(result => ({ ...result, mode, maxWalkDistance }));
    });
    const results = await Promise.allSettled(requests);

    const warnings: RoutingWarning[] = [];
    const candidates: RoutingCandidate[] = [];
    let firstSuccessfulResponse: RoutingResponse | undefined;
    let successfulCombinations = 0;
    results.forEach((result, index) => {
        const combination = combinations[index];
        if (result.status === "rejected") {
            warnings.push({ ...combination, message: "OneMap request failed" });
            return;
        }

        if (!result.value.response.ok) {
            warnings.push({
                ...combination,
                status: result.value.response.status,
                message: "OneMap returned an error"
            });
            return;
        }

        let body: RoutingResponse;
        try {
            body = JSON.parse(result.value.body) as RoutingResponse;
        } catch {
            warnings.push({ ...combination, message: "OneMap returned invalid JSON" });
            return;
        }

        firstSuccessfulResponse ??= body;
        successfulCombinations++;
        (body.plan?.itineraries ?? []).forEach(itinerary => {
            candidates.push({ itinerary, ...combination });
        });
    });

    if (!firstSuccessfulResponse) {
        const warning = warnings[0];
        return jsonError(warning?.message ?? "No routing results were returned", warning?.status ?? 502);
    }

    const uniqueCandidates = new Map<string, RoutingCandidate>();
    candidates.forEach(candidate => {
        const signature = getJourneySignature(candidate.itinerary);
        const existing = uniqueCandidates.get(signature);
        if (!existing || compareCandidates(candidate, existing) < 0) uniqueCandidates.set(signature, candidate);
    });
    const itineraries = [...uniqueCandidates.values()]
        .sort(compareCandidates)
        .slice(0, maxMergedItineraries)
        .map(candidate => ({
            ...candidate.itinerary,
            routingOptions: {
                mode: candidate.mode,
                maxWalkDistance: candidate.maxWalkDistance
            }
        }));

    return Response.json({
        ...firstSuccessfulResponse,
        plan: {
            ...firstSuccessfulResponse.plan,
            itineraries
        },
        routing: {
            requestedCombinations: combinations.length,
            successfulCombinations,
            failedCombinations: warnings.length,
            candidateCount: candidates.length,
            deduplicatedCount: uniqueCandidates.size,
            warnings
        }
    });
}