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
  const [roleLoading, setRoleLoading] = useState({}); // { [projectId]: bool }
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

  const handleSetProjectRole = async (projectId, role) => {
    setRoleLoading(prev => ({ ...prev, [projectId]: true }));
    try {
      const res = await api.put(`/teams/project/${projectId}/role`, { role });
      // Update the projects list with new memberRoles
      setProjects(prev => prev.map(p =>
        p.project?._id === projectId ? { ...p, memberRoles: res.data.data.memberRoles } : p
      ));
      setSnack({ open: true, msg: t('teamRoleSaveSuccess'), severity: 'success' });
    } catch (err) {
      const msg = err.response?.status === 409
        ? t('teamRoleAlreadyTaken')
        : err.response?.status === 400
        ? t('teamRoleAlreadyUsed')
        : t('teamRoleSaveError');
      setSnack({ open: true, msg, severity: 'error' });
    } finally {
      setRoleLoading(prev => ({ ...prev, [projectId]: false }));
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

  // Helper: get my role in a specific project enrollment
  const getMyProjectRole = (enrollment) => {
    const mr = (enrollment.memberRoles || []).find(r => r.user === user?._id || r.user?._id === user?._id || String(r.user) === String(user?._id));
    return mr?.role || null;
  };

  // Helper: get all roles I've already used across previous projects (to enforce rotation)
  const getMyUsedRoles = (currentEnrollment) => {
    return projects
      .filter(p => p._id !== currentEnrollment._id && new Date(p.enrolledAt) <= new Date(currentEnrollment.enrolledAt))
      .map(p => getMyProjectRole(p))
      .filter(Boolean);
  };

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

        {/* Team Members */}
        <Typography variant="h6" gutterBottom sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <PersonIcon /> {t('teamMembers')}
        </Typography>
        <Grid container spacing={2} sx={{ mt: 1 }}>
          {team.members?.map((member) => {
            const memberUser = member.user || member;
            const memberId = memberUser?._id || memberUser;
            const isMe = memberId === user?._id || String(memberId) === String(user?._id);
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
                  {/* Per-project role selector */}
                  <Box sx={{ px: 2, pb: 1 }}>
                    <Divider sx={{ mb: 1.5 }} />
                    <Typography variant="body2" fontWeight={600} sx={{ mb: 1 }}>
                      {t('teamRoleForProject')}
                    </Typography>
                    {/* Role chips for all members in this project */}
                    <Box sx={{ display: 'flex', gap: 0.5, flexWrap: 'wrap', mb: 1 }}>
                      {(enrollment.memberRoles || []).map(mr => {
                        const roleKey = mr.role;
                        const meta = ROLE_META[roleKey];
                        const memberUser = team.members?.find(m => String(m.user?._id || m.user) === String(mr.user?._id || mr.user))?.user;
                        const isMe = String(mr.user?._id || mr.user) === String(user?._id);
                        return (
                          <Chip
                            key={String(mr.user?._id || mr.user)}
                            size="small"
                            icon={meta?.icon}
                            label={`${isMe ? t('you') : (memberUser?.name || '...')}: ${t(meta?.labelKey || 'teamRoleUnassigned')}`}
                            color={isMe ? meta?.color || 'default' : 'default'}
                            variant={isMe ? 'filled' : 'outlined'}
                          />
                        );
                      })}
                    </Box>
                    {/* My role selector */}
                    {(() => {
                      const pid = enrollment.project?._id;
                      const myRole = getMyProjectRole(enrollment);
                      const takenRoles = (enrollment.memberRoles || [])
                        .filter(mr => String(mr.user?._id || mr.user) !== String(user?._id))
                        .map(mr => mr.role);
                      const usedInPrevious = getMyUsedRoles(enrollment);
                      return (
                        <FormControl size="small" sx={{ minWidth: 240 }} disabled={!!roleLoading[pid]}>
                          <InputLabel id={`role-label-${pid}`}>{t('teamRoleSelectPrompt')}</InputLabel>
                          <Select
                            labelId={`role-label-${pid}`}
                            value={myRole || ''}
                            label={t('teamRoleSelectPrompt')}
                            onChange={e => handleSetProjectRole(pid, e.target.value)}
                          >
                            {['system_designer', 'hardware_engineer', 'tester'].map(r => {
                              const meta = ROLE_META[r];
                              const taken = takenRoles.includes(r);
                              const usedPrev = usedInPrevious.includes(r);
                              return (
                                <MenuItem key={r} value={r} disabled={taken || usedPrev}>
                                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                                    {meta?.icon}
                                    <span>
                                      {t(meta?.labelKey)}
                                      {taken && ` — ${t('teamRoleAlreadyTaken')}`}
                                      {!taken && usedPrev && ` — ${t('teamRoleAlreadyUsed')}`}
                                    </span>
                                  </Box>
                                </MenuItem>
                              );
                            })}
                          </Select>
                        </FormControl>
                      );
                    })()}
                  </Box>
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
