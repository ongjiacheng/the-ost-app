import Container from '@mui/material/Container';
import Link from '@mui/material/Link'
import Table from '@mui/material/Table';
import TableBody from '@mui/material/TableBody';
import TableCell from '@mui/material/TableCell';
import TableHead from '@mui/material/TableHead';
import TableRow from '@mui/material/TableRow';
import Typography from '@mui/material/Typography';
import { Link as RouterLink } from "react-router";

import stations from "../assets/lrt_stations.json";
import type { TrainStationType } from "../types";
import { lineMap } from "../types";

export default function LRT() {
    return (
        <Container>
            <Typography variant="h2">LRT Stations</Typography>
            {stations.map(line => (
                <Container>
                    <Typography variant="h4">{line.line}</Typography>
                    <LRTTable line={line.stations} />
                </Container>
            ))
            }
        </Container>
    )
}

function LRTTable(props: { line: TrainStationType[] }) {
    return (
        <Container>
            <Table>
                <TableHead>
                    <TableRow>
                        <TableCell>Code</TableCell>
                        <TableCell>English (Malay) Name</TableCell>
                        <TableCell>Chinese</TableCell>
                        <TableCell>Tamil</TableCell>
                    </TableRow>
                </TableHead>
                <TableBody>
                    {props.line.map(station => (
                        <TableRow key={station.english}>
                            <TableCell>
                                <Typography variant="body2" sx={{color: lineMap[station.code.slice(0, 2)]}}>
                                    {station.code}
                                </Typography>
                            </TableCell>
                            <TableCell>
                                <Link component={RouterLink} to={`../train/${station.url}`} color="primary.light" underline="hover">
                                    {station.english} {station.malay && `\n(${station.malay})`}
                                </Link>
                            </TableCell>
                            <TableCell>{station.chinese}</TableCell>
                            <TableCell>{station.tamil}</TableCell>
                        </TableRow>
                    ))}
                </TableBody>
            </Table>
        </Container >
    )
}