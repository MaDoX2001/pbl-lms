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
  import Dialog from '@mui/material/Dialog';
  import DialogTitle from '@mui/material/DialogTitle';
  import DialogContent from '@mui/material/DialogContent';
  import DialogActions from '@mui/material/DialogActions';
import {
  Group as GroupIcon,
  Assignment as AssignmentIcon,
  Person as PersonIcon,
  Chat as ChatIcon,
  Folder as FolderIcon,
  Download as DownloadIcon,
  Engineering as EngineeringIcon,
  BugReport as BugReportIcon,
  DesignServices as DesignServicesIcon,
} from '@mui/icons-material';
  import HistoryIcon from '@mui/icons-material/History';
import api from '../services/api';
import { useAppSettings } from '../context/AppSettingsContext';

// Role metadata: label, color, icon
const ROLE_META = {
  system_designer:  { labelKey: 'teamRoleSystemDesigner',  color: 'primary',   icon: <DesignServicesIcon fontSize="small" /> },
  hardware_engineer:{ labelKey: 'teamRoleHardwareEngineer', color: 'warning',   icon: <EngineeringIcon fontSize="small" /> },
  tester:           { labelKey: 'teamRoleTester',            color: 'success',   icon: <BugReportIcon fontSize="small" /> },
  unassigned:       { labelKey: 'teamRoleUnassigned',        color: 'default',   icon: null },
};

const TEST_BYPASS_ROLE_ROTATION_EMAILS = [
  'maaadooo2001@gmail.com',
  'maaadooo.2001@gmail.com',
  'maaadooo20.01@gmail.com'
];

