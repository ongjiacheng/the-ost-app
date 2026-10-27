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
import Table from "@mui/material/Table";
import TableBody from "@mui/material/TableBody";
import TableCell from "@mui/material/TableCell";
import TableHead from "@mui/material/TableHead";
import TableRow from "@mui/material/TableRow";
import TextField from "@mui/material/TextField";
import Typography from "@mui/material/Typography";
import Dialog from "@mui/material/Dialog";
import DialogActions from "@mui/material/DialogActions";
import DialogContent from "@mui/material/DialogContent";
import DialogTitle from "@mui/material/DialogTitle";

import { useFetcher, useLoaderData } from "react-router";
import { useState } from "react";

const channels = [
    { value: "3449", label: "3449 Hyperlapses" },
    { value: "AT", label: "Alvetor Transport" },
    { value: "TMT", label: "TheMainTrain" },
    { value: "TE", label: "Transit Evolution" }
] as const;

export async function loader() {
    const get = async (path: string) => {
        const response = await fetch(`https://storage.googleapis.com/the-ost-app/${path}`);
        return response.ok ? await response.json() as string : null;
    };
    const [bus, map, youtube] = await Promise.all([
        get("bus/updated.json"),
        get("map/updated.json"),
        get("hyperlapse/updated.json"),
    ]);
    return { bus, map, youtube };
}

export default function Infobar() {
    const { bus: busUpdated, map: mapUpdated, youtube: youtubeUpdated } = useLoaderData<typeof loader>();
    const fetcher = useFetcher<string>();
    const [service, setService] = useState("");
    const [direction, setDirection] = useState("1");
    const [channel, setChannel] = useState("TE");

    const updater = useFetcher<string>();
    const [secret, setSecret] = useState("");
    const [timecodeDialogOpen, setTimecodeDialogOpen] = useState(false);
    const [timecodeFile, setTimecodeFile] = useState<File | null>(null);

    function requestInfobar() {
        const params = new URLSearchParams({
            ServiceNo: service,
            Direction: direction,
            Channel: channel,
        });
        fetcher.load(`/api/infobar?${params.toString()}`);
    }

    function copyTxt() {
        if (fetcher.data) navigator.clipboard.writeText(fetcher.data);
    }

    return (
        <Box sx={{ maxWidth: "80%", mx: "auto", py: 2 }}>
            <Typography variant="h2">DataCaller 6.2.1</Typography>
            <Typography sx={{ mb: 2 }}>27 Oct 2026: Add functionality to update data online.</Typography>
            <Table size="small" sx={{ mb: 2, width: "fit-content", mx: "auto" }}>
                <TableHead>
                    <TableRow>
                        <TableCell align="center">Data source</TableCell>
                        <TableCell align="center">Datamall</TableCell>
                        <TableCell align="center">OpenStreetMap</TableCell>
                        <TableCell align="center">YouTube</TableCell>
                    </TableRow>
                </TableHead>
                <TableBody>
                    <TableRow>
                        <TableCell align="center" component="th" scope="row">Last updated</TableCell>
                        <TableCell align="center">{busUpdated ? new Date(busUpdated).toLocaleString() : "Unknown"}</TableCell>
                        <TableCell align="center">{mapUpdated ? new Date(mapUpdated).toLocaleString() : "Unknown"}</TableCell>
                        <TableCell align="center">{youtubeUpdated ? new Date(youtubeUpdated).toLocaleString() : "Unknown"}</TableCell>
                    </TableRow>
                </TableBody>
            </Table>
            <Stack direction={{ xs: "column", sm: "row" }} spacing={2} sx={{ alignItems: "stretch", mt: 4 }}>
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

            <Stack spacing={2} sx={{ mt: 4 }}>
                <TextField label="Password" type="password" size="small" value={secret} onChange={event => setSecret(event.target.value)} fullWidth />
                <Stack direction="row" spacing={2} sx={{ justifyContent: "center" }}>
                    <Button variant="contained" onClick={() => updater.submit({ secret, update: "bus" }, { method: "post", action: "/api/bus-update" })} disabled={updater.state !== "idle"} sx={{ whiteSpace: "nowrap", flexShrink: 0 }}>
                        {updater.formData?.get("update") === "bus" && updater.state !== "idle" ? "Loading..." : "Refresh Datamall"}
                    </Button>
                    <Button variant="contained" onClick={() => updater.submit({ secret, update: "map" }, { method: "post", action: "/api/bus-update" })} disabled={updater.state !== "idle"} sx={{ whiteSpace: "nowrap", flexShrink: 0 }}>
                        {updater.formData?.get("update") === "map" && updater.state !== "idle" ? "Loading..." : "Refresh OpenStreetMap"}
                    </Button>
                    <Button variant="contained" onClick={() => updater.submit({ secret, update: "hyperlapse" }, { method: "post", action: "/api/bus-update" })} disabled={updater.state !== "idle"} sx={{ whiteSpace: "nowrap", flexShrink: 0 }}>
                        {updater.formData?.get("update") === "hyperlapse" && updater.state !== "idle" ? "Loading..." : "Refresh YouTube"}
                    </Button>
                    <Button variant="contained" onClick={() => setTimecodeDialogOpen(true)} disabled={updater.state !== "idle"} sx={{ whiteSpace: "nowrap", flexShrink: 0 }}>
                        Upload timecodes
                    </Button>
                </Stack>
            </Stack>
            <Typography sx={{ pt: 2 }}>{updater.data}</Typography>

            <Dialog open={timecodeDialogOpen} onClose={() => setTimecodeDialogOpen(false)}>
                <DialogTitle>Upload stop timecodes</DialogTitle>
                <DialogContent>
                    <Typography sx={{ mb: 2 }}>Choose a JSON file with timecodes of the format (svcNo)_(dir).json.</Typography>
                    <Button component="label" variant="outlined">
                        {timecodeFile?.name ?? "Choose JSON file"}
                        <input type="file" accept=".json,application/json" hidden onChange={event => setTimecodeFile(event.target.files?.[0] ?? null)} />
                    </Button>
                </DialogContent>
                <DialogActions>
                    <Button onClick={() => setTimecodeDialogOpen(false)}>Cancel</Button>
                    <Button
                        variant="contained"
                        disabled={!timecodeFile || !/^\d+[A-Za-z]?_[12]\.json$/.test(timecodeFile.name) || updater.state !== "idle"}
                        onClick={() => {
                            if (!timecodeFile) return;
                            const formData = new FormData();
                            Object.entries({ secret, update: "upload-timecodes", file: timecodeFile }).forEach(([key, value]) => formData.set(key, value));
                            updater.submit(formData, { method: "post", action: "/api/bus-update", encType: "multipart/form-data" });
                            setTimecodeDialogOpen(false);
                        }}
                    >
                        {updater.state === "idle" ? "Upload" : "Uploading..."}
                    </Button>
                </DialogActions>
            </Dialog>
        </Box>
    );
}
