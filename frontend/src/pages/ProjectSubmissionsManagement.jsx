import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
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
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  Divider,
  IconButton,
  Accordion,
  AccordionSummary,
  AccordionDetails,
} from '@mui/material';
import {
  ExpandMore as ExpandMoreIcon,
  Download as DownloadIcon,
  Feedback as FeedbackIcon,
  Grade as GradeIcon,
  ArrowBack as ArrowBackIcon,
  Description as DescriptionIcon,
} from '@mui/icons-material';
import { toast } from 'react-toastify';
import api from '../services/api';

/**
 * ProjectSubmissionsManagement Component
 * 
 * Teacher/Admin view of all team submissions for a project.
 * Can add feedback and grades.
 * Access: Teacher/Admin only
 */
const ProjectSubmissionsManagement = () => {
  const { projectId } = useParams();
  const navigate = useNavigate();

  const [project, setProject] = useState(null);
  const [submissions, setSubmissions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [feedbackDialog, setFeedbackDialog] = useState({
    open: false,
    submission: null,
    feedback: ''
  });
  const [gradeDialog, setGradeDialog] = useState({
    open: false,
    submission: null,
    score: ''
  });

  useEffect(() => {
    fetchData();
  }, [projectId]);

  const fetchData = async () => {
    try {
      setLoading(true);

      // Get project details
      const projectResponse = await api.get(`/projects/${projectId}`);
      setProject(projectResponse.data.data);

      // Get all submissions for this project
      const submissionsResponse = await api.get(`/team-submissions/project/${projectId}`);
      setSubmissions(submissionsResponse.data.data);

      setLoading(false);
    } catch (err) {
      toast.error(err.response?.data?.message || 'حدث خطأ في جلب البيانات');
      setLoading(false);
    }
  };

  const handleOpenFeedbackDialog = (submission) => {
    setFeedbackDialog({
      open: true,
      submission,
      feedback: submission.feedback || ''
    });
  };

  const handleSubmitFeedback = async () => {
    try {
      await api.put(`/team-submissions/${feedbackDialog.submission._id}/feedback`, {
        feedback: feedbackDialog.feedback
      });
      toast.success('تم إضافة الملاحظات بنجاح');
      setFeedbackDialog({ open: false, submission: null, feedback: '' });
      fetchData();
    } catch (err) {
      toast.error(err.response?.data?.message || 'حدث خطأ');
    }
  };

  const handleOpenGradeDialog = (submission) => {
    setGradeDialog({
      open: true,
      submission,
      score: submission.score !== null ? submission.score : ''
    });
  };

  const handleSubmitGrade = async () => {
    try {
      const score = parseFloat(gradeDialog.score);
      if (isNaN(score) || score < 0 || score > 100) {
        toast.error('الدرجة يجب أن تكون بين 0 و 100');
        return;
      }

      await api.put(`/team-submissions/${gradeDialog.submission._id}/grade`, {
        score
      });
      toast.success('تم إضافة الدرجة بنجاح');
      setGradeDialog({ open: false, submission: null, score: '' });
      fetchData();
    } catch (err) {
      toast.error(err.response?.data?.message || 'حدث خطأ');
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

  // Group submissions by team
  const submissionsByTeam = submissions.reduce((acc, submission) => {
    const teamId = submission.team._id;
    if (!acc[teamId]) {
      acc[teamId] = {
        team: submission.team,
        submissions: []
      };
    }
    acc[teamId].submissions.push(submission);
    return acc;
  }, {});

  if (loading) {
    return (
      <Container maxWidth="lg" sx={{ mt: 4, display: 'flex', justifyContent: 'center' }}>
        <CircularProgress />
      </Container>
    );
  }

  if (!project) {
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
        onClick={() => navigate('/projects')}
        sx={{ mb: 2 }}
      >
        العودة للمشاريع
      </Button>

      {/* Project Header */}
      <Paper elevation={3} sx={{ p: 3, mb: 3 }}>
        <Typography variant="h4" gutterBottom>
          {project.title}
        </Typography>
        <Typography variant="body1" color="text.secondary">
          إجمالي التسليمات: {submissions.length}
        </Typography>
      </Paper>

      {/* Submissions by Team */}
      {Object.keys(submissionsByTeam).length === 0 ? (
        <Alert severity="info">لم يتم رفع أي تسليم بعد</Alert>
      ) : (
        Object.values(submissionsByTeam).map(({ team, submissions: teamSubmissions }) => (
          <Accordion key={team._id} sx={{ mb: 2 }}>
            <AccordionSummary expandIcon={<ExpandMoreIcon />}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, width: '100%' }}>
                <Typography variant="h6">{team.name}</Typography>
                <Chip label={`${teamSubmissions.length} تسليم`} size="small" />
                <Box sx={{ flex: 1 }} />
                <Typography variant="body2" color="text.secondary">
                  الأعضاء: {team.members.map(m => m.name).join(', ')}
                </Typography>
              </Box>
            </AccordionSummary>
            <AccordionDetails>
              {teamSubmissions
                .sort((a, b) => new Date(b.submittedAt) - new Date(a.submittedAt))
                .map((submission, index) => (
                  <Card key={submission._id} sx={{ mb: 2 }}>
                    <CardContent>
                      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start', mb: 2 }}>
                        <Box>
                          <Typography variant="h6">
                            التسليم #{teamSubmissions.length - index}
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

                      <Divider sx={{ my: 2 }} />

                      {/* Feedback Section */}
                      <Box sx={{ mb: 2 }}>
                        {submission.feedback ? (
                          <Alert severity="info" icon={<FeedbackIcon />}>
                            <Typography variant="body2" sx={{ fontWeight: 'bold' }}>
                              الملاحظات:
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
                        ) : (
                          <Alert severity="warning">لم يتم إضافة ملاحظات بعد</Alert>
                        )}
                        <Button
                          variant="outlined"
                          startIcon={<FeedbackIcon />}
                          onClick={() => handleOpenFeedbackDialog(submission)}
                          sx={{ mt: 1 }}
                          size="small"
                        >
                          {submission.feedback ? 'تعديل الملاحظات' : 'إضافة ملاحظات'}
                        </Button>
                      </Box>

                      {/* Grade Section */}
                      <Box>
                        {submission.score !== null ? (
                          <Alert severity="success" icon={<GradeIcon />}>
                            <Typography variant="body2" sx={{ fontWeight: 'bold' }}>
                              الدرجة: {submission.score} / 100
                            </Typography>
                            {submission.gradedBy && (
                              <Typography variant="caption" color="text.secondary">
                                - {submission.gradedBy.name}
                              </Typography>
                            )}
                          </Alert>
                        ) : (
                          <Alert severity="warning">لم يتم التقييم بعد</Alert>
                        )}
                        <Button
                          variant="outlined"
                          startIcon={<GradeIcon />}
                          onClick={() => handleOpenGradeDialog(submission)}
                          sx={{ mt: 1 }}
                          size="small"
                        >
                          {submission.score !== null ? 'تعديل الدرجة' : 'إضافة درجة'}
                        </Button>
                      </Box>
                    </CardContent>
                  </Card>
                ))}
            </AccordionDetails>
          </Accordion>
        ))
      )}

      {/* Feedback Dialog */}
      <Dialog open={feedbackDialog.open} onClose={() => setFeedbackDialog({ open: false, submission: null, feedback: '' })} maxWidth="sm" fullWidth>
        <DialogTitle>إضافة/تعديل الملاحظات</DialogTitle>
        <DialogContent>
          <TextField
            label="الملاحظات"
            value={feedbackDialog.feedback}
            onChange={(e) => setFeedbackDialog({ ...feedbackDialog, feedback: e.target.value })}
            multiline
            rows={4}
            fullWidth
            sx={{ mt: 2 }}
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setFeedbackDialog({ open: false, submission: null, feedback: '' })}>
            إلغاء
          </Button>
          <Button onClick={handleSubmitFeedback} variant="contained">
            حفظ
          </Button>
        </DialogActions>
      </Dialog>

      {/* Grade Dialog */}
      <Dialog open={gradeDialog.open} onClose={() => setGradeDialog({ open: false, submission: null, score: '' })} maxWidth="xs" fullWidth>
        <DialogTitle>إضافة/تعديل الدرجة</DialogTitle>
        <DialogContent>
          <TextField
            label="الدرجة (0-100)"
            type="number"
            value={gradeDialog.score}
            onChange={(e) => setGradeDialog({ ...gradeDialog, score: e.target.value })}
            fullWidth
            sx={{ mt: 2 }}
            inputProps={{ min: 0, max: 100, step: 0.5 }}
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setGradeDialog({ open: false, submission: null, score: '' })}>
            إلغاء
          </Button>
          <Button onClick={handleSubmitGrade} variant="contained">
            حفظ
          </Button>
        </DialogActions>
      </Dialog>
    </Container>
  );
};

export default ProjectSubmissionsManagement;
