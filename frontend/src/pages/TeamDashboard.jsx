import { useState, useEffect, useCallback } from 'react';
import { useSelector } from 'react-redux';
import { useNavigate } from 'react-router-dom';
import {
  Container, Paper, Typography, Box, Grid, Card, CardContent,
  CardActions, Button, Chip, Avatar, CircularProgress, Alert,
  Divider, FormControl, InputLabel, Select, MenuItem, Snackbar,
  Table, TableBody, TableCell, TableContainer, TableHead, TableRow,
  IconButton, Tooltip, Tab, Tabs,
} from '@mui/material';
import {
  Group as GroupIcon,
  Assignment as AssignmentIcon,
  Person as PersonIcon,
  Folder as FolderIcon,
  Download as DownloadIcon,
  Engineering as EngineeringIcon,
  BugReport as BugReportIcon,
  DesignServices as DesignServicesIcon,
} from '@mui/icons-material';
import api from '../services/api';
import { useAppSettings } from '../context/AppSettingsContext';

// Role metadata: label, color, icon
const ROLE_META = {
  system_designer:  { labelKey: 'teamRoleSystemDesigner',  color: 'primary',   icon: <DesignServicesIcon fontSize="small" /> },
  hardware_engineer:{ labelKey: 'teamRoleHardwareEngineer', color: 'warning',   icon: <EngineeringIcon fontSize="small" /> },
  tester:           { labelKey: 'teamRoleTester',            color: 'success',   icon: <BugReportIcon fontSize="small" /> },
  unassigned:       { labelKey: 'teamRoleUnassigned',        color: 'default',   icon: null },
};

