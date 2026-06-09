import Box from '@mui/material/Box';
import MuiLink from '@mui/material/Link'
import Table from '@mui/material/Table';
import TableBody from '@mui/material/TableBody';
import TableCell from '@mui/material/TableCell';
import TableRow from '@mui/material/TableRow';
import Typography from '@mui/material/Typography';
import { Link } from "react-router-dom";
import busTable from "./assets/bus_table.json";

export default function Buses() {
    return (
        <Box sx={{textAlign: "center", py: 5}}>
            <Typography variant="h3">Bus Services</Typography>
            <BusTable table={busTable.main} />
            <BusTable table={busTable.variant} />
        </Box>
    )
}

function BusTable(props: {table: (number | string | null)[][]}) {
    return (
        <Box sx={{py: 5}}>
            <Table sx={{ width: "100%", tableLayout: "fixed" }}>
                <TableBody>
                    {props.table.map(row => (
                        <TableRow>
                            {row.map(col => (
                                <TableCell align='center' key={col} sx={{fontSize: {xs: "0.6rem", sm: "0.8rem", md: "1rem"}}}>
                                    {col
                                        ? (<MuiLink component={Link} to={`${col}`} color="primary.light" underline="hover">{col}</MuiLink>)
                                        : ""}
                                </TableCell>
                            ))}
                        </TableRow>
                    ))}
                </TableBody>
            </Table>
        </Box>
    )
}