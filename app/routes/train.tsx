import Card from "@mui/material/Card";
import CardMedia from "@mui/material/CardMedia";
import Container from "@mui/material/Container";
import Grid from "@mui/material/Grid";
import Typography from "@mui/material/Typography";

import { Firestore } from "@google-cloud/firestore";
import type { Route } from "./+types/train";

import { useState } from "react";

import type { VideoType } from "../types";

const db = new Firestore({
    projectId: "the-ost-app",
    databaseId: "the-ost-app"
});

export async function loader() {
    const walkingToursQuery = await db.collection("walking_tours").orderBy("position").get();
    const walkingTours: VideoType[] = walkingToursQuery.docs.map(doc => ({
        id: doc.id,
        ...doc.data() as VideoType
    }));

    return { walkingTours };
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
                    image={video.thumbnails}
                    alt={video.title}
                    sx={{ aspectRatio: "16 / 9", border: 0, width: "100%" }}
                    onClick={() => setPlaying(true)}
                />
            )}
        </Card >
    )
}

export default function Trains({
    loaderData: { walkingTours }
}: Route.ComponentProps) {
    const videos = [walkingTours];
    const titles = ["Station Transfers"];

    return (
        <Container>
            <Typography variant="h2">Train Services</Typography>
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