const TeamDashboard = () => {
  const navigate = useNavigate();
  const { user } = useSelector((state) => state.auth);
  const { t } = useAppSettings();

  const [team, setTeam] = useState(null);
  const [projects, setProjects] = useState([]);
  const [files, setFiles] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filesLoading, setFilesLoading] = useState(false);
  const [error, setError] = useState('');
  const [roleLoading, setRoleLoading] = useState(false);
  const [snack, setSnack] = useState({ open: false, msg: '', severity: 'success' });
  const [activeTab, setActiveTab] = useState(0);
  const [projectFilter, setProjectFilter] = useState('all');

  const fetchTeamData = useCallback(async () => {
    try {
      setLoading(true);
      const teamRes = await api.get('/teams/my-team');
      const teamData = teamRes.data.data;
      setTeam(teamData);
      const projectsRes = await api.get(`/team-projects/team/${teamData._id}`);
      setProjects(projectsRes.data.data || []);
    } catch (err) {
      setError(err.response?.data?.message || t('teamDataFetchError'));
    } finally {
      setLoading(false);
    }
  }, [t]);

  const fetchFiles = useCallback(async (teamId, filterProjectId) => {
    try {
      setFilesLoading(true);
      let all = [];
      // Fetch submissions per project or all projects
      const projectIds = filterProjectId === 'all'
        ? projects.map(p => p.project?._id).filter(Boolean)
        : [filterProjectId];
      for (const pid of projectIds) {
        try {
          const res = await api.get(`/team-submissions/team/${teamId}/project/${pid}`);
          all = [...all, ...(res.data.data || [])];
        } catch {}
      }
      setFiles(all);
    } finally {
      setFilesLoading(false);
    }
  }, [projects]);

  useEffect(() => { fetchTeamData(); }, [fetchTeamData]);

  useEffect(() => {
    if (team && activeTab === 1) fetchFiles(team._id, projectFilter);
  }, [team, activeTab, projectFilter, fetchFiles]);

  const handleSetRole = async (role) => {
    setRoleLoading(true);
    try {
      const res = await api.put('/teams/my-team/role', { role });
      setTeam(res.data.data);
      setSnack({ open: true, msg: t('teamRoleSaveSuccess'), severity: 'success' });
    } catch (err) {
      const msg = err.response?.status === 409
        ? t('teamRoleAlreadyTaken')
        : t('teamRoleSaveError');
      setSnack({ open: true, msg, severity: 'error' });
    } finally {
      setRoleLoading(false);
    }
  };

  if (loading) return (
    <Container maxWidth="lg" sx={{ mt: 4, display: 'flex', justifyContent: 'center' }}>
      <CircularProgress />
    </Container>
  );

  if (error) return (
    <Container maxWidth="lg" sx={{ mt: 4 }}>
      <Alert severity="error">{error}</Alert>
    </Container>
  );

  if (!team) return (
    <Container maxWidth="lg" sx={{ mt: 4 }}>
      <Alert severity="info">{t('notInTeamYet')}</Alert>
    </Container>
  );

  // Find current user's member record
  const myMember = team.members?.find(m => (m.user?._id || m.user) === user?._id || m.user?._id === user?._id);
  const myRole = myMember?.role || 'unassigned';

  return (
    <Container maxWidth="lg" sx={{ mt: 4, mb: 4 }}>
      {/* Team Info Card */}
      <Paper elevation={3} sx={{ p: 3, mb: 3 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
          <Avatar sx={{ bgcolor: 'primary.main', mr: 2, width: 56, height: 56 }}>
            <GroupIcon fontSize="large" />
          </Avatar>
          <Box>
            <Typography variant="h4" gutterBottom>{team.name}</Typography>
            {team.description && (
              <Typography variant="body2" color="text.secondary">{team.description}</Typography>
            )}
          </Box>
        </Box>

        <Divider sx={{ my: 2 }} />

        {/* My Role Selector */}
        <Box sx={{ mb: 2, display: 'flex', alignItems: 'center', gap: 2, flexWrap: 'wrap' }}>
          <Typography variant="subtitle1" fontWeight={600}>{t('teamRoleLabel')}:</Typography>
          <FormControl size="small" sx={{ minWidth: 220 }} disabled={roleLoading}>
            <InputLabel id="my-role-label">{t('teamRoleSelectPrompt')}</InputLabel>
            <Select
              labelId="my-role-label"
              value={myRole === 'unassigned' ? '' : myRole}
              label={t('teamRoleSelectPrompt')}
              onChange={e => handleSetRole(e.target.value)}
            >
              <MenuItem value="system_designer">{t('teamRoleSystemDesigner')}</MenuItem>
              <MenuItem value="hardware_engineer">{t('teamRoleHardwareEngineer')}</MenuItem>
              <MenuItem value="tester">{t('teamRoleTester')}</MenuItem>
            </Select>
          </FormControl>
          {myRole !== 'unassigned' && (
            <Chip
              size="small"
              icon={ROLE_META[myRole]?.icon}
              label={t(ROLE_META[myRole]?.labelKey)}
              color={ROLE_META[myRole]?.color}
            />
          )}
        </Box>

        <Divider sx={{ my: 2 }} />

        {/* Team Members */}
        <Typography variant="h6" gutterBottom sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <PersonIcon /> {t('teamMembers')}
        </Typography>
        <Grid container spacing={2} sx={{ mt: 1 }}>
          {team.members?.map((member) => {
            const memberUser = member.user || member;
            const memberId = memberUser?._id || memberUser;
            const isMe = memberId === user?._id || String(memberId) === String(user?._id);
            const role = member.role || 'unassigned';
            const roleMeta = ROLE_META[role];
            return (
              <Grid item xs={12} sm={4} key={String(memberId)}>
                <Card
                  variant="outlined"
                  sx={{
                    cursor: 'pointer', transition: 'all 0.3s ease',
                    '&:hover': { boxShadow: 3, transform: 'translateY(-4px)', borderColor: 'primary.main' }
                  }}
                  onClick={() => !isMe && navigate(`/user/${memberId}`)}
                >
                  <CardContent>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                      <Avatar src={memberUser?.avatar} sx={{ bgcolor: 'secondary.main' }}>
                        {(memberUser?.name || '?').charAt(0)}
                      </Avatar>
                      <Box>
                        <Typography variant="body1" sx={{ fontWeight: 'bold' }}>
                          {memberUser?.name || '—'}
                        </Typography>
                        <Typography variant="body2" color="text.secondary">
                          {memberUser?.email || ''}
                        </Typography>
                      </Box>
                    </Box>
                    <Box sx={{ mt: 1, display: 'flex', gap: 0.5, flexWrap: 'wrap' }}>
                      {isMe && <Chip label={t('you')} size="small" color="primary" />}
                      <Chip
                        size="small"
                        icon={roleMeta?.icon}
                        label={t(roleMeta?.labelKey || 'teamRoleUnassigned')}
                        color={roleMeta?.color || 'default'}
                        variant={role === 'unassigned' ? 'outlined' : 'filled'}
                      />
                    </Box>
                  </CardContent>
                </Card>
              </Grid>
            );
          })}
        </Grid>
      </Paper>

      {/* Tabs: Projects | Files */}
      <Tabs value={activeTab} onChange={(_, v) => setActiveTab(v)} sx={{ mb: 2 }}>
        <Tab icon={<AssignmentIcon />} iconPosition="start" label={t('enrolledProjects')} />
        <Tab icon={<FolderIcon />} iconPosition="start" label={t('teamSharedFiles')} />
      </Tabs>

      {/* Tab 0: Projects */}
      {activeTab === 0 && (
        projects.length === 0 ? (
          <Alert severity="info">{t('teamNoProjectsYet')}</Alert>
        ) : (
          <Grid container spacing={3}>
            {projects.map((enrollment) => (
              <Grid item xs={12} md={6} key={enrollment._id}>
                <Card>
                  <CardContent>
                    <Typography variant="h6" gutterBottom>{enrollment.project?.title}</Typography>
                    <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                      {enrollment.project?.description?.substring(0, 150)}...
                    </Typography>
                    <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
                      <Chip
                        label={t('levelWithValue', { level: enrollment.project?.level || t('notSpecified') })}
                        size="small" color="primary" variant="outlined"
                      />
                      <Chip
                        label={t('enrollmentDateWithValue', { date: new Date(enrollment.enrolledAt).toLocaleDateString('ar-EG') })}
                        size="small" variant="outlined"
                      />
                    </Box>
                  </CardContent>
                  <CardActions>
                    <Button size="small" onClick={() => navigate(`/team/project/${enrollment.project?._id}`)}>
                      {t('viewProjectAndSubmissions')}
                    </Button>
                  </CardActions>
                </Card>
              </Grid>
            ))}
          </Grid>
        )
      )}

      {/* Tab 1: Shared Files */}
      {activeTab === 1 && (
        <Paper elevation={2} sx={{ p: 3 }}>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2, flexWrap: 'wrap', gap: 1 }}>
            <Typography variant="h6">{t('teamSharedFiles')}</Typography>
            <FormControl size="small" sx={{ minWidth: 180 }}>
              <InputLabel>{t('teamFilesProject')}</InputLabel>
              <Select value={projectFilter} label={t('teamFilesProject')} onChange={e => setProjectFilter(e.target.value)}>
                <MenuItem value="all">{t('teamFilesAllProjects')}</MenuItem>
                {projects.map(p => (
                  <MenuItem key={p.project?._id} value={p.project?._id}>{p.project?.title}</MenuItem>
                ))}
              </Select>
            </FormControl>
          </Box>

          {filesLoading ? (
            <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}><CircularProgress /></Box>
          ) : files.length === 0 ? (
            <Alert severity="info">{t('teamFilesNoFiles')}</Alert>
          ) : (
            <TableContainer>
              <Table size="small">
                <TableHead>
                  <TableRow>
                    <TableCell>{t('teamFilesProject')}</TableCell>
                    <TableCell>اسم الملف</TableCell>
                    <TableCell>{t('teamFilesUploadedBy')}</TableCell>
                    <TableCell>{t('teamFilesDate')}</TableCell>
                    <TableCell align="center">{t('teamFilesDownload')}</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {files.map(f => (
                    <TableRow key={f._id} hover>
                      <TableCell>{f.project?.title || '—'}</TableCell>
                      <TableCell sx={{ maxWidth: 200, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {f.fileName}
                      </TableCell>
                      <TableCell>{f.submittedBy?.name || '—'}</TableCell>
                      <TableCell>{new Date(f.submittedAt).toLocaleDateString('ar-EG')}</TableCell>
                      <TableCell align="center">
                        <Tooltip title={t('teamFilesDownload')}>
                          <IconButton size="small" component="a" href={f.fileUrl} target="_blank" rel="noopener noreferrer">
                            <DownloadIcon fontSize="small" />
                          </IconButton>
                        </Tooltip>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>
          )}
        </Paper>
      )}

      <Snackbar
        open={snack.open}
        autoHideDuration={3000}
        onClose={() => setSnack(s => ({ ...s, open: false }))}
        message={snack.msg}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
      />
    </Container>
  );
};

export default TeamDashboard;
