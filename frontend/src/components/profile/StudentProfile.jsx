import React, { useState } from 'react';
import {
  Box,
  Grid,
  Paper,
  Typography,
  Tabs,
  Tab,
  Card,
  CardContent,
  LinearProgress,
  Chip,
  Button,
  List,
  ListItem,
  ListItemText,
  ListItemIcon,
  Divider
} from '@mui/material';
import {
  TrendingUp,
  Assignment,
  CheckCircle,
  Schedule,
  Star,
  FolderOpen,
  Assessment,
  Notifications,
  Settings as SettingsIcon
} from '@mui/icons-material';
import ProfileHeader from './ProfileHeader';

const StudentProfile = ({ user }) => {
  const [activeTab, setActiveTab] = useState(0);

  // Dummy data
  const stats = {
    level: 5,
    points: 1250,
    projectsCount: 8,
    completedProjects: 5,
    pendingSubmissions: 3,
    averageGrade: 85
  };

  const projects = [
    { id: 1, name: 'تطوير تطبيق ويب', status: 'active', progress: 75, grade: null },
    { id: 2, name: 'نظام إدارة المكتبة', status: 'active', progress: 40, grade: null },
    { id: 3, name: 'تطبيق الطقس', status: 'completed', progress: 100, grade: 92 },
    { id: 4, name: 'موقع إلكتروني شخصي', status: 'completed', progress: 100, grade: 88 },
  ];

  const recentActivity = [
    { type: 'submission', text: 'تم رفع الواجب: المرحلة 3 - تطوير تطبيق ويب', time: 'منذ ساعتين' },
    { type: 'grade', text: 'حصلت على 92 في مشروع تطبيق الطقس', time: 'أمس' },
    { type: 'comment', text: 'المعلم علق على واجبك', time: 'منذ 3 أيام' },
    { type: 'project', text: 'انضممت لمشروع جديد: نظام إدارة المكتبة', time: 'منذ أسبوع' },
  ];

  const handleTabChange = (event, newValue) => {
    setActiveTab(newValue);
  };

  const handleEditProfile = () => {
    // TODO: Open edit dialog
    console.log('Edit profile');
  };

  return (
    <Box>
      <ProfileHeader user={user} onEdit={handleEditProfile} />

      {/* Stats Cards */}
      <Grid container spacing={3} sx={{ mb: 3 }}>
        <Grid item xs={12} sm={6} md={3}>
          <Card sx={{ bgcolor: '#e3f2fd', borderRadius: 2 }}>
            <CardContent>
              <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <Box>
                  <Typography color="textSecondary" variant="body2">المستوى</Typography>
                  <Typography variant="h4" sx={{ fontWeight: 'bold', color: '#1976d2' }}>
                    {stats.level}
                  </Typography>
                </Box>
                <TrendingUp sx={{ fontSize: 48, color: '#1976d2', opacity: 0.7 }} />
              </Box>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} sm={6} md={3}>
          <Card sx={{ bgcolor: '#fff3e0', borderRadius: 2 }}>
            <CardContent>
              <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <Box>
                  <Typography color="textSecondary" variant="body2">النقاط</Typography>
                  <Typography variant="h4" sx={{ fontWeight: 'bold', color: '#f57c00' }}>
                    {stats.points}
                  </Typography>
                </Box>
                <Star sx={{ fontSize: 48, color: '#f57c00', opacity: 0.7 }} />
              </Box>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} sm={6} md={3}>
          <Card sx={{ bgcolor: '#e8f5e9', borderRadius: 2 }}>
            <CardContent>
              <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <Box>
                  <Typography color="textSecondary" variant="body2">المشاريع المكتملة</Typography>
                  <Typography variant="h4" sx={{ fontWeight: 'bold', color: '#388e3c' }}>
                    {stats.completedProjects}
                  </Typography>
                </Box>
                <CheckCircle sx={{ fontSize: 48, color: '#388e3c', opacity: 0.7 }} />
              </Box>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} sm={6} md={3}>
          <Card sx={{ bgcolor: '#fce4ec', borderRadius: 2 }}>
            <CardContent>
              <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <Box>
                  <Typography color="textSecondary" variant="body2">المعدل</Typography>
                  <Typography variant="h4" sx={{ fontWeight: 'bold', color: '#c2185b' }}>
                    {stats.averageGrade}%
                  </Typography>
                </Box>
                <Assessment sx={{ fontSize: 48, color: '#c2185b', opacity: 0.7 }} />
              </Box>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {/* Tabs */}
      <Paper sx={{ borderRadius: 2 }}>
        <Tabs
          value={activeTab}
          onChange={handleTabChange}
          indicatorColor="primary"
          textColor="primary"
          variant="scrollable"
          scrollButtons="auto"
          sx={{ borderBottom: 1, borderColor: 'divider', px: 2 }}
        >
          <Tab icon={<FolderOpen />} label="مشاريعي" iconPosition="start" />
          <Tab icon={<Assignment />} label="الواجبات والدرجات" iconPosition="start" />
          <Tab icon={<Notifications />} label="النشاط الأخير" iconPosition="start" />
          <Tab icon={<SettingsIcon />} label="الإعدادات" iconPosition="start" />
        </Tabs>

        <Box sx={{ p: 3 }}>
          {/* Tab 0: Projects */}
          {activeTab === 0 && (
            <Grid container spacing={3}>
              {projects.map((project) => (
                <Grid item xs={12} md={6} key={project.id}>
                  <Card variant="outlined" sx={{ borderRadius: 2 }}>
                    <CardContent>
                      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start', mb: 2 }}>
                        <Typography variant="h6" sx={{ fontWeight: 'bold' }}>
                          {project.name}
                        </Typography>
                        <Chip
                          label={project.status === 'active' ? 'نشط' : 'مكتمل'}
                          color={project.status === 'active' ? 'primary' : 'success'}
                          size="small"
                        />
                      </Box>

                      <Box sx={{ mb: 2 }}>
                        <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
                          <Typography variant="body2" color="textSecondary">التقدم</Typography>
                          <Typography variant="body2" sx={{ fontWeight: 'bold' }}>
                            {project.progress}%
                          </Typography>
                        </Box>
                        <LinearProgress
                          variant="determinate"
                          value={project.progress}
                          sx={{ height: 8, borderRadius: 1 }}
                        />
                      </Box>

                      {project.grade && (
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                          <Star sx={{ color: '#ffa726' }} />
                          <Typography variant="body2">
                            الدرجة: <strong>{project.grade}/100</strong>
                          </Typography>
                        </Box>
                      )}

                      <Button
                        fullWidth
                        variant="outlined"
                        sx={{ mt: 2 }}
                      >
                        عرض المشروع
                      </Button>
                    </CardContent>
                  </Card>
                </Grid>
              ))}
            </Grid>
          )}

          {/* Tab 1: Submissions & Grades */}
          {activeTab === 1 && (
            <Box>
              <Typography variant="h6" sx={{ mb: 2, fontWeight: 'bold' }}>
                الواجبات والدرجات
              </Typography>
              <List>
                {projects.filter(p => p.grade).map((project, index) => (
                  <React.Fragment key={project.id}>
                    <ListItem
                      sx={{
                        borderRadius: 2,
                        mb: 1,
                        '&:hover': { bgcolor: '#f5f5f5' }
                      }}
                    >
                      <ListItemIcon>
                        <Assignment color="primary" />
                      </ListItemIcon>
                      <ListItemText
                        primary={project.name}
                        secondary="تم التسليم"
                      />
                      <Chip
                        label={`${project.grade}/100`}
                        color={project.grade >= 80 ? 'success' : 'warning'}
                        sx={{ fontWeight: 'bold' }}
                      />
                    </ListItem>
                    {index < projects.filter(p => p.grade).length - 1 && <Divider />}
                  </React.Fragment>
                ))}
              </List>
            </Box>
          )}

          {/* Tab 2: Recent Activity */}
          {activeTab === 2 && (
            <Box>
              <Typography variant="h6" sx={{ mb: 2, fontWeight: 'bold' }}>
                النشاط الأخير
              </Typography>
              <List>
                {recentActivity.map((activity, index) => (
                  <React.Fragment key={index}>
                    <ListItem
                      sx={{
                        borderRadius: 2,
                        mb: 1,
                        '&:hover': { bgcolor: '#f5f5f5' }
                      }}
                    >
                      <ListItemIcon>
                        {activity.type === 'submission' && <Schedule color="primary" />}
                        {activity.type === 'grade' && <Star sx={{ color: '#ffa726' }} />}
                        {activity.type === 'comment' && <Notifications color="action" />}
                        {activity.type === 'project' && <FolderOpen color="success" />}
                      </ListItemIcon>
                      <ListItemText
                        primary={activity.text}
                        secondary={activity.time}
                      />
                    </ListItem>
                    {index < recentActivity.length - 1 && <Divider />}
                  </React.Fragment>
                ))}
              </List>
            </Box>
          )}

          {/* Tab 3: Settings */}
          {activeTab === 3 && (
            <Box>
              <Typography variant="h6" sx={{ mb: 2, fontWeight: 'bold' }}>
                الإعدادات
              </Typography>
              <Typography color="textSecondary">
                قريباً: إعدادات الحساب، تفضيلات الإشعارات، وإدارة البيانات الشخصية
              </Typography>
            </Box>
          )}
        </Box>
      </Paper>
    </Box>
  );
};

export default StudentProfile;
