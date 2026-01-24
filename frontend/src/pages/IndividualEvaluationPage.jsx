import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  Box,
  Paper,
  Typography,
  Button,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Radio,
  RadioGroup,
  FormControlLabel,
  TextField,
  Alert,
  CircularProgress,
  Chip,
  Breadcrumbs,
  Link,
  Select,
  MenuItem,
  FormControl,
  InputLabel
} from '@mui/material';
import { NavigateNext as NavigateNextIcon, Lock as LockIcon, ArrowBack as ArrowBackIcon } from '@mui/icons-material';
import axios from 'axios';

const ROLES = {
  system_designer: 'مصمم النظام',
  hardware_engineer: 'مهندس الأجهزة',
  programmer: 'المبرمج'
};

const IndividualEvaluationPage = () => {
  const { projectId, studentId, submissionId } = useParams();
  const navigate = useNavigate();

  const [loading, setLoading] = useState(true);
  const [observationCard, setObservationCard] = useState(null);
  const [project, setProject] = useState(null);
  const [student, setStudent] = useState(null);
  const [studentRole, setStudentRole] = useState('');
  const [phase1Status, setPhase1Status] = useState(null);
  const [selections, setSelections] = useState({});
  const [feedbackSummary, setFeedbackSummary] = useState('');
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    fetchData();
  }, [projectId, studentId]);

  const fetchData = async () => {
    try {
      setLoading(true);

      // Fetch project details
      const projectRes = await axios.get(`/api/projects/${projectId}`, {
        headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
      });
      setProject(projectRes.data.data);

      // If team project, check Phase 1 completion
      if (projectRes.data.data.isTeamProject) {
        // Fetch student to get team
        const studentRes = await axios.get(`/api/users/${studentId}`, {
          headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
        });
        setStudent(studentRes.data.data);

        // Find team
        const teamsRes = await axios.get(`/api/teams/project/${projectId}`, {
          headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
        });
        const studentTeam = teamsRes.data.data.find(team =>
          team.members.some(m => m._id === studentId || m === studentId)
        );

        if (studentTeam) {
          // Check Phase 1 status
          const statusRes = await axios.get(`/api/assessment/group-status/${projectId}/${studentTeam._id}`, {
            headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
          });
          setPhase1Status(statusRes.data.data);
        }
      } else {
        // Individual project - no Phase 1 check needed
        const studentRes = await axios.get(`/api/users/${studentId}`, {
          headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
        });
        setStudent(studentRes.data.data);
        setPhase1Status({ phase1Complete: true }); // Skip Phase 1 for individual projects
      }
      
      // Fetch observation card
      const cardRes = await axios.get(`/api/assessment/observation-card/${projectId}/individual_oral`, {
        headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
      });
      setObservationCard(cardRes.data.data);

      // Initialize selections
      const initialSelections = {};
      cardRes.data.data.sections.forEach(section => {
        section.criteria.forEach(criterion => {
          initialSelections[`${section.name}_${criterion.name}`] = {
            sectionName: section.name,
            criterionName: criterion.name,
            applicableRoles: criterion.applicableRoles,
            selectedPercentage: null,
            selectedDescription: ''
          };
        });
      });
      setSelections(initialSelections);

      setLoading(false);
    } catch (err) {
      console.error(err);
      setError(err.response?.data?.message || 'فشل في تحميل البيانات');
      setLoading(false);
    }
  };

  const handleSelection = (sectionName, criterionName, percentage, description) => {
    const key = `${sectionName}_${criterionName}`;
    setSelections(prev => ({
      ...prev,
      [key]: {
        ...prev[key],
        selectedPercentage: percentage,
        selectedDescription: description
      }
    }));
  };

  const isCriterionRequired = (criterion) => {
    if (!studentRole) return false;
    return criterion.applicableRoles.includes('all') || 
           criterion.applicableRoles.includes(studentRole);
  };

  const calculatePreviewScore = () => {
    if (!observationCard || !studentRole) return 0;

    let totalScore = 0;
    observationCard.sections.forEach(section => {
      let sumPercentages = 0;
      let requiredCount = 0;
      
      section.criteria.forEach(criterion => {
        const key = `${section.name}_${criterion.name}`;
        const selection = selections[key];
        const isRequired = isCriterionRequired(criterion);
        
        if (isRequired) {
          requiredCount++;
          if (selection && selection.selectedPercentage !== null) {
            sumPercentages += selection.selectedPercentage;
          }
        }
      });

      if (requiredCount > 0) {
        const avgPercentage = sumPercentages / requiredCount;
        const sectionScore = avgPercentage * (section.weight / 100);
        totalScore += sectionScore;
      }
    });

    return totalScore.toFixed(2);
  };

  const handleSubmit = async () => {
    setError('');

    if (!studentRole) {
      setError('يجب تحديد دور الطالب');
      return;
    }

    // Validate all REQUIRED criteria selected
    const allRequiredSelected = Object.entries(selections).every(([key, sel]) => {
      const [sectionName, criterionName] = key.split('_');
      const section = observationCard.sections.find(s => s.name === sectionName);
      const criterion = section?.criteria.find(c => c.name === criterionName);
      
      if (!criterion) return true;
      
      const isRequired = isCriterionRequired(criterion);
      if (!isRequired) return true; // Not required = OK
      
      return sel.selectedPercentage !== null; // Required = must have selection
    });

    if (!allRequiredSelected) {
      setError('يجب تحديد درجة لجميع المعايير المطلوبة');
      return;
    }

    try {
      setSubmitting(true);

      // Group selections by section
      const sectionEvaluations = [];
      observationCard.sections.forEach(section => {
        const criterionSelections = section.criteria.map(criterion => {
          const key = `${section.name}_${criterion.name}`;
          return selections[key];
        });
        
        sectionEvaluations.push({
          sectionName: section.name,
          criterionSelections
        });
      });

      await axios.post('/api/assessment/evaluate-individual', {
        projectId,
        studentId,
        studentRole,
        submissionId,
        sectionEvaluations,
        feedbackSummary
      }, {
        headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
      });

      alert('تم حفظ التقييم الفردي بنجاح');
      navigate(`/projects/${projectId}/submissions`);
    } catch (err) {
      console.error(err);
      setError(err.response?.data?.message || 'فشل في حفظ التقييم');
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '60vh' }}>
        <CircularProgress />
      </Box>
    );
  }

  if (!observationCard) {
    return (
      <Alert severity="error">بطاقة الملاحظة غير موجودة</Alert>
    );
  }

  // Phase 1 blocking check
  if (project?.isTeamProject && (!phase1Status || !phase1Status.phase1Complete)) {
    return (
      <Box>
        <Paper sx={{ p: 4, textAlign: 'center' }}>
          <LockIcon sx={{ fontSize: 80, color: 'warning.main', mb: 2 }} />
          <Typography variant="h5" gutterBottom fontWeight={600}>
            المرحلة الجماعية غير مكتملة
          </Typography>
          <Typography variant="body1" color="text.secondary" paragraph>
            يجب إكمال التقييم الجماعي (المرحلة الأولى) قبل البدء في التقييم الفردي
          </Typography>
          <Button
            variant="contained"
            onClick={() => navigate(`/projects/${projectId}/submissions`)}
          >
            العودة إلى قائمة التسليمات
          </Button>
        </Paper>
      </Box>
    );
  }

  return (
    <Box>
      {/* Back Button */}
      <Button
        startIcon={<ArrowBackIcon />}
        onClick={() => navigate(-1)}
        sx={{ mb: 2 }}
      >
        العودة
      </Button>

      {/* Breadcrumbs */}
      <Breadcrumbs separator={<NavigateNextIcon fontSize="small" />} sx={{ mb: 3 }}>
        <Link underline="hover" color="inherit" href="/projects">المشاريع</Link>
        <Link underline="hover" color="inherit" href={`/projects/${projectId}`}>
          {project?.title}
        </Link>
        <Typography color="text.primary">التقييم الفردي</Typography>
      </Breadcrumbs>

      {/* Header */}
      <Paper sx={{ p: 3, mb: 3 }}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
          <Box>
            <Typography variant="h4" fontWeight={600} gutterBottom>
              التقييم الفردي والشفوي (المرحلة الثانية)
            </Typography>
            <Typography variant="body1" color="text.secondary">
              المشروع: {project?.title}
            </Typography>
            <Typography variant="body2" color="text.secondary">
              الطالب: {student?.name}
            </Typography>
          </Box>
          <Chip label="المرحلة 2" color="secondary" size="large" />
        </Box>

        <Alert severity="info" sx={{ mb: 2 }}>
          هذا التقييم خاص بالطالب. المعايير ستُفلتر حسب الدور المحدد.
        </Alert>

        {/* Role Selector */}
        <FormControl fullWidth sx={{ mt: 2 }}>
          <InputLabel>دور الطالب</InputLabel>
          <Select
            value={studentRole}
            onChange={(e) => setStudentRole(e.target.value)}
            label="دور الطالب"
          >
            <MenuItem value="">-- اختر الدور --</MenuItem>
            {Object.entries(ROLES).map(([value, label]) => (
              <MenuItem key={value} value={value}>{label}</MenuItem>
            ))}
          </Select>
        </FormControl>
      </Paper>

      {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}

      {!studentRole && (
        <Alert severity="warning" sx={{ mb: 3 }}>
          يرجى اختيار دور الطالب لبدء التقييم
        </Alert>
      )}

      {/* Preview Score */}
      {studentRole && (
        <Paper sx={{ p: 2, mb: 3, bgcolor: 'secondary.light', color: 'secondary.contrastText' }}>
          <Typography variant="h6">
            الدرجة المحسوبة: {calculatePreviewScore()} / 100
          </Typography>
        </Paper>
      )}

      {/* Evaluation Sections */}
      {studentRole && observationCard.sections.map((section, sectionIndex) => (
        <Paper key={sectionIndex} sx={{ p: 3, mb: 3 }}>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
            <Typography variant="h5" fontWeight={600}>
              {section.name}
            </Typography>
            <Chip label={`${section.weight}%`} color="secondary" />
          </Box>

          <TableContainer>
            <Table>
              <TableHead>
                <TableRow>
                  <TableCell width="25%"><strong>المعيار</strong></TableCell>
                  <TableCell width="10%" align="center"><strong>مطلوب</strong></TableCell>
                  <TableCell width="55%"><strong>الخيارات</strong></TableCell>
                  <TableCell width="10%" align="center"><strong>الدرجة</strong></TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {section.criteria.map((criterion, criterionIndex) => {
                  const key = `${section.name}_${criterion.name}`;
                  const selected = selections[key];
                  const isRequired = isCriterionRequired(criterion);

                  return (
                    <TableRow key={criterionIndex} sx={{ opacity: isRequired ? 1 : 0.5 }}>
                      <TableCell>
                        <Typography fontWeight={600}>{criterion.name}</Typography>
                        <Typography variant="caption" color="text.secondary">
                          {criterion.applicableRoles.includes('all') 
                            ? 'جميع الأدوار' 
                            : criterion.applicableRoles.map(r => ROLES[r] || r).join(', ')}
                        </Typography>
                      </TableCell>
                      <TableCell align="center">
                        {isRequired ? (
                          <Chip label="نعم" color="success" size="small" />
                        ) : (
                          <Chip label="لا" size="small" />
                        )}
                      </TableCell>
                      <TableCell>
                        {isRequired ? (
                          <RadioGroup
                            value={selected?.selectedPercentage?.toString() || ''}
                            onChange={(e) => {
                              const percentage = parseInt(e.target.value);
                              const option = criterion.options.find(o => o.percentage === percentage);
                              handleSelection(
                                section.name,
                                criterion.name,
                                percentage,
                                option?.description || ''
                              );
                            }}
                          >
                            {criterion.options.map(option => (
                              <FormControlLabel
                                key={option.percentage}
                                value={option.percentage.toString()}
                                control={<Radio />}
                                label={
                                  <Box>
                                    <Typography variant="body2" fontWeight={600}>
                                      {option.percentage}%
                                    </Typography>
                                    {option.description && (
                                      <Typography variant="caption" color="text.secondary">
                                        {option.description}
                                      </Typography>
                                    )}
                                  </Box>
                                }
                              />
                            ))}
                          </RadioGroup>
                        ) : (
                          <Typography variant="body2" color="text.secondary">
                            غير مطلوب لهذا الدور
                          </Typography>
                        )}
                      </TableCell>
                      <TableCell align="center">
                        {isRequired ? (
                          <Chip 
                            label={selected?.selectedPercentage !== null ? `${selected.selectedPercentage}%` : '-'}
                            color={selected?.selectedPercentage !== null ? 'success' : 'default'}
                          />
                        ) : (
                          <Chip label="N/A" size="small" />
                        )}
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </TableContainer>
        </Paper>
      ))}

      {/* Feedback */}
      {studentRole && (
        <Paper sx={{ p: 3, mb: 3 }}>
          <Typography variant="h6" gutterBottom fontWeight={600}>
            ملاحظات عامة (اختياري)
          </Typography>
          <TextField
            fullWidth
            multiline
            rows={4}
            value={feedbackSummary}
            onChange={(e) => setFeedbackSummary(e.target.value)}
            placeholder="أضف ملاحظاتك العامة على أداء الطالب..."
          />
        </Paper>
      )}

      {/* Submit Button */}
      {studentRole && (
        <Box sx={{ display: 'flex', justifyContent: 'flex-end', gap: 2 }}>
          <Button
            variant="outlined"
            onClick={() => navigate(`/projects/${projectId}/submissions`)}
            disabled={submitting}
          >
            إلغاء
          </Button>
          <Button
            variant="contained"
            color="secondary"
            size="large"
            onClick={handleSubmit}
            disabled={submitting}
          >
            {submitting ? 'جاري الحفظ...' : 'حفظ التقييم الفردي'}
          </Button>
        </Box>
      )}
    </Box>
  );
};

export default IndividualEvaluationPage;
