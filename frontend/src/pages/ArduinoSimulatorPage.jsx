import React, { useState, useEffect } from 'react';
import {
  Box, Container, Typography, Paper, Button, Dialog, DialogTitle,
  DialogContent, DialogActions, TextField, MenuItem, Select, FormControl,
  InputLabel, Snackbar, Alert, CircularProgress, Tooltip
} from '@mui/material';
import SaveIcon from '@mui/icons-material/Save';
import { useSelector } from 'react-redux';
import api from '../services/api';
import { useAppSettings } from '../context/AppSettingsContext';

function ArduinoSimulatorPage() {
  const { t } = useAppSettings();
  const { user } = useSelector(state => state.auth);

  // Dialog state
  const [open, setOpen] = useState(false);
  const [wokwiLink, setWokwiLink] = useState('');
  const [notes, setNotes] = useState('');
  const [selectedProject, setSelectedProject] = useState('');
  const [projects, setProjects] = useState([]);   // team enrollments
  const [submitting, setSubmitting] = useState(false);
  const [snack, setSnack] = useState({ open: false, msg: '', severity: 'success' });

  // Fetch team's enrolled projects for the dropdown
  useEffect(() => {
    if (user?.role === 'student') {
      api.get('/teams/my-team').then(res => {
        const teamId = res.data.data._id;
          api.get(`/team-projects/team/${teamId}`).then(r => {
            setProjects(r.data.data || []);
          }).catch(() => {});
      }).catch(() => {});
    }
  }, [user]);

  const handleSubmit = async () => {
    if (!selectedProject) {
      setSnack({ open: true, msg: t('wokwiSelectProject'), severity: 'warning' });
      return;
    }
    if (!wokwiLink.trim()) {
      setSnack({ open: true, msg: t('wokwiLinkRequired'), severity: 'warning' });
      return;
    }
    if (!/^https:\/\/wokwi\.com\/projects\/\d+/.test(wokwiLink.trim())) {
      setSnack({ open: true, msg: t('wokwiLinkInvalid'), severity: 'error' });
      return;
    }

    setSubmitting(true);
    try {
      const myTeam = await api.get('/teams/my-team');
      await api.post('/team-submissions/wokwi', {
        teamId: myTeam.data.data._id,
        projectId: selectedProject,
        wokwiLink: wokwiLink.trim(),
        notes: notes.trim()
      });
      setSnack({ open: true, msg: t('wokwiSubmitSuccess'), severity: 'success' });
      setOpen(false);
      setWokwiLink('');
      setNotes('');
      setSelectedProject('');
    } catch (err) {
      const msg = err.response?.data?.message || t('wokwiSubmitError');
      setSnack({ open: true, msg, severity: 'error' });
    } finally {
      setSubmitting(false);
    }
  };

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
          <Box sx={{ flex: 1 }} />
          {user?.role === 'student' && (
            <Tooltip title={t('wokwiSubmitTooltip')}>
              <Button
                variant="contained"
                size="small"
                startIcon={<SaveIcon />}
                onClick={() => setOpen(true)}
                color="success"
              >
                {t('wokwiSubmitBtn')}
              </Button>
            </Tooltip>
          )}
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

      {/* Submit Dialog */}
      <Dialog open={open} onClose={() => !submitting && setOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle fontWeight={700}>{t('wokwiSubmitTitle')}</DialogTitle>
        <DialogContent sx={{ display: 'flex', flexDirection: 'column', gap: 2, pt: '16px !important' }}>
          <Alert severity="info" sx={{ mb: 1 }}>
            {t('wokwiSubmitHint')}
          </Alert>

          {/* Project selector */}
          <FormControl fullWidth required>
            <InputLabel id="wokwi-project-label">{t('wokwiSelectProject')}</InputLabel>
            <Select
              labelId="wokwi-project-label"
              value={selectedProject}
              label={t('wokwiSelectProject')}
              onChange={e => setSelectedProject(e.target.value)}
              disabled={submitting}
            >
              {projects.length > 0 ? projects.map(e => (
                <MenuItem key={e.project?._id || e._id} value={e.project?._id || e._id}>
                  {e.project?.title || e.title || e._id}
                </MenuItem>
              )) : (
                <MenuItem disabled value="">{t('wokwiNoProjects')}</MenuItem>
              )}
            </Select>
          </FormControl>

          {/* Wokwi link */}
          <TextField
            fullWidth
            required
            label={t('wokwiLinkLabel')}
            placeholder="https://wokwi.com/projects/458418966794014721"
            value={wokwiLink}
            onChange={e => setWokwiLink(e.target.value)}
            disabled={submitting}
            helperText={t('wokwiLinkHelper')}
          />

          {/* Notes */}
          <TextField
            fullWidth
            multiline
            rows={2}
            label={t('wokwiNotesLabel')}
            placeholder={t('wokwiNotesPlaceholder')}
            value={notes}
            onChange={e => setNotes(e.target.value)}
            disabled={submitting}
            inputProps={{ maxLength: 500 }}
            helperText={`${notes.length}/500`}
          />
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2 }}>
          <Button onClick={() => setOpen(false)} disabled={submitting}>{t('cancel')}</Button>
          <Button
            variant="contained"
            onClick={handleSubmit}
            disabled={submitting}
            startIcon={submitting ? <CircularProgress size={16} /> : <SaveIcon />}
          >
            {submitting ? t('submitting') : t('wokwiSubmitConfirm')}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Snackbar */}
      <Snackbar
        open={snack.open}
        autoHideDuration={4000}
        onClose={() => setSnack(p => ({ ...p, open: false }))}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
      >
        <Alert severity={snack.severity} onClose={() => setSnack(p => ({ ...p, open: false }))}>
          {snack.msg}
        </Alert>
      </Snackbar>
    </Container>
  );
}

export default ArduinoSimulatorPage;
