import React, { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import {
  Box,
  Typography,
  Paper,
  TextField,
  Button,
  Grid,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Chip,
  IconButton,
  Alert,
  CircularProgress,
  Divider
} from '@mui/material';
import { Add as AddIcon, Delete as DeleteIcon } from '@mui/icons-material';
import { toast } from 'react-toastify';
import api from '../services/api';
import ObservationCardBuilder from '../components/ObservationCardBuilder';
import ObservationCardStatus from '../components/ObservationCardStatus';
import { useAppSettings } from '../context/AppSettingsContext';

const FIXED_MILESTONES = [
  {
    stageKey: 'design',
    title: 'تسليم التصميم (Designer Lead)',
    description: 'وصف فكرة النظام، المدخلات والمخرجات، ومخطط مبدئي للدائرة.'
  },
  {
    stageKey: 'wiring',
    title: 'تسليم الموصل (Builder Lead)',
    description: 'تنفيذ التوصيلات على Wokwi والتحقق من صحة التوصيل.'
  },
  {
    stageKey: 'programming',
    title: 'تسليم الكود (Programmer - إلزامي لكل طالب)',
    description: 'كل طالب يسلّم كود يطبق منطق المشروع.'
  },
  {
    stageKey: 'testing',
    title: 'تسليم المختبر (Tester Lead)',
    description: 'اختبار النظام وتوثيق النتائج والأخطاء والتحسينات.'
  },
  {
    stageKey: 'final_delivery',
    title: 'التسليم النهائي (Final Delivery)',
    description: 'نسخة نهائية بعد الفيدباك وتصحيح الملاحظات.'
  }
];

const EditProjectPage = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { t } = useAppSettings();
  const [loading, setLoading] = useState(false);
  const [loadingProject, setLoadingProject] = useState(true);
  const [error, setError] = useState('');
  
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    shortDescription: '',
    difficulty: 'beginner',
    objectives: [''],
    estimatedDuration: '',
    deadline: '',
    learningScenario: '',
    teachingStrategy: '',
    finalReportNote: '',
    points: 100,
    isTeamProject: false,
    isPublished: false,
    showObjectives: true,
    components: [''],
    showComponents: true,
    milestones: FIXED_MILESTONES.map((m) => ({
      stageKey: m.stageKey,
      title: m.title,
      description: m.description,
      dueDate: '',
      points: 0,
      tasks: [{ title: '', description: '' }]
    })),
  });

  // Observation cards state
  const [groupCard, setGroupCard] = useState(null);
  const [individualCard, setIndividualCard] = useState(null);
  const [existingGroupCard, setExistingGroupCard] = useState(null);
  const [existingIndividualCard, setExistingIndividualCard] = useState(null);
  const [savingCards, setSavingCards] = useState(false);

  const difficulties = [
    { value: 'beginner', label: t('beginner') },
    { value: 'intermediate', label: t('intermediate') },
    { value: 'advanced', label: t('advanced') }
  ];

  useEffect(() => {
    fetchProject();
  }, [id]);

  const fetchProject = async () => {
    try {
      setLoadingProject(true);
      const response = await api.get(`/projects/${id}`);
      const project = response.data.data;
      
      // Format deadline for datetime-local input
      const deadline = project.deadline ? new Date(project.deadline).toISOString().slice(0, 16) : '';
      
      setFormData({
        title: project.title || '',
        description: project.description || '',
        shortDescription: project.shortDescription || '',
        difficulty: project.difficulty || 'beginner',
        objectives: project.objectives?.length > 0 ? project.objectives : [''],
        estimatedDuration: project.estimatedDuration || '',
        deadline: deadline,
        learningScenario: project.learningScenario || '',
        teachingStrategy: project.teachingStrategy || '',
        finalReportNote: project.finalReportNote || '',
        points: project.points || 100,
        isTeamProject: Boolean(project.isTeamProject),
        isPublished: project.isPublished || false,
        showObjectives: project.showObjectives !== undefined ? project.showObjectives : true,
        components: project.components?.length > 0 ? project.components : [''],
        showComponents: project.showComponents !== undefined ? project.showComponents : true,
        milestones: FIXED_MILESTONES.map((fixed, index) => {
          const existing = [...(project.milestones || [])]
            .sort((a, b) => (a.order ?? 0) - (b.order ?? 0))[index] || {};
          return {
            stageKey: fixed.stageKey,
            title: fixed.title,
            description: fixed.description,
            dueDate: existing.dueDate ? new Date(existing.dueDate).toISOString().slice(0, 16) : '',
            points: existing.points || 0,
            tasks: existing.tasks?.length > 0
              ? existing.tasks.map((task) => ({ title: task.title || '', description: task.description || '' }))
              : [{ title: '', description: '' }],
          };
        }),
      });

      // Fetch existing observation cards
      try {
        // Fetch both phases
        const groupCardPromise = api.get(`/assessment/observation-card/${id}/group`);
        const individualCardPromise = api.get(`/assessment/observation-card/${id}/individual_oral`);
        
        const [groupResult, individualResult] = await Promise.allSettled([groupCardPromise, individualCardPromise]);
        
        if (groupResult.status === 'fulfilled') {
          setExistingGroupCard(groupResult.value.data.data);
        }
        if (individualResult.status === 'fulfilled') {
          setExistingIndividualCard(individualResult.value.data.data);
        }
      } catch (cardError) {
        console.log('No existing observation cards found or error fetching them');
      }
    } catch (error) {
      console.error('Error fetching project:', error);
      toast.error(t('projectLoadFailed'));
      navigate('/projects');
    } finally {
      setLoadingProject(false);
    }
  };

  const handleChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value
    });
  };

  const handleAddObjective = () => {
    setFormData({
      ...formData,
      objectives: [...formData.objectives, '']
    });
  };

  const handleObjectiveChange = (index, value) => {
    const newObjectives = [...formData.objectives];
    newObjectives[index] = value;
    setFormData({
      ...formData,
      objectives: newObjectives
    });
  };

  const handleDeleteObjective = (index) => {
    setFormData({
      ...formData,
      objectives: formData.objectives.filter((_, i) => i !== index)
    });
  };

  const handleAddComponent = () => {
    setFormData({ ...formData, components: [...formData.components, ''] });
  };
  const handleComponentChange = (index, value) => {
    const newComponents = [...formData.components];
    newComponents[index] = value;
    setFormData({ ...formData, components: newComponents });
  };
  const handleDeleteComponent = (index) => {
    setFormData({ ...formData, components: formData.components.filter((_, i) => i !== index) });
  };

  const handleAddMilestone = () => {
    toast.info('عدد المراحل ثابت ولا يمكن إضافة مراحل جديدة');
  };

  const handleDeleteMilestone = (milestoneIndex) => {
    toast.info('عدد المراحل ثابت ولا يمكن حذف أي مرحلة');
  };

  const handleMilestoneChange = (milestoneIndex, field, value) => {
    setFormData((prev) => ({
      ...prev,
      milestones: prev.milestones.map((milestone, i) =>
        i === milestoneIndex ? { ...milestone, [field]: value } : milestone
      ),
    }));
  };

  const handleAddTask = (milestoneIndex) => {
    setFormData((prev) => ({
      ...prev,
      milestones: prev.milestones.map((milestone, i) =>
        i === milestoneIndex
          ? {
              ...milestone,
              tasks: [...(milestone.tasks || []), { title: '', description: '' }],
            }
          : milestone
      ),
    }));
  };

  const handleTaskChange = (milestoneIndex, taskIndex, field, value) => {
    setFormData((prev) => ({
      ...prev,
      milestones: prev.milestones.map((milestone, i) => {
        if (i !== milestoneIndex) return milestone;
        const updatedTasks = (milestone.tasks || []).map((task, ti) =>
          ti === taskIndex ? { ...task, [field]: value } : task
        );
        return { ...milestone, tasks: updatedTasks };
      }),
    }));
  };

  const handleDeleteTask = (milestoneIndex, taskIndex) => {
    setFormData((prev) => ({
      ...prev,
      milestones: prev.milestones.map((milestone, i) => {
        if (i !== milestoneIndex) return milestone;
        return {
          ...milestone,
          tasks: (milestone.tasks || []).filter((_, ti) => ti !== taskIndex),
        };
      }),
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    try {
      setLoading(true);
      
      // Filter out empty objectives
      const cleanData = {
        ...formData,
        objectives: formData.objectives.filter(obj => obj.trim() !== ''),
        components: formData.components.filter(c => c.trim() !== ''),
        milestones: (formData.milestones || [])
          .map((milestone, index) => ({
            stageKey: milestone.stageKey,
            title: (milestone.title || '').trim(),
            description: (milestone.description || '').trim(),
            dueDate: milestone.dueDate ? new Date(milestone.dueDate).toISOString() : undefined,
            order: index + 1,
            points: Number(milestone.points || 0),
            tasks: (milestone.tasks || [])
              .map((task) => ({
                title: (task.title || '').trim(),
                description: (task.description || '').trim(),
              }))
              .filter((task) => task.title),
          }))
          .filter((milestone) => milestone.title),
        estimatedDuration: formData.estimatedDuration ? Number(formData.estimatedDuration) : undefined,
        points: formData.points ? Number(formData.points) : 100
      };

      await api.put(`/projects/${id}`, cleanData);

      // Update observation cards if changed
      if (groupCard || individualCard) {
        setSavingCards(true);
        try {
          if (groupCard) {
            if (existingGroupCard) {
              await api.put(`/assessment/observation-card/${existingGroupCard._id}`, {
                sections: groupCard.sections
              });
            } else {
              await api.post('/assessment/observation-card', {
                projectId: id,
                phase: 'group',
                sections: groupCard.sections
              });
            }
          }
          if (individualCard) {
            if (existingIndividualCard) {
              await api.put(`/assessment/observation-card/${existingIndividualCard._id}`, {
                sections: individualCard.sections
              });
            } else {
              await api.post('/assessment/observation-card', {
                projectId: id,
                phase: 'individual_oral',
                sections: individualCard.sections
              });
            }
          }
          toast.success(t('projectAndCardsUpdatedSuccess'));
        } catch (cardError) {
          console.error('Error updating observation cards:', cardError);
          toast.warning(t('projectUpdatedButCardsFailed'));
        }
        setSavingCards(false);
      } else {
        toast.success(t('projectUpdatedSuccess'));
      }
      
      navigate(`/projects/${id}`);
    } catch (error) {
      console.error('Error updating project:', error);
      setError(error.response?.data?.message || t('projectUpdateFailed'));
      toast.error(t('projectUpdateFailed'));
    } finally {
      setLoading(false);
    }
  };

  if (loadingProject) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '60vh' }}>
        <CircularProgress size={60} />
      </Box>
    );
  }

  return (
    <Box sx={{ maxWidth: 1200, mx: 'auto', p: 3 }}>
      <Typography variant="h4" component="h1" gutterBottom fontWeight={700}>
        {t('editProject')}
      </Typography>
      <Typography variant="body1" color="text.secondary" paragraph>
        {t('editProjectSubtitle')}
      </Typography>

      {error && (
        <Alert severity="error" sx={{ mb: 3 }}>
          {error}
        </Alert>
      )}

      <Paper sx={{ p: 3 }}>
        <form onSubmit={handleSubmit}>
          <Grid container spacing={3}>
            {/* Basic Info */}
            <Grid item xs={12}>
              <Typography variant="h6" gutterBottom>
                {t('basicInfo')}
              </Typography>
            </Grid>

            <Grid item xs={12}>
              <TextField
                fullWidth
                label={t('projectTitle')}
                name="title"
                value={formData.title}
                onChange={handleChange}
                disabled={loading}
              />
            </Grid>

            <Grid item xs={12}>
              <TextField
                fullWidth
                label={t('shortDescription')}
                name="shortDescription"
                value={formData.shortDescription}
                onChange={handleChange}
                disabled={loading}
                multiline
                rows={2}
                helperText={t('shortDescriptionHelper')}
              />
            </Grid>

            <Grid item xs={12}>
              <TextField
                fullWidth
                label={t('detailedDescription')}
                name="description"
                value={formData.description}
                onChange={handleChange}
                disabled={loading}
                multiline
                rows={6}
                helperText={t('projectDescriptionHelper')}
              />
            </Grid>

            <Grid item xs={12} sm={4}>
              <FormControl fullWidth>
                <InputLabel>{t('level')}</InputLabel>
                <Select
                  name="difficulty"
                  value={formData.difficulty}
                  onChange={handleChange}
                  disabled={loading}
                  label={t('level')}
                >
                  {difficulties.map((diff) => (
                    <MenuItem key={diff.value} value={diff.value}>
                      {diff.label}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Grid>

            <Grid item xs={12} sm={4}>
              <TextField
                fullWidth
                label={t('estimatedDurationHours')}
                name="estimatedDuration"
                type="number"
                value={formData.estimatedDuration}
                onChange={handleChange}
                disabled={loading}
              />
            </Grid>

            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                label={t('deadline')}
                name="deadline"
                type="datetime-local"
                value={formData.deadline}
                onChange={handleChange}
                disabled={loading}
                InputLabelProps={{ shrink: true }}
                helperText={t('deadlineHelper')}
              />
            </Grid>

            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                label={t('pointsLabel')}
                name="points"
                type="number"
                value={formData.points}
                onChange={handleChange}
                disabled={loading}
                helperText={t('projectPointsHelper')}
              />
            </Grid>

            <Grid item xs={12} sm={6}>
              <FormControl fullWidth>
                <InputLabel>{t('projectTypeLabel')}</InputLabel>
                <Select
                  name="isTeamProject"
                  value={formData.isTeamProject}
                  onChange={handleChange}
                  disabled={loading}
                  label={t('projectTypeLabel')}
                >
                  <MenuItem value={false}>{t('individualProject')}</MenuItem>
                  <MenuItem value={true}>{t('teamProject')}</MenuItem>
                </Select>
              </FormControl>
            </Grid>

            <Grid item xs={12} sm={6}>
              <FormControl fullWidth>
                <InputLabel>{t('status')}</InputLabel>
                <Select
                  name="isPublished"
                  value={formData.isPublished}
                  onChange={handleChange}
                  disabled={loading}
                  label={t('status')}
                >
                  <MenuItem value={false}>{t('draftUnpublished')}</MenuItem>
                  <MenuItem value={true}>{t('published')}</MenuItem>
                </Select>
              </FormControl>
            </Grid>

            {/* Objectives */}
            <Grid item xs={12}>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
                <Typography variant="h6">
                  {t('projectObjectives')}
                </Typography>
                <Box sx={{ display: 'flex', gap: 1 }}>
                  <Button
                    variant="outlined"
                    onClick={() => setFormData({ ...formData, showObjectives: !formData.showObjectives })}
                    disabled={loading}
                  >
                    {formData.showObjectives ? t('hideObjectivesInProject') : t('showObjectivesInProject')}
                  </Button>
                  <Button
                    startIcon={<AddIcon />}
                    onClick={handleAddObjective}
                    disabled={loading}
                  >
                    {t('addObjective')}
                  </Button>
                </Box>
              </Box>
              {formData.objectives.map((objective, index) => (
                <Box key={index} sx={{ display: 'flex', gap: 1, mb: 2 }}>
                  <TextField
                    fullWidth
                    label={t('objectiveWithNumber', { number: index + 1 })}
                    value={objective}
                    onChange={(e) => handleObjectiveChange(index, e.target.value)}
                    disabled={loading}
                    placeholder={t('projectObjectivePlaceholder')}
                  />
                  <IconButton
                    color="error"
                    onClick={() => handleDeleteObjective(index)}
                    disabled={loading || formData.objectives.length === 1}
                  >
                    <DeleteIcon />
                  </IconButton>
                </Box>
              ))}
            </Grid>

            {/* Components */}
            <Grid item xs={12}>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
                <Typography variant="h6">
                  {t('projectComponents')}
                </Typography>
                <Box sx={{ display: 'flex', gap: 1 }}>
                  <Button
                    variant="outlined"
                    onClick={() => setFormData({ ...formData, showComponents: !formData.showComponents })}
                    disabled={loading}
                  >
                    {formData.showComponents ? t('hideComponentsInProject') : t('showComponentsInProject')}
                  </Button>
                  <Button
                    startIcon={<AddIcon />}
                    onClick={handleAddComponent}
                    disabled={loading}
                  >
                    {t('addComponent')}
                  </Button>
                </Box>
              </Box>
              {formData.components.map((comp, index) => (
                <Box key={index} sx={{ display: 'flex', gap: 1, mb: 2 }}>
                  <TextField
                    fullWidth
                    label={t('componentWithNumber', { number: index + 1 })}
                    value={comp}
                    onChange={(e) => handleComponentChange(index, e.target.value)}
                    disabled={loading}
                    placeholder={t('componentPlaceholder')}
                  />
                  <IconButton
                    color="error"
                    onClick={() => handleDeleteComponent(index)}
                    disabled={loading || formData.components.length === 1}
                  >
                    <DeleteIcon />
                  </IconButton>
                </Box>
              ))}
            </Grid>

            {/* Learning Scenario & Strategy */}
            <Grid item xs={12}>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mt: 2, mb: 2 }}>
                <Typography variant="h6">
                  مراحل المشروع وخطة التنفيذ
                </Typography>
                <Button startIcon={<AddIcon />} onClick={handleAddMilestone} disabled={loading}>
                  إضافة مرحلة
                </Button>
              </Box>

              {formData.milestones.map((milestone, milestoneIndex) => (
                <Paper key={milestoneIndex} variant="outlined" sx={{ p: 2, mb: 2 }}>
                  <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 1 }}>
                    <Typography variant="subtitle1" fontWeight={700}>
                      المرحلة {milestoneIndex + 1}
                    </Typography>
                    <IconButton
                      color="error"
                      onClick={() => handleDeleteMilestone(milestoneIndex)}
                      disabled={true}
                    >
                      <DeleteIcon />
                    </IconButton>
                  </Box>

                  <Grid container spacing={2}>
                    <Grid item xs={12} md={6}>
                      <TextField
                        fullWidth
                        label="عنوان المرحلة"
                        value={milestone.title}
                        onChange={(e) => handleMilestoneChange(milestoneIndex, 'title', e.target.value)}
                        disabled
                      />
                    </Grid>
                    <Grid item xs={12} md={3}>
                      <TextField
                        fullWidth
                        type="datetime-local"
                        label="موعد تسليم المرحلة"
                        value={milestone.dueDate || ''}
                        onChange={(e) => handleMilestoneChange(milestoneIndex, 'dueDate', e.target.value)}
                        disabled={loading}
                        InputLabelProps={{ shrink: true }}
                      />
                    </Grid>
                    <Grid item xs={12} md={3}>
                      <TextField
                        fullWidth
                        type="number"
                        label="نقاط المرحلة"
                        value={milestone.points}
                        onChange={(e) => handleMilestoneChange(milestoneIndex, 'points', e.target.value)}
                        disabled={loading}
                      />
                    </Grid>
                    <Grid item xs={12}>
                      <TextField
                        fullWidth
                        multiline
                        rows={2}
                        label="وصف المرحلة"
                        value={milestone.description}
                        onChange={(e) => handleMilestoneChange(milestoneIndex, 'description', e.target.value)}
                        disabled
                      />
                    </Grid>
                  </Grid>

                  <Box sx={{ mt: 2, mb: 1, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <Typography variant="subtitle2" fontWeight={600}>مهام المرحلة</Typography>
                    <Button size="small" startIcon={<AddIcon />} onClick={() => handleAddTask(milestoneIndex)} disabled={loading}>
                      إضافة مهمة
                    </Button>
                  </Box>

                  {(milestone.tasks || []).map((task, taskIndex) => (
                    <Box key={taskIndex} sx={{ display: 'flex', gap: 1, mb: 1, alignItems: 'flex-start' }}>
                      <TextField
                        fullWidth
                        size="small"
                        label={`المهمة ${taskIndex + 1}`}
                        value={task.title}
                        onChange={(e) => handleTaskChange(milestoneIndex, taskIndex, 'title', e.target.value)}
                        disabled={loading}
                      />
                      <TextField
                        fullWidth
                        size="small"
                        label="وصف المهمة"
                        value={task.description}
                        onChange={(e) => handleTaskChange(milestoneIndex, taskIndex, 'description', e.target.value)}
                        disabled={loading}
                      />
                      <IconButton
                        color="error"
                        onClick={() => handleDeleteTask(milestoneIndex, taskIndex)}
                        disabled={loading || (milestone.tasks || []).length === 1}
                      >
                        <DeleteIcon />
                      </IconButton>
                    </Box>
                  ))}
                </Paper>
              ))}
            </Grid>

            <Grid item xs={12}>
              <Typography variant="h6" gutterBottom sx={{ mt: 2 }}>
                {t('learningScenarioAndStrategy')}
              </Typography>
            </Grid>

            <Grid item xs={12}>
              <TextField
                fullWidth
                label={t('projectLearningScenario')}
                name="learningScenario"
                value={formData.learningScenario}
                onChange={handleChange}
                disabled={loading}
                multiline
                rows={8}
                placeholder={t('learningScenarioPlaceholder')}
                helperText={t('learningScenarioHelper')}
              />
            </Grid>

            <Grid item xs={12}>
              <TextField
                fullWidth
                label={t('teachingStrategy')}
                name="teachingStrategy"
                value={formData.teachingStrategy}
                onChange={handleChange}
                disabled={loading}
                multiline
                rows={3}
                placeholder={t('teachingStrategyPlaceholder')}
                helperText={t('teachingStrategyHelper')}
              />
            </Grid>

            <Grid item xs={12}>
              <TextField
                fullWidth
                label={t('finalReportNote')}
                name="finalReportNote"
                value={formData.finalReportNote}
                onChange={handleChange}
                disabled={loading}
                multiline
                rows={2}
                placeholder={t('finalReportNotePlaceholder')}
                helperText={t('finalReportNoteHelper')}
              />
            </Grid>

            {/* Observation Cards Section */}
            <Grid item xs={12}>
              <Divider sx={{ my: 3 }} />
              <Typography variant="h6" gutterBottom sx={{ mt: 2 }}>
                {t('digitalAssessmentCards')}
              </Typography>
              <ObservationCardStatus projectId={id} />
              <Alert severity="info" sx={{ mb: 3 }}>
                {t('editObservationCardsHint')}
              </Alert>
            </Grid>

            {/* Group Observation Card */}
            <Grid item xs={12}>
              <Paper variant="outlined" sx={{ p: 3, mb: 2 }}>
                <Typography variant="h6" gutterBottom color="primary">
                  {t('groupObservationCardTitle')}
                </Typography>
                <Typography variant="body2" color="text.secondary" gutterBottom>
                  {t('groupObservationCardDesc')}
                </Typography>
                <ObservationCardBuilder
                  projectId={id}
                  phase="group"
                  isTeamProject={Boolean(formData.isTeamProject)}
                  initialData={existingGroupCard}
                  onSave={setGroupCard}
                />
              </Paper>
            </Grid>

            {/* Individual + Oral Observation Card */}
            <Grid item xs={12}>
              <Paper variant="outlined" sx={{ p: 3, mb: 2 }}>
                <Typography variant="h6" gutterBottom color="secondary">
                  {t('individualOralObservationCardTitle')}
                </Typography>
                <Typography variant="body2" color="text.secondary" gutterBottom>
                  {t('individualOralObservationCardDesc')}
                </Typography>
                <ObservationCardBuilder
                  projectId={id}
                  phase="individual_oral"
                  isTeamProject={Boolean(formData.isTeamProject)}
                  initialData={existingIndividualCard}
                  onSave={setIndividualCard}
                />
              </Paper>
            </Grid>

            {/* Submit Buttons */}
            <Grid item xs={12}>
              <Box sx={{ display: 'flex', gap: 2, justifyContent: 'flex-end', mt: 3 }}>
                <Button
                  variant="outlined"
                  onClick={() => navigate(`/projects/${id}`)}
                  disabled={loading}
                >
                  {t('cancel')}
                </Button>
                <Button
                  type="submit"
                  variant="contained"
                  disabled={loading || savingCards}
                  size="large"
                >
                  {loading || savingCards ? t('updating') : t('saveChanges')}
                </Button>
              </Box>
            </Grid>
          </Grid>
        </form>
      </Paper>
    </Box>
  );
};

export default EditProjectPage;
