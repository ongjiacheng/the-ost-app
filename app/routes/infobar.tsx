import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import FormControl from "@mui/material/FormControl";
import InputLabel from "@mui/material/InputLabel";
import MenuItem from "@mui/material/MenuItem";
import Paper from "@mui/material/Paper";
import Select from "@mui/material/Select";
import Stack from "@mui/material/Stack";
import TextField from "@mui/material/TextField";
import Typography from "@mui/material/Typography";

import { useFetcher } from "react-router";
import { useState } from "react";

const channels = [
    { value: "3449", label: "3449 Hyperlapses" },
    { value: "AT", label: "Alvetor Transport" },
    { value: "TE", label: "Transit Evolution" },
    { value: "TMT", label: "TheMainTrain" },
] as const;

export default function Infobar() {
    const fetcher = useFetcher<string>();
    const [service, setService] = useState("");
    const [direction, setDirection] = useState("1");
    const [channel, setChannel] = useState("TE");
    const [error, setError] = useState(false);

    function requestInfobar() {
        const match = service.trim().match(/^(\d+)([a-zA-Z]*)$/);
        if (!match) return setError(true);

        const [, serviceNo, serviceSuffix] = match;
        setError(false);
        const params = new URLSearchParams({
            ServiceNo: serviceNo,
            ServiceSuffix: serviceSuffix,
            Direction: direction,
            Channel: channel,
        });
        fetcher.load(`/api/infobar?${params.toString()}`);
    }

    return (
        <Box sx={{ maxWidth: { xs: "100%", md: "80%" }, mx: "auto", py: 2 }}>
            <Typography variant="h2" sx={{ mb: 2 }}>Infobar Generator</Typography>

            <Stack direction={{ xs: "column", sm: "row" }} spacing={2} sx={{ alignItems: "stretch" }}>
                <TextField label="Service" value={service} onChange={event => setService(event.target.value)} required fullWidth />
                <FormControl fullWidth>
                    <InputLabel id="direction">Direction</InputLabel>
                    <Select labelId="direction" label="Direction" value={direction} onChange={event => setDirection(event.target.value)}>
                        <MenuItem value="1">Direction 1</MenuItem>
                        <MenuItem value="2">Direction 2</MenuItem>
                    </Select>
                </FormControl>
                <FormControl fullWidth>
                    <InputLabel id="channel">Channel</InputLabel>
                    <Select labelId="channel" label="Channel" value={channel} onChange={event => setChannel(event.target.value as typeof channel)}>
                        {channels.map(option => <MenuItem key={option.value} value={option.value}>{option.label}</MenuItem>)}
                    </Select>
                </FormControl>
            </Stack>

            <Button variant="contained" onClick={requestInfobar} disabled={fetcher.state !== "idle"} sx={{ mt: 2 }}>
                {fetcher.state === "idle" ? "Generate infobar" : "Loading..."}
            </Button>
            {error &&
                <Typography color="error" sx={{ pt: 2 }}>
                    Enter a valid service!
                </Typography>
            }
            {fetcher.state === "idle" && fetcher.data === "" &&
                <Typography color="error" sx={{ pt: 2 }}>
                    No stops found for this service.
                </Typography>
            }
            {fetcher.data && (
                <Paper variant="outlined" sx={{ mt: 3, p: 2 }}>
                    <Box sx={{ fontFamily: "monospace", textAlign: "left", whiteSpace: "pre-wrap" }}>
                        {fetcher.data}
                    </Box>
                </Paper>
            )}
        </Box>
    );
}
