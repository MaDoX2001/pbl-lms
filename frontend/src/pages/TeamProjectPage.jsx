import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useSelector } from 'react-redux';
import {
  Container,
  Paper,
  Typography,
  Box,
  Button,
  Grid,
  Card,
  CardContent,
  Chip,
  CircularProgress,
  Skeleton,
  Alert,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  Divider,
  List,
  ListItem,
  ListItemText,
  ListItemSecondaryAction,
  IconButton,
} from '@mui/material';
import {
  Upload as UploadIcon,
  Description as DescriptionIcon,
  Download as DownloadIcon,
  Feedback as FeedbackIcon,
  Grade as GradeIcon,
  ArrowBack as ArrowBackIcon,
} from '@mui/icons-material';
import { toast } from 'react-toastify';
import api from '../services/api';
import StudentEvaluationStatus from '../components/StudentEvaluationStatus';
import FinalEvaluationSummary from '../components/FinalEvaluationSummary';
import EvaluationProgressBar from '../components/EvaluationProgressBar';
import BadgeCelebrationPopup from '../components/BadgeCelebrationPopup';

/**
 * TeamProjectPage Component
 * 
 * Shows project details and all submissions for the team.
 * Students can upload new submissions.
 * Teachers can view all team submissions.
 */
const TeamProjectPage = () => {
  const { projectId } = useParams();
  const navigate = useNavigate();
  const { user } = useSelector((state) => state.auth);

  const [project, setProject] = useState(null);
  const [team, setTeam] = useState(null);
  const [submissions, setSubmissions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [openUploadDialog, setOpenUploadDialog] = useState(false);
  const [uploadForm, setUploadForm] = useState({
    file: null,
    description: ''
  });
  const [uploading, setUploading] = useState(false);
  const [evaluationStatus, setEvaluationStatus] = useState(null);
  const [badgePopup, setBadgePopup] = useState({ open: false, badge: null });

  useEffect(() => {
    fetchData();
  }, [projectId]);

  const fetchData = async () => {
    try {
      setLoading(true);

      // Get project details
      const projectResponse = await api.get(`/projects/${projectId}`);
      const projectData = projectResponse.data.data;
      setProject(projectData);

      // Get my team (only if team project)
      if (projectData.isTeamProject) {
        try {
          const teamResponse = await api.get('/teams/my-team');
          setTeam(teamResponse.data.data);

          // Get team submissions
          const submissionsResponse = await api.get(
            `/team-submissions/team/${teamResponse.data.data._id}/project/${projectId}`
          );
          setSubmissions(submissionsResponse.data.data);
        } catch (teamErr) {
          console.error('Team fetch error:', teamErr);
          toast.warning('لم يتم العثور على فريق لهذا المشروع');
        }
      } else {
        // Individual project - get individual submissions
        try {
          const submissionsResponse = await api.get(
            `/submissions/project/${projectId}/student/${user._id}`
          );
          setSubmissions(submissionsResponse.data.data);
        } catch (subErr) {
          console.error('Submissions fetch error:', subErr);
        }
      }

      // Fetch evaluation status for progress bar
      if (user.role === 'student') {
        await fetchEvaluationStatus(projectData);
      }

      setLoading(false);
    } catch (err) {
      toast.error(err.response?.data?.message || 'حدث خطأ في جلب البيانات');
      setLoading(false);
    }
  };

  const fetchEvaluationStatus = async (projectData) => {
    try {
      let phase1Complete = false;
      let phase2Complete = false;
      let finalEval = null;

      // Phase 1 status
      if (projectData?.isTeamProject && team) {
        try {
          const phase1Res = await api.get(`/assessment/group-status/${projectId}/${team._id}`);
          phase1Complete = phase1Res.data.data?.phase1Complete || false;
        } catch (err) {
          phase1Complete = false;
        }
      } else {
        phase1Complete = true; // Individual project, skip phase 1
      }

      // Phase 2 status
      try {
        const phase2Res = await api.get(`/assessment/individual-status/${projectId}/${user._id}`);
        phase2Complete = phase2Res.data.data?.phase2Complete || false;
      } catch (err) {
        phase2Complete = false;
      }

      // Final evaluation
      try {
        const finalRes = await api.get(`/assessment/final/${projectId}/${user._id}`);
        finalEval = finalRes.data.data;
      } catch (err) {
        finalEval = null;
      }

      setEvaluationStatus({
        phase1Complete,
        phase2Complete,
        finalComplete: !!finalEval,
        finalStatus: finalEval?.status,
        retry: finalEval?.retryAllowed
      });
    } catch (err) {
      console.error('Error fetching evaluation status:', err);
    }
  };

  const handleFileChange = (e) => {
    setUploadForm({ ...uploadForm, file: e.target.files[0] });
  };

  const handleUploadSubmit = async () => {
    if (!uploadForm.file) {
      toast.error('يجب اختيار ملف');
      return;
    }

    try {
      setUploading(true);

      const formData = new FormData();
      formData.append('file', uploadForm.file);
      formData.append('teamId', team._id);
      formData.append('projectId', projectId);
      formData.append('description', uploadForm.description);

      await api.post('/team-submissions', formData, {
        headers: {
          'Content-Type': 'multipart/form-data'
        }
      });

      toast.success('تم رفع التسليم بنجاح');
      setOpenUploadDialog(false);
      setUploadForm({ file: null, description: '' });
      fetchData();
    } catch (err) {
      toast.error(err.response?.data?.message || 'حدث خطأ في رفع الملف');
    } finally {
      setUploading(false);
    }
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'graded':
        return 'success';
      case 'reviewed':
        return 'info';
      default:
        return 'warning';
    }
  };

  const getStatusLabel = (status) => {
    switch (status) {
      case 'graded':
        return 'مُقيّم';
      case 'reviewed':
        return 'تمت المراجعة';
      default:
        return 'قيد الانتظار';
    }
  };

  if (loading) {
    return (
      <Container maxWidth="lg" sx={{ mt: 4, mb: 4 }}>
        <Skeleton variant="rectangular" height={40} width={150} sx={{ mb: 2 }} />
        <Paper elevation={3} sx={{ p: 3, mb: 3 }}>
          <Skeleton variant="text" height={50} width="60%" sx={{ mb: 2 }} />
          <Skeleton variant="text" height={20} width="100%" />
          <Skeleton variant="text" height={20} width="90%" />
          <Skeleton variant="text" height={20} width="95%" sx={{ mb: 2 }} />
          <Box sx={{ display: 'flex', gap: 1 }}>
            <Skeleton variant="rounded" height={32} width={100} />
            <Skeleton variant="rounded" height={32} width={120} />
          </Box>
        </Paper>
        <Skeleton variant="rectangular" height={200} sx={{ mb: 2 }} />
        <Skeleton variant="rectangular" height={400} />
      </Container>
    );
  }

  if (!project || !team) {
    return (
      <Container maxWidth="lg" sx={{ mt: 4 }}>
        <Alert severity="error">فشل في تحميل بيانات المشروع</Alert>
      </Container>
    );
  }

  return (
    <Container maxWidth="lg" sx={{ mt: 4, mb: 4 }}>
      <Button
        startIcon={<ArrowBackIcon />}
        onClick={() => navigate('/team/dashboard')}
        sx={{ mb: 2 }}
      >
        العودة للوحة الفريق
      </Button>

      {/* Project Details */}
      <Paper elevation={3} sx={{ p: 3, mb: 3 }}>
        <Typography variant="h4" gutterBottom>
          {project.title}
        </Typography>
        <Typography variant="body1" color="text.secondary" paragraph>
          {project.description}
        </Typography>
        <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
          <Chip label={`المستوى: ${project.projectLevel || project.difficulty || 'غير محدد'}`} />
          {project.isTeamProject && team && (
            <Chip label={`الفريق: ${team.name}`} color="primary" />
          )}
          {!project.isTeamProject && (
            <Chip label="مشروع فردي" color="secondary" />
          )}
          {project.projectOrder && (
            <Chip label={`الترتيب: ${project.projectOrder}`} variant="outlined" />
          )}
        </Box>
      </Paper>

      {/* Student Evaluation Status - Only show for students */}
      {user.role === 'student' && evaluationStatus && (
        <Paper elevation={3} sx={{ p: 3, mb: 3 }}>
          <Typography variant="h5" gutterBottom>
            حالة التقييم
          </Typography>
          <Divider sx={{ mb: 2 }} />
          
          {/* Progress Bar */}
          <Box sx={{ mb: 3 }}>
            <EvaluationProgressBar 
              status={evaluationStatus}
              isTeamProject={project?.isTeamProject || false}
            />
          </Box>

          {/* Detailed Status */}
          <StudentEvaluationStatus 
            projectId={projectId}
            studentId={user._id}
            teamId={team?._id}
            isTeamProject={project?.isTeamProject || false}
          />
        </Paper>
      )}

      {/* Upload Section */}
      {user.role === 'student' && (
        <Box sx={{ mb: 3 }}>
          {project.deadline && new Date() > new Date(project.deadline) ? (
            <Alert severity="warning" sx={{ mb: 2 }}>
              انتهى موعد تسليم المشروع
            </Alert>
          ) : (
            <Button
              variant="contained"
              startIcon={<UploadIcon />}
              onClick={() => setOpenUploadDialog(true)}
              fullWidth
            >
              رفع تسليم جديد
            </Button>
          )}
        </Box>
      )}

      {/* Submissions List */}
      <Paper elevation={3} sx={{ p: 3 }}>
        <Typography variant="h5" gutterBottom>
          التسليمات ({submissions.length})
        </Typography>
        <Divider sx={{ mb: 2 }} />

        {submissions.length === 0 ? (
          <Alert severity="info">لم يتم رفع أي تسليم بعد</Alert>
        ) : (
          <List>
            {submissions.map((submission, index) => (
              <Card key={submission._id} sx={{ mb: 2 }}>
                <CardContent>
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start', mb: 2 }}>
                    <Box>
                      <Typography variant="h6">
                        التسليم #{submissions.length - index}
                      </Typography>
                      <Typography variant="body2" color="text.secondary">
                        رفع بواسطة: {submission.submittedBy.name}
                      </Typography>
                      <Typography variant="body2" color="text.secondary">
                        التاريخ: {new Date(submission.submittedAt).toLocaleString('ar-EG')}
                      </Typography>
                    </Box>
                    <Chip
                      label={getStatusLabel(submission.status)}
                      color={getStatusColor(submission.status)}
                    />
                  </Box>

                  {/* File Info */}
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
                    <DescriptionIcon color="action" />
                    <Typography variant="body2">{submission.fileName}</Typography>
                    <IconButton
                      size="small"
                      href={submission.fileUrl}
                      target="_blank"
                      download
                    >
                      <DownloadIcon />
                    </IconButton>
                  </Box>

                  {/* Description */}
                  {submission.description && (
                    <Box sx={{ mb: 2 }}>
                      <Typography variant="body2" sx={{ fontWeight: 'bold' }}>
                        الوصف:
                      </Typography>
                      <Typography variant="body2" color="text.secondary">
                        {submission.description}
                      </Typography>
                    </Box>
                  )}

                  {/* Feedback */}
                  {submission.feedback && (
                    <Alert severity="info" icon={<FeedbackIcon />} sx={{ mb: 1 }}>
                      <Typography variant="body2" sx={{ fontWeight: 'bold' }}>
                        ملاحظات المعلم:
                      </Typography>
                      <Typography variant="body2">
                        {submission.feedback}
                      </Typography>
                      {submission.feedbackBy && (
                        <Typography variant="caption" color="text.secondary">
                          - {submission.feedbackBy.name}
                        </Typography>
                      )}
                    </Alert>
                  )}

                  {/* Grade */}
                  {submission.score !== null && (
                    <Alert severity="success" icon={<GradeIcon />}>
                      <Typography variant="body2" sx={{ fontWeight: 'bold' }}>
                        الدرجة: {submission.score} / 100
                      </Typography>
                    </Alert>
                  )}
                </CardContent>
              </Card>
            ))}
          </List>
        )}
      </Paper>

      {/* Upload Dialog */}
      <Dialog open={openUploadDialog} onClose={() => setOpenUploadDialog(false)} maxWidth="sm" fullWidth>
        <DialogTitle>رفع تسليم جديد</DialogTitle>
        <DialogContent>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, mt: 2 }}>
            <Button
              variant="outlined"
              component="label"
              fullWidth
            >
              {uploadForm.file ? uploadForm.file.name : 'اختر ملف'}
              <input
                type="file"
                hidden
                onChange={handleFileChange}
              />
            </Button>

            <TextField
              label="الوصف (اختياري)"
              value={uploadForm.description}
              onChange={(e) => setUploadForm({ ...uploadForm, description: e.target.value })}
              multiline
              rows={3}
              fullWidth
            />

            <Alert severity="info">
              يمكنك رفع أي نوع من الملفات. الحد الأقصى للحجم: 50 ميجابايت
            </Alert>
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setOpenUploadDialog(false)}>إلغاء</Button>
          <Button
            onClick={handleUploadSubmit}
            variant="contained"
            disabled={!uploadForm.file || uploading}
          >
            {uploading ? <CircularProgress size={24} /> : 'رفع'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Badge Celebration Popup */}
      <BadgeCelebrationPopup
        open={badgePopup.open}
        onClose={() => setBadgePopup({ open: false, badge: null })}
        badge={badgePopup.badge}
      />
    </Container>
  );
};

export default TeamProjectPage;
