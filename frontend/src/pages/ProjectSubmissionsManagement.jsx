import { useState, useEffect, useMemo } from 'react';
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
} from '@mui/material';
import {
  Download as DownloadIcon,
  OpenInNew as OpenInNewIcon,
  Feedback as FeedbackIcon,
  Grade as GradeIcon,
  ArrowBack as ArrowBackIcon,
  Description as DescriptionIcon,
  Assessment as AssessmentIcon,
  AutoAwesome as AutoAwesomeIcon,
  Architecture as ArchitectureIcon,
  Memory as MemoryIcon,
  Science as ScienceIcon,
} from '@mui/icons-material';
import { toast } from 'react-toastify';
import api from '../services/api';
import { useAppSettings } from '../context/AppSettingsContext';

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
  const { t } = useAppSettings();

  const [project, setProject] = useState(null);
  const [submissions, setSubmissions] = useState([]);
  const [projectEnrollments, setProjectEnrollments] = useState([]);
  const [teamScoresByTeamId, setTeamScoresByTeamId] = useState({});
  const [stageBoard, setStageBoard] = useState([]);
  const [stageLoading, setStageLoading] = useState(false);
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
  const [teamRetryDialog, setTeamRetryDialog] = useState({
    open: false,
    team: null
  });
  const [submissionDetailsDialog, setSubmissionDetailsDialog] = useState({
    open: false,
    submission: null,
    title: ''
  });
  const [submissionEvaluationState, setSubmissionEvaluationState] = useState({
    loading: false,
    data: null
  });
  const [bulkAIRunning, setBulkAIRunning] = useState(false);
  const [teamAIRunningById, setTeamAIRunningById] = useState({});
  const [bulkAIProgress, setBulkAIProgress] = useState({ done: 0, total: 0 });
  const [teamSearchTerm, setTeamSearchTerm] = useState('');
  const [finalDeliveryFilter, setFinalDeliveryFilter] = useState('all');

  useEffect(() => {
    fetchData();
  }, [projectId]);

  const fetchData = async (forceRefresh = false) => {
    try {
      setLoading(true);

      const cacheKey = `project-submissions:${projectId}`;
      const cachedRaw = !forceRefresh ? sessionStorage.getItem(cacheKey) : null;
      if (cachedRaw) {
        try {
          const cached = JSON.parse(cachedRaw);
          if (cached?.ts && Date.now() - cached.ts < 45000) {
            setProject(cached.project || null);
            setSubmissions(cached.submissions || []);
            setProjectEnrollments(cached.enrollments || []);
            setTeamScoresByTeamId(cached.teamScoresByTeamId || {});
            setStageBoard(cached.stageBoard || []);
            setStageLoading(false);
            setLoading(false);
            return;
          }
        } catch (_) {}
      }

      // Get project details
      const projectResponse = await api.get(`/projects/${projectId}`);
      const projectData = projectResponse.data.data;
      setProject(projectData);

      // Get all submissions for this project
      const submissionsResponse = await api.get(`/team-submissions/project/${projectId}`);
      const submissionsData = submissionsResponse.data.data;
      setSubmissions(submissionsData);

      // Stage progress board by team
      setStageLoading(true);
      const teamsResponse = await api.get(`/team-projects/project/${projectId}`);
      const enrollments = teamsResponse.data.data || [];
      setProjectEnrollments(enrollments);

      const progressRows = await Promise.all(
        enrollments.map(async (enrollment) => {
          try {
            const progressRes = await api.get(`/team-submissions/progress/${enrollment.team._id}/${projectId}`);
            return {
              team: enrollment.team,
              progress: progressRes.data.data
            };
          } catch (_) {
            return {
              team: enrollment.team,
              progress: null
            };
          }
        })
      );

      const scoreResponse = await api.get(`/assessment/team-scores/${projectId}`);
      const teamScores = (scoreResponse.data?.data || []).reduce((acc, row) => {
        acc[String(row.teamId)] = row;
        return acc;
      }, {});
      setTeamScoresByTeamId(teamScores);

      setStageBoard(progressRows);
      setStageLoading(false);
      sessionStorage.setItem(cacheKey, JSON.stringify({
        ts: Date.now(),
        project: projectData,
        submissions: submissionsData,
        enrollments,
        teamScoresByTeamId: teamScores,
        stageBoard: progressRows
      }));

      setLoading(false);
    } catch (err) {
      toast.error(err.response?.data?.message || t('genericLoadError'));
      setStageLoading(false);
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
      toast.success(t('feedbackAddedSuccess'));
      setFeedbackDialog({ open: false, submission: null, feedback: '' });
      fetchData(true);
    } catch (err) {
      toast.error(err.response?.data?.message || t('genericError'));
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
        toast.error(t('scoreRange0To100'));
        return;
      }

      await api.put(`/team-submissions/${gradeDialog.submission._id}/grade`, {
        score
      });
      toast.success(t('scoreAddedSuccess'));
      setGradeDialog({ open: false, submission: null, score: '' });
      fetchData(true);
    } catch (err) {
      toast.error(err.response?.data?.message || t('genericError'));
    }
  };

  const handleOpenDigitalEvaluation = (submission) => {
    const teamId = submission?.team?._id;
    const studentId = submission?.submittedBy?._id || submission?.submittedBy;
    const stageKey = submission?.stageKey;

    // Programming & final delivery are evaluated per student.
    if ((stageKey === 'programming' || stageKey === 'final_delivery') && studentId) {
      navigate(`/evaluate/individual/${projectId}/${studentId}/${submission._id}`);
      return;
    }

    // Other stages use group evaluation flow.
    if (teamId) {
      navigate(`/evaluate/group/${projectId}/${teamId}/${submission._id}`);
      return;
    }

    toast.error('تعذر فتح صفحة التقييم: بيانات الفريق/الطالب غير مكتملة');
  };

  const handleOpenTeamRetryDialog = (team) => {
    setTeamRetryDialog({
      open: true,
      team
    });
  };

  const handleConfirmTeamRetry = async () => {
    try {
      const teamId = teamRetryDialog.team?._id;
      if (!teamId) {
        toast.error('معرف الفريق غير متوفر');
        return;
      }

      await api.post('/assessment/allow-retry', {
        projectId,
        teamId
      });

      toast.success('تم فتح إعادة المحاولة للفريق في جميع المراحل بنجاح');
      setTeamRetryDialog({ open: false, team: null });
      fetchData(true);
    } catch (err) {
      toast.error(err.response?.data?.message || 'فشل فتح إعادة المحاولة للفريق');
    }
  };

  const draftToSectionEvaluations = (cardDraft) => {
    return (cardDraft?.sectionEvaluations || []).map((section) => ({
      sectionName: section.sectionName,
      criterionSelections: (section.criterionSelections || []).map((criterion) => ({
        criterionName: criterion.criterionName,
        selectedPercentage: criterion.selectedPercentage,
        selectedDescription: criterion.selectedDescription || ''
      }))
    }));
  };

  const getLatestSubmission = (items = []) => {
    if (!items.length) return null;
    return [...items].sort((a, b) => new Date(b.submittedAt) - new Date(a.submittedAt))[0];
  };

  const hasFinalDeliverySubmission = (teamSubmissions = []) => {
    return teamSubmissions.some((submission) => submission.stageKey === 'final_delivery');
  };

  const buildTeamAICandidates = () => {
    const candidates = [];

    Object.values(submissionsByTeam).forEach(({ team, submissions: teamSubmissions }) => {
      const latestFinal = getLatestSubmission(teamSubmissions.filter((s) => s.stageKey === 'final_delivery'));
      if (!latestFinal) return;

      const programmingSubmissions = teamSubmissions.filter((s) => s.stageKey === 'programming');
      if (!programmingSubmissions.length) return;

      const memberIds = (team?.members || [])
        .map((member) => member?.user?._id || member?._id || member?.user || member)
        .filter(Boolean)
        .map((id) => String(id));

      if (!memberIds.length) return;

      const latestProgrammingByStudent = {};
      programmingSubmissions.forEach((submission) => {
        const studentId = String(submission.submittedBy?._id || submission.submittedBy || '');
        if (!studentId) return;

        const current = latestProgrammingByStudent[studentId];
        if (!current || new Date(submission.submittedAt) > new Date(current.submittedAt)) {
          latestProgrammingByStudent[studentId] = submission;
        }
      });

      const hasProgrammingForAllMembers = memberIds.every((studentId) => Boolean(latestProgrammingByStudent[studentId]));
      if (!hasProgrammingForAllMembers) return;

      memberIds.forEach((studentId) => {
        const studentProgrammingSubmission = latestProgrammingByStudent[studentId];
        candidates.push({
          projectId,
          teamId: team._id,
          teamName: team.name,
          studentId,
          studentName: studentProgrammingSubmission?.submittedBy?.name || 'طالب',
          programmingSubmissionId: studentProgrammingSubmission?._id,
          finalSubmissionId: latestFinal._id
        });
      });
    });

    return candidates;
  };

  const runAIEvaluationForTeams = async (teams) => {
    if (!teams.length) return { successCount: 0, failedCount: 0, totalStudents: 0 };

    setBulkAIProgress({ done: 0, total: teams.length });

    let successCount = 0;
    let failedCount = 0;
    let totalStudents = 0;

    for (let i = 0; i < teams.length; i += 1) {
      const team = teams[i];
      const teamId = String(team?._id || '');

      try {
        const aiRes = await api.post('/assessment/ai-evaluate-team', {
          projectId,
          teamId
        });

        const aiData = aiRes.data?.data;
        if (!aiData?.groupCard || !Array.isArray(aiData.individualCards)) {
          throw new Error('لم يتم استلام نتيجة تقييم AI للفريق بصيغة صالحة');
        }

        const evidenceSubmissionIds = [
          aiData.evidenceSummary?.groupSubmissionId,
          ...(aiData.evidenceSummary?.programmingSubmissionIds || [])
        ].filter(Boolean);

        await api.post('/assessment/evaluate-group', {
          projectId,
          teamId,
          submissionId: aiData.basedOnGroupSubmissionId,
          sectionEvaluations: draftToSectionEvaluations(aiData.groupCard),
          feedbackSummary: aiData.groupFeedbackSuggestion || aiData.teamFeedbackSuggestion || '',
          evaluationSource: 'ai-batch',
          aiApproval: {
            confidence: aiData.confidence,
            plagiarismSimilarityPercent: aiData.plagiarism?.similarityPercent,
            plagiarismLevel: aiData.plagiarism?.level,
            rationale: aiData.rationale,
            evidenceScope: aiData.evidenceSummary?.scope,
            evidenceCount: aiData.evidenceSummary?.totalArtifacts || evidenceSubmissionIds.length,
            evidenceSubmissionIds,
            evidenceSummary: 'تم التقييم اعتمادا على 4 أدلة ثابتة: 3 برمجة + 1 نهائي.'
          }
        });

        const studentsCountForTeam = aiData.individualCards.length;
        totalStudents += studentsCountForTeam;

        for (const studentCard of aiData.individualCards) {
          await api.post('/assessment/evaluate-individual', {
            projectId,
            teamId,
            studentId: studentCard.studentId,
            studentRole: studentCard.studentRole || 'programmer',
            submissionId: studentCard.submissionId,
            sectionEvaluations: draftToSectionEvaluations(studentCard.individualCard),
            feedbackSummary: studentCard.feedbackSuggestion || '',
            evaluationSource: 'ai-batch',
            aiApproval: {
              confidence: aiData.confidence,
              plagiarismSimilarityPercent: aiData.plagiarism?.similarityPercent,
              plagiarismLevel: aiData.plagiarism?.level,
              rationale: aiData.rationale,
              evidenceScope: aiData.evidenceSummary?.scope,
              evidenceCount: aiData.evidenceSummary?.totalArtifacts || evidenceSubmissionIds.length,
              evidenceSubmissionIds,
              evidenceSummary: 'تم التقييم اعتمادا على 4 أدلة ثابتة: 3 برمجة + 1 نهائي.'
            }
          });
          successCount += 1;
        }
      } catch (err) {
        const teamMembersCount = (team?.members || []).length || 1;
        failedCount += teamMembersCount;
        totalStudents += teamMembersCount;
        console.error('Team AI evaluation failed', team, err);

        const status = err?.response?.status;
        const message = err?.response?.data?.message || err?.message || '';
        const errorDetails = String(err?.response?.data?.error || '');
        const text = `${message} ${errorDetails}`.toLowerCase();

        const isQuotaOrServiceLimit =
          status === 429
          || text.includes('quota')
          || text.includes('too many requests')
          || text.includes('rate limit')
          || text.includes('gemini');

        if (isQuotaOrServiceLimit) {
          toast.error(message || 'تم إيقاف التقييم: خدمة AI وصلت للحد الأقصى مؤقتًا.');
          setBulkAIProgress({ done: i + 1, total: teams.length });
          break;
        }

        if (status === 400 || status === 404 || status === 405 || status === 500 || status === 501 || status === 502 || status === 503) {
          toast.error(message || 'تم إيقاف التقييم: خدمة AI غير متاحة أو بيانات الفريق غير مكتملة.');
          setBulkAIProgress({ done: i + 1, total: teams.length });
          break;
        }
      } finally {
        setBulkAIProgress({ done: i + 1, total: teams.length });
      }
    }

    return { successCount, failedCount, totalStudents };
  };

  const runAIEvaluationForTeam = async (team) => {
    const teamId = String(team?._id || '');
    if (!teamId || bulkAIRunning || teamAIRunningById[teamId]) return;

    const confirmRun = window.confirm(`سيتم تقييم ${team.name} بالكامل في طلب AI واحد (التقييم الجماعي + كل الطلاب). المتابعة؟`);
    if (!confirmRun) return;

    setTeamAIRunningById((prev) => ({ ...prev, [teamId]: true }));
    try {
      const { successCount, failedCount, totalStudents } = await runAIEvaluationForTeams([team]);
      await fetchData(true);

      if (failedCount === 0) {
        toast.success(`تم إنهاء تقييم AI للفريق ${team.name} بنجاح (${successCount}/${totalStudents})`);
      } else {
        toast.warning(`اكتمل تقييم AI للفريق ${team.name}. نجح ${successCount} وفشل ${failedCount} من ${totalStudents}`);
      }
    } finally {
      setTeamAIRunningById((prev) => ({ ...prev, [teamId]: false }));
    }
  };

  const runBulkAIEvaluationForTeams = async () => {
    if (bulkAIRunning) return;

    const readyTeamIds = Array.from(new Set(buildTeamAICandidates().map((candidate) => String(candidate.teamId))));
    const teams = readyTeamIds
      .map((teamId) => submissionsByTeam[teamId]?.team)
      .filter(Boolean);
    if (!teams.length) {
      toast.info('لا توجد فرق مكتملة الشروط لتقييم AI (تسليم نهائي + برمجة لكل أعضاء الفريق).');
      return;
    }

    const confirmRun = window.confirm(`سيتم تقييم ${teams.length} فريقًا تلقائيًا (طلب AI واحد لكل فريق). المتابعة؟`);
    if (!confirmRun) return;

    setBulkAIRunning(true);
    const { successCount, failedCount, totalStudents } = await runAIEvaluationForTeams(teams);

    await fetchData(true);
    setBulkAIRunning(false);

    if (failedCount === 0) {
      toast.success(`تم إنهاء تقييم AI لكل الطلاب بنجاح (${successCount}/${totalStudents})`);
    } else {
      toast.warning(`اكتمل تقييم AI. نجح ${successCount} وفشل ${failedCount} من ${totalStudents}`);
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
        return t('graded');
      case 'reviewed':
        return t('reviewed');
      default:
        return t('pending');
    }
  };

  const getStageLabel = (stageKey) => {
    switch (stageKey) {
      case 'design':
        return 'التصميم';
      case 'wiring':
        return 'الموصل';
      case 'programming':
        return 'البرمجة';
      case 'testing':
        return 'المختبر';
      case 'final_delivery':
        return 'النهائي';
      default:
        return stageKey || 'غير محدد';
    }
  };

  const getTeamMemberNames = (team) => {
    return (team?.members || [])
      .map((member) => member?.user?.name || member?.name)
      .filter(Boolean)
      .sort((a, b) => String(a).localeCompare(String(b), 'ar', { sensitivity: 'base' }));
  };

  const enrollmentByTeamId = useMemo(() => {
    return (projectEnrollments || []).reduce((acc, enrollment) => {
      const teamId = String(enrollment?.team?._id || enrollment?.team || '');
      if (!teamId) return acc;
      acc[teamId] = enrollment;
      return acc;
    }, {});
  }, [projectEnrollments]);

  const roleMeta = {
    system_designer: {
      label: 'مصمم النظام',
      icon: ArchitectureIcon,
      color: 'info'
    },
    hardware_engineer: {
      label: 'مسؤول التوصيل',
      icon: MemoryIcon,
      color: 'warning'
    },
    tester: {
      label: 'مختبر',
      icon: ScienceIcon,
      color: 'success'
    }
  };

  const getTeamMembersWithRoles = (team) => {
    const teamId = String(team?._id || '');
    const enrollment = enrollmentByTeamId[teamId];
    const memberRoles = enrollment?.memberRoles || [];

    return (team?.members || [])
      .map((member) => {
        const userId = String(member?.user?._id || member?._id || member?.user || '');
        const name = member?.user?.name || member?.name || 'طالب';
        const role = memberRoles.find((mr) => String(mr?.user) === userId)?.role || null;
        return { userId, name, role };
      })
      .filter((m) => Boolean(m.userId))
      .sort((a, b) => String(a.name).localeCompare(String(b.name), 'ar', { sensitivity: 'base' }));
  };

  const getTeamSubmissionButtons = (teamSubmissions = [], team = {}) => {
    // استخرج قائمة أعضاء الفريق
    const members = [...(team?.members || [])].sort((a, b) => {
      const aName = a?.user?.name || a?.name || '';
      const bName = b?.user?.name || b?.name || '';
      return String(aName).localeCompare(String(bName), 'ar', { sensitivity: 'base' });
    });

    // لكل عضو، جيب آخر تسليمة برمجية
    const programmingByStudent = {};

    teamSubmissions
      .filter((submission) => submission.stageKey === 'programming')
      .forEach((submission) => {
        const studentId = submission.submittedBy?._id || submission.submittedBy;
        if (!studentId) return;

        const studentIdStr = String(studentId);
        const current = programmingByStudent[studentIdStr];

        if (!current || new Date(submission.submittedAt) > new Date(current.submittedAt)) {
          programmingByStudent[studentIdStr] = submission;
        }
      });

    // لكل عضو في الفريق، جيب آخر برمجة لهم مع إسمه
    const programmingButtons = members
      .slice(0, 3)
      .map((member) => {
        const memberId = String(member.user?._id || member._id || '');
        const submission = programmingByStudent[memberId];
        const memberName = member.user?.name || member.name || 'طالب';

        return {
          key: `programming-${memberId}`,
          label: `برمجة: ${memberName}`,
          submission: submission || null
        };
      });

    // جيب آخر التسليم النهائي
    const latestFinalDelivery = [...teamSubmissions]
      .filter((submission) => submission.stageKey === 'final_delivery')
      .sort((a, b) => new Date(b.submittedAt) - new Date(a.submittedAt))[0] || null;

    return [
      ...programmingButtons,
      { key: 'final-delivery', label: 'التسليم النهائي', submission: latestFinalDelivery }
    ];
  };

  const handleOpenSubmissionDetails = async (submission, title) => {
    if (!submission) return;
    setSubmissionDetailsDialog({
      open: true,
      submission,
      title
    });
    setSubmissionEvaluationState({ loading: true, data: null });

    try {
      const evaluationRes = await api.get(`/assessment/evaluation/${submission._id}`);
      setSubmissionEvaluationState({ loading: false, data: evaluationRes.data?.data || null });
    } catch (_) {
      setSubmissionEvaluationState({ loading: false, data: null });
    }
  };

  // Group submissions by team
  const submissionsByTeam = useMemo(() => submissions.reduce((acc, submission) => {
    const teamId = submission.team._id;
    if (!acc[teamId]) {
      acc[teamId] = {
        team: submission.team,
        submissions: []
      };
    }
    acc[teamId].submissions.push(submission);
    return acc;
  }, {}), [submissions]);

  const visibleTeams = useMemo(() => {
    const q = String(teamSearchTerm || '').trim().toLowerCase();

    const sorted = [...Object.values(submissionsByTeam)].sort((a, b) => {
      const aName = a?.team?.name || '';
      const bName = b?.team?.name || '';
      return String(aName).localeCompare(String(bName), 'ar', { sensitivity: 'base' });
    });

    return sorted.filter(({ team, submissions: teamSubmissions }) => {
      const teamName = String(team?.name || '').toLowerCase();
      const memberNames = getTeamMemberNames(team).join(' ').toLowerCase();
      const submitterNames = (teamSubmissions || [])
        .map((s) => s?.submittedBy?.name || '')
        .join(' ')
        .toLowerCase();

      const hasFinal = hasFinalDeliverySubmission(teamSubmissions);
      const passesFinalDeliveryFilter =
        finalDeliveryFilter === 'all'
          ? true
          : finalDeliveryFilter === 'submitted'
            ? hasFinal
            : !hasFinal;

      if (!passesFinalDeliveryFilter) return false;
      if (!q) return true;
      return teamName.includes(q) || memberNames.includes(q) || submitterNames.includes(q);
    });
  }, [submissionsByTeam, teamSearchTerm, finalDeliveryFilter]);

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
        <Alert severity="error">{t('projectDataLoadFailed')}</Alert>
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
        {t('backToProjects')}
      </Button>

      {/* Project Header */}
      <Paper elevation={3} sx={{ p: 3, mb: 3 }}>
        <Typography variant="h4" gutterBottom>
          {project.title}
        </Typography>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 1, flexWrap: 'wrap' }}>
          <Typography variant="body1" color="text.secondary">
            {t('totalSubmissionsWithCount', { count: submissions.length })}
          </Typography>
          <Box sx={{ display: 'flex', gap: 1, alignItems: 'center', flexWrap: 'wrap' }}>
            {bulkAIRunning && (
              <Chip
                color="warning"
                label={`AI يعمل: ${bulkAIProgress.done}/${bulkAIProgress.total}`}
              />
            )}
            <Button
              variant="outlined"
              color="secondary"
              startIcon={<AutoAwesomeIcon />}
              onClick={runBulkAIEvaluationForTeams}
              disabled={bulkAIRunning}
            >
              {bulkAIRunning ? 'جاري تقييم الطلاب...' : 'تقييم AI لكل الطلاب'}
            </Button>
          </Box>
        </Box>
      </Paper>

      {/* Compact Team Cards (merged stages + evaluation submissions) */}
      {stageLoading ? (
        <Paper elevation={3} sx={{ p: 3, mb: 3 }}>
          <Box sx={{ display: 'flex', justifyContent: 'center', py: 3 }}>
            <CircularProgress />
          </Box>
        </Paper>
      ) : Object.keys(submissionsByTeam).length === 0 ? (
        <Alert severity="info">{t('noSubmissionsUploadedYet')}</Alert>
      ) : (
        <Box>
          <Paper elevation={1} sx={{ p: 2, mb: 1.5 }}>
            <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap', alignItems: 'center' }}>
              <TextField
                size="small"
                label="بحث باسم الفريق أو الطالب"
                value={teamSearchTerm}
                onChange={(e) => setTeamSearchTerm(e.target.value)}
                sx={{ minWidth: 280, maxWidth: 420 }}
              />
              <Button
                size="small"
                variant={finalDeliveryFilter === 'all' ? 'contained' : 'outlined'}
                onClick={() => setFinalDeliveryFilter('all')}
              >
                كل الفرق
              </Button>
              <Button
                size="small"
                variant={finalDeliveryFilter === 'submitted' ? 'contained' : 'outlined'}
                color={finalDeliveryFilter === 'submitted' ? 'success' : 'inherit'}
                onClick={() => setFinalDeliveryFilter('submitted')}
              >
                سلّم النهائي
              </Button>
              <Button
                size="small"
                variant={finalDeliveryFilter === 'not_submitted' ? 'contained' : 'outlined'}
                color={finalDeliveryFilter === 'not_submitted' ? 'warning' : 'inherit'}
                onClick={() => setFinalDeliveryFilter('not_submitted')}
              >
                لم يسلّم النهائي
              </Button>
              <Chip label={`النتائج: ${visibleTeams.length}`} size="small" variant="outlined" />
              <Typography variant="caption" color="text.secondary">
                الترتيب: أبجدي حسب اسم الفريق
              </Typography>
            </Box>
          </Paper>

          {visibleTeams.length === 0 ? (
            <Alert severity="info">لا توجد نتائج مطابقة للبحث الحالي.</Alert>
          ) : (
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5 }}>
              {visibleTeams.map(({ team, submissions: teamSubmissions }) => {
            const stageRow = stageBoard.find((row) => row.team._id === team._id);
            const completed = stageRow?.progress?.completed || {};
            const stageChips = [
              { key: 'design', label: 'التصميم' },
              { key: 'wiring', label: 'الموصل' },
              { key: 'programming', label: 'البرمجة' },
              { key: 'testing', label: 'المختبر' },
              { key: 'final_delivery', label: 'النهائي' }
            ];
            const submissionButtons = getTeamSubmissionButtons(teamSubmissions, team);
            const teamScoreRow = teamScoresByTeamId[String(team._id)] || null;
            const memberScoreById = (teamScoreRow?.members || []).reduce((acc, m) => {
              acc[String(m.studentId)] = m;
              return acc;
            }, {});

            return (
              <Card key={team._id} variant="outlined">
                <CardContent>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, flexWrap: 'wrap', mb: 1 }}>
                    <Typography variant="h6">{team.name}</Typography>
                    <Chip label={t('teamSubmissionsCount', { count: teamSubmissions.length })} size="small" />
                    <Typography variant="caption" color="text.secondary">
                      برمجة: {stageRow?.progress?.programmingSubmittedCount || 0}/{stageRow?.progress?.programmingRequiredCount || 0}
                    </Typography>
                    <Chip
                      size="small"
                      color={teamScoreRow?.groupScore !== null && teamScoreRow?.groupScore !== undefined ? 'success' : 'default'}
                      variant={teamScoreRow?.groupScore !== null && teamScoreRow?.groupScore !== undefined ? 'filled' : 'outlined'}
                      label={`درجة الجماعي: ${teamScoreRow?.groupScore !== null && teamScoreRow?.groupScore !== undefined ? Number(teamScoreRow.groupScore).toFixed(2) : '-'}`}
                    />
                    <Box sx={{ flex: 1 }} />
                    <Button
                      variant="outlined"
                      size="small"
                      onClick={() => handleOpenTeamRetryDialog(team)}
                    >
                      فتح إعادة المحاولة للفريق
                    </Button>
                    <Button
                      variant="contained"
                      size="small"
                      color="secondary"
                      startIcon={<AutoAwesomeIcon />}
                      disabled={bulkAIRunning || Boolean(teamAIRunningById[String(team._id)])}
                      onClick={() => runAIEvaluationForTeam(team)}
                    >
                      {teamAIRunningById[String(team._id)] ? 'جاري تقييم الفريق...' : 'تقييم AI للفريق'}
                    </Button>
                  </Box>

                  <Box sx={{ display: 'flex', gap: 0.75, flexWrap: 'wrap', mb: 0.8 }}>
                    {getTeamMembersWithRoles(team).map((member) => {
                      const meta = roleMeta[member.role] || null;
                      const RoleIcon = meta?.icon;
                      const individualScore = memberScoreById[String(member.userId)]?.individualProgrammingScore;
                      return (
                        <Chip
                          key={member.userId}
                          size="small"
                          variant="outlined"
                          color={meta?.color || 'default'}
                          icon={RoleIcon ? <RoleIcon fontSize="small" /> : undefined}
                          label={meta ? `${member.name} - ${meta.label}` : member.name}
                        />
                      );
                    })}
                  </Box>

                  <Box sx={{ display: 'flex', gap: 0.75, flexWrap: 'wrap', mb: 1.2 }}>
                    {getTeamMembersWithRoles(team).map((member) => {
                      const individualScore = memberScoreById[String(member.userId)]?.individualProgrammingScore;
                      return (
                        <Chip
                          key={`score-${member.userId}`}
                          size="small"
                          color={individualScore !== null && individualScore !== undefined ? 'primary' : 'default'}
                          variant={individualScore !== null && individualScore !== undefined ? 'filled' : 'outlined'}
                          label={`برمجة ${member.name}: ${individualScore !== null && individualScore !== undefined ? Number(individualScore).toFixed(2) : '-'}`}
                        />
                      );
                    })}
                  </Box>

                  <Box sx={{ display: 'flex', gap: 0.75, flexWrap: 'wrap', mb: 1.2 }}>
                    {stageChips.map((s) => (
                      <Chip
                        key={s.key}
                        label={`${s.label}: ${completed[s.key] ? 'مكتمل' : 'غير مكتمل'}`}
                        color={completed[s.key] ? 'success' : 'default'}
                        variant={completed[s.key] ? 'filled' : 'outlined'}
                        size="small"
                      />
                    ))}
                  </Box>

                  <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
                    {submissionButtons.map((item) => (
                      <Button
                        key={item.key}
                        variant={item.submission ? 'contained' : 'outlined'}
                        size="small"
                        disabled={!item.submission}
                        onClick={() => handleOpenSubmissionDetails(item.submission, item.label)}
                      >
                        {item.label}
                      </Button>
                    ))}
                  </Box>
                </CardContent>
              </Card>
              );
            })}
            </Box>
          )}
        </Box>
      )}

      {/* Submission Details Dialog */}
      <Dialog
        open={submissionDetailsDialog.open}
        onClose={() => {
          setSubmissionDetailsDialog({ open: false, submission: null, title: '' });
          setSubmissionEvaluationState({ loading: false, data: null });
        }}
        maxWidth="md"
        fullWidth
      >
        <DialogTitle>
          {submissionDetailsDialog.title || 'تفاصيل التسليم'}
        </DialogTitle>
        <DialogContent dividers>
          {submissionDetailsDialog.submission && (
            <Box>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start', mb: 2 }}>
                <Box>
                  <Chip
                    label={`المرحلة: ${getStageLabel(submissionDetailsDialog.submission.stageKey)}`}
                    size="small"
                    variant="outlined"
                    sx={{ mb: 1 }}
                  />
                  <Typography variant="body2" color="text.secondary">
                    {t('uploadedByLabel')}{' '}
                    <Typography
                      component="span"
                      variant="body2"
                      sx={{ color: 'primary.main', cursor: 'pointer', fontWeight: 600, '&:hover': { textDecoration: 'underline' } }}
                      onClick={() => navigate(`/user/${submissionDetailsDialog.submission.submittedBy?._id}`)}
                    >
                      {submissionDetailsDialog.submission.submittedBy?.name || 'غير معروف'}
                    </Typography>
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    {t('dateWithValue', { date: new Date(submissionDetailsDialog.submission.submittedAt).toLocaleString('ar-EG') })}
                  </Typography>
                </Box>
                <Chip
                  label={getStatusLabel(submissionDetailsDialog.submission.status)}
                  color={getStatusColor(submissionDetailsDialog.submission.status)}
                />
              </Box>

              {submissionDetailsDialog.submission.submissionType === 'wokwi' ? (
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2, flexWrap: 'wrap' }}>
                          <DescriptionIcon color="action" />
                          <Typography variant="body2" sx={{ fontWeight: 600 }}>
                            رابط المحاكي (Wokwi)
                          </Typography>
                          <Button
                            size="small"
                            variant="contained"
                            startIcon={<OpenInNewIcon />}
                            href={submissionDetailsDialog.submission.wokwiLink}
                            target="_blank"
                            rel="noopener noreferrer"
                            sx={{ ml: 1 }}
                          >
                            فتح المحاكي للتقييم
                          </Button>
                        </Box>
                      ) : (
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
                          <DescriptionIcon color="action" />
                          <Typography variant="body2">{submissionDetailsDialog.submission.fileName}</Typography>
                          <IconButton
                            size="small"
                            href={submissionDetailsDialog.submission.fileUrl}
                            target="_blank"
                            download
                          >
                            <DownloadIcon />
                          </IconButton>
                        </Box>
                      )}

                      {submissionDetailsDialog.submission.description && (
                        <Box sx={{ mb: 2 }}>
                          <Typography variant="body2" sx={{ fontWeight: 'bold' }}>
                            {t('descriptionLabel')}
                          </Typography>
                          <Typography variant="body2" color="text.secondary">
                            {submissionDetailsDialog.submission.description}
                          </Typography>
                        </Box>
                      )}

                      {submissionDetailsDialog.submission.notes && (
                        <Box sx={{ mb: 2 }}>
                          <Typography variant="body2" sx={{ fontWeight: 'bold' }}>
                            ملاحظات الطالب
                          </Typography>
                          <Typography variant="body2" color="text.secondary">
                            {submissionDetailsDialog.submission.notes}
                          </Typography>
                        </Box>
                      )}

                      <Divider sx={{ my: 2 }} />

                      <Box sx={{ mb: 2 }}>
                        {submissionEvaluationState.loading ? (
                          <Alert severity="info">جاري تحميل تفاصيل تقييم AI...</Alert>
                        ) : submissionEvaluationState.data?.aiApproval?.rationale ? (
                          <Alert severity="success">
                            <Typography variant="body2" sx={{ fontWeight: 'bold', mb: 0.5 }}>
                              ملخص قرار AI
                            </Typography>
                            <Typography variant="body2" sx={{ mb: 1 }}>
                              {submissionEvaluationState.data.aiApproval.rationale}
                            </Typography>
                            <Typography variant="caption" color="text.secondary" sx={{ display: 'block' }}>
                              الثقة: {submissionEvaluationState.data.aiApproval.confidence ?? '-'}
                            </Typography>
                            <Typography variant="caption" color="text.secondary" sx={{ display: 'block' }}>
                              التشابه: {submissionEvaluationState.data.aiApproval.plagiarismSimilarityPercent ?? '-'}%
                            </Typography>
                            <Typography variant="caption" color="text.secondary" sx={{ display: 'block' }}>
                              مستوى التشابه: {submissionEvaluationState.data.aiApproval.plagiarismLevel || 'غير محدد'}
                            </Typography>
                            <Typography variant="caption" color="text.secondary" sx={{ display: 'block' }}>
                              عدد الأدلة المستخدمة: {submissionEvaluationState.data.aiApproval.evidenceCount || 0}
                            </Typography>
                          </Alert>
                        ) : (
                          <Alert severity="info">لا توجد بيانات قرار AI محفوظة لهذا التسليم.</Alert>
                        )}
                      </Box>

                      {/* Feedback Section */}
                      <Box sx={{ mb: 2 }}>
                        {submissionDetailsDialog.submission.feedback ? (
                          <Alert severity="info" icon={<FeedbackIcon />}>
                            <Typography variant="body2" sx={{ fontWeight: 'bold' }}>
                              {t('teacherFeedbackLabel')}
                            </Typography>
                            <Typography variant="body2">
                              {submissionDetailsDialog.submission.feedback}
                            </Typography>
                            {submissionDetailsDialog.submission.feedbackBy && (
                              <Typography variant="caption" color="text.secondary">
                                - {submissionDetailsDialog.submission.feedbackBy.name}
                              </Typography>
                            )}
                          </Alert>
                        ) : (
                          <Alert severity="warning">{t('noFeedbackAddedYet')}</Alert>
                        )}
                        <Button
                          variant="outlined"
                          startIcon={<FeedbackIcon />}
                          onClick={() => handleOpenFeedbackDialog(submissionDetailsDialog.submission)}
                          sx={{ mt: 1 }}
                          size="small"
                        >
                          {submissionDetailsDialog.submission.feedback ? t('editFeedback') : t('addFeedback')}
                        </Button>
                      </Box>

                      {/* Grade Section */}
                      <Box>
                        {submissionDetailsDialog.submission.score !== null ? (
                          <Alert severity="success" icon={<GradeIcon />}>
                            <Typography variant="body2" sx={{ fontWeight: 'bold' }}>
                              {t('scoreOutOf100', { score: submissionDetailsDialog.submission.score })}
                            </Typography>
                            {submissionDetailsDialog.submission.gradedBy && (
                              <Typography variant="caption" color="text.secondary">
                                - {submissionDetailsDialog.submission.gradedBy.name}
                              </Typography>
                            )}
                          </Alert>
                        ) : (
                          <Alert severity="warning">{t('notEvaluatedYet')}</Alert>
                        )}
                        <Box sx={{ display: 'flex', gap: 1, mt: 1 }}>
                          <Button
                            variant="contained"
                            color="primary"
                            startIcon={<AssessmentIcon />}
                            onClick={() => handleOpenDigitalEvaluation(submissionDetailsDialog.submission)}
                            size="small"
                          >
                            {t('digitalEvaluation')}
                          </Button>
                          {submissionDetailsDialog.submission.stageKey === 'programming' && submissionDetailsDialog.submission.submittedBy?._id && (
                            <Button
                              variant="outlined"
                              color="secondary"
                              startIcon={<AutoAwesomeIcon />}
                              onClick={() => navigate(`/evaluate/individual/${projectId}/${submissionDetailsDialog.submission.submittedBy._id}/${submissionDetailsDialog.submission._id}?ai=1`)}
                              size="small"
                            >
                              تقييم AI
                            </Button>
                          )}
                          <Button
                            variant="outlined"
                            startIcon={<GradeIcon />}
                            onClick={() => handleOpenGradeDialog(submissionDetailsDialog.submission)}
                            size="small"
                          >
                            {submissionDetailsDialog.submission.score !== null ? t('editScore') : t('addScore')}
                          </Button>
                        </Box>
                      </Box>
            </Box>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => {
            setSubmissionDetailsDialog({ open: false, submission: null, title: '' });
            setSubmissionEvaluationState({ loading: false, data: null });
          }}>
            {t('close') || 'إغلاق'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Feedback Dialog */}
      <Dialog open={feedbackDialog.open} onClose={() => setFeedbackDialog({ open: false, submission: null, feedback: '' })} maxWidth="sm" fullWidth>
        <DialogTitle>{t('addOrEditFeedback')}</DialogTitle>
        <DialogContent>
          <TextField
            label={t('feedback')}
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
            {t('cancel')}
          </Button>
          <Button onClick={handleSubmitFeedback} variant="contained">
            {t('save')}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Grade Dialog */}
      <Dialog open={gradeDialog.open} onClose={() => setGradeDialog({ open: false, submission: null, score: '' })} maxWidth="xs" fullWidth>
        <DialogTitle>{t('addOrEditScore')}</DialogTitle>
        <DialogContent>
          <TextField
            label={t('score0To100')}
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
            {t('cancel')}
          </Button>
          <Button onClick={handleSubmitGrade} variant="contained">
            {t('save')}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Team Retry Confirmation Dialog */}
      <Dialog open={teamRetryDialog.open} onClose={() => setTeamRetryDialog({ open: false, team: null })} maxWidth="sm" fullWidth>
        <DialogTitle>تأكيد فتح إعادة المحاولة للفريق</DialogTitle>
        <DialogContent>
          <Alert severity="warning" sx={{ mb: 2 }}>
            هل تريد فتح إعادة المحاولة لفريق <strong>{teamRetryDialog.team?.name}</strong> في جميع المراحل؟
          </Alert>
          <Typography variant="body2" color="text.secondary">
            • سيتم إعادة تعيين جميع التقييمات للفريق
          </Typography>
          <Typography variant="body2" color="text.secondary">
            • سيتم حذف جميع التقييمات والدرجات للمراحل المختلفة
          </Typography>
          <Typography variant="body2" color="text.secondary">
            • يمكن للفريق إعادة تقديم التسليمات من جديد
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setTeamRetryDialog({ open: false, team: null })}>
            {t('cancel')}
          </Button>
          <Button onClick={handleConfirmTeamRetry} variant="contained" color="error">
            تأكيد فتح إعادة المحاولة
          </Button>
        </DialogActions>
      </Dialog>
    </Container>
  );
};

export default ProjectSubmissionsManagement;
