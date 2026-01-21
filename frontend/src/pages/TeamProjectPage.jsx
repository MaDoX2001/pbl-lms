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

/**
 * TeamProjectPage Component
 * 
 * Shows project details and all submissions for the team.
 * Students can upload new submissions.
 * Teachers can view all team submissions.
 * 
 * BUSINESS RULE: Multiple submissions are allowed.
 * Only the latest submission before the deadline is graded.
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

  useEffect(() => {
    fetchData();
  }, [projectId]);

  const fetchData = async () => {
    try {
      setLoading(true);

      // Get project details
      const projectResponse = await api.get(`/projects/${projectId}`);
      setProject(projectResponse.data.data);

      // Get my team
      const teamResponse = await api.get('/teams/my-team');
      setTeam(teamResponse.data.data);

      // Get submissions (sorted by submittedAt DESC - latest first)
      const submissionsResponse = await api.get(
        `/team-submissions/team/${teamResponse.data.data._id}/project/${projectId}`
      );
      // Multiple submissions allowed - only the latest before deadline is graded
      const sortedSubmissions = (submissionsResponse.data.data || []).sort(
        (a, b) => new Date(b.submittedAt) - new Date(a.submittedAt)
      );
      setSubmissions(sortedSubmissions);

      setLoading(false);
    } catch (err) {
      toast.error(err.response?.data?.message || 'حدث خطأ في جلب البيانات');
      setLoading(false);
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
      <Container maxWidth="lg" sx={{ mt: 4, display: 'flex', justifyContent: 'center' }}>
        <CircularProgress />
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
          <Chip label={`المستوى: ${project.level || 'غير محدد'}`} />
          <Chip label={`الفريق: ${team.name}`} color="primary" />
        </Box>
      </Paper>

      {/* Upload Section */}
      {user.role === 'student' && (
        <Box sx={{ mb: 3 }}>
          {project.deadline && new Date() > new Date(project.deadline) ? (
            <Alert severity="error" sx={{ mb: 2 }}>
              <Typography variant="body2" sx={{ fontWeight: 'bold', mb: 0.5 }}>
                ⛔ انتهى موعد التسليم
              </Typography>
              <Typography variant="body2">
                سيتم تقييم <strong>آخر تسليمة فقط</strong> تم رفعها قبل الموعد النهائي.
              </Typography>
            </Alert>
          ) : (
            <>
              {project.deadline && (
                <Alert severity="info" sx={{ mb: 2 }}>
                  <Typography variant="body2">
                    <strong>الموعد النهائي للتسليم:</strong>{' '}
                    {new Date(project.deadline).toLocaleString('ar-EG', {
                      year: 'numeric',
                      month: 'long',
                      day: 'numeric',
                      hour: '2-digit',
                      minute: '2-digit'
                    })}
                  </Typography>
                </Alert>
              )}
              <Button
                variant="contained"
                startIcon={<UploadIcon />}
                onClick={() => setOpenUploadDialog(true)}
                fullWidth
              >
                رفع تسليم جديد
              </Button>
            </>
          )}
        </Box>
      )}

      {/* Submissions List */}
      <Paper elevation={3} sx={{ p: 3 }}>
        <Typography variant="h5" gutterBottom>
          التسليمات ({submissions.length})
        </Typography>
        <Divider sx={{ mb: 2 }} />

        {/* Permanent explanatory notice - ALWAYS visible */}
        <Alert severity="warning" sx={{ mb: 3 }}>
          <Typography variant="body2" sx={{ fontWeight: 'bold', mb: 0.5 }}>
            ⚠️ تنبيه مهم
          </Typography>
          <Typography variant="body2">
            يتم التقييم على <strong>آخر تسليمة فقط</strong> قبل الموعد النهائي للمشروع.
            يمكنك رفع أكثر من تسليمة، لكن <strong>آخر واحدة هي المعتمدة</strong>.
          </Typography>
        </Alert>

        {submissions.length === 0 ? (
          <Alert severity="info">لم يتم رفع أي تسليم بعد</Alert>
        ) : (
          <List>
            {/* Multiple submissions allowed - sorted by submittedAt DESC */}
            {/* First submission is the latest (final one that will be graded) */}
            {submissions.map((submission, index) => {
              const isLatestSubmission = index === 0; // First in sorted list = most recent
              
              return (
                <Card 
                  key={submission._id} 
                  sx={{ 
                    mb: 2,
                    border: isLatestSubmission ? '2px solid #1976d2' : '1px solid #e0e0e0',
                    bgcolor: isLatestSubmission ? '#e3f2fd' : 'transparent'
                  }}
                >
                  <CardContent>
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start', mb: 2 }}>
                      <Box>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
                          <Typography variant="h6">
                            التسليم #{submissions.length - index}
                          </Typography>
                          {/* Badge to distinguish final submission from older ones */}
                          {isLatestSubmission ? (
                            <Chip 
                              label="آخر تسليمة – سيتم التقييم عليها" 
                              color="primary" 
                              size="small"
                              sx={{ fontWeight: 'bold' }}
                            />
                          ) : (
                            <Chip 
                              label="تسليمة سابقة" 
                              variant="outlined"
                              size="small"
                            />
                          )}
                        </Box>
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
              );
            })}
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
    </Container>
  );
};

export default TeamProjectPage;
