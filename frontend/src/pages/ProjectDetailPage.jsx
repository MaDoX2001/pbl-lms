import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
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
  Alert,
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
import AssessmentIcon from '@mui/icons-material/Assessment';
import VideocamIcon from '@mui/icons-material/Videocam';
import EditIcon from '@mui/icons-material/Edit';
import GroupsIcon from '@mui/icons-material/Groups';
import GradeIcon from '@mui/icons-material/Grade';
import { toast } from 'react-toastify';
import { fetchProjectById } from '../redux/slices/projectSlice';
import { enrollInProject } from '../redux/slices/projectSlice';
import ResourceUploadDialog from '../components/ResourceUploadDialog';
import HomeworkSubmitDialog from '../components/HomeworkSubmitDialog';
import CreateAssignmentDialog from '../components/CreateAssignmentDialog';
import api from '../services/api';
import { useAppSettings } from '../context/AppSettingsContext';

const ProjectDetailPage = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const dispatch = useDispatch();
  const { currentProject: project, loading } = useSelector((state) => state.projects);
  const { user, isAuthenticated } = useSelector((state) => state.auth);
  const { t, direction } = useAppSettings();

  const [materials, setMaterials] = useState([]);
  const [assignments, setAssignments] = useState([]);
  const [mySubmissions, setMySubmissions] = useState([]);
  const [uploadDialogOpen, setUploadDialogOpen] = useState(false);
  const [homeworkDialogOpen, setHomeworkDialogOpen] = useState(false);
  const [assignmentDialogOpen, setAssignmentDialogOpen] = useState(false);
  const [selectedAssignment, setSelectedAssignment] = useState(null);
  const [projectSubmitDialogOpen, setProjectSubmitDialogOpen] = useState(false);
  const [projectSubmitting, setProjectSubmitting] = useState(false);
  const [projectSubmissionData, setProjectSubmissionData] = useState({
    submissionUrl: '',
    codeSubmission: '',
    notes: '',
  });
  const [wiringImageFile, setWiringImageFile] = useState(null);
  const [projectSubmissionFile, setProjectSubmissionFile] = useState(null);
  const [loadingMaterials, setLoadingMaterials] = useState(false);
  const [loadingAssignments, setLoadingAssignments] = useState(false);
  const [teamsLinkDialogOpen, setTeamsLinkDialogOpen] = useState(false);
  const [teamsLink, setTeamsLink] = useState('');
  const [teams, setTeams] = useState([]);
  const [selectedTeams, setSelectedTeams] = useState([]);
  const [selectAllTeams, setSelectAllTeams] = useState(false);
  const [teamRegisterDialogOpen, setTeamRegisterDialogOpen] = useState(false);
  const [countdown, setCountdown] = useState('');
  const [studentProjectSubmission, setStudentProjectSubmission] = useState(null);
  const [studentEvaluationScore, setStudentEvaluationScore] = useState(null);
  const [projectSubmissionsForReview, setProjectSubmissionsForReview] = useState([]);
  const [projectSubmissionScoresForReview, setProjectSubmissionScoresForReview] = useState({});
  const [loadingProjectSubmissions, setLoadingProjectSubmissions] = useState(false);
  const [showIndividualSubmissions, setShowIndividualSubmissions] = useState(false);
  const [feedbackBySubmission, setFeedbackBySubmission] = useState({});
  const [allowResubmitBySubmission, setAllowResubmitBySubmission] = useState({});
  const [savingFeedbackBySubmission, setSavingFeedbackBySubmission] = useState({});
  const [showOtherSubmissionsByStudent, setShowOtherSubmissionsByStudent] = useState({});
  const [myTeam, setMyTeam] = useState(null);
  const [teamEnrollmentLoading, setTeamEnrollmentLoading] = useState(false);
  const [teamAlreadyEnrolled, setTeamAlreadyEnrolled] = useState(false);
  const [enrollingTeam, setEnrollingTeam] = useState(false);

  useEffect(() => {
    if (!project?.deadline) { setCountdown(''); return; }
    const calc = () => {
      const diff = new Date(project.deadline) - new Date();
      if (diff <= 0) { setCountdown(t('deadlinePassed') || 'انتهى الوقت'); return; }
      const days = Math.floor(diff / 86400000);
      const hours = Math.floor((diff % 86400000) / 3600000);
      const minutes = Math.floor((diff % 3600000) / 60000);
      const seconds = Math.floor((diff % 60000) / 1000);
      const parts = [];
      if (days > 0) parts.push(`${days} يوم`);
      parts.push(`${String(hours).padStart(2,'0')}:${String(minutes).padStart(2,'0')}:${String(seconds).padStart(2,'0')}`);
      setCountdown(parts.join(' — '));
    };
    calc();
    const interval = setInterval(calc, 1000);
    return () => clearInterval(interval);
  }, [project?.deadline]);

  useEffect(() => {
    dispatch(fetchProjectById(id));
  }, [dispatch, id]);

  useEffect(() => {
    const fetchTeamEnrollmentState = async () => {
      if (!id || !project?.isTeamProject || user?.role !== 'student') {
        setMyTeam(null);
        setTeamAlreadyEnrolled(false);
        return;
      }

      try {
        setTeamEnrollmentLoading(true);
        const teamResponse = await api.get('/teams/my-team');
        const teamData = teamResponse.data?.data || null;
        setMyTeam(teamData);

        if (!teamData?._id) {
          setTeamAlreadyEnrolled(false);
          return;
        }

        const enrollmentsResponse = await api.get('/team-projects/my-team');
        const enrollments = enrollmentsResponse.data?.data || [];
        const enrolled = enrollments.some(
          (enrollment) => String(enrollment.project?._id || enrollment.project) === String(id)
        );
        setTeamAlreadyEnrolled(enrolled);
      } catch (error) {
        setMyTeam(null);
        setTeamAlreadyEnrolled(false);
      } finally {
        setTeamEnrollmentLoading(false);
      }
    };

    fetchTeamEnrollmentState();
  }, [id, project?.isTeamProject, user?.role]);

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

  const fetchStudentProjectSubmission = async () => {
    try {
      const response = await api.get(`/progress/${id}`);
      const progressData = response.data?.data;
      if (progressData && ['submitted', 'reviewed', 'completed'].includes(progressData.status)) {
        setStudentProjectSubmission(progressData);
        
        // Also fetch the evaluation score from EvaluationAttempt
        try {
          const scoreResponse = await api.get(`/assessment/individual-status/${id}/${user._id}`);
          const latestScore = scoreResponse.data?.data?.latestScore;
          if (latestScore !== null && latestScore !== undefined) {
            setStudentEvaluationScore(latestScore);
          } else {
            setStudentEvaluationScore(null);
          }
        } catch (err) {
          // Silent fail if evaluation data not available yet
          setStudentEvaluationScore(null);
        }
      } else {
        setStudentProjectSubmission(null);
        setStudentEvaluationScore(null);
      }
    } catch (error) {
      setStudentProjectSubmission(null);
      setStudentEvaluationScore(null);
    }
  };

  const fetchProjectSubmissionsForReview = async () => {
    try {
      setLoadingProjectSubmissions(true);
      const response = await api.get(`/progress/project/${id}/submissions`);
      const submissions = response.data?.data || [];
      setProjectSubmissionsForReview(submissions);

      // Build reviewer drafts
      const feedbackDrafts = {};
      const allowResubmitDrafts = {};
      submissions.forEach((submission) => {
        feedbackDrafts[submission._id] = submission.feedback?.comments || '';
        allowResubmitDrafts[submission._id] = Boolean(submission.resubmissionAllowed);
      });

      // Fetch evaluation scores in parallel to avoid N+1 sequential latency
      const scoreResults = await Promise.all(
        submissions.map(async (submission) => {
          const studentId = submission.student?._id || submission.studentId || submission.student;
          if (!studentId) {
            return { progressId: submission._id, score: undefined };
          }

          try {
            const scoreResponse = await api.get(`/assessment/individual-status/${id}/${studentId}`);
            const latestScore = scoreResponse.data?.data?.latestScore;
            return {
              progressId: submission._id,
              score: latestScore !== null && latestScore !== undefined ? latestScore : undefined
            };
          } catch (err) {
            return { progressId: submission._id, score: undefined };
          }
        })
      );

      const scoresData = {};
      scoreResults.forEach(({ progressId, score }) => {
        if (score !== undefined) {
          scoresData[progressId] = score;
        }
      });

      setProjectSubmissionScoresForReview(scoresData);
      setFeedbackBySubmission(feedbackDrafts);
      setAllowResubmitBySubmission(allowResubmitDrafts);
    } catch (error) {
      setProjectSubmissionsForReview([]);
      setProjectSubmissionScoresForReview({});
    } finally {
      setLoadingProjectSubmissions(false);
    }
  };

  const handleDeleteMaterial = async (materialId) => {
    if (!window.confirm(t('confirmDeleteMaterial'))) return;

    try {
      await api.delete(`/resources/${id}/materials/${materialId}`);
      toast.success(t('materialDeletedSuccess'));
      fetchCourseMaterials();
    } catch (error) {
      toast.error(t('materialDeleteFailed'));
    }
  };

  const handleDeleteAssignment = async (assignmentId) => {
    if (!window.confirm(t('confirmDeleteAssignment'))) return;

    try {
      await api.delete(`/resources/${id}/assignments/${assignmentId}`);
      toast.success(t('assignmentDeletedSuccess'));
      fetchAssignments();
    } catch (error) {
      toast.error(t('assignmentDeleteFailed'));
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
      
      toast.success(t('fileDownloadedSuccess'));
    } catch (error) {
      toast.error(t('fileDownloadFailed'));
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
    dispatch(enrollInProject(id)).then(() => {
      dispatch(fetchProjectById(id));
    });
  };

  const handleTeamEnroll = async () => {
    try {
      setEnrollingTeam(true);

      let teamData = myTeam;
      if (!teamData?._id) {
        const teamResponse = await api.get('/teams/my-team');
        teamData = teamResponse.data?.data || null;
        setMyTeam(teamData);
      }

      if (!teamData?._id) {
        toast.error('يجب الانضمام لفريق أولاً قبل تسجيل مشروع جماعي');
        return;
      }

      await api.post('/team-projects/enroll', {
        teamId: teamData._id,
        projectId: id
      });

      setTeamAlreadyEnrolled(true);
      toast.success('تم تسجيل الفريق بالكامل في المشروع بنجاح');
      dispatch(fetchProjectById(id));
    } catch (error) {
      const message = error.response?.data?.message || 'تعذر تسجيل الفريق في المشروع';
      if (message.includes('مسجل بالفعل')) {
        setTeamAlreadyEnrolled(true);
      }
      toast.error(message);
    } finally {
      setEnrollingTeam(false);
    }
  };

  const handleDeleteProject = async () => {
    if (!window.confirm(t('confirmDeleteProject'))) {
      return;
    }

    try {
      await api.delete(`/projects/${id}`);
      toast.success(t('projectDeletedSuccess'));
      window.location.href = '/projects';
    } catch (error) {
      toast.error(error.response?.data?.message || t('projectDeleteFailed'));
      console.error('Delete project error:', error);
    }
  };

  const handleSaveTeamsLink = async () => {
    try {
      await api.put(`/projects/${id}`, { teamsLink });
      toast.success(t('teamsLinkSavedSuccess'));
      setTeamsLinkDialogOpen(false);
      dispatch(fetchProjectById(id));
    } catch (error) {
      toast.error(t('teamsLinkSaveFailed'));
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
      toast.error(t('selectAtLeastOneTeam'));
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
          if (error.response?.data?.message?.includes('\u0645\u0633\u062c\u0644 \u0628\u0627\u0644\u0641\u0639\u0644')) {
            errorCount++;
          } else {
            throw error;
          }
        }
      }

      if (successCount > 0) {
        toast.success(t('teamsRegisteredInProject', { count: successCount }));
      }
      if (errorCount > 0) {
        toast.warning(t('teamsAlreadyRegistered', { count: errorCount }));
      }

      setTeamRegisterDialogOpen(false);
      setSelectedTeams([]);
      setSelectAllTeams(false);
    } catch (error) {
      toast.error(error.response?.data?.message || t('teamRegisterFailed'));
    }
  };

  const handleJoinTeams = () => {
    if (project.teamsLink) {
      window.open(project.teamsLink, '_blank');
    }
  };

  const handleSubmitIndividualProject = async () => {
    try {
      setProjectSubmitting(true);
      const formData = new FormData();
      formData.append('submissionUrl', projectSubmissionData.submissionUrl || '');
      formData.append('codeSubmission', projectSubmissionData.codeSubmission || '');
      formData.append('notes', projectSubmissionData.notes || '');

      if (wiringImageFile) {
        formData.append('wiringImage', wiringImageFile);
      }

      if (projectSubmissionFile) {
        formData.append('submissionFile', projectSubmissionFile);
      }

      await api.post(`/progress/${id}/submit`, formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });
      toast.success(t('projectSubmitSuccess'));
      setProjectSubmitDialogOpen(false);
      setProjectSubmissionData({
        submissionUrl: '',
        codeSubmission: '',
        notes: '',
      });
      setWiringImageFile(null);
      setProjectSubmissionFile(null);
      fetchStudentProjectSubmission();
      if (user?.role === 'teacher' || user?.role === 'admin') {
        fetchProjectSubmissionsForReview();
      }
    } catch (error) {
      toast.error(error.response?.data?.message || t('projectSubmitFailed'));
    } finally {
      setProjectSubmitting(false);
    }
  };

  const handleProjectFileChange = (event) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const allowed = [
      'application/pdf',
      'application/msword',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'video/mp4',
      'video/webm',
      'video/quicktime',
      'video/x-msvideo'
    ];

    if (!allowed.includes(file.type)) {
      toast.error('الملف المسموح: Word أو PDF أو فيديو فقط');
      return;
    }

    setProjectSubmissionFile(file);
  };

  const handleWiringImageChange = (event) => {
    const file = event.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      toast.error('صورة التوصيل يجب أن تكون صورة فقط');
      return;
    }

    setWiringImageFile(file);
  };

  const handleSaveReviewerFeedback = async (submissionId) => {
    try {
      setSavingFeedbackBySubmission((prev) => ({ ...prev, [submissionId]: true }));
      await api.put(`/progress/${submissionId}/feedback`, {
        comments: feedbackBySubmission[submissionId] || '',
        allowResubmission: Boolean(allowResubmitBySubmission[submissionId])
      });
      toast.success('تم حفظ تعليق المراجع بنجاح');
      fetchProjectSubmissionsForReview();
    } catch (error) {
      toast.error(error.response?.data?.message || 'فشل حفظ تعليق المراجع');
    } finally {
      setSavingFeedbackBySubmission((prev) => ({ ...prev, [submissionId]: false }));
    }
  };

  useEffect(() => {
    if (!id || !project || project.isTeamProject === true) return;

    if (user?.role === 'student') {
      fetchStudentProjectSubmission();
    }

    if (user?.role === 'teacher' || user?.role === 'admin') {
      fetchProjectSubmissionsForReview();
    }
  }, [id, project, user?.role]);

  if (loading || !project) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', py: 8 }}>
        <CircularProgress />
      </Box>
    );
  }

  const enrolledProjectIds = (user?.enrolledProjects || []).map((p) =>
    typeof p === 'string' ? p : (p?._id || p?.id)
  );
  const enrolledStudentIds = (project?.enrolledStudents || []).map((s) =>
    typeof s === 'string' ? s : (s?._id || s?.id)
  );
  const isEnrolled = Boolean(project?.isEnrolled)
    || enrolledProjectIds.includes(project._id)
    || (user?._id ? enrolledStudentIds.includes(user._id) : false);
  const isTeamProject = project?.isTeamProject === true;
  const totalRegisteredStudents = Array.isArray(project?.enrolledStudents)
    ? project.enrolledStudents.length
    : 0;
  const submittedStudentIds = new Set(
    (projectSubmissionsForReview || [])
      .map((submission) => submission?.student?._id || submission?.studentId || submission?.student)
      .filter(Boolean)
      .map((studentId) => String(studentId))
  );
  const submittedStudentsCount = submittedStudentIds.size;
  const studentEvaluationDone = studentEvaluationScore !== null;
  // Admin can manage any project, Teacher can only manage their own projects
  const canManageProject = user && (
    user.role === 'admin' || 
    (user.role === 'teacher' && project.instructor?._id === user._id)
  );
  const difficultyLabel = {
    beginner: t('beginner'),
    intermediate: t('intermediate'),
    advanced: t('advanced'),
  };

  const handleTogglePublish = async () => {
    try {
      const response = await api.put(`/projects/${id}`, {
        isPublished: !project.isPublished
      });
      
      toast.success(project.isPublished ? t('projectUnpublished') : t('projectPublished'));
      dispatch(fetchProjectById(id)); // Refresh project data
    } catch (error) {
      console.error('Error toggling publish status:', error);
      toast.error(t('publishStatusChangeFailed'));
    }
  };

  return (
    <Box>
      {/* Header */}
      <Paper
        sx={{
          p: 4, mb: 3,
          background: project.coverImage
            ? `linear-gradient(rgba(0,0,0,0.55), rgba(0,0,0,0.55)), url(${project.coverImage})`
            : 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
          backgroundSize: 'cover',
          backgroundPosition: 'center',
          color: 'white'
        }}
      >
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
                {t('editProject')}
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
                {project.isPublished ? t('unpublishProject') : t('publishProject')}
              </Button>
            </Box>
          )}
        </Box>
        <Typography variant="h6" sx={{ mb: 2, opacity: 0.9 }}>
          {project.shortDescription || project.description}
        </Typography>
        <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap', mb: 2 }}>
          <Chip 
            label={project.isPublished ? t('published') : t('draft')}
            sx={{ 
              bgcolor: project.isPublished ? 'rgba(76,175,80,0.3)' : 'rgba(255,152,0,0.3)', 
              color: 'white',
              fontWeight: 600
            }} 
          />
          <Chip label={difficultyLabel[project.difficulty]} sx={{ bgcolor: 'rgba(255,255,255,0.2)', color: 'white' }} />
          <Chip label={t('arduinoUno')} sx={{ bgcolor: 'rgba(255,255,255,0.2)', color: 'white' }} />
          <Chip label={t('simulationEnvironment')} sx={{ bgcolor: 'rgba(255,255,255,0.2)', color: 'white' }} />
          {project.technologies?.map((tech, i) => (
            <Chip key={i} label={tech} sx={{ bgcolor: 'rgba(255,255,255,0.2)', color: 'white' }} />
          ))}
        </Box>
        <Box sx={{ display: 'flex', gap: 3, alignItems: 'center' }}>
          {project.deadline && (
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              <AccessTimeIcon />
              <span style={{ fontVariantNumeric: 'tabular-nums' }}>{countdown}</span>
            </Box>
          )}
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <CodeIcon />
            <span>{project.points} {t('pointsUnit')}</span>
          </Box>
        </Box>
      </Paper>

      <Grid container spacing={3}>
        {/* Main Content */}
        <Grid item xs={12} md={8} sx={{ order: { xs: 2, md: direction === 'rtl' ? 2 : 1 } }}>
          {/* Description */}
          <Paper sx={{ p: 3, mb: 3 }}>
            <Typography variant="h5" gutterBottom fontWeight={600}>
              {t('detailedDescription')}
            </Typography>
            <Typography variant="body1" paragraph sx={{ whiteSpace: 'pre-line' }}>
              {project.description}
            </Typography>
          </Paper>

          {/* Objectives */}
          {project.showObjectives && project.objectives?.length > 0 && (
            <Paper sx={{ p: 3, mb: 3 }}>
              <Typography variant="h5" gutterBottom fontWeight={600}>
                {t('learningObjectives')}
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

          {/* Components */}
          {project.showComponents && project.components?.length > 0 && (
            <Paper sx={{ p: 3, mb: 3 }}>
              <Typography variant="h5" gutterBottom fontWeight={600}>
                {t('projectComponents')}
              </Typography>
              <List>
                {project.components.map((comp, index) => (
                  <ListItem key={index}>
                    <CheckCircleIcon color="primary" sx={{ mr: 1 }} />
                    <ListItemText primary={comp} />
                  </ListItem>
                ))}
              </List>
            </Paper>
          )}

          {/* Learning Scenario */}
          {project.learningScenario && (
            <Paper sx={{ p: 3, mb: 3 }}>
              <Typography variant="h5" gutterBottom fontWeight={600}>
                {t('projectLearningScenario')}
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
                {t('teachingStrategy')}
              </Typography>
              <Typography variant="body1" sx={{ whiteSpace: 'pre-line' }}>
                {project.teachingStrategy}
              </Typography>
            </Paper>
          )}

          {/* Milestones */}
          {project.milestones?.length > 0 && (
            <Paper sx={{ p: 3, mb: 3 }}>
              <Typography variant="h5" gutterBottom fontWeight={600}>
                مراحل المشروع وخطة التنفيذ
              </Typography>
              <List>
                {[...project.milestones]
                  .sort((a, b) => (a.order ?? 0) - (b.order ?? 0))
                  .map((milestone, index) => (
                    <ListItem key={milestone._id || index} sx={{ display: 'block', px: 0 }}>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 0.5 }}>
                        <CheckCircleIcon color="primary" />
                        <Typography variant="subtitle1" fontWeight={700}>
                          {index + 1}. {milestone.title}
                        </Typography>
                        {milestone.dueDate && (
                          <Chip
                            size="small"
                            color="secondary"
                            variant="outlined"
                            label={`حتى ${new Date(milestone.dueDate).toLocaleDateString('ar-EG')}`}
                          />
                        )}
                        {milestone.points > 0 && (
                          <Chip size="small" label={`${milestone.points} ${t('pointsUnit')}`} color="info" variant="outlined" />
                        )}
                      </Box>
                      {milestone.description && (
                        <Typography variant="body2" color="text.secondary" sx={{ mb: 1.25, mr: 4 }}>
                          {milestone.description}
                        </Typography>
                      )}
                      {milestone.tasks?.length > 0 && (
                        <List dense sx={{ mr: 4, mb: 1 }}>
                          {milestone.tasks.map((task, taskIndex) => (
                            <ListItem key={task._id || taskIndex} sx={{ py: 0.25 }}>
                              <ListItemText
                                primary={`- ${task.title}`}
                                secondary={task.description || ''}
                              />
                            </ListItem>
                          ))}
                        </List>
                      )}
                    </ListItem>
                  ))}
              </List>
            </Paper>
          )}

          {/* Final Report Note */}
          {project.finalReportNote && (
            <Paper sx={{ p: 3, mb: 3, bgcolor: '#f5f5f5' }}>
              <Typography variant="h6" gutterBottom fontWeight={600} color="primary">
                {t('importantNote')}
              </Typography>
              <Typography variant="body1">
                {project.finalReportNote}
              </Typography>
            </Paper>
          )}

          {/* Resources */}
          {project.resources?.length > 0 && (
            <Paper sx={{ p: 3 }}>
              <Typography variant="h5" gutterBottom fontWeight={600}>
                {t('learningResources')}
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
        <Grid item xs={12} md={4} sx={{ order: { xs: 1, md: direction === 'rtl' ? 1 : 2 } }}>
          {/* Enrollment Card */}
          <Paper sx={{ p: 3, mb: 3, position: 'sticky', top: 20 }}>
            {!isTeamProject && (
              isAuthenticated ? (
                user?.role === 'student' && !isEnrolled ? (
                  <Button variant="contained" fullWidth size="large" onClick={handleEnroll}>
                    {t('enrollInProject')}
                  </Button>
                ) : user?.role === 'student' ? (
                  <Typography variant="body2" color="success.main" sx={{ textAlign: 'center', fontWeight: 600 }}>
                    {t('alreadyEnrolled')}
                  </Typography>
                ) : null
              ) : (
                <Button variant="contained" fullWidth size="large" href="/login">
                  {t('loginToEnroll')}
                </Button>
              )
            )}

            {isTeamProject && (
              isAuthenticated ? (
                user?.role === 'student' ? (
                  <Box>
                    {teamEnrollmentLoading ? (
                      <Box sx={{ display: 'flex', justifyContent: 'center', py: 1 }}>
                        <CircularProgress size={24} />
                      </Box>
                    ) : !myTeam ? (
                      <Alert severity="warning" sx={{ mb: 1 }}>
                        لازم تكون عضو في فريق أولاً قبل التسجيل في مشروع جماعي.
                      </Alert>
                    ) : !teamAlreadyEnrolled ? (
                      <Button
                        variant="contained"
                        color="secondary"
                        fullWidth
                        size="large"
                        startIcon={<GroupsIcon />}
                        onClick={handleTeamEnroll}
                        disabled={enrollingTeam}
                      >
                        {enrollingTeam ? 'جارِ تسجيل الفريق...' : 'تسجيل الفريق في المشروع'}
                      </Button>
                    ) : (
                      <Typography variant="body2" color="success.main" sx={{ textAlign: 'center', fontWeight: 700 }}>
                        الفريق مسجل بالفعل في هذا المشروع
                      </Typography>
                    )}

                    <Alert severity="info" sx={{ mt: 2 }}>
                      اختيار الأدوار يتم من لوحة الفريق، والتسليمات والمراحل تظهر في صفحة المشروع الجماعي.
                    </Alert>

                    {teamAlreadyEnrolled && (
                      <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1, mt: 1 }}>
                        <Button variant="outlined" onClick={() => navigate('/team/dashboard')}>
                          واجهة اختيار الأدوار (لوحة الفريق)
                        </Button>
                        <Button variant="outlined" onClick={() => navigate(`/team/project/${id}`)}>
                          مكان التسليم + عرض المراحل والتسليمات
                        </Button>
                        <Button variant="outlined" onClick={() => navigate('/arduino-simulator')}>
                          صفحة المحاكي وتسليم Wokwi
                        </Button>
                      </Box>
                    )}
                  </Box>
                ) : null
              ) : (
                <Button variant="contained" fullWidth size="large" href="/login">
                  {t('loginToEnroll')}
                </Button>
              )
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
                  {t('joinLiveLecture')}
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
                  {project.teamsLink ? t('editTeamsLink') : t('addTeamsLink')}
                </Button>
              </>
            )}

            {/* Register Team Button for Admin/Teacher */}
            {canManageProject && isTeamProject && (
              <>
                <Divider sx={{ my: 2 }} />
                <Button
                  variant="contained"
                  color="secondary"
                  fullWidth
                  startIcon={<GroupsIcon />}
                  onClick={handleOpenTeamRegister}
                >
                  {t('registerTeamInProject')}
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
                  {t('deleteProject')}
                </Button>
              </>
            )}

            <Divider sx={{ my: 2 }} />

            {/* Instructor */}
            {project.instructor && (
              <Box>
                <Typography variant="subtitle2" color="text.secondary" gutterBottom>
                  {t('teacher')}
                </Typography>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
                  <Avatar src={project.instructor.avatar} />
                  <Typography variant="body1">{project.instructor.name}</Typography>
                </Box>
              </Box>
            )}

            {/* Stats */}
            <Typography variant="subtitle2" color="text.secondary" gutterBottom>
              {t('stats')}
            </Typography>
            <Typography variant="body2" paragraph>
              {project?.isTeamProject
                ? t('enrolledTeamsCount', { count: project.enrolledTeamsCount || 0 })
                : t('enrolledStudentsCount', { count: project.enrolledStudents?.length || 0 })}
            </Typography>
            <Typography variant="body2">
              {t('completedCount', { count: project.completedBy?.length || 0 })}
            </Typography>
          </Paper>
        </Grid>
      </Grid>

      {/* Course Materials Section */}
      <Paper sx={{ p: 3, mt: 3 }}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
          <Typography variant="h6">{t('courseMaterials')}</Typography>
          {(user?.role === 'teacher' || user?.role === 'admin') && (
            <Button
              variant="contained"
              startIcon={<CloudUploadIcon />}
              onClick={() => setUploadDialogOpen(true)}
            >
              {t('uploadMaterial')}
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
            {t('noCourseMaterialsYet')}
          </Typography>
        ) : (
          <Grid container spacing={2}>
            {materials.map((material) => (
              <Grid item xs={12} sm={6} md={4} key={material._id}>
                <Card sx={{ position: 'relative', overflow: 'hidden' }}>
                  {/* Thumbnail background */}
                  {material.thumbnail && (
                    <Box
                      sx={{
                        position: 'absolute', inset: 0,
                        backgroundImage: `url(${material.thumbnail})`,
                        backgroundSize: 'cover',
                        backgroundPosition: 'center',
                        zIndex: 0,
                      }}
                    />
                  )}
                  <CardContent sx={{ position: 'relative', zIndex: 1, bgcolor: material.thumbnail ? 'rgba(255,255,255,0.88)' : 'transparent', borderRadius: 1 }}>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
                      {getFileIcon(material.fileType)}
                      <Typography variant="subtitle1" noWrap fontWeight={600}>
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
                  <CardActions sx={{ position: 'relative', zIndex: 1, bgcolor: material.thumbnail ? 'rgba(255,255,255,0.88)' : 'transparent' }}>
                    <Button
                      size="small"
                      startIcon={<DownloadIcon />}
                      href={material.fileUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                    >
                      {t('viewOrDownload')}
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

      {/* Project Submission Section */}
      <Paper sx={{ p: 3, mt: 3 }}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
          <Typography variant="h6">تسليم المشروع</Typography>
          {isTeamProject && (user?.role === 'teacher' || user?.role === 'admin') && (
            <Button
              variant="contained"
              startIcon={<AssessmentIcon />}
              onClick={() => navigate(`/projects/${id}/submissions`)}
            >
              عرض تسليمات الفرق
            </Button>
          )}
          {!isTeamProject && (user?.role === 'teacher' || user?.role === 'admin') && (
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, flexWrap: 'wrap' }}>
              <Chip
                color="primary"
                variant="outlined"
                label={`سلم ${submittedStudentsCount} من ${totalRegisteredStudents}`}
              />
              <Button
                variant="contained"
                startIcon={<AssessmentIcon />}
                onClick={() => setShowIndividualSubmissions((prev) => !prev)}
              >
                {showIndividualSubmissions ? 'إخفاء تسليمات الطلاب' : 'عرض تسليمات الطلاب'}
              </Button>
            </Box>
          )}
        </Box>
        {user?.role === 'student' && isEnrolled && !isTeamProject && (
          <Box sx={{ mb: 2 }}>
            <Button
              variant="contained"
              color="success"
              startIcon={<CloudUploadIcon />}
              onClick={() => setProjectSubmitDialogOpen(true)}
            >
              {studentProjectSubmission?.resubmissionAllowed ? 'إعادة التسليم' : t('submit')}
            </Button>
          </Box>
        )}
        <Divider sx={{ mb: 2 }} />

        {!isTeamProject && user?.role === 'student' && (
          <Box sx={{ mb: 3 }}>
            <Typography variant="subtitle1" fontWeight={700} sx={{ mb: 1 }}>
              تسليمك في هذا المشروع
            </Typography>
            {studentProjectSubmission ? (
              <Card variant="outlined">
                <CardContent>
                  <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
                    تاريخ التسليم: {studentProjectSubmission.submittedAt ? new Date(studentProjectSubmission.submittedAt).toLocaleString('ar-EG') : '—'}
                  </Typography>
                  <Chip
                    size="small"
                    color={studentEvaluationDone ? 'success' : 'warning'}
                    label={studentEvaluationDone ? 'تم تقييم التسليم من المعلم' : 'بانتظار تقييم المعلم'}
                    sx={{ mb: 1 }}
                  />
                  {studentProjectSubmission.submissionUrl && (
                    <Typography variant="body2" sx={{ mb: 1 }}>
                      رابط التسليم: <a href={studentProjectSubmission.submissionUrl} target="_blank" rel="noopener noreferrer">{studentProjectSubmission.submissionUrl}</a>
                    </Typography>
                  )}
                  {studentProjectSubmission.wiringImageUrl && (
                    <Box sx={{ mb: 1.5 }}>
                      <Typography variant="body2" sx={{ mb: 0.5 }}>صورة التوصيل:</Typography>
                      <Box component="img" src={studentProjectSubmission.wiringImageUrl} alt="wiring" sx={{ maxWidth: '100%', borderRadius: 1, border: '1px solid', borderColor: 'divider' }} />
                    </Box>
                  )}
                  {studentProjectSubmission.submissionFiles?.length > 0 && (
                    <Typography variant="body2" sx={{ mb: 1 }}>
                      ملف إضافي: <a href={studentProjectSubmission.submissionFiles[studentProjectSubmission.submissionFiles.length - 1].url} target="_blank" rel="noopener noreferrer">تحميل الملف</a>
                    </Typography>
                  )}
                  <Typography variant="body2" sx={{ whiteSpace: 'pre-wrap' }}>
                    الكود:\n{studentProjectSubmission.codeSubmission || '—'}
                  </Typography>
                  {studentProjectSubmission.notes && (
                    <Typography variant="body2" sx={{ mt: 1, whiteSpace: 'pre-wrap' }}>
                      الملاحظات:\n{studentProjectSubmission.notes}
                    </Typography>
                  )}
                  {studentEvaluationDone && studentEvaluationScore !== null && (
                    <Paper sx={{ p: 2, mt: 2, backgroundColor: studentEvaluationScore >= 60 ? 'success.light' : 'error.light' }}>
                      <Typography variant="h6" sx={{ mb: 1 }}>
                        <strong>الدرجة: {studentEvaluationScore} / 100</strong>
                      </Typography>
                      {studentEvaluationScore >= 60 ? (
                        <Chip label="نجح" size="small" color="success" sx={{ mb: 1 }} />
                      ) : (
                        <Chip label="رسب" size="small" color="error" sx={{ mb: 1 }} />
                      )}
                      {studentProjectSubmission.feedback?.comments && (
                        <Typography variant="body2" sx={{ mt: 1, whiteSpace: 'pre-wrap' }}>
                          <strong>ملاحظات المراجع:</strong>{'\n'}{studentProjectSubmission.feedback.comments}
                        </Typography>
                      )}
                    </Paper>
                  )}
                  {studentProjectSubmission.resubmissionAllowed && (
                    <Alert severity="warning" sx={{ mt: 1 }}>
                      تم فتح إعادة التسليم لك. راجع تعليق المراجع ثم أعد التسليم.
                    </Alert>
                  )}
                </CardContent>
              </Card>
            ) : (
              <Alert severity="info">لم يتم تسليم المشروع الفردي بعد.</Alert>
            )}
          </Box>
        )}

        {!isTeamProject && (user?.role === 'teacher' || user?.role === 'admin') && showIndividualSubmissions && (
          <Box sx={{ mb: 3 }}>
            <Typography variant="subtitle1" fontWeight={700} sx={{ mb: 1 }}>
              تسليمات الطلاب للمشروع الفردي
            </Typography>
            {loadingProjectSubmissions ? (
              <Box sx={{ display: 'flex', justifyContent: 'center', py: 2 }}>
                <CircularProgress size={24} />
              </Box>
            ) : projectSubmissionsForReview.length === 0 ? (
              <Alert severity="info">لا توجد تسليمات حتى الآن.</Alert>
            ) : (
              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5 }}>
                {projectSubmissionsForReview.map((submission) => {
                  const submissionHistory = Array.isArray(submission.submissionHistory)
                    ? submission.submissionHistory
                    : [];
                  const otherSubmissions = submissionHistory.length > 1
                    ? submissionHistory.slice(0, -1).reverse()
                    : [];
                  const studentIdentifier = String(
                    submission.student?._id || submission.studentId || submission.student || submission._id
                  );

                  return (
                    <Card key={submission._id} variant="outlined">
                      <CardContent>
                        <Grid container spacing={2} alignItems="stretch">
                          <Grid item xs={12} md={7}>
                            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1 }}>
                              <Typography variant="subtitle2" fontWeight={700}>
                                {submission.student?.name || 'طالب'}
                              </Typography>
                              <Box sx={{ display: 'flex', gap: 1, alignItems: 'center' }}>
                                {projectSubmissionScoresForReview[submission._id] !== undefined && (
                                  <Chip
                                    size="small"
                                    icon={<GradeIcon />}
                                    label={`الدرجة: ${projectSubmissionScoresForReview[submission._id]}/100`}
                                    color={projectSubmissionScoresForReview[submission._id] >= 60 ? 'success' : 'error'}
                                    variant="outlined"
                                  />
                                )}
                                <Chip
                                  size="small"
                                  color={submission.status === 'completed' ? 'success' : submission.status === 'reviewed' ? 'info' : 'warning'}
                                  label={
                                    submission.status === 'completed' ? 'مكتمل'
                                      : submission.status === 'reviewed' ? 'تمت المراجعة'
                                      : 'تم التسليم'
                                  }
                                />
                              </Box>
                            </Box>

                            <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
                              البريد: {submission.student?.email || '—'}
                            </Typography>
                            <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
                              تاريخ آخر تسليم: {submission.submittedAt ? new Date(submission.submittedAt).toLocaleString('ar-EG') : '—'}
                            </Typography>

                            {submission.submissionUrl && (
                              <Typography variant="body2" sx={{ mb: 1 }}>
                                رابط التسليم: <a href={submission.submissionUrl} target="_blank" rel="noopener noreferrer">فتح الرابط</a>
                              </Typography>
                            )}
                            {submission.wiringImageUrl && (
                              <Typography variant="body2" sx={{ mb: 1 }}>
                                صورة التوصيل: <a href={submission.wiringImageUrl} target="_blank" rel="noopener noreferrer">عرض الصورة</a>
                              </Typography>
                            )}
                            {submission.submissionFiles?.length > 0 && (
                              <Typography variant="body2" sx={{ mb: 1 }}>
                                الملف المرفوع: <a href={submission.submissionFiles[submission.submissionFiles.length - 1].url} target="_blank" rel="noopener noreferrer">تحميل الملف</a>
                              </Typography>
                            )}

                            <Typography variant="body2" sx={{ whiteSpace: 'pre-wrap', mb: 1.5 }}>
                              <strong>الملاحظات:</strong>{'\n'}{submission.notes || '—'}
                            </Typography>

                            <TextField
                              fullWidth
                              multiline
                              minRows={2}
                              label="تعليق المراجع للطالب"
                              value={feedbackBySubmission[submission._id] || ''}
                              onChange={(e) => setFeedbackBySubmission((prev) => ({
                                ...prev,
                                [submission._id]: e.target.value
                              }))}
                              sx={{ mb: 1 }}
                            />

                            <FormControlLabel
                              sx={{ mb: 1 }}
                              control={(
                                <Checkbox
                                  checked={Boolean(allowResubmitBySubmission[submission._id])}
                                  onChange={(e) => setAllowResubmitBySubmission((prev) => ({
                                    ...prev,
                                    [submission._id]: e.target.checked
                                  }))}
                                />
                              )}
                              label="السماح بإعادة التسليم"
                            />

                            <Grid container spacing={1} sx={{ mb: 1 }}>
                              <Grid item xs={12} sm={6}>
                                <Button
                                  fullWidth
                                  variant="outlined"
                                  onClick={() => handleSaveReviewerFeedback(submission._id)}
                                  disabled={Boolean(savingFeedbackBySubmission[submission._id])}
                                >
                                  {savingFeedbackBySubmission[submission._id] ? 'جارٍ الحفظ...' : 'حفظ الفيدباك'}
                                </Button>
                              </Grid>
                              <Grid item xs={12} sm={6}>
                                <Button
                                  fullWidth
                                  variant="contained"
                                  startIcon={<AssessmentIcon />}
                                  onClick={() => {
                                    const studentId = submission.student?._id || submission.studentId || submission.student;
                                    if (!studentId) return;
                                    navigate(`/evaluate/individual/${id}/${studentId}/${submission._id}`);
                                  }}
                                  disabled={!(submission.student?._id || submission.studentId || submission.student)}
                                >
                                  تقييم هذا الطالب
                                </Button>
                              </Grid>
                            </Grid>

                            {otherSubmissions.length > 0 && (
                              <>
                                <Button
                                  size="small"
                                  onClick={() => setShowOtherSubmissionsByStudent((prev) => ({
                                    ...prev,
                                    [studentIdentifier]: !prev[studentIdentifier]
                                  }))}
                                  sx={{ mb: 1 }}
                                >
                                  {showOtherSubmissionsByStudent[studentIdentifier]
                                    ? 'إخفاء التسليمات الأخرى'
                                    : `عرض التسليمات الأخرى (${otherSubmissions.length})`}
                                </Button>

                                {showOtherSubmissionsByStudent[studentIdentifier] && (
                                  <Box sx={{ border: '1px dashed', borderColor: 'divider', borderRadius: 1, p: 1.5 }}>
                                    {otherSubmissions.map((oldSubmission) => (
                                      <Box key={`${submission._id}-${oldSubmission.attemptNumber}`} sx={{ mb: 1.5, '&:last-child': { mb: 0 } }}>
                                        <Typography variant="body2" fontWeight={700}>
                                          محاولة #{oldSubmission.attemptNumber}
                                        </Typography>
                                        <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 0.5 }}>
                                          {oldSubmission.submittedAt ? new Date(oldSubmission.submittedAt).toLocaleString('ar-EG') : '—'}
                                        </Typography>
                                        {oldSubmission.submissionUrl && (
                                          <Typography variant="body2">
                                            الرابط: <a href={oldSubmission.submissionUrl} target="_blank" rel="noopener noreferrer">فتح</a>
                                          </Typography>
                                        )}
                                        {oldSubmission.feedback?.comments && (
                                          <Typography variant="body2" sx={{ mt: 0.5, whiteSpace: 'pre-wrap' }}>
                                            تعليق المراجع:\n{oldSubmission.feedback.comments}
                                          </Typography>
                                        )}
                                      </Box>
                                    ))}
                                  </Box>
                                )}
                              </>
                            )}
                          </Grid>

                          <Grid item xs={12} md={5}>
                            <Box
                              sx={{
                                height: '100%',
                                p: 1.5,
                                borderRadius: 1,
                                border: '1px solid',
                                borderColor: 'divider',
                                backgroundColor: 'background.default'
                              }}
                            >
                              <Typography variant="body2" sx={{ mb: 1, fontWeight: 700 }}>
                                الكود (آخر تسليم)
                              </Typography>
                              <pre
                                dir="ltr"
                                style={{
                                  direction: 'ltr',
                                  textAlign: 'left',
                                  margin: 0,
                                  padding: '8px',
                                  fontFamily: 'Consolas, Monaco, "Courier New", monospace',
                                  fontSize: '0.8rem',
                                  overflow: 'auto',
                                  whiteSpace: 'pre-wrap',
                                  wordWrap: 'break-word',
                                  lineHeight: 1.5
                                }}
                              >
                                {submission.codeSubmission || '—'}
                              </pre>
                            </Box>
                          </Grid>
                        </Grid>
                      </CardContent>
                    </Card>
                  );
                })}
              </Box>
            )}
          </Box>
        )}
        
        {isTeamProject && user?.role === 'student' && (
          <Alert severity="info">
            تسليم المشروع الجماعي يتم من صفحة الفريق.
            <Button size="small" sx={{ ml: 1 }} onClick={() => navigate(`/team/project/${id}`)}>فتح صفحة الفريق</Button>
          </Alert>
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

      <Dialog open={projectSubmitDialogOpen} onClose={() => !projectSubmitting && setProjectSubmitDialogOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>{t('submit')}</DialogTitle>
        <DialogContent>
          <TextField
            margin="normal"
            fullWidth
            label="رابط التسليم"
            value={projectSubmissionData.submissionUrl}
            onChange={(e) => setProjectSubmissionData((prev) => ({ ...prev, submissionUrl: e.target.value }))}
          />
          <TextField
            margin="normal"
            fullWidth
            label="الكود"
            value={projectSubmissionData.codeSubmission}
            multiline
            minRows={4}
            onChange={(e) => setProjectSubmissionData((prev) => ({ ...prev, codeSubmission: e.target.value }))}
          />

          <Box sx={{ mt: 2 }}>
            <input
              id="wiring-image-file"
              type="file"
              accept="image/*"
              style={{ display: 'none' }}
              onChange={handleWiringImageChange}
              disabled={projectSubmitting}
            />
            <label htmlFor="wiring-image-file">
              <Button variant="outlined" component="span" startIcon={<CloudUploadIcon />}>
                رفع صورة التوصيل (إجباري)
              </Button>
            </label>
            {wiringImageFile && (
              <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
                صورة التوصيل: {wiringImageFile.name}
              </Typography>
            )}
          </Box>

          <TextField
            margin="normal"
            fullWidth
            multiline
            rows={4}
            label="ملاحظات"
            value={projectSubmissionData.notes}
            onChange={(e) => setProjectSubmissionData((prev) => ({ ...prev, notes: e.target.value }))}
          />

          <Box sx={{ mt: 2 }}>
            <input
              id="project-submit-file"
              type="file"
              accept=".pdf,.doc,.docx,.mp4,.webm,.mov,.avi"
              style={{ display: 'none' }}
              onChange={handleProjectFileChange}
              disabled={projectSubmitting}
            />
            <label htmlFor="project-submit-file">
              <Button variant="outlined" component="span" startIcon={<CloudUploadIcon />}>
                رفع ملف إضافي (Word / PDF / Video)
              </Button>
            </label>
            {projectSubmissionFile && (
              <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
                الملف المختار: {projectSubmissionFile.name}
              </Typography>
            )}
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setProjectSubmitDialogOpen(false)} disabled={projectSubmitting}>{t('cancel')}</Button>
          <Button
            variant="contained"
            onClick={handleSubmitIndividualProject}
            disabled={
              projectSubmitting
              || !projectSubmissionData.submissionUrl.trim()
              || !projectSubmissionData.codeSubmission.trim()
              || !wiringImageFile
            }
          >
            {projectSubmitting ? t('submitting') : t('submit')}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Teams Link Dialog */}
      <Dialog open={teamsLinkDialogOpen} onClose={() => setTeamsLinkDialogOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>{project.teamsLink ? t('editMicrosoftTeamsLink') : t('addMicrosoftTeamsLink')}</DialogTitle>
        <DialogContent>
          <TextField
            fullWidth
            label={t('teamsLinkLabel')}
            value={teamsLink}
            onChange={(e) => setTeamsLink(e.target.value)}
            placeholder="https://teams.microsoft.com/..."
            sx={{ mt: 2 }}
            helperText={t('teamsLinkHelper')}
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setTeamsLinkDialogOpen(false)}>{t('cancel')}</Button>
          <Button onClick={handleSaveTeamsLink} variant="contained">
            {t('save')}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Team Registration Dialog */}
      <Dialog open={teamRegisterDialogOpen} onClose={() => setTeamRegisterDialogOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>{t('registerTeamsInProject')}</DialogTitle>
        <DialogContent>
          <Box sx={{ mt: 2, display: 'flex', flexDirection: 'column', gap: 2 }}>
            <FormControlLabel
              control={
                <Checkbox
                  checked={selectAllTeams}
                  onChange={(e) => handleSelectAllTeams(e.target.checked)}
                />
              }
              label={t('registerAllTeams')}
            />
            <Autocomplete
              multiple
              options={teams}
              value={selectedTeams}
              onChange={(e, newValue) => {
                setSelectedTeams(newValue);
                setSelectAllTeams(newValue.length === teams.length && teams.length > 0);
              }}
              getOptionLabel={(option) => `${option.name} (${option.members?.length || 0} ${t('members')})`}
              isOptionEqualToValue={(option, value) => option._id === value._id}
              renderInput={(params) => (
                <TextField
                  {...params}
                  label={t('selectTeams')}
                  placeholder={t('searchTeam')}
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
          <Button onClick={() => setTeamRegisterDialogOpen(false)}>{t('cancel')}</Button>
          <Button 
            onClick={handleRegisterTeam} 
            variant="contained" 
            color="secondary"
            disabled={selectedTeams.length === 0}
          >
            {t('register')} {selectedTeams.length > 0 && `(${selectedTeams.length})`}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default ProjectDetailPage;
