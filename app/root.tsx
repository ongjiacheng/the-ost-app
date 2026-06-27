import AppBar from "@mui/material/AppBar";
import Box from "@mui/material/Box";
import Container from "@mui/material/Container";
import CssBaseline from "@mui/material/CssBaseline";
import IconButton from '@mui/material/IconButton';
import List from '@mui/material/List';
import ListItem from '@mui/material/ListItem';
import ListItemButton from '@mui/material/ListItem';
import ListItemText from '@mui/material/ListItemText';
import { ThemeProvider, createTheme } from "@mui/material/styles";
import Toolbar from "@mui/material/Toolbar";

import { Link, Links, Meta, Outlet, Scripts, ScrollRestoration } from "react-router";

import am from './assets/am.png';
import bus from './assets/bus.png';
import train from './assets/train.png';
import logo from './assets/ost_logo.png';

import '@fontsource/inter/300.css';
import '@fontsource/inter/400.css';
import '@fontsource/inter/500.css';
import '@fontsource/inter/700.css';

const theme = createTheme({
    components: {
        MuiContainer: {
            styleOverrides: {
                root: {
                    paddingTop: 16,
                    paddingBottom: 16,
                    paddingLeft: 0,
                    paddingRight: 0,
                    textAlign: "center"
                }
            }
        },
        MuiTableCell: {
            styleOverrides: {
                root: {
                    paddingTop: 8,
                    paddingBottom: 8,
                    paddingLeft: 4,
                    paddingRight: 4,
                    textAlign: "center",
                    whiteSpace: "pre-line"
                }
            }
        },
        MuiTypography: {
            styleOverrides: {
                h1: { paddingTop: 16, paddingBottom: 16 },
                h2: { paddingTop: 16, paddingBottom: 16 },
                h3: { paddingTop: 16, paddingBottom: 16 },
                h4: { paddingTop: 16, paddingBottom: 16 },
                h5: { paddingTop: 16, paddingBottom: 16 },
                h6: { paddingTop: 16, paddingBottom: 16 },
            }
        }
    },
    typography: { fontFamily: '"Inter", sans-serif' },
    palette: {
        primary: {
            main: "#39887b",
            light: "#8bcbc3",
            dark: "#274c42"
        },
        secondary: {
            main: "#b64449",
            light: "#e6949d",
            dark: "#682f3a"
        },
        mode: "dark"
    }
});

function Header() {
    return (
        <AppBar position="relative">
            <Toolbar sx={{ bgcolor: "primary.dark" }}>
                <Container sx={{ px: { xs: 1, sm: 2 }, py: 0 }}>
                    <Box component="header" sx={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                        <IconButton component={Link} to="/" aria-label="Home">
                            <Box component="img" src={logo} alt="OST Logo" sx={{ width: 120, height: 32 }} />
                        </IconButton>
                        <Box>
                            <IconButton component={Link} to="/walk-cycle" aria-label="Active Mobility">
                                <Box component="img" src={am} alt="Active Mobility" sx={{ width: 36, height: 36 }} />
                            </IconButton>
                            <IconButton component={Link} to="/train" aria-label="Train">
                                <Box component="img" src={train} alt="Train" sx={{ width: 36, height: 36 }} />
                            </IconButton>
                            <IconButton component={Link} to="/bus" aria-label="Bus">
                                <Box component="img" src={bus} alt="Bus" sx={{ width: 36, height: 36 }} />
                            </IconButton>
                        </Box>
                    </Box>
                </Container>
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

export function links() {
    return [
        { rel: "icon", href: "/favicon.png", type: "image/png" },
    ];
}

export function Layout({
    children,
}: {
    children: React.ReactNode;
}) {
    return (
        <html lang="en">
            <head>
                <meta charSet="UTF-8" />
                <meta name="viewport" content="width=device-width, initial-scale=1.0" />
                <title>One Stop Transport</title>
                <script src="https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js"></script>
                <Meta />
                <Links />
            </head>
            <body>
                {children}
                <ScrollRestoration />
                <Scripts />
            </body>
        </html>
    );
}

export default function Root() {
    return (
        <ThemeProvider theme={theme}>
            <CssBaseline />
            <Header />
            <Container sx={{ px: { xs: 1, sm: 2 } }}>
                <Outlet />
            </Container>
            <Footer />
        </ThemeProvider>
    );
}