const TeamDashboard = () => {
  const navigate = useNavigate();
  const { user } = useSelector((state) => state.auth);
  const { t } = useAppSettings();
  const currentUserId = user?._id || user?.id;
  const currentUserEmail = String(user?.email || '').toLowerCase();
  const bypassRoleRotation = TEST_BYPASS_ROLE_ROTATION_EMAILS.includes(currentUserEmail);

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
    const [wokwiData, setWokwiData] = useState({});   // { [projectId]: { latest: null|obj } }
    const [historyDialog, setHistoryDialog] = useState({ open: false, teamId: null, projectId: null, submissions: [], loading: false });

  const fetchTeamData = useCallback(async () => {
    try {
      setLoading(true);
      const teamRes = await api.get('/teams/my-team');
      const teamData = teamRes.data.data;
      setTeam(teamData);
      const projectsRes = await api.get('/team-projects/my-team');
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

  // Fetch latest Wokwi submission per project
  const fetchWokwiData = useCallback(async (teamId, projectIds) => {
    for (const pid of projectIds) {
      try {
        const res = await api.get(`/team-submissions/wokwi/${teamId}/${pid}`);
        const subs = res.data.data || [];
        setWokwiData(prev => ({ ...prev, [pid]: { latest: subs[0] || null } }));
      } catch {}
    }
  }, []);

  // Load wokwi data when team + projects are ready
  useEffect(() => {
    if (team && projects.length > 0) {
      const pids = projects.map(p => p.project?._id).filter(Boolean);
      fetchWokwiData(team._id, pids);
    }
  }, [team, projects, fetchWokwiData]);

  const openHistoryDialog = async (teamId, projectId) => {
    setHistoryDialog({ open: true, teamId, projectId, submissions: [], loading: true });
    try {
      const res = await api.get(`/team-submissions/wokwi/${teamId}/${projectId}`);
      setHistoryDialog(prev => ({ ...prev, submissions: res.data.data || [], loading: false }));
    } catch {
      setHistoryDialog(prev => ({ ...prev, loading: false }));
    }
  };

  const handleSetProjectRole = async (projectId, role) => {
    if (document.activeElement && typeof document.activeElement.blur === 'function') {
      document.activeElement.blur();
    }

    setRoleLoading(prev => ({ ...prev, [projectId]: true }));
    try {
      const res = await api.put(`/teams/project/${projectId}/role`, { role });
      // Update the projects list with new memberRoles
      setProjects(prev => prev.map(p =>
        p.project?._id === projectId ? { ...p, memberRoles: res.data.data.memberRoles } : p
      ));
      setSnack({ open: true, msg: res.data?.message || t('teamRoleSaveSuccess'), severity: 'success' });
    } catch (err) {
      const msg = err.response?.data?.message || (err.response?.status === 409
        ? t('teamRoleAlreadyTaken')
        : err.response?.status === 400
        ? t('teamRoleAlreadyUsed')
        : t('teamRoleSaveError'));
      setSnack({ open: true, msg, severity: 'error' });
    } finally {
      setRoleLoading(prev => ({ ...prev, [projectId]: false }));
    }
  };

  const handleOpenInSimulator = (link, projectId) => {
    if (!link) {
      setSnack({ open: true, msg: 'لا يوجد رابط Wokwi صالح لفتحه', severity: 'warning' });
      return;
    }
    const encodedLink = encodeURIComponent(link);
    const encodedProject = encodeURIComponent(projectId || '');
    navigate(`/arduino-simulator?wokwiLink=${encodedLink}&projectId=${encodedProject}`);
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
    const mr = (enrollment.memberRoles || []).find((r) => {
      const roleUserId = r.user?._id || r.user?.id || r.user;
      return String(roleUserId) === String(currentUserId);
    });
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
    <>
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
          <Box sx={{ flex: 1 }} />
          <Button
            variant="contained"
            startIcon={<ChatIcon />}
            onClick={() => navigate('/chat?type=team&autoOpen=1')}
          >
            شات الفريق
          </Button>
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
                        const isMe = String(mr.user?._id || mr.user?.id || mr.user) === String(currentUserId);
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
                      const rotationOrder = ['system_designer', 'hardware_engineer', 'tester'];
                      const takenRoles = (enrollment.memberRoles || [])
                        .filter(mr => String(mr.user?._id || mr.user?.id || mr.user) !== String(currentUserId))
                        .map(mr => mr.role);
                      const usedInPrevious = bypassRoleRotation ? [] : getMyUsedRoles(enrollment);
                      const suggestedRole = rotationOrder.find(r => !takenRoles.includes(r) && !usedInPrevious.includes(r))
                        || rotationOrder.find(r => !takenRoles.includes(r))
                        || null;
                      return (
                        <Box>
                          {suggestedRole && !myRole && (
                            <Chip
                              size="small"
                              color="info"
                              sx={{ mb: 1 }}
                              label={`الدور المقترح لك الآن: ${t(ROLE_META[suggestedRole]?.labelKey)}`}
                            />
                          )}
                          {myRole ? (
                            <Alert severity="success" sx={{ py: 0.5 }}>
                              دورك مثبت في هذا المشروع: <strong>{t(ROLE_META[myRole]?.labelKey || 'teamRoleUnassigned')}</strong>
                            </Alert>
                          ) : (
                            <FormControl size="small" sx={{ minWidth: 240 }} disabled={!!roleLoading[pid]}>
                              <InputLabel id={`role-label-${pid}`}>{t('teamRoleSelectPrompt')}</InputLabel>
                              <Select
                                labelId={`role-label-${pid}`}
                                value={myRole || ''}
                                label={t('teamRoleSelectPrompt')}
                                onChange={e => handleSetProjectRole(pid, e.target.value)}
                                MenuProps={{
                                  disableAutoFocusItem: true,
                                  disableRestoreFocus: false
                                }}
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
                          )}
                        </Box>
                      );
                    })()}
                  </Box>
                  <CardActions>
                    <Button size="small" onClick={() => navigate(`/team/project/${enrollment.project?._id}`)}>
                      {t('viewProjectAndSubmissions')}
                    </Button>
                  </CardActions>
                    {/* ---- Wokwi Section ---- */}
                    <Box sx={{ px: 2, pb: 2 }}>
                      <Divider sx={{ mb: 1.5 }} />
                      <Typography variant="body2" fontWeight={600} sx={{ mb: 1 }}>
                        {t('wokwiLatestVersion')}
                      </Typography>
                      {(() => {
                        const latest = wokwiData[enrollment.project?._id]?.latest;
                        return latest ? (
                        <Box>
                          <Typography variant="body2" color="text.secondary">
                            {t('wokwiLastUpdatedBy')}: <strong>{latest.submittedBy?.name}</strong>
                            {' — '}{new Date(latest.submittedAt).toLocaleString('ar-EG')}
                          </Typography>
                          {latest.notes && (
                            <Typography variant="caption" color="text.secondary" display="block" sx={{ mt: 0.5, fontStyle: 'italic' }}>
                              {latest.notes}
                            </Typography>
                          )}
                          <Box sx={{ display: 'flex', gap: 1, mt: 1, flexWrap: 'wrap' }}>
                            <Button
                              size="small" variant="outlined"
                              onClick={() => handleOpenInSimulator(latest.wokwiLink, enrollment.project?._id)}
                            >
                              فتح في صفحة المحاكي
                            </Button>
                            <Button
                              size="small" variant="outlined" startIcon={<HistoryIcon />}
                              onClick={() => openHistoryDialog(team._id, enrollment.project?._id)}
                            >
                              {t('wokwiVersionHistory')}
                            </Button>
                          </Box>
                        </Box>
                      ) : (
                        <Typography variant="caption" color="text.secondary">
                          {t('wokwiNoSubmissions')}
                        </Typography>
                      );
                      })()}
                    </Box>
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

      {/* Wokwi Version History Dialog */}
      <Dialog
        open={historyDialog.open}
        onClose={() => setHistoryDialog(p => ({ ...p, open: false }))}
        maxWidth="sm" fullWidth
      >
        <DialogTitle fontWeight={700}>{t('wokwiVersionHistory')}</DialogTitle>
        <DialogContent dividers>
          {historyDialog.loading ? (
            <Box sx={{ display: 'flex', justifyContent: 'center', py: 3 }}><CircularProgress /></Box>
          ) : historyDialog.submissions.length === 0 ? (
            <Alert severity="info">{t('wokwiNoSubmissions')}</Alert>
          ) : (
            (() => {
              const latestByStage = [];
              const archivedReviewed = [];
              const seenKeys = new Set();

              historyDialog.submissions.forEach((sub) => {
                const submitterId = String(sub.submittedBy?._id || sub.submittedBy?.id || sub.submittedBy || '');
                const stageKey = String(sub.stageKey || 'wiring');
                const groupingKey = stageKey === 'programming' ? `programming:${submitterId}` : stageKey;

                if (!seenKeys.has(groupingKey)) {
                  seenKeys.add(groupingKey);
                  latestByStage.push(sub);
                } else {
                  archivedReviewed.push(sub);
                }
              });

              const renderSubmissionCard = (sub, options = {}) => (
                <Paper key={sub._id} variant="outlined" sx={{ p: 2, opacity: options.archived ? 0.92 : 1 }}>
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 1 }}>
                    <Box>
                      <Typography variant="body2" fontWeight={600}>{sub.submittedBy?.name}</Typography>
                      <Typography variant="caption" color="text.secondary">
                        {new Date(sub.submittedAt).toLocaleString('ar-EG')}
                      </Typography>
                      {sub.notes && (
                        <Typography variant="body2" sx={{ mt: 0.5, fontStyle: 'italic' }} color="text.secondary">
                          {sub.notes}
                        </Typography>
                      )}
                    </Box>
                    <Button
                      size="small" variant="outlined"
                      onClick={() => handleOpenInSimulator(sub.wokwiLink, historyDialog.projectId)}
                    >
                      فتح في صفحة المحاكي
                    </Button>
                  </Box>
                  {options.latest && (
                    <Chip label={t('wokwiLatestVersion')} size="small" color="success" sx={{ mt: 1 }} />
                  )}
                  {options.archived && (
                    <Chip label="نسخة قديمة محفوظة (تقييم/مراجعة معلم)" size="small" color="warning" sx={{ mt: 1 }} />
                  )}
                </Paper>
              );

              return (
                <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                  <Typography variant="subtitle2" fontWeight={700}>أحدث النسخ حسب المرحلة</Typography>
                  {latestByStage.map((sub) => renderSubmissionCard(sub, { latest: true }))}

                  {archivedReviewed.length > 0 && (
                    <>
                      <Divider sx={{ my: 0.5 }} />
                      <Typography variant="subtitle2" fontWeight={700} color="warning.main">
                        نسخ قديمة محفوظة
                      </Typography>
                      {archivedReviewed.map((sub) => renderSubmissionCard(sub, { archived: true }))}
                    </>
                  )}
                </Box>
              );
            })()
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setHistoryDialog(p => ({ ...p, open: false }))}>{t('close')}</Button>
        </DialogActions>
      </Dialog>
    </>
  );
};

export default TeamDashboard;
