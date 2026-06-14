import AppBar from "@mui/material/AppBar";
import Box from "@mui/material/Box";
import Container from "@mui/material/Container";
import IconButton from '@mui/material/IconButton';
import List from '@mui/material/List';
import ListItem from '@mui/material/ListItem';
import ListItemButton from '@mui/material/ListItem';
import ListItemText from '@mui/material/ListItemText';
import Toolbar from "@mui/material/Toolbar";
import Tooltip from "@mui/material/Tooltip";

import { Link, Outlet } from "react-router";

import bus from './assets/bus.png';
import cycle from './assets/cycle.png';
import lrt from './assets/lrt.png';
import mrt from './assets/mrt.png';
import walk from './assets/walk.png';
import logo from './assets/ost_logo.png';

function Header() {
    return (
        <AppBar position="relative">
            <Toolbar sx={{ bgcolor: "primary.dark" }}>
                <Box component="header" sx={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                    <IconButton component={Link} to="/" aria-label="Home">
                        <Box component="img" src={logo} alt="OST Logo" sx={{ width: 90, height: 24 }} />
                    </IconButton>
                    <Box>
                        <Tooltip title="Walk">
                            <IconButton component={Link} to="/walk" aria-label="Walk">
                                <Box component="img" src={walk} alt="Walk" sx={{ width: 28, height: 28 }} />
                            </IconButton>
                        </Tooltip>
                        <Tooltip title="Cycle">
                            <IconButton component={Link} to="/cycle" aria-label="Cycle">
                                <Box component="img" src={cycle} alt="Cycle" sx={{ width: 28, height: 28 }} />
                            </IconButton>
                        </Tooltip>
                        <Tooltip title="MRT">
                            <IconButton component={Link} to="/mrt" aria-label="MRT">
                                <Box component="img" src={mrt} alt="MRT" sx={{ width: 28, height: 28 }} />
                            </IconButton>
                        </Tooltip>
                        <Tooltip title="Bus">
                            <IconButton component={Link} to="/bus" aria-label="Bus">
                                <Box component="img" src={bus} alt="Bus" sx={{ width: 28, height: 28 }} />
                            </IconButton>
                        </Tooltip>
                        <Tooltip title="LRT">
                            <IconButton component={Link} to="/lrt" aria-label="LRT">
                                <Box component="img" src={lrt} alt="LRT" sx={{ width: 28, height: 28 }} />
                            </IconButton>
                        </Tooltip>
                        <Tooltip title="Data">
                            <IconButton component={Link} to="/lrt" aria-label="LRT">
                                <Box component="img" src={lrt} alt="LRT" sx={{ width: 28, height: 28 }} />
                            </IconButton>
                        </Tooltip>
                    </Box>
                </Box>
            </Toolbar>
        </AppBar>
    );
}

function Footer() {
    return (
        <Box component="footer" sx={{ bgcolor: "primary.dark", color: "white", py: 3 }}>
            <Container sx={{ alignItems: "center", display: "flex", justifyContent: "space-between", px: { xs: 1, sm: 2 }, py: 0 }}>
                <List sx={{ p: 0 }}>
                    <ListItem disableGutters>
                        <ListItemText sx={{ color: "white" }} primary="©2026 One Stop Transport" />
                    </ListItem>
                    <ListItem disableGutters>
                        <ListItemText primary="onestoptransportsg@gmail.com" />
                    </ListItem>
                </List>
                <List sx={{ p: 0 }}>
                    <ListItem disablePadding>
                        <ListItemButton component="a" href="https://www.youtube.com/@3449Hyperlapses" sx={{ py: 0 }}>
                            <ListItemText sx={{ color: "white" }} primary="3449 Hyperlapses" />
                        </ListItemButton>
                    </ListItem>
                    <ListItem disablePadding>
                        <ListItemButton component="a" href="https://www.youtube.com/@AlvetorTransport" sx={{ py: 0 }}>
                            <ListItemText sx={{ color: "white" }} primary="Alvetor Transport" />
                        </ListItemButton>
                    </ListItem>
                    <ListItem disablePadding>
                        <ListItemButton component="a" href="https://www.youtube.com/@themaintrainost" sx={{ py: 0 }}>
                            <ListItemText sx={{ color: "white" }} primary="TheMainTrain" />
                        </ListItemButton>
                    </ListItem>
                    <ListItem disablePadding>
                        <ListItemButton component="a" href="https://www.youtube.com/@transitevolution" sx={{ py: 0 }}>
                            <ListItemText sx={{ color: "white" }} primary="Transit Evolution" />
                        </ListItemButton>
                    </ListItem>
                </List>
            </Container>
        </Box>
    );
}

export default function Layout() {
    return (
        <Box>
            <Header />
            <Outlet />
            <Footer />
        </Box>
    )
}