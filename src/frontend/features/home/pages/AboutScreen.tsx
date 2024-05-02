import { Container, Grid, Typography, Stack, IconButton, Link } from '@mui/material';
import EmailIcon from '@mui/icons-material/Email';
import LinkedinIcon from '@mui/icons-material/LinkedIn';
import { mainTheme } from '../../../common/mainTheme';

export const AboutScreen = () => {
  return (
    <>
      <Container
        maxWidth="xl"
        sx={{ paddingTop: 2 }}
        style={{
          background: `linear-gradient(to right bottom, ${mainTheme.fourthColor}, ${mainTheme.secondaryColor})`
        }}
      >
        <Grid display="flex" justifyContent="center">
          <Grid>
            <Typography color={mainTheme.primaryColor} variant="subtitle1" textAlign="center">
              About
            </Typography>
            <Typography color={mainTheme.textColor} variant="h2">
              GAMING KARDZ
            </Typography>
          </Grid>
        </Grid>

        <Container>
          <Stack spacing={2} sx={{ marginTop: 5 }}>
            <Grid>
              <Typography color={mainTheme.textColor} variant="subtitle1">
                Welcome to Gaming Kardz. Here you find, buy and sell player NFTs of your favorite teams around the
                world. Buy low and sell high to obtain profits. Earn royalties buying token when it minted in the
                market.
              </Typography>
              <Typography color={mainTheme.textColor} variant="subtitle1">
                Contribute with your team buying one of their tokens and receive benefits.
              </Typography>
            </Grid>
            <Typography color={mainTheme.textColor} variant="subtitle1">
              Gaming Kardz is made in Ethereum Blockchain, your tokens are secure!
            </Typography>
            <Typography color={mainTheme.textColor} variant="subtitle1">
              How it works? Gaming Kardz is responsible to mint all the tokens in the platform. The teams creates their
              NFT collection and send to Gaming Kardz to publish them. The platform mints the collection in Ethereum
              Network and release automatically in the market.
            </Typography>
            <Grid sx={{ paddingBottom: 5 }}>
              <Typography color={mainTheme.textColor} variant="subtitle1">
                Platform develped in new technologies with best programming practices.
              </Typography>
              <Typography color={mainTheme.textColor} variant="subtitle1">
                Christian Perez is the owner and creator. He is a software engineering passionate about crypto.
              </Typography>
              <Typography color={mainTheme.textColor} variant="subtitle1">
                Project powered by BSM.
              </Typography>
            </Grid>
          </Stack>
        </Container>
      </Container>

      <Grid container sx={{ pt: 2, pb: 2, background: mainTheme.primaryColor }}>
        <Container>
          <Typography color="black" variant="h6">
            If you are intersted to contact me, send me an email to:
            <IconButton disableRipple>
              <Link color="black" underline="none" href="mailto:christiangperez@gmail.com" variant="body2">
                <Grid display="flex">
                  <EmailIcon sx={{ color: 'black', fontSize: 24, marginRight: 1 }} />
                  <Typography variant="subtitle1">christiangperez@gmail.com</Typography>
                </Grid>
              </Link>
            </IconButton>
          </Typography>
        </Container>
        <Container>
          <Typography color="black" variant="h6">
            Or visit my Linkedin:
            <IconButton disableRipple>
              <Link
                color="black"
                underline="none"
                href="https://www.linkedin.com/in/christian-g-perez/"
                variant="body2"
              >
                <Grid display="flex">
                  <LinkedinIcon sx={{ color: 'black', fontSize: 24, marginRight: 1 }} />
                  <Typography variant="subtitle1">Linkedin</Typography>
                </Grid>
              </Link>
            </IconButton>
          </Typography>
        </Container>
      </Grid>
    </>
  );
};
