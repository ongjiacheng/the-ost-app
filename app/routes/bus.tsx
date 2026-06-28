import Container from '@mui/material/Container';
import MuiLink from '@mui/material/Link'
import Table from '@mui/material/Table';
import TableBody from '@mui/material/TableBody';
import TableCell from '@mui/material/TableCell';
import TableRow from '@mui/material/TableRow';
import ToggleButton from '@mui/material/ToggleButton';
import ToggleButtonGroup from '@mui/material/ToggleButtonGroup';
import Typography from '@mui/material/Typography';

import { useState } from "react";
import { Link } from "react-router";

import busPackage from "../assets/bus_package.json";
import busType from "../assets/bus_type.json";

export default function Buses() {
    const [view, setView] = useState("type");
    return (
        <Container>
            <Typography variant="h2">Bus Services</Typography>
            <ToggleButtonGroup value={view} size="small" exclusive onChange={(_, view) => setView(view)}>
                <ToggleButton value="type">By Type / Number</ToggleButton>
                <ToggleButton value="package">By Package / Operator</ToggleButton>
            </ToggleButtonGroup>
            {view === "package" &&
                busPackage.map(pack => (
                    <Container>
                        <Typography variant="h4">{pack.name} Bus Package</Typography>
                        Operated by {pack.operator} from {pack.depot} Bus Depot
                        <BusTable table={pack.services} />
                    </Container>
                ))
            }
            {view === "type" && (
                busType.map(type => (
                    <Container>
                        <Typography variant="h4">{type.name}</Typography>
                        <BusTable table={type.services} />
                    </Container>
                ))
            )}
        </Container>
    )
}

function BusTable(props: { table: (string | null)[][] }) {
    return (
        <Container>
            <Table>
                <TableBody>
                    {props.table.map((row, rowNo) => (
                        <TableRow key={rowNo}>
                            {row.map((col, colNo) => (
                                <TableCell key={colNo} sx={{ fontSize: { xs: "0.8rem", sm: "0.9rem", md: "1rem" } }}>
                                    {col
                                        ? (/\d/.test(col)
                                            ? <MuiLink component={Link} to={`${col}`} color="primary.light" underline="hover">{col}</MuiLink>
                                            : col)
                                        : ""}
                                </TableCell>
                            ))}
                        </TableRow>
                    ))}
                </TableBody>
            </Table>
        </Container>
    )
}