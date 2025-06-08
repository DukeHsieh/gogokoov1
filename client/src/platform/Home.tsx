import { useNavigate } from 'react-router-dom';
import React from 'react';
import {
  Box,
  Typography,
  Button,
  Container,
  Grid,
  Card,
  CardContent,
  CardActions,
  Paper,
} from '@mui/material';
import { styled } from '@mui/material/styles';
import GhibliPartyRoom from '../assets/ghibli-party-room.svg';
import SportsEsportsIcon from '@mui/icons-material/SportsEsports';
import AddCircleOutlineIcon from '@mui/icons-material/AddCircleOutline';

const StyledPaper = styled(Paper)(({ theme }) => ({
  padding: theme.spacing(4),
  borderRadius: theme.spacing(2),
  background: 'linear-gradient(135deg, #FFD700 0%, #FFA500 100%)', /* Changed to a warm, inviting gradient */
  color: 'white',
  position: 'relative',
  overflow: 'hidden',
  '&::before': {
    content: '""',
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    background: `url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='%23ffffff' fill-opacity='0.1'%3E%3Cpath d='M30 0L60 30L30 60L0 30z'/%3E%3C/g%3E%3C/svg%3E") repeat`, /* Changed to a new, abstract pattern */
    opacity: 0.3,
  },
}));

const FormCard = styled(Card)(({ theme }) => ({
  background: 'rgba(255, 255, 255, 0.95)',
  backdropFilter: 'blur(10px)',
  borderRadius: theme.spacing(2),
  boxShadow: '0 8px 32px rgba(0, 0, 0, 0.1)',
}));

const Home = () => {
  const navigate = useNavigate();

  return (
    <Container maxWidth="md">
      <Box sx={{ py: 4 }}>
        <StyledPaper>
          <Box sx={{ position: 'relative', zIndex: 1 }}>
            <Typography
              variant="h3"
              sx={{
                textAlign: 'center',
                mb: 2,
                fontWeight: 700,
                textShadow: '2px 2px 4px rgba(0,0,0,0.3)',
              }}
            >
              Gogokoo
            </Typography>
            <Typography
              variant="h6"
              sx={{
                textAlign: 'center',
                mb: 4,
                opacity: 0.9,
              }}
            >
              Do you have a host screen? Enjoy it!
            </Typography>

            {/* 吉卜力風格房間圖片 */}
            <Box
              sx={{
                display: 'flex',
                justifyContent: 'center',
                mb: 4,
              }}
            >
              <img src={GhibliPartyRoom} alt="Ghibli Party Room" style={{ borderRadius: '12px', maxWidth: '100%', height: 'auto' }} />
            </Box>

            <Grid container spacing={4} justifyContent="center">
              <Grid item xs={12} md={6}>
                <FormCard
                  sx={{
                    height: '100%',
                    display: 'flex',
                    flexDirection: 'column',
                    transition: '0.3s',
                    '&:hover': {
                      transform: 'translateY(-8px)',
                      boxShadow: 4,
                    },
                  }}
                >
                  <CardContent sx={{ flexGrow: 1, textAlign: 'center', p: 4 }}>
                    <SportsEsportsIcon sx={{ fontSize: 60, color: 'primary.main', mb: 2 }} />
                    <Typography variant="h5" component="h2" gutterBottom>
                      開始遊戲
                    </Typography>
                    <Typography color="text.secondary">
                      創建遊戲房間，邀請朋友一起玩記憶大考驗等精彩遊戲。
                      立即開始您的主持之旅！
                    </Typography>
                  </CardContent>
                  <CardActions sx={{ justifyContent: 'center', pb: 3 }}>
                    <Button
                      variant="contained"
                      size="large"
                      onClick={() => navigate('/create-room')}
                      startIcon={<SportsEsportsIcon />}
                    >
                      開始遊戲
                    </Button>
                  </CardActions>
                </FormCard>
              </Grid>

              <Grid item xs={12} md={6}>
                <FormCard
                  sx={{
                    height: '100%',
                    display: 'flex',
                    flexDirection: 'column',
                    transition: '0.3s',
                    '&:hover': {
                      transform: 'translateY(-8px)',
                      boxShadow: 4,
                    },
                  }}
                >
                  <CardContent sx={{ flexGrow: 1, textAlign: 'center', p: 4 }}>
                    <AddCircleOutlineIcon sx={{ fontSize: 60, color: 'primary.main', mb: 2 }} />
                    <Typography variant="h5" component="h2" gutterBottom>
                      創建遊戲
                    </Typography>
                    <Typography color="text.secondary">
                      設計您自己的互動遊戲，創造獨特的主持體驗。
                      讓您的活動更加生動有趣！
                    </Typography>
                  </CardContent>
                  <CardActions sx={{ justifyContent: 'center', pb: 3 }}>
                    <Button
                      variant="contained"
                      size="large"
                      onClick={() => navigate('/create-room')}
                      startIcon={<AddCircleOutlineIcon />}
                    >
                      開始創建
                    </Button>
                  </CardActions>
                </FormCard>
              </Grid>
            </Grid>
          </Box>
        </StyledPaper>
      </Box>
    </Container>
  );
};

export default Home;