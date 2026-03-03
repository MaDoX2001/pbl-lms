import React from 'react';
import { Box, Container, Typography, Paper } from '@mui/material';
import { useAppSettings } from '../context/AppSettingsContext';

function ArduinoSimulatorPage() {
  const { t } = useAppSettings();

  return (
    <Container maxWidth={false} sx={{ py: 1, px: 2, height: 'calc(100vh - 64px)' }}>
      <Paper elevation={3} sx={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
        <Box sx={{ px: 2, py: 0.75, borderBottom: 1, borderColor: 'divider', display: 'flex', alignItems: 'center', gap: 2 }}>
          <Typography variant="subtitle1" component="h1" fontWeight={700}>
            {t('arduinoSimulatorTitle')}
          </Typography>
          <Typography variant="caption" color="text.secondary">
            {t('arduinoSimulatorSubtitle')}
          </Typography>
        </Box>
        
        <Box sx={{ flex: 1, position: 'relative', overflow: 'hidden' }}>
          <iframe
            src="https://wokwi.com/projects/new/arduino-uno"
            title="Arduino Simulator"
            style={{
              width: '100%',
              height: '100%',
              border: 'none',
              position: 'absolute',
              top: 0,
              left: 0
            }}
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
            allowFullScreen
          />
        </Box>
      </Paper>
    </Container>
  );
}

export default ArduinoSimulatorPage;
