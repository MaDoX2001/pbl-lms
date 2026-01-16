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
  Button,
  List,
  ListItem,
  ListItemText,
  ListItemAvatar,
  Avatar,
  Chip,
  Divider,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow
} from '@mui/material';
import {
  Add,
  People,
  Assignment,
  Folder,
  BarChart,
  Settings as SettingsIcon,
  School,
  CheckCircle,
  Schedule
} from '@mui/icons-material';
import ProfileHeader from './ProfileHeader';

const TeacherProfile = ({ user }) => {
  const [activeTab, setActiveTab] = useState(0);

  // Dummy data
  const stats = {
    createdProjects: 12,
    totalStudents: 156,
    activeAssignments: 8,
    averageCompletion: 78
  };

  const myProjects = [
    { 
      id: 1, 
      name: 'تطوير تطبيق ويب متقدم', 
      studentsCount: 45, 
      assignmentsCount: 6,
      status: 'active',
      completionRate: 72
    },
    { 
      id: 2, 
      name: 'أساسيات قواعد البيانات', 
      studentsCount: 38, 
      assignmentsCount: 4,
      status: 'active',
      completionRate: 85
    },
    { 
      id: 3, 
      name: 'برمجة تطبيقات الهاتف', 
      studentsCount: 32, 
      assignmentsCount: 5,
      status: 'completed',
      completionRate: 95
    },
    { 
      id: 4, 
      name: 'تصميم واجهات المستخدم', 
      studentsCount: 41, 
      assignmentsCount: 3,
      status: 'active',
      completionRate: 68
    },
  ];

  const recentStudents = [
    { id: 1, name: 'أحمد محمد', email: 'ahmed@example.com', projects: 3, avgGrade: 88 },
    { id: 2, name: 'فاطمة علي', email: 'fatima@example.com', projects: 4, avgGrade: 92 },
    { id: 3, name: 'محمود خالد', email: 'mahmoud@example.com', projects: 2, avgGrade: 85 },
    { id: 4, name: 'سارة أحمد', email: 'sara@example.com', projects: 5, avgGrade: 95 },
    { id: 5, name: 'عمر حسن', email: 'omar@example.com', projects: 3, avgGrade: 78 },
  ];

  const pendingSubmissions = [
    { studentName: 'أحمد محمد', assignment: 'المرحلة 3 - تطوير تطبيق ويب', project: 'تطوير تطبيق ويب متقدم', submittedAt: '2026-01-15' },
    { studentName: 'فاطمة علي', assignment: 'التصميم النهائي', project: 'تصميم واجهات المستخدم', submittedAt: '2026-01-14' },
    { studentName: 'محمود خالد', assignment: 'إنشاء قاعدة البيانات', project: 'أساسيات قواعد البيانات', submittedAt: '2026-01-13' },
  ];

  const handleTabChange = (event, newValue) => {
    setActiveTab(newValue);
  };

  const handleEditProfile = () => {
    console.log('Edit profile');
  };

  return (
    <Box>
      <ProfileHeader user={user} onEdit={handleEditProfile} />

      {/* Stats Cards */}
      <Grid container spacing={3} sx={{ mb: 3 }}>
        <Grid item xs={12} sm={6} md={3}>
          <Card sx={{ bgcolor: '#e8eaf6', borderRadius: 2 }}>
            <CardContent>
              <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <Box>
                  <Typography color="textSecondary" variant="body2">المشاريع المُنشأة</Typography>
                  <Typography variant="h4" sx={{ fontWeight: 'bold', color: '#3f51b5' }}>
                    {stats.createdProjects}
                  </Typography>
                </Box>
                <Folder sx={{ fontSize: 48, color: '#3f51b5', opacity: 0.7 }} />
              </Box>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} sm={6} md={3}>
          <Card sx={{ bgcolor: '#e0f2f1', borderRadius: 2 }}>
            <CardContent>
              <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <Box>
                  <Typography color="textSecondary" variant="body2">إجمالي الطلاب</Typography>
                  <Typography variant="h4" sx={{ fontWeight: 'bold', color: '#00796b' }}>
                    {stats.totalStudents}
                  </Typography>
                </Box>
                <People sx={{ fontSize: 48, color: '#00796b', opacity: 0.7 }} />
              </Box>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} sm={6} md={3}>
          <Card sx={{ bgcolor: '#fff8e1', borderRadius: 2 }}>
            <CardContent>
              <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <Box>
                  <Typography color="textSecondary" variant="body2">الواجبات النشطة</Typography>
                  <Typography variant="h4" sx={{ fontWeight: 'bold', color: '#f57f17' }}>
                    {stats.activeAssignments}
                  </Typography>
                </Box>
                <Assignment sx={{ fontSize: 48, color: '#f57f17', opacity: 0.7 }} />
              </Box>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} sm={6} md={3}>
          <Card sx={{ bgcolor: '#f3e5f5', borderRadius: 2 }}>
            <CardContent>
              <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <Box>
                  <Typography color="textSecondary" variant="body2">معدل الإنجاز</Typography>
                  <Typography variant="h4" sx={{ fontWeight: 'bold', color: '#7b1fa2' }}>
                    {stats.averageCompletion}%
                  </Typography>
                </Box>
                <BarChart sx={{ fontSize: 48, color: '#7b1fa2', opacity: 0.7 }} />
              </Box>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {/* Quick Actions */}
      <Paper sx={{ p: 2, mb: 3, borderRadius: 2 }}>
        <Typography variant="h6" sx={{ mb: 2, fontWeight: 'bold' }}>إجراءات سريعة</Typography>
        <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap' }}>
          <Button
            variant="contained"
            startIcon={<Add />}
            sx={{ borderRadius: 2 }}
          >
            إنشاء مشروع جديد
          </Button>
          <Button
            variant="outlined"
            startIcon={<Assignment />}
            sx={{ borderRadius: 2 }}
          >
            إضافة واجب
          </Button>
          <Button
            variant="outlined"
            startIcon={<People />}
            sx={{ borderRadius: 2 }}
          >
            إدارة الطلاب
          </Button>
        </Box>
      </Paper>

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
          <Tab icon={<Folder />} label="مشاريعي" iconPosition="start" />
          <Tab icon={<Assignment />} label="الواجبات المعلقة" iconPosition="start" />
          <Tab icon={<People />} label="الطلاب" iconPosition="start" />
          <Tab icon={<SettingsIcon />} label="الإعدادات" iconPosition="start" />
        </Tabs>

        <Box sx={{ p: 3 }}>
          {/* Tab 0: My Projects */}
          {activeTab === 0 && (
            <Grid container spacing={3}>
              {myProjects.map((project) => (
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

                      <Box sx={{ display: 'flex', gap: 3, mb: 2 }}>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                          <People sx={{ fontSize: 20, color: 'text.secondary' }} />
                          <Typography variant="body2">
                            {project.studentsCount} طالب
                          </Typography>
                        </Box>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                          <Assignment sx={{ fontSize: 20, color: 'text.secondary' }} />
                          <Typography variant="body2">
                            {project.assignmentsCount} واجب
                          </Typography>
                        </Box>
                      </Box>

                      <Box sx={{ mb: 2 }}>
                        <Typography variant="body2" color="textSecondary" sx={{ mb: 1 }}>
                          معدل الإنجاز: {project.completionRate}%
                        </Typography>
                        <Box
                          sx={{
                            width: '100%',
                            height: 8,
                            bgcolor: '#e0e0e0',
                            borderRadius: 1,
                            overflow: 'hidden'
                          }}
                        >
                          <Box
                            sx={{
                              width: `${project.completionRate}%`,
                              height: '100%',
                              bgcolor: project.completionRate >= 80 ? '#4caf50' : '#ff9800',
                              transition: 'width 0.3s'
                            }}
                          />
                        </Box>
                      </Box>

                      <Button
                        fullWidth
                        variant="outlined"
                      >
                        إدارة المشروع
                      </Button>
                    </CardContent>
                  </Card>
                </Grid>
              ))}
            </Grid>
          )}

          {/* Tab 1: Pending Submissions */}
          {activeTab === 1 && (
            <Box>
              <Typography variant="h6" sx={{ mb: 2, fontWeight: 'bold' }}>
                الواجبات المعلقة ({pendingSubmissions.length})
              </Typography>
              <TableContainer>
                <Table>
                  <TableHead>
                    <TableRow>
                      <TableCell><strong>الطالب</strong></TableCell>
                      <TableCell><strong>الواجب</strong></TableCell>
                      <TableCell><strong>المشروع</strong></TableCell>
                      <TableCell><strong>تاريخ التسليم</strong></TableCell>
                      <TableCell align="center"><strong>إجراء</strong></TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {pendingSubmissions.map((submission, index) => (
                      <TableRow key={index} hover>
                        <TableCell>{submission.studentName}</TableCell>
                        <TableCell>{submission.assignment}</TableCell>
                        <TableCell>
                          <Typography variant="body2" color="textSecondary">
                            {submission.project}
                          </Typography>
                        </TableCell>
                        <TableCell>{submission.submittedAt}</TableCell>
                        <TableCell align="center">
                          <Button size="small" variant="contained">
                            تقييم
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </TableContainer>
            </Box>
          )}

          {/* Tab 2: Students */}
          {activeTab === 2 && (
            <Box>
              <Typography variant="h6" sx={{ mb: 2, fontWeight: 'bold' }}>
                طلابي ({recentStudents.length})
              </Typography>
              <List>
                {recentStudents.map((student, index) => (
                  <React.Fragment key={student.id}>
                    <ListItem
                      sx={{
                        borderRadius: 2,
                        mb: 1,
                        '&:hover': { bgcolor: '#f5f5f5' }
                      }}
                    >
                      <ListItemAvatar>
                        <Avatar sx={{ bgcolor: '#3f51b5' }}>
                          <School />
                        </Avatar>
                      </ListItemAvatar>
                      <ListItemText
                        primary={student.name}
                        secondary={student.email}
                      />
                      <Box sx={{ display: 'flex', gap: 2, alignItems: 'center' }}>
                        <Chip
                          label={`${student.projects} مشاريع`}
                          size="small"
                          variant="outlined"
                        />
                        <Chip
                          label={`المعدل: ${student.avgGrade}%`}
                          size="small"
                          color={student.avgGrade >= 80 ? 'success' : 'warning'}
                        />
                        <Button size="small" variant="outlined">
                          عرض
                        </Button>
                      </Box>
                    </ListItem>
                    {index < recentStudents.length - 1 && <Divider />}
                  </React.Fragment>
                ))}
              </List>
            </Box>
          )}

          {/* Tab 3: Settings */}
          {activeTab === 3 && (
            <Box>
              <Typography variant="h6" sx={{ mb: 2, fontWeight: 'bold' }}>
                إعدادات الحساب
              </Typography>
              <Typography color="textSecondary">
                قريباً: إعدادات الحساب، إدارة الإشعارات، وتفضيلات التصحيح
              </Typography>
            </Box>
          )}
        </Box>
      </Paper>
    </Box>
  );
};

export default TeacherProfile;
