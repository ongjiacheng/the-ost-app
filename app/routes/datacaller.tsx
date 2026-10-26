import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import ContentCopyIcon from "@mui/icons-material/ContentCopy";
import DownloadIcon from "@mui/icons-material/Download";
import FormControl from "@mui/material/FormControl";
import InputLabel from "@mui/material/InputLabel";
import MenuItem from "@mui/material/MenuItem";
import Paper from "@mui/material/Paper";
import Select from "@mui/material/Select";
import Stack from "@mui/material/Stack";
import TextField from "@mui/material/TextField";
import Typography from "@mui/material/Typography";

import { useFetcher, useLoaderData } from "react-router";
import { useState } from "react";

const channels = [
    { value: "3449", label: "3449 Hyperlapses" },
    { value: "AT", label: "Alvetor Transport" },
    { value: "TMT", label: "TheMainTrain" },
    { value: "TE", label: "Transit Evolution" }
] as const;

export async function loader() {
    const response = await fetch(`https://storage.googleapis.com/the-ost-app/bus/updated.json`);
    return response.ok ? await response.json() as string : null;
}

export default function Infobar() {
    const updated = useLoaderData<typeof loader>();
    const fetcher = useFetcher<string>();
    const [service, setService] = useState("");
    const [direction, setDirection] = useState("1");
    const [channel, setChannel] = useState("TE");
    
    const refresher = useFetcher<string>();
    const [secret, setSecret] = useState("");

    function requestInfobar() {
        const params = new URLSearchParams({
            ServiceNo: service,
            Direction: direction,
            Channel: channel,
        });
        fetcher.load(`/api/infobar?${params.toString()}`);
    }

    function refreshBus() {
        refresher.submit({ secret }, { method: "post", action: "/api/bus-update" });
    }

    function copyTxt() {
        if (fetcher.data) navigator.clipboard.writeText(fetcher.data);
    }

    return (
        <Box sx={{ maxWidth: "80%", mx: "auto", py: 2 }}>
            <Typography variant="h2">DataCaller 6.2</Typography>
            <Typography sx={{ mb: 2 }}>24 Oct 2026: Add functionality to update Datamall data online.</Typography>
            <Typography sx={{ mb: 2 }}>Last updated: {updated ? new Date(updated).toLocaleString() : "Unknown"}</Typography>
            <Stack direction={{ xs: "column", sm: "row" }} spacing={2} sx={{ alignItems: "stretch" }}>
                <TextField label="Service" size="small" value={service} onChange={event => setService(event.target.value)} required fullWidth />
                <FormControl fullWidth size="small">
                    <InputLabel id="direction">Direction</InputLabel>
                    <Select labelId="direction" label="Direction" value={direction} onChange={event => setDirection(event.target.value)}>
                        <MenuItem value="1">Direction 1</MenuItem>
                        <MenuItem value="2">Direction 2</MenuItem>
                    </Select>
                </FormControl>
                <FormControl fullWidth size="small">
                    <InputLabel id="channel">Channel</InputLabel>
                    <Select labelId="channel" label="Channel" value={channel} onChange={event => setChannel(event.target.value as typeof channel)}>
                        {channels.map(option => <MenuItem key={option.value} value={option.value}>{option.label}</MenuItem>)}
                    </Select>
                </FormControl>
            </Stack>

            <Button variant="contained" onClick={requestInfobar} disabled={fetcher.state !== "idle"} sx={{ mt: 2 }}>
                {fetcher.state === "idle" ? "Generate infobar" : "Loading..."}
            </Button>
            {(fetcher.state === "idle" && fetcher.data === "") &&
                <Typography sx={{ pt: 2 }}>Enter a valid service!</Typography>
            }
            {fetcher.data && (
                <Paper variant="outlined" sx={{ mt: 3, p: 2 }}>
                    <Button startIcon={<ContentCopyIcon />} onClick={copyTxt} sx={{ m: 1 }}>
                        Copy
                    </Button>
                    <Button startIcon={<DownloadIcon />} component="a"
                        href={`data:text/plain;charset=utf-8,${encodeURIComponent(fetcher.data)}`} download={`${service}.txt`} sx={{ m: 1 }}>
                        Download
                    </Button>
                    <Box sx={{ fontFamily: "monospace", textAlign: "left", whiteSpace: "pre-wrap" }}>
                        {fetcher.data}
                    </Box>
                </Paper>
            )}

            <Stack direction="row" spacing={2} sx={{ mt: 5, alignItems: "center" }}>
                <TextField label="Password" type="password" size="small" value={secret} onChange={event => setSecret(event.target.value)} fullWidth />
                <Button variant="contained" onClick={refreshBus} disabled={refresher.state !== "idle"} sx={{ whiteSpace: "nowrap", flexShrink: 0 }}>
                    {refresher.state === "idle" ? "Refresh bus data" : "Loading..."}
                </Button>
            </Stack>
            <Typography sx={{ pt: 2 }}>{refresher.data}</Typography>
        </Box>
    );
}
