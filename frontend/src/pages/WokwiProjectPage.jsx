import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import {
  Alert,
  Box,
  Button,
  CircularProgress,
  Container,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Paper,
  Typography
} from '@mui/material';
import HistoryIcon from '@mui/icons-material/History';
import SaveIcon from '@mui/icons-material/Save';
import api from '../services/api';
import { useAppSettings } from '../context/AppSettingsContext';

export default function WokwiProjectPage() {
  const { projectId } = useParams();
  const navigate = useNavigate();
  const { t } = useAppSettings();

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [projectTitle, setProjectTitle] = useState('');
  const [myTeamId, setMyTeamId] = useState('');
  const [latestSubmission, setLatestSubmission] = useState(null);
  const [wokwiHistory, setWokwiHistory] = useState([]);
  const [historyOpen, setHistoryOpen] = useState(false);
  const [historyLoading, setHistoryLoading] = useState(false);

  // On mount: fetch ONLY the latest submission (1 record) for efficiency
  useEffect(() => {
    let mounted = true;

    const fetchData = async () => {
      try {
        setLoading(true);
        setError('');

        const teamRes = await api.get('/teams/my-team');
        const teamId = teamRes.data?.data?._id;

        if (!teamId) throw new Error(t('notInTeamYet'));

        const [latestRes, projectsRes] = await Promise.all([
          api.get(`/team-submissions/wokwi/${teamId}/${projectId}/latest`),
          api.get(`/team-projects/team/${teamId}`)
        ]);

        if (!mounted) return;

        const enrollment = (projectsRes.data?.data || []).find(
          e => String(e.project?._id) === String(projectId)
        );

        setMyTeamId(teamId);
        setLatestSubmission(latestRes.data?.data || null);
        setProjectTitle(enrollment?.project?.title || t('simulationEnvironment'));
      } catch (err) {
        if (!mounted) return;
        setError(err.response?.data?.message || err.message || t('genericLoadError'));
      } finally {
        if (mounted) setLoading(false);
      }
    };

    fetchData();
    return () => { mounted = false; };
  }, [projectId, t]);

  // Lazy-load history only when dialog opens
  const handleOpenHistory = async () => {
    setHistoryOpen(true);
    if (wokwiHistory.length > 0) return; // already loaded
    setHistoryLoading(true);
    try {
      const res = await api.get(`/team-submissions/wokwi/${myTeamId}/${projectId}`);
      setWokwiHistory(res.data?.data || []);
    } catch {}
    setHistoryLoading(false);
  };

  if (loading) {
    return (
      <Container maxWidth="lg" sx={{ mt: 4, display: 'flex', justifyContent: 'center' }}>
        <CircularProgress />
      </Container>
    );
  }

  return (
    <Container maxWidth={false} sx={{ px: { xs: 1, md: 2 }, py: 1, height: 'calc(100vh - 64px)' }}>
      <Paper elevation={3} sx={{ height: '100%', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
        <Box
          sx={{
            px: 2,
            py: 1,
            borderBottom: 1,
            borderColor: 'divider',
            display: 'flex',
            alignItems: 'center',
            gap: 1,
            flexWrap: 'wrap'
          }}
        >
          <Box sx={{ flex: 1, minWidth: 220 }}>
            <Typography variant="subtitle1" fontWeight={700}>
              {projectTitle}
            </Typography>
            <Typography variant="caption" color="text.secondary">
              {t('wokwiLatestVersion')}
              {latestSubmission?.submittedBy?.name ? ` — ${t('wokwiLastUpdatedBy')}: ${latestSubmission.submittedBy.name}` : ''}
            </Typography>
          </Box>

          <Button
            size="small"
            variant="outlined"
            startIcon={<SaveIcon />}
            onClick={() => navigate('/arduino-simulator')}
          >
            {t('uploadNewSubmission')}
          </Button>

          <Button
            size="small"
            variant="outlined"
            startIcon={<HistoryIcon />}
            onClick={handleOpenHistory}
            disabled={!latestSubmission}
          >
            {t('wokwiVersionHistory')}
          </Button>

        </Box>

        {!latestSubmission ? (
          <Box sx={{ p: 4, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 2 }}>
            <Alert severity="info" sx={{ width: '100%', maxWidth: 480 }}>
              {error || t('wokwiNoSubmissions')}
            </Alert>
            <Button
              variant="contained"
              startIcon={<SaveIcon />}
              onClick={() => navigate('/arduino-simulator')}
            >
              {t('uploadNewSubmission')}
            </Button>
          </Box>
        ) : (
          <Box sx={{ flex: 1, minHeight: 0 }}>
            <iframe
              src={latestSubmission.wokwiLink}
              title="Wokwi Project"
              style={{ width: '100%', height: '100%', border: 'none' }}
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
              sandbox="allow-scripts allow-same-origin allow-forms allow-popups"
              allowFullScreen
            />
          </Box>
        )}
      </Paper>

      <Dialog open={historyOpen} onClose={() => setHistoryOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>{t('wokwiVersionHistory')}</DialogTitle>
        <DialogContent dividers>
          {historyLoading ? (
            <Box sx={{ display: 'flex', justifyContent: 'center', py: 3 }}><CircularProgress /></Box>
          ) : wokwiHistory.length === 0 ? (
            <Alert severity="info">{t('wokwiNoSubmissions')}</Alert>
          ) : (
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5 }}>
              {wokwiHistory.map((sub, idx) => (
                <Paper key={sub._id || `${sub.submittedAt}-${idx}`} variant="outlined" sx={{ p: 1.5 }}>
                  <Typography variant="body2" fontWeight={600}>
                    {sub.submittedBy?.name || '—'}
                  </Typography>
                  <Typography variant="caption" color="text.secondary" display="block">
                    {sub.submittedAt ? new Date(sub.submittedAt).toLocaleString('ar-EG') : '—'}
                  </Typography>
                  {sub.notes && (
                    <Typography variant="body2" sx={{ mt: 0.5 }} color="text.secondary">
                      {sub.notes}
                    </Typography>
                  )}
                </Paper>
              ))}
            </Box>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setHistoryOpen(false)}>{t('close')}</Button>
          <Button onClick={() => navigate('/team/dashboard')}>{t('backToTeamDashboard')}</Button>
        </DialogActions>
      </Dialog>
    </Container>
  );
}
