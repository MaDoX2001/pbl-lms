import React from 'react';
import { Box, Container, Typography, Link, Grid } from '@mui/material';
import { Link as RouterLink } from 'react-router-dom';
import GitHubIcon from '@mui/icons-material/GitHub';
import LinkedInIcon from '@mui/icons-material/LinkedIn';
import TwitterIcon from '@mui/icons-material/Twitter';

const Footer = () => {
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

          <Grid item xs={12} md={4}>
            <Typography variant="h6" gutterBottom fontWeight={700}>
              روابط سريعة
            </Typography>
            <Link
              component={RouterLink}
              to="/projects"
              color="inherit"
              underline="hover"
              display="block"
              sx={{ mb: 1 }}
            >
              المشاريع
            </Link>
            <Link
              component={RouterLink}
              to="/leaderboard"
              color="inherit"
              underline="hover"
              display="block"
              sx={{ mb: 1 }}
            >
              لوحة المتصدرين
            </Link>
            <Link
              component={RouterLink}
              to="/about"
              color="inherit"
              underline="hover"
              display="block"
            >
              عن المنصة
            </Link>
          </Grid>

          <Grid item xs={12} md={4}>
            <Typography variant="h6" gutterBottom fontWeight={700}>
              تواصل معنا
            </Typography>
            <Box sx={{ display: 'flex', gap: 2 }}>
              <Link href="#" color="inherit">
                <GitHubIcon />
              </Link>
              <Link href="#" color="inherit">
                <LinkedInIcon />
              </Link>
              <Link href="#" color="inherit">
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
