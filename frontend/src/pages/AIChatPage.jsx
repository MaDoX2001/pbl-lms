import React, { useState } from 'react';
import { Box, Typography, Button, Paper, Alert, Divider, Chip } from '@mui/material';
import OpenInNewIcon from '@mui/icons-material/OpenInNew';
import SmartToyIcon from '@mui/icons-material/SmartToy';
import { useAppSettings } from '../context/AppSettingsContext';

const AIChatPage = () => {
  const { t, direction } = useAppSettings();
  const [iframeError, setIframeError] = useState(false);

  return (
    <Box sx={{ p: { xs: 2, md: 4 }, maxWidth: 900, mx: 'auto', direction }}>
      {/* Header */}
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 3 }}>
        <SmartToyIcon sx={{ fontSize: 40, color: 'primary.main' }} />
        <Box>
          <Typography variant="h4" fontWeight={700}>
            {t('aiAssistantTitle')}
          </Typography>
          <Typography variant="body2" color="text.secondary">
            {t('aiAssistantSubtitle')}
          </Typography>
        </Box>
      </Box>

      <Divider sx={{ mb: 3 }} />

      {/* Open Button */}
      <Paper
        elevation={0}
        sx={{
          p: 4,
          textAlign: 'center',
          border: '2px dashed',
          borderColor: 'primary.main',
          borderRadius: 3,
          backgroundColor: 'action.hover',
          mb: 3,
        }}
      >
        <SmartToyIcon sx={{ fontSize: 64, color: 'primary.main', mb: 2, opacity: 0.8 }} />
        <Typography variant="h6" fontWeight={600} gutterBottom>
          {t('aiOpenChatGPT')}
        </Typography>
        <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
          {t('aiOpenChatGPTDesc')}
        </Typography>
        <Button
          variant="contained"
          size="large"
          startIcon={<OpenInNewIcon />}
          href="https://chat.openai.com"
          target="_blank"
          rel="noopener noreferrer"
          sx={{ borderRadius: 2, px: 4, py: 1.5, fontSize: '1rem' }}
        >
          {t('aiOpenButton')}
        </Button>
      </Paper>

      {/* Tips */}
      <Paper elevation={0} sx={{ p: 3, borderRadius: 3, border: '1px solid', borderColor: 'divider' }}>
        <Typography variant="subtitle1" fontWeight={700} gutterBottom>
          {t('aiTipsTitle')}
        </Typography>
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5, mt: 1 }}>
          {[
            t('aiTip1'),
            t('aiTip2'),
            t('aiTip3'),
            t('aiTip4'),
          ].map((tip, i) => (
            <Box key={i} sx={{ display: 'flex', alignItems: 'flex-start', gap: 1 }}>
              <Chip label={i + 1} size="small" color="primary" sx={{ minWidth: 28, height: 24, mt: 0.2 }} />
              <Typography variant="body2" color="text.secondary">{tip}</Typography>
            </Box>
          ))}
        </Box>
      </Paper>
    </Box>
  );
};

export default AIChatPage;
