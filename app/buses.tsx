import Container from '@mui/material/Container';
import MuiLink from '@mui/material/Link'
import Table from '@mui/material/Table';
import TableBody from '@mui/material/TableBody';
import TableCell from '@mui/material/TableCell';
import TableRow from '@mui/material/TableRow';
import Typography from '@mui/material/Typography';
import { Link } from "react-router";
import busTable from "./assets/bus_table.json";

export default function Buses() {
    return (
        <Container>
            <Typography variant="h3">Bus Services</Typography>
            <BusTable table={busTable.main} />
            <BusTable table={busTable.variant} />
        </Container>
    )
}

function BusTable(props: {table: (number | string | null)[][]}) {
    return (
        <Container>
            <Table>
                <TableBody>
                    {props.table.map((row, rowNo) => (
                        <TableRow key={rowNo}>
                            {row.map((col, colNo) => (
                                <TableCell key={colNo} sx={{fontSize: {xs: "0.8rem", sm: "0.9rem", md: "1rem"}}}>
                                    {col
                                        ? (<MuiLink component={Link} to={`${col}`} color="primary.light" underline="hover">{col}</MuiLink>)
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