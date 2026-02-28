import React, { useState } from 'react';
import { Box, Typography, Button, Paper, Divider, Chip, Alert } from '@mui/material';
import OpenInNewIcon from '@mui/icons-material/OpenInNew';
import SmartToyIcon from '@mui/icons-material/SmartToy';
import InfoOutlinedIcon from '@mui/icons-material/InfoOutlined';
import { useAppSettings } from '../context/AppSettingsContext';

const AIChatPage = () => {
  const { t, direction } = useAppSettings();
  const [iframeBlocked, setIframeBlocked] = useState(false);

  // ChatGPT blocks iframes - detect after short delay
  React.useEffect(() => {
    const timer = setTimeout(() => setIframeBlocked(true), 3000);
    return () => clearTimeout(timer);
  }, []);

  return (
    <Box sx={{ p: { xs: 2, md: 3 }, direction, textAlign: direction === 'rtl' ? 'right' : 'left' }}>

      {/* Header */}
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 2, flexDirection: direction === 'rtl' ? 'row-reverse' : 'row' }}>
        <SmartToyIcon sx={{ fontSize: 36, color: 'primary.main' }} />
        <Box>
          <Typography variant="h5" fontWeight={700}>
            {t('aiAssistantTitle')}
          </Typography>
          <Typography variant="body2" color="text.secondary">
            {t('aiAssistantSubtitle')}
          </Typography>
        </Box>
      </Box>

      <Divider sx={{ mb: 2 }} />

      {/* Iframe attempt */}
      <Paper elevation={1} sx={{ borderRadius: 3, overflow: 'hidden', mb: 2, position: 'relative', minHeight: 520 }}>
        {!iframeBlocked ? (
          <iframe
            src="https://chat.openai.com"
            title="ChatGPT"
            width="100%"
            height="520"
            style={{ border: 'none', display: 'block' }}
          />
        ) : (
          /* Fallback when iframe is blocked */
          <Box
            sx={{
              height: 520,
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 2,
              p: 4,
              backgroundColor: 'action.hover',
            }}
          >
            <SmartToyIcon sx={{ fontSize: 72, color: 'primary.main', opacity: 0.7 }} />
            <Typography variant="h6" fontWeight={700} textAlign="center">
              {t('aiOpenChatGPT')}
            </Typography>
            <Alert
              severity="info"
              icon={<InfoOutlinedIcon />}
              sx={{ borderRadius: 2, maxWidth: 420, textAlign: direction === 'rtl' ? 'right' : 'left' }}
            >
              {t('aiIframeBlocked')}
            </Alert>
            <Button
              variant="contained"
              size="large"
              endIcon={direction === 'rtl' ? null : <OpenInNewIcon />}
              startIcon={direction === 'rtl' ? <OpenInNewIcon /> : null}
              href="https://chat.openai.com"
              target="_blank"
              rel="noopener noreferrer"
              sx={{ borderRadius: 2, px: 5, py: 1.5, fontSize: '1rem', mt: 1 }}
            >
              {t('aiOpenButton')}
            </Button>
          </Box>
        )}
      </Paper>

      {/* Tips */}
      <Paper elevation={0} sx={{ p: 3, borderRadius: 3, border: '1px solid', borderColor: 'divider' }}>
        <Typography variant="subtitle1" fontWeight={700} gutterBottom>
          {t('aiTipsTitle')}
        </Typography>
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5, mt: 1 }}>
          {[t('aiTip1'), t('aiTip2'), t('aiTip3'), t('aiTip4')].map((tip, i) => (
            <Box
              key={i}
              sx={{
                display: 'flex',
                alignItems: 'flex-start',
                gap: 1.5,
                flexDirection: direction === 'rtl' ? 'row-reverse' : 'row',
              }}
            >
              <Chip label={i + 1} size="small" color="primary" sx={{ minWidth: 28, height: 24, mt: 0.2, flexShrink: 0 }} />
              <Typography variant="body2" color="text.secondary">{tip}</Typography>
            </Box>
          ))}
        </Box>
      </Paper>
    </Box>
  );
};

export default AIChatPage;
