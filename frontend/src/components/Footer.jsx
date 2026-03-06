import React from 'react';
import { Box, Container, Typography, Link } from '@mui/material';
import { Link as RouterLink } from 'react-router-dom';
import EmailIcon from '@mui/icons-material/Email';
import WhatsAppIcon from '@mui/icons-material/WhatsApp';
import ChatIcon from '@mui/icons-material/Chat';
import { useAppSettings } from '../context/AppSettingsContext';

const Footer = () => {
  const { t, mode } = useAppSettings();
  const isDark = mode === 'dark';

  return (
    <Box
      component="footer"
      sx={{
        bgcolor: isDark ? 'background.paper' : 'primary.main',
        color: isDark ? 'text.primary' : 'white',
        borderTop: isDark ? '1px solid' : 'none',
        borderColor: 'divider',
        py: 2.5,
        mt: 'auto',
      }}
    >
      <Container maxWidth="lg">
        <Box sx={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'space-between', gap: 1 }}>
          <Typography variant="body2" fontWeight={700}>
            {t('appName')}
          </Typography>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <Typography variant="caption">{t('contactUs')}:</Typography>
            <Link 
              href="https://mail.google.com/mail/u/0/?fs=1&tf=cm&source=mailto&su=%D8%AA%D9%88%D8%A7%D8%B5%D9%84+%D9%85%D9%86+%D8%A7%D9%84%D9%85%D9%86%D8%B5%D8%A9&to=elmahdyaisha8@gmail.com&body=%D9%85%D8%B1%D8%AD%D8%A8%D9%8B%D8%A7%D8%8C%0A%D8%A3%D8%B1%D8%BA%D8%A8+%D9%81%D9%8A+%D8%A7%D9%84%D8%AA%D9%88%D8%A7%D8%B5%D9%84+%D8%A8%D8%AE%D8%B5%D9%88%D8%B5..." 
              target="_blank" color="inherit"
            >
              <EmailIcon fontSize="small" />
            </Link>
            <Link component={RouterLink} to="/chat" color="inherit">
              <ChatIcon fontSize="small" />
            </Link>
            <Link href="https://wa.me/201207505780" target="_blank" color="inherit">
              <WhatsAppIcon fontSize="small" />
            </Link>
          </Box>
          <Typography variant="caption">
            {t('rights', { year: new Date().getFullYear() })}
          </Typography>
        </Box>
      </Container>
    </Box>
  );
};

export default Footer;
