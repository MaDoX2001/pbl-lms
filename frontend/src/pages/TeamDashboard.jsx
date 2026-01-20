import { useState, useEffect } from 'react';
import { useSelector } from 'react-redux';
import { useNavigate } from 'react-router-dom';
import {
  Container,
  Paper,
  Typography,
  Box,
  Grid,
  Card,
  CardContent,
  CardActions,
  Button,
  Chip,
  Avatar,
  CircularProgress,
  Alert,
  Divider,
} from '@mui/material';
import {
  Group as GroupIcon,
  Assignment as AssignmentIcon,
  Person as PersonIcon,
} from '@mui/icons-material';
import api from '../services/api';

/**
 * TeamDashboard Component
 * 
 * Shows student's team information and enrolled projects.
 * Access: Student only (shows their own team)
 */
const TeamDashboard = () => {
  const navigate = useNavigate();
  const { user } = useSelector((state) => state.auth);
  
  const [team, setTeam] = useState(null);
  const [projects, setProjects] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    fetchTeamData();
  }, []);

  const fetchTeamData = async () => {
    try {
      setLoading(true);
      
      // Get my team
      const teamResponse = await api.get('/teams/my-team');
      setTeam(teamResponse.data.data);
      
      // Get team's projects
      const projectsResponse = await api.get(`/team-projects/team/${teamResponse.data.data._id}`);
      setProjects(projectsResponse.data.data);
      
      setLoading(false);
    } catch (err) {
      setError(err.response?.data?.message || 'حدث خطأ في جلب بيانات الفريق');
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <Container maxWidth="lg" sx={{ mt: 4, display: 'flex', justifyContent: 'center' }}>
        <CircularProgress />
      </Container>
    );
  }

  if (error) {
    return (
      <Container maxWidth="lg" sx={{ mt: 4 }}>
        <Alert severity="error">{error}</Alert>
      </Container>
    );
  }

  if (!team) {
    return (
      <Container maxWidth="lg" sx={{ mt: 4 }}>
        <Alert severity="info">
          أنت لست عضواً في أي فريق بعد. يرجى التواصل مع المدير لإضافتك إلى فريق.
        </Alert>
      </Container>
    );
  }

  return (
    <Container maxWidth="lg" sx={{ mt: 4, mb: 4 }}>
      {/* Team Info Card */}
      <Paper elevation={3} sx={{ p: 3, mb: 3 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
          <Avatar sx={{ bgcolor: 'primary.main', mr: 2, width: 56, height: 56 }}>
            <GroupIcon fontSize="large" />
          </Avatar>
          <Box>
            <Typography variant="h4" gutterBottom>
              {team.name}
            </Typography>
            {team.description && (
              <Typography variant="body2" color="text.secondary">
                {team.description}
              </Typography>
            )}
          </Box>
        </Box>

        <Divider sx={{ my: 2 }} />

        {/* Team Members */}
        <Typography variant="h6" gutterBottom sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <PersonIcon /> أعضاء الفريق
        </Typography>
        <Grid container spacing={2} sx={{ mt: 1 }}>
          {team.members.map((member) => (
            <Grid item xs={12} sm={4} key={member._id}>
              <Card 
                variant="outlined"
                sx={{ 
                  cursor: 'pointer',
                  transition: 'all 0.3s ease',
                  '&:hover': {
                    boxShadow: 3,
                    transform: 'translateY(-4px)',
                    borderColor: 'primary.main'
                  }
                }}
                onClick={() => navigate(`/user/${member._id}`)}
              >
                <CardContent>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    <Avatar 
                      src={member.avatar}
                      sx={{ bgcolor: 'secondary.main' }}
                    >
                      {member.name.charAt(0)}
                    </Avatar>
                    <Box>
                      <Typography variant="body1" sx={{ fontWeight: 'bold' }}>
                        {member.name}
                      </Typography>
                      <Typography variant="body2" color="text.secondary">
                        {member.email}
                      </Typography>
                    </Box>
                  </Box>
                  {member._id === user._id && (
                    <Chip label="أنت" size="small" color="primary" sx={{ mt: 1 }} />
                  )}
                </CardContent>
              </Card>
            </Grid>
          ))}
        </Grid>
      </Paper>

      {/* Enrolled Projects */}
      <Typography variant="h5" gutterBottom sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
        <AssignmentIcon /> المشاريع المسجلة
      </Typography>
      
      {projects.length === 0 ? (
        <Alert severity="info" sx={{ mt: 2 }}>
          فريقك لم يسجل في أي مشروع بعد.
        </Alert>
      ) : (
        <Grid container spacing={3} sx={{ mt: 1 }}>
          {projects.map((enrollment) => (
            <Grid item xs={12} md={6} key={enrollment._id}>
              <Card>
                <CardContent>
                  <Typography variant="h6" gutterBottom>
                    {enrollment.project.title}
                  </Typography>
                  <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                    {enrollment.project.description?.substring(0, 150)}...
                  </Typography>
                  <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
                    <Chip 
                      label={`المستوى: ${enrollment.project.level || 'غير محدد'}`} 
                      size="small" 
                      color="primary" 
                      variant="outlined"
                    />
                    <Chip 
                      label={`تاريخ التسجيل: ${new Date(enrollment.enrolledAt).toLocaleDateString('ar-EG')}`} 
                      size="small" 
                      variant="outlined"
                    />
                  </Box>
                </CardContent>
                <CardActions>
                  <Button 
                    size="small" 
                    onClick={() => navigate(`/team/project/${enrollment.project._id}`)}
                  >
                    عرض المشروع والتسليمات
                  </Button>
                </CardActions>
              </Card>
            </Grid>
          ))}
        </Grid>
      )}
    </Container>
  );
};

export default TeamDashboard;
