import Card from "@mui/material/Card";
import CardMedia from "@mui/material/CardMedia";
import Container from "@mui/material/Container";
import Grid from "@mui/material/Grid";
import Typography from "@mui/material/Typography";

import type { Route } from "./+types/cycle";
import { useState } from "react";
import type { VideoType } from "../types";

export async function loader() {
    const bikethrough = await fetch("https://storage.googleapis.com/the-ost-app/bikethrough.json")
        .then(response => response.json()) as VideoType[];
    const cyclingTours = await fetch("https://storage.googleapis.com/the-ost-app/cycling_tours.json")
        .then(response => response.json()) as VideoType[];
    return { bikethrough, cyclingTours };
}

function Video({ video }: { video: VideoType }) {
    const [playing, setPlaying] = useState(false);

    return (
        <Card>
            {playing ? (
                <CardMedia
                    component="iframe"
                    src={`https://www.youtube.com/embed/${video.videoId}`}
                    sx={{ width: "100%", aspectRatio: "16 / 9", border: 0 }}
                />

            ) : (
                <CardMedia
                    component="img"
                    image={`https://i.ytimg.com/vi/${video.videoId}/sddefault.jpg`}
                    alt={video.title}
                    sx={{ aspectRatio: "16 / 9", border: 0, width: "100%" }}
                    onClick={() => setPlaying(true)}
                />
            )}
        </Card >
    )
}

export default function Cycle({
    loaderData: { bikethrough, cyclingTours }
}: Route.ComponentProps) {
    const videos = [bikethrough, cyclingTours];
    const titles = ["Park Connectors", "Cycling Towns"];

    return (
        <Container>
            <Typography variant="h2">Cycle</Typography>
            {videos.map((series, i) => (
                <Container>
                    <Typography variant="h4">{titles[i]}</Typography>
                    <Grid container spacing={2} sx={{ py: 2 }}>
                        {series.map(video => (
                            <Grid size={{ xs: 12, sm: 6, md: 4 }} key={video.position}>
                                <Video video={video} />
                            </Grid>
                        ))}
                    </Grid>
                </Container>
            ))}
        </Container>
    )
}