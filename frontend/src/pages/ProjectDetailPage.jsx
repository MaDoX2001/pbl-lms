import React, { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { useDispatch, useSelector } from 'react-redux';
import {
  Box,
  Paper,
  Typography,
  Button,
  Chip,
  Grid,
  Divider,
  List,
  ListItem,
  ListItemText,
  CircularProgress,
  Avatar,
  IconButton,
  Card,
  CardContent,
  CardActions,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  Checkbox,
  FormControlLabel,
  Autocomplete,
} from '@mui/material';
import AccessTimeIcon from '@mui/icons-material/AccessTime';
import CodeIcon from '@mui/icons-material/Code';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import CloudUploadIcon from '@mui/icons-material/CloudUpload';
import DownloadIcon from '@mui/icons-material/Download';
import DeleteIcon from '@mui/icons-material/Delete';
import VideoLibraryIcon from '@mui/icons-material/VideoLibrary';
import PictureAsPdfIcon from '@mui/icons-material/PictureAsPdf';
import InsertDriveFileIcon from '@mui/icons-material/InsertDriveFile';
import AssignmentIcon from '@mui/icons-material/Assignment';
import VideocamIcon from '@mui/icons-material/Videocam';
import EditIcon from '@mui/icons-material/Edit';
import GroupsIcon from '@mui/icons-material/Groups';
import { toast } from 'react-toastify';
import { fetchProjectById } from '../redux/slices/projectSlice';
import { enrollInProject } from '../redux/slices/projectSlice';
import ResourceUploadDialog from '../components/ResourceUploadDialog';
import HomeworkSubmitDialog from '../components/HomeworkSubmitDialog';
import CreateAssignmentDialog from '../components/CreateAssignmentDialog';
import api from '../services/api';

const ProjectDetailPage = () => {
  const { id } = useParams();
  const dispatch = useDispatch();
  const { currentProject: project, loading } = useSelector((state) => state.projects);
  const { user, isAuthenticated } = useSelector((state) => state.auth);

  const [materials, setMaterials] = useState([]);
  const [assignments, setAssignments] = useState([]);
  const [mySubmissions, setMySubmissions] = useState([]);
  const [uploadDialogOpen, setUploadDialogOpen] = useState(false);
  const [homeworkDialogOpen, setHomeworkDialogOpen] = useState(false);
  const [assignmentDialogOpen, setAssignmentDialogOpen] = useState(false);
  const [selectedAssignment, setSelectedAssignment] = useState(null);
  const [loadingMaterials, setLoadingMaterials] = useState(false);
  const [loadingAssignments, setLoadingAssignments] = useState(false);
  const [teamsLinkDialogOpen, setTeamsLinkDialogOpen] = useState(false);
  const [teamsLink, setTeamsLink] = useState('');
  const [teams, setTeams] = useState([]);
  const [selectedTeams, setSelectedTeams] = useState([]);
  const [selectAllTeams, setSelectAllTeams] = useState(false);
  const [teamRegisterDialogOpen, setTeamRegisterDialogOpen] = useState(false);

  useEffect(() => {
    dispatch(fetchProjectById(id));
  }, [dispatch, id]);

  useEffect(() => {
    if (id) {
      fetchCourseMaterials();
      fetchAssignments();
      if (user?.role === 'student') {
        fetchMySubmissions();
      }
    }
  }, [id, user]);

  const fetchCourseMaterials = async () => {
    try {
      setLoadingMaterials(true);
      const response = await api.get(`/resources/${id}/materials`);
      setMaterials(response.data.materials || []);
    } catch (error) {
      console.error('Error fetching materials:', error);
    } finally {
      setLoadingMaterials(false);
    }
  };

  const fetchAssignments = async () => {
    try {
      setLoadingAssignments(true);
      const response = await api.get(`/resources/${id}/assignments`);
      setAssignments(response.data.assignments || []);
    } catch (error) {
      console.error('Error fetching assignments:', error);
    } finally {
      setLoadingAssignments(false);
    }
  };

  const fetchMySubmissions = async () => {
    try {
      const response = await api.get(`/submissions/projects/${id}/my-submissions`);
      setMySubmissions(response.data.submissions || []);
    } catch (error) {
      console.error('Error fetching submissions:', error);
    }
  };

  const handleDeleteMaterial = async (materialId) => {
    if (!window.confirm('هل أنت متأكد من حذف هذه المادة؟')) return;

    try {
      await api.delete(`/resources/${id}/materials/${materialId}`);
      toast.success('تم حذف المادة بنجاح');
      fetchCourseMaterials();
    } catch (error) {
      toast.error('فشل حذف المادة');
    }
  };

  const handleDeleteAssignment = async (assignmentId) => {
    if (!window.confirm('هل أنت متأكد من حذف هذه المهمة؟')) return;

    try {
      await api.delete(`/resources/${id}/assignments/${assignmentId}`);
      toast.success('تم حذف المهمة بنجاح');
      fetchAssignments();
    } catch (error) {
      toast.error('فشل حذف المهمة');
    }
  };

  const handleSubmitHomework = (assignment) => {
    setSelectedAssignment(assignment);
    setHomeworkDialogOpen(true);
  };

  const handleDownloadSubmission = async (submissionId, fileName) => {
    try {
      const response = await api.get(`/submissions/${submissionId}/download`, {
        responseType: 'blob'
      });
      
      // Create a blob URL and trigger download
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', fileName);
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
      
      toast.success('تم تحميل الملف بنجاح');
    } catch (error) {
      toast.error('فشل تحميل الملف');
      console.error('Download error:', error);
    }
  };

  const getFileIcon = (fileType) => {
    switch (fileType) {
      case 'video':
        return <VideoLibraryIcon />;
      case 'pdf':
        return <PictureAsPdfIcon />;
      default:
        return <InsertDriveFileIcon />;
    }
  };

  const handleEnroll = () => {
    dispatch(enrollInProject(id));
  };

  const handleDeleteProject = async () => {
    if (!window.confirm('هل أنت متأكد من حذف هذا المشروع؟ لا يمكن التراجع عن هذا الإجراء.')) {
      return;
    }

    try {
      await api.delete(`/projects/${id}`);
      toast.success('تم حذف المشروع بنجاح');
      window.location.href = '/projects';
    } catch (error) {
      toast.error(error.response?.data?.message || 'فشل حذف المشروع');
      console.error('Delete project error:', error);
    }
  };

  const handleSaveTeamsLink = async () => {
    try {
      await api.put(`/projects/${id}`, { teamsLink });
      toast.success('تم حفظ رابط Teams بنجاح');
      setTeamsLinkDialogOpen(false);
      dispatch(fetchProjectById(id));
    } catch (error) {
      toast.error('فشل حفظ رابط Teams');
    }
  };

  const fetchTeams = async () => {
    try {
      const response = await api.get('/teams');
      setTeams(response.data.data || []);
    } catch (error) {
      console.error('Error fetching teams:', error);
    }
  };

  const handleOpenTeamRegister = async () => {
    await fetchTeams();
    setSelectedTeams([]);
    setSelectAllTeams(false);
    setTeamRegisterDialogOpen(true);
  };

  const handleSelectAllTeams = (checked) => {
    setSelectAllTeams(checked);
    if (checked) {
      setSelectedTeams(teams);
    } else {
      setSelectedTeams([]);
    }
  };

  const handleRegisterTeam = async () => {
    if (selectedTeams.length === 0) {
      toast.error('يرجى اختيار فريق واحد على الأقل');
      return;
    }

    try {
      let successCount = 0;
      let errorCount = 0;

      // Register each team
      for (const team of selectedTeams) {
        try {
          await api.post('/team-projects/enroll', {
            teamId: team._id,
            projectId: id
          });
          successCount++;
        } catch (error) {
          // Skip if already enrolled
          if (error.response?.data?.message?.includes('مسجل بالفعل')) {
            errorCount++;
          } else {
            throw error;
          }
        }
      }

      if (successCount > 0) {
        toast.success(`تم تسجيل ${successCount} فريق في المشروع بنجاح`);
      }
      if (errorCount > 0) {
        toast.warning(`${errorCount} فريق مسجل بالفعل`);
      }

      setTeamRegisterDialogOpen(false);
      setSelectedTeams([]);
      setSelectAllTeams(false);
    } catch (error) {
      toast.error(error.response?.data?.message || 'فشل تسجيل الفريق');
    }
  };

  const handleJoinTeams = () => {
    if (project.teamsLink) {
      window.open(project.teamsLink, '_blank');
    }
  };

  if (loading || !project) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', py: 8 }}>
        <CircularProgress />
      </Box>
    );
  }

  const isEnrolled = user?.enrolledProjects?.includes(project._id);
  // Admin can manage any project, Teacher can only manage their own projects
  const canManageProject = user && (
    user.role === 'admin' || 
    (user.role === 'teacher' && project.instructor?._id === user.id)
  );
  const difficultyLabel = {
    beginner: 'مبتدئ',
    intermediate: 'متوسط',
    advanced: 'متقدم',
  };

  const handleTogglePublish = async () => {
    try {
      const response = await api.put(`/projects/${id}`, {
        isPublished: !project.isPublished
      });
      
      toast.success(project.isPublished ? 'تم إلغاء نشر المشروع' : 'تم نشر المشروع');
      dispatch(fetchProjectById(id)); // Refresh project data
    } catch (error) {
      console.error('Error toggling publish status:', error);
      toast.error('فشل تغيير حالة النشر');
    }
  };

  return (
    <Box>
      {/* Header */}
      <Paper sx={{ p: 4, mb: 3, background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)', color: 'white' }}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start', mb: 2 }}>
          <Box sx={{ flex: 1 }}>
            <Typography variant="h3" component="h1" gutterBottom fontWeight={700}>
              {project.title}
            </Typography>
          </Box>
          {canManageProject && (
            <Box sx={{ display: 'flex', gap: 1 }}>
              <Button
                variant="contained"
                color="info"
                startIcon={<EditIcon />}
                onClick={() => navigate(`/edit-project/${id}`)}
                sx={{ 
                  bgcolor: 'rgba(33,150,243,0.9)',
                  '&:hover': {
                    bgcolor: 'rgba(33,150,243,1)'
                  }
                }}
              >
                تعديل المشروع
              </Button>
              <Button
                variant="contained"
                color={project.isPublished ? 'warning' : 'success'}
                onClick={handleTogglePublish}
                sx={{ 
                  bgcolor: project.isPublished ? 'rgba(255,152,0,0.9)' : 'rgba(76,175,80,0.9)',
                  '&:hover': {
                    bgcolor: project.isPublished ? 'rgba(255,152,0,1)' : 'rgba(76,175,80,1)'
                  }
                }}
              >
                {project.isPublished ? 'إلغاء النشر' : 'نشر المشروع'}
              </Button>
            </Box>
          )}
        </Box>
        <Typography variant="h6" sx={{ mb: 2, opacity: 0.9 }}>
          {project.shortDescription || project.description}
        </Typography>
        <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap', mb: 2 }}>
          <Chip 
            label={project.isPublished ? 'منشور' : 'مسودة'} 
            sx={{ 
              bgcolor: project.isPublished ? 'rgba(76,175,80,0.3)' : 'rgba(255,152,0,0.3)', 
              color: 'white',
              fontWeight: 600
            }} 
          />
          <Chip label={difficultyLabel[project.difficulty]} sx={{ bgcolor: 'rgba(255,255,255,0.2)', color: 'white' }} />
          <Chip label={project.category} sx={{ bgcolor: 'rgba(255,255,255,0.2)', color: 'white' }} />
          {project.technologies?.map((tech, i) => (
            <Chip key={i} label={tech} sx={{ bgcolor: 'rgba(255,255,255,0.2)', color: 'white' }} />
          ))}
        </Box>
        <Box sx={{ display: 'flex', gap: 3, alignItems: 'center' }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <AccessTimeIcon />
            <span>{project.estimatedDuration} ساعة</span>
          </Box>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <CodeIcon />
            <span>{project.points} نقطة</span>
          </Box>
        </Box>
      </Paper>

      <Grid container spacing={3}>
        {/* Main Content */}
        <Grid item xs={12} md={8}>
          {/* Description */}
          <Paper sx={{ p: 3, mb: 3 }}>
            <Typography variant="h5" gutterBottom fontWeight={600}>
              نظرة عامة
            </Typography>
            <Typography variant="body1" paragraph>
              {project.description}
            </Typography>
          </Paper>

          {/* Objectives */}
          {project.showObjectives && project.objectives?.length > 0 && (
            <Paper sx={{ p: 3, mb: 3 }}>
              <Typography variant="h5" gutterBottom fontWeight={600}>
                أهداف التعلم
              </Typography>
              <List>
                {project.objectives.map((obj, index) => (
                  <ListItem key={index}>
                    <CheckCircleIcon color="success" sx={{ mr: 1 }} />
                    <ListItemText primary={obj} />
                  </ListItem>
                ))}
              </List>
            </Paper>
          )}

          {/* Learning Scenario */}
          {project.learningScenario && (
            <Paper sx={{ p: 3, mb: 3 }}>
              <Typography variant="h5" gutterBottom fontWeight={600}>
                السيناريو التعليمي للمشروع
              </Typography>
              <Typography variant="body1" sx={{ whiteSpace: 'pre-line' }}>
                {project.learningScenario}
              </Typography>
            </Paper>
          )}

          {/* Teaching Strategy */}
          {project.teachingStrategy && (
            <Paper sx={{ p: 3, mb: 3 }}>
              <Typography variant="h5" gutterBottom fontWeight={600}>
                الاستراتيجية التعليمية المستخدمة
              </Typography>
              <Typography variant="body1" sx={{ whiteSpace: 'pre-line' }}>
                {project.teachingStrategy}
              </Typography>
            </Paper>
          )}

          {/* Final Report Note */}
          {project.finalReportNote && (
            <Paper sx={{ p: 3, mb: 3, bgcolor: '#f5f5f5' }}>
              <Typography variant="h6" gutterBottom fontWeight={600} color="primary">
                ملاحظة هامة
              </Typography>
              <Typography variant="body1">
                {project.finalReportNote}
              </Typography>
            </Paper>
          )}

          {/* Milestones */}
          {project.milestones?.length > 0 && (
            <Paper sx={{ p: 3, mb: 3 }}>
              <Typography variant="h5" gutterBottom fontWeight={600}>
                المراحل
              </Typography>
              <List>
                {project.milestones.map((milestone, index) => (
                  <Box key={index}>
                    <ListItem>
                      <ListItemText
                        primary={`${index + 1}. ${milestone.title}`}
                        secondary={milestone.description}
                      />
                      <Chip label={`${milestone.points} نقطة`} size="small" color="primary" />
                    </ListItem>
                    {index < project.milestones.length - 1 && <Divider />}
                  </Box>
                ))}
              </List>
            </Paper>
          )}

          {/* Resources */}
          {project.resources?.length > 0 && (
            <Paper sx={{ p: 3 }}>
              <Typography variant="h5" gutterBottom fontWeight={600}>
                مصادر التعلم
              </Typography>
              <List>
                {project.resources.map((resource, index) => (
                  <ListItem key={index} component="a" href={resource.url} target="_blank">
                    <ListItemText
                      primary={resource.title}
                      secondary={resource.description}
                    />
                  </ListItem>
                ))}
              </List>
            </Paper>
          )}
        </Grid>

        {/* Sidebar */}
        <Grid item xs={12} md={4}>
          {/* Enrollment Card */}
          <Paper sx={{ p: 3, mb: 3, position: 'sticky', top: 20 }}>
            {isAuthenticated ? (
              isEnrolled ? (
                <Button variant="contained" fullWidth size="large" disabled>
                  مسجل بالفعل
                </Button>
              ) : (
                <Button variant="contained" fullWidth size="large" onClick={handleEnroll}>
                  التسجيل في المشروع
                </Button>
              )
            ) : (
              <Button variant="contained" fullWidth size="large" href="/login">
                سجل الدخول للتسجيل
              </Button>
            )}

            {/* Teams Meeting Link */}
            {project.teamsLink && (
              <>
                <Divider sx={{ my: 2 }} />
                <Button
                  variant="contained"
                  color="primary"
                  fullWidth
                  startIcon={<VideocamIcon />}
                  onClick={handleJoinTeams}
                  sx={{ mb: 1 }}
                >
                  انضم للمحاضرة المباشرة
                </Button>
              </>
            )}

            {/* Edit Teams Link for Admin/Owner */}
            {canManageProject && (
              <>
                <Button
                  variant="outlined"
                  fullWidth
                  startIcon={<EditIcon />}
                  onClick={() => {
                    setTeamsLink(project.teamsLink || '');
                    setTeamsLinkDialogOpen(true);
                  }}
                  sx={{ mb: 1 }}
                >
                  {project.teamsLink ? 'تعديل رابط Teams' : 'إضافة رابط Teams'}
                </Button>
              </>
            )}

            {/* Register Team Button for Admin/Teacher */}
            {canManageProject && (
              <>
                <Divider sx={{ my: 2 }} />
                <Button
                  variant="contained"
                  color="secondary"
                  fullWidth
                  startIcon={<GroupsIcon />}
                  onClick={handleOpenTeamRegister}
                >
                  تسجيل فريق في المشروع
                </Button>
              </>
            )}

            {/* Delete Button for Admin/Owner */}
            {canManageProject && (
              <>
                <Divider sx={{ my: 2 }} />
                <Button
                  variant="outlined"
                  color="error"
                  fullWidth
                  startIcon={<DeleteIcon />}
                  onClick={handleDeleteProject}
                >
                  حذف المشروع
                </Button>
              </>
            )}

            <Divider sx={{ my: 2 }} />

            {/* Instructor */}
            {project.instructor && (
              <Box>
                <Typography variant="subtitle2" color="text.secondary" gutterBottom>
                  المدرس
                </Typography>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
                  <Avatar src={project.instructor.avatar} />
                  <Typography variant="body1">{project.instructor.name}</Typography>
                </Box>
              </Box>
            )}

            {/* Stats */}
            <Typography variant="subtitle2" color="text.secondary" gutterBottom>
              الإحصائيات
            </Typography>
            <Typography variant="body2" paragraph>
              عدد الطلاب المسجلين: {project.enrolledStudents?.length || 0}
            </Typography>
            <Typography variant="body2">
              أكمل المشروع: {project.completedBy?.length || 0}
            </Typography>
          </Paper>
        </Grid>
      </Grid>

      {/* Course Materials Section */}
      <Paper sx={{ p: 3, mt: 3 }}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
          <Typography variant="h6">المواد التعليمية</Typography>
          {(user?.role === 'teacher' || user?.role === 'admin') && (
            <Button
              variant="contained"
              startIcon={<CloudUploadIcon />}
              onClick={() => setUploadDialogOpen(true)}
            >
              تحميل مادة
            </Button>
          )}
        </Box>
        <Divider sx={{ mb: 2 }} />
        
        {loadingMaterials ? (
          <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}>
            <CircularProgress />
          </Box>
        ) : materials.length === 0 ? (
          <Typography color="text.secondary" align="center" py={3}>
            لا توجد مواد تعليمية حتى الآن
          </Typography>
        ) : (
          <Grid container spacing={2}>
            {materials.map((material) => (
              <Grid item xs={12} sm={6} md={4} key={material._id}>
                <Card>
                  <CardContent>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
                      {getFileIcon(material.fileType)}
                      <Typography variant="subtitle1" noWrap>
                        {material.title}
                      </Typography>
                    </Box>
                    {material.description && (
                      <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
                        {material.description}
                      </Typography>
                    )}
                    <Typography variant="caption" color="text.secondary">
                      {material.size ? `${(material.size / 1024 / 1024).toFixed(2)} MB` : ''}
                    </Typography>
                  </CardContent>
                  <CardActions>
                    <Button
                      size="small"
                      startIcon={<DownloadIcon />}
                      href={material.fileUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                    >
                      عرض/تحميل
                    </Button>
                    {(user?.role === 'teacher' || user?.role === 'admin') && (
                      <IconButton
                        size="small"
                        color="error"
                        onClick={() => handleDeleteMaterial(material._id)}
                      >
                        <DeleteIcon />
                      </IconButton>
                    )}
                  </CardActions>
                </Card>
              </Grid>
            ))}
          </Grid>
        )}
      </Paper>

      {/* Assignments Section */}
      <Paper sx={{ p: 3, mt: 3 }}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
          <Typography variant="h6">الواجبات والمهام</Typography>
          {(user?.role === 'teacher' || user?.role === 'admin') && (
            <Button
              variant="contained"
              startIcon={<AssignmentIcon />}
              onClick={() => setAssignmentDialogOpen(true)}
            >
              إنشاء مهمة
            </Button>
          )}
        </Box>
        <Divider sx={{ mb: 2 }} />
        
        {loadingAssignments ? (
          <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}>
            <CircularProgress />
          </Box>
        ) : assignments.length === 0 ? (
          <Typography color="text.secondary" align="center" py={3}>
            لا توجد مهام حتى الآن
          </Typography>
        ) : (
          <Grid container spacing={2}>
            {assignments.map((assignment) => {
              const submission = mySubmissions.find(
                (s) => s.assignment.assignmentId === assignment._id
              );
              const isOverdue = assignment.dueDate && new Date() > new Date(assignment.dueDate);

              return (
                <Grid item xs={12} md={6} key={assignment._id}>
                  <Card>
                    <CardContent>
                      <Typography variant="h6" gutterBottom>
                        {assignment.title}
                      </Typography>
                      {assignment.description && (
                        <Typography variant="body2" color="text.secondary" paragraph>
                          {assignment.description}
                        </Typography>
                      )}
                      <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap', mb: 1 }}>
                        {assignment.dueDate && (
                          <Chip
                            label={`الموعد: ${new Date(assignment.dueDate).toLocaleDateString('ar-SA')}`}
                            size="small"
                            color={isOverdue ? 'error' : 'default'}
                          />
                        )}
                        <Chip
                          label={`الدرجة: ${assignment.maxScore}`}
                          size="small"
                          color="primary"
                        />
                        {submission && (
                          <Chip
                            label={submission.status === 'graded' ? `تم التقييم: ${submission.grade?.score}` : 'تم التسليم'}
                            size="small"
                            color={submission.status === 'graded' ? 'success' : 'info'}
                          />
                        )}
                      </Box>
                    </CardContent>
                    <CardActions>
                      {user?.role === 'student' && !submission && (
                        <Button
                          size="small"
                          variant="contained"
                          onClick={() => handleSubmitHomework(assignment)}
                          disabled={isOverdue && !assignment.allowLateSubmission}
                        >
                          تسليم الواجب
                        </Button>
                      )}
                      {user?.role === 'student' && submission && (
                        <Button
                          size="small"
                          variant="outlined"
                          startIcon={<DownloadIcon />}
                          onClick={() => handleDownloadSubmission(submission._id, submission.fileName)}
                        >
                          تحميل التسليم
                        </Button>
                      )}
                      {(user?.role === 'teacher' || user?.role === 'admin') && (
                        <>
                          <Button size="small">عرض التسليمات</Button>
                          <IconButton
                            size="small"
                            color="error"
                            onClick={() => handleDeleteAssignment(assignment._id)}
                          >
                            <DeleteIcon />
                          </IconButton>
                        </>
                      )}
                    </CardActions>
                  </Card>
                </Grid>
              );
            })}
          </Grid>
        )}
      </Paper>

      {/* Upload Dialogs */}
      <ResourceUploadDialog
        open={uploadDialogOpen}
        onClose={() => setUploadDialogOpen(false)}
        projectId={id}
        onSuccess={() => {
          fetchCourseMaterials();
        }}
      />

      <HomeworkSubmitDialog
        open={homeworkDialogOpen}
        onClose={() => {
          setHomeworkDialogOpen(false);
          setSelectedAssignment(null);
        }}
        projectId={id}
        assignment={selectedAssignment}
        onSuccess={() => {
          fetchMySubmissions();
        }}
      />

      <CreateAssignmentDialog
        open={assignmentDialogOpen}
        onClose={() => setAssignmentDialogOpen(false)}
        projectId={id}
        onSuccess={() => {
          fetchAssignments();
        }}
      />

      {/* Teams Link Dialog */}
      <Dialog open={teamsLinkDialogOpen} onClose={() => setTeamsLinkDialogOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>{project.teamsLink ? 'تعديل رابط Microsoft Teams' : 'إضافة رابط Microsoft Teams'}</DialogTitle>
        <DialogContent>
          <TextField
            fullWidth
            label="رابط Teams"
            value={teamsLink}
            onChange={(e) => setTeamsLink(e.target.value)}
            placeholder="https://teams.microsoft.com/..."
            sx={{ mt: 2 }}
            helperText="الصق رابط اجتماع Microsoft Teams هنا"
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setTeamsLinkDialogOpen(false)}>إلغاء</Button>
          <Button onClick={handleSaveTeamsLink} variant="contained">
            حفظ
          </Button>
        </DialogActions>
      </Dialog>

      {/* Team Registration Dialog */}
      <Dialog open={teamRegisterDialogOpen} onClose={() => setTeamRegisterDialogOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>تسجيل فرق في المشروع</DialogTitle>
        <DialogContent>
          <Box sx={{ mt: 2, display: 'flex', flexDirection: 'column', gap: 2 }}>
            <FormControlLabel
              control={
                <Checkbox
                  checked={selectAllTeams}
                  onChange={(e) => handleSelectAllTeams(e.target.checked)}
                />
              }
              label="تسجيل جميع الفرق"
            />
            <Autocomplete
              multiple
              options={teams}
              value={selectedTeams}
              onChange={(e, newValue) => {
                setSelectedTeams(newValue);
                setSelectAllTeams(newValue.length === teams.length && teams.length > 0);
              }}
              getOptionLabel={(option) => `${option.name} (${option.members?.length || 0} أعضاء)`}
              isOptionEqualToValue={(option, value) => option._id === value._id}
              renderInput={(params) => (
                <TextField
                  {...params}
                  label="اختر الفرق"
                  placeholder="ابحث عن فريق..."
                />
              )}
              renderTags={(value, getTagProps) =>
                value.map((option, index) => (
                  <Chip
                    key={option._id}
                    label={option.name}
                    {...getTagProps({ index })}
                  />
                ))
              }
            />
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setTeamRegisterDialogOpen(false)}>إلغاء</Button>
          <Button 
            onClick={handleRegisterTeam} 
            variant="contained" 
            color="secondary"
            disabled={selectedTeams.length === 0}
          >
            تسجيل {selectedTeams.length > 0 && `(${selectedTeams.length})`}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default ProjectDetailPage;
