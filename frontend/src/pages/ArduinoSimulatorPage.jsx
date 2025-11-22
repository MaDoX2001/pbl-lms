import React from 'react';
import { Box, Container, Typography, Paper } from '@mui/material';

function ArduinoSimulatorPage() {
  return (
    <Container maxWidth={false} sx={{ py: 4, px: 2, height: 'calc(100vh - 64px)' }}>
      <Paper elevation={3} sx={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
        <Box sx={{ p: 2, borderBottom: 1, borderColor: 'divider' }}>
          <Typography variant="h5" component="h1" gutterBottom>
            محاكي Arduino
          </Typography>
          <Typography variant="body2" color="text.secondary">
            محاكي Arduino عبر الإنترنت - يمكنك كتابة وتشغيل أكواد Arduino مباشرة في المتصفح
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
