import Container from "@mui/material/Container";
import Typography from "@mui/material/Typography";

import stations from "../assets/train_stations.json";

import { lineMap } from "../types";
import type { TrainStationType } from "../types";
import type { Route } from "./+types/train_.$station";

export async function loader({ params }: Route.LoaderArgs) {
    const match = stations
        .flatMap(line => line.stations)
        .filter(station => station.url === params.station) as TrainStationType[];
    const master = {
        ...match[0],
        codes: match.map(station => station.code)
    };

    return { master };
}

export default function Train({
    loaderData: { master }
}: Route.ComponentProps) {
    return (
        <Container>
            <Typography variant="h3">
                {master.codes.map(code =>
                    <Typography key={code} variant="h3" sx={{ color: lineMap[code.slice(0, 2)], display: 'inline' }}>
                        {`${code} `}
                    </Typography>
                )}{master.english}
            </Typography>
            Useful information to come!
        </Container>
    );
}