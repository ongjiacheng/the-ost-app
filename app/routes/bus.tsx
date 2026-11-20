import Container from '@mui/material/Container';
import Link from '@mui/material/Link'
import Table from '@mui/material/Table';
import TableBody from '@mui/material/TableBody';
import TableCell from '@mui/material/TableCell';
import TableRow from '@mui/material/TableRow';
import ToggleButton from '@mui/material/ToggleButton';
import ToggleButtonGroup from '@mui/material/ToggleButtonGroup';
import Typography from '@mui/material/Typography';

import { Link as RouterLink, useSearchParams } from "react-router";

import busPackage from "../assets/bus_package.json";
import busType from "../assets/bus_type.json";

export default function Buses() {
    const [searchParams, setSearchParams] = useSearchParams();
    const view = searchParams.get("view") === "package" ? "package" : "type";
    const operator = searchParams.get("operator");
    return (
        <Container>
            <Typography variant="h2">Bus Services</Typography>
            <ToggleButtonGroup value={view} size="small" exclusive onChange={(_, view) => { if (view) setSearchParams({ view }); }}>
                <ToggleButton value="type">By Type / Number</ToggleButton>
                <ToggleButton value="package">By Package / Operator</ToggleButton>
            </ToggleButtonGroup>
            {view === "package" &&
                busPackage.filter(pack => !operator || pack.operator === operator).map(pack => (
                    <Container key={pack.name} id={`package-${pack.name}`}>
                        <Typography variant="h4">{pack.name} Bus Package</Typography>
                        Operated by {pack.operator} from {pack.depot} Bus Depot
                        <BusTable table={pack.services} />
                    </Container>
                ))
            }
            {view === "type" && (
                busType.map(type => (
                    <Container key={type.name} id={`type-${type.name}`}>
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
                                <TableCell align="center" key={colNo} sx={{ fontSize: { xs: "0.8rem", sm: "0.9rem", md: "1rem" } }}>
                                    {col
                                        ? (/\d/.test(col)
                                            ? <Link component={RouterLink} to={`${col}`} underline="hover">{col}</Link>
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