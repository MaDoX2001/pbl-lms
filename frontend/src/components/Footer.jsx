import React from 'react';
import { Box, Container, Typography, Link, Grid, Button } from '@mui/material';
import { Link as RouterLink, useNavigate } from 'react-router-dom';
import EmailIcon from '@mui/icons-material/Email';
import WhatsAppIcon from '@mui/icons-material/WhatsApp';
import ChatIcon from '@mui/icons-material/Chat';

const Footer = () => {
  const navigate = useNavigate();

  return (
    <Box
      component="footer"
      sx={{
        bgcolor: 'primary.main',
        color: 'white',
        py: 4,
        mt: 'auto',
      }}
    >
      <Container maxWidth="lg">
        <Grid container spacing={4}>
          <Grid item xs={12} md={4}>
            <Typography variant="h6" gutterBottom fontWeight={700}>
              منصة التعلم بالمشروعات
            </Typography>
            <Typography variant="body2">
              منصة تعليمية مبتكرة تساعد الطلاب على تعلم البرمجة من خلال مشاريع عملية وتفاعلية.
            </Typography>
          </Grid>

          <Griتواصل معنا
            </Typography>
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5 }}>
              <Button
                variant="outlined"
                startIcon={<EmailIcon />}
                href="mailto:elmahdyaisha8@gmail.com"
                sx={{ 
                  color: 'white',
                  borderColor: 'white',
                  justifyContent: 'flex-start',
                  '&:hover': {
                    borderColor: 'white',
                    bgcolor: 'rgba(255,255,255,0.1)'
                  }
                }}
              >
                إرسال رسالة
              </Button>
              <Button
                variant="outlined"
                startIcon={<ChatIcon />}
                onClick={() => navigate('/chat')}
                sx={{ 
                  color: 'white',
                  borderColor: 'white',
                  justifyContent: 'flex-start',
                  '&:hover': {
                    borderColor: 'white',
                    bgcolor: 'rgba(255,255,255,0.1)'
                  }
                }}
              >
                الشات الداخلي
              </Button>
              <Button
                variant="outlined"
                startIcon={<WhatsAppIcon />}
                href="https://wa.me/201207505780"
                target="_blank"
                sx={{ 
                  color: 'white',
                  borderColor: 'white',
                  justifyContent: 'flex-start',
                  '&:hover': {
                    borderColor: 'white',
                    bgcolor: 'rgba(255,255,255,0.1)'
                  }
                }}
              >
                واتساب
              </Buttonhref="#" color="inherit">
                <TwitterIcon />
              </Link>
            </Box>
          </Grid>
        </Grid>

        <Box sx={{ mt: 4, pt: 2, borderTop: '1px solid rgba(255,255,255,0.2)' }}>
          <Typography variant="body2" align="center">
            © {new Date().getFullYear()} منصة التعلم بالمشروعات. جميع الحقوق محفوظة.
          </Typography>
        </Box>
      </Container>
    </Box>
  );
};

export default Footer;
