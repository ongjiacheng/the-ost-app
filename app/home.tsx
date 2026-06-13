import Box from '@mui/material/Box';
import IconButton from '@mui/material/IconButton';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';

import FacebookIcon from '@mui/icons-material/Facebook';
import InstagramIcon from '@mui/icons-material/Instagram';
import LinkedInIcon from '@mui/icons-material/LinkedIn';
import YouTubeIcon from '@mui/icons-material/YouTube';

export default function Home() {
    return (
        <Box sx={{ minHeight: "74vh", py: 10, textAlign: "center" }}>
            <Typography variant="h3" sx={{ py: 2 }}>
                Welcome to One Stop Transport!
            </Typography>
            <Typography variant="h5" sx={{ py: 2 }}>
                Founded in 2015, One Stop Transport is an interest group about all things transportation, comprising of alumni from the School of Science and Technology, Singapore.
            </Typography>
            <Typography variant="h5" sx={{ py: 2 }}>
                We are best known for our video works about the walk-cycle-ride travel modes, uploaded on 4 YouTube channels: 3449 Hyperlapses, Alvetor Transport, TheMainTrain, and Transit Evolution.
            </Typography>
            <Typography variant="h5" sx={{ py: 2}}>
                From the well-received bus service route visuals and park connector bikethroughs, to rides in Singapore and abroad, there is truly something for everyone!
            </Typography>
            <Stack direction="row" sx={{ justifyContent: "center", py: 2 }}>
                <IconButton component="a" href="https://tinyurl.com/osthsc"><YouTubeIcon /></IconButton>
                <IconButton component="a" href="https://www.instagram.com/onestoptransport"><InstagramIcon /></IconButton>
                <IconButton component="a" href="https://www.facebook.com/OneStopTransportSG"><FacebookIcon /></IconButton>
                <IconButton component="a" href="https://www.linkedin.com/company/one-stop-transport-sg"><LinkedInIcon /></IconButton>
            </Stack>
        </Box>
    )
}