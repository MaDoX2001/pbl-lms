import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Container,
  Paper,
  Typography,
  Box,
  Button,
  Card,
  CardContent,
  Chip,
  CircularProgress,
  Alert,
  Accordion,
  AccordionSummary,
  AccordionDetails,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  IconButton,
  Tooltip,
} from '@mui/material';
import {
  ExpandMore as ExpandMoreIcon,
  Visibility as VisibilityIcon,
  Assignment as AssignmentIcon,
} from '@mui/icons-material';
import { toast } from 'react-toastify';
import api from '../services/api';

/**
 * StudentProjectsManagement Component
 * 
 * Centralized view for teachers/admins to see:
 * - All teams
 * - Their enrolled projects
 * - Quick navigation to submissions
 * 
 * Access: Teacher/Admin only
 */
const StudentProjectsManagement = () => {
  const navigate = useNavigate();
  const [teams, setTeams] = useState([]);
  const [teamProjects, setTeamProjects] = useState({});
  const [loading, setLoading] = useState(true);
  const [expandedTeam, setExpandedTeam] = useState(null);

  useEffect(() => {
    fetchTeams();
  }, []);

  const fetchTeams = async () => {
    try {
      setLoading(true);
      const response = await api.get('/teams');
      const teamsData = response.data.data || [];
      setTeams(teamsData);
      
      // Fetch projects for each team
      const projectsMap = {};
      for (const team of teamsData) {
        try {
          const projectsResponse = await api.get(`/team-projects/team/${team._id}`);
          projectsMap[team._id] = projectsResponse.data.data || [];
        } catch (err) {
          projectsMap[team._id] = [];
        }
      }
      setTeamProjects(projectsMap);
      setLoading(false);
    } catch (err) {
      toast.error('فشل في تحميل الفرق');
      setLoading(false);
    }
  };

  const handleTeamChange = (teamId) => {
    setExpandedTeam(expandedTeam === teamId ? null : teamId);
  };

  const handleViewSubmissions = (projectId) => {
    navigate(`/projects/${projectId}/submissions`);
  };

  if (loading) {
    return (
      <Container maxWidth="lg" sx={{ mt: 4, display: 'flex', justifyContent: 'center' }}>
        <CircularProgress />
      </Container>
    );
  }

  return (
    <Container maxWidth="lg" sx={{ mt: 4, mb: 4 }}>
      <Paper elevation={3} sx={{ p: 3, mb: 3 }}>
        <Typography variant="h4" gutterBottom>
          مشروعات الطلاب
        </Typography>
        <Typography variant="body2" color="text.secondary">
          عرض جميع الفرق ومشروعاتهم وتسليماتهم
        </Typography>
      </Paper>

      {teams.length === 0 ? (
        <Alert severity="info">لا توجد فرق بعد</Alert>
      ) : (
        <Box>
          {teams.map((team) => {
            const projects = teamProjects[team._id] || [];
            
            return (
              <Accordion
                key={team._id}
                expanded={expandedTeam === team._id}
                onChange={() => handleTeamChange(team._id)}
                sx={{ mb: 2 }}
              >
                <AccordionSummary expandIcon={<ExpandMoreIcon />}>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, width: '100%' }}>
                    <Typography variant="h6">{team.name}</Typography>
                    <Chip
                      label={`${team.members?.length || 0} أعضاء`}
                      size="small"
                      color="primary"
                    />
                    <Chip
                      label={`${projects.length} مشروع`}
                      size="small"
                      color="secondary"
                    />
                  </Box>
                </AccordionSummary>

                <AccordionDetails>
                  {/* Team Members */}
                  <Box sx={{ mb: 3 }}>
                    <Typography variant="subtitle2" color="text.secondary" gutterBottom>
                      أعضاء الفريق:
                    </Typography>
                    <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
                      {team.members?.map((member) => (
                        <Chip
                          key={member._id}
                          label={member.name}
                          size="small"
                          variant="outlined"
                        />
                      ))}
                    </Box>
                  </Box>

                  {/* Team Projects */}
                  {projects.length === 0 ? (
                    <Alert severity="info" sx={{ mt: 2 }}>
                      لم يتم تسجيل الفريق في أي مشروع بعد
                    </Alert>
                  ) : (
                    <Box>
                      <Typography variant="subtitle2" gutterBottom sx={{ mb: 2 }}>
                        المشروعات المسجلة:
                      </Typography>
                      <TableContainer component={Paper} variant="outlined">
                        <Table size="small">
                          <TableHead>
                            <TableRow>
                              <TableCell><strong>اسم المشروع</strong></TableCell>
                              <TableCell><strong>المستوى</strong></TableCell>
                              <TableCell><strong>تاريخ التسجيل</strong></TableCell>
                              <TableCell align="center"><strong>الإجراءات</strong></TableCell>
                            </TableRow>
                          </TableHead>
                          <TableBody>
                            {projects.map((enrollment) => {
                              const project = enrollment.project;
                              if (!project) return null;

                              return (
                                <TableRow key={enrollment._id}>
                                  <TableCell>
                                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                                      <AssignmentIcon color="action" fontSize="small" />
                                      {project.title}
                                    </Box>
                                  </TableCell>
                                  <TableCell>
                                    <Chip
                                      label={project.difficulty || 'غير محدد'}
                                      size="small"
                                      color={
                                        project.difficulty === 'easy' ? 'success' :
                                        project.difficulty === 'medium' ? 'warning' :
                                        project.difficulty === 'hard' ? 'error' : 'default'
                                      }
                                    />
                                  </TableCell>
                                  <TableCell>
                                    {new Date(enrollment.enrolledAt).toLocaleDateString('ar-EG')}
                                  </TableCell>
                                  <TableCell align="center">
                                    <Tooltip title="عرض التسليمات">
                                      <IconButton
                                        color="primary"
                                        onClick={() => handleViewSubmissions(project._id)}
                                        size="small"
                                      >
                                        <VisibilityIcon />
                                      </IconButton>
                                    </Tooltip>
                                  </TableCell>
                                </TableRow>
                              );
                            })}
                          </TableBody>
                        </Table>
                      </TableContainer>
                    </Box>
                  )}
                </AccordionDetails>
              </Accordion>
            );
          })}
        </Box>
      )}
    </Container>
  );
};

export default StudentProjectsManagement;
