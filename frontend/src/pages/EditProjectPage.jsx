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
    isPublished: false,
    showObjectives: true
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
        isPublished: project.isPublished || false,
        showObjectives: project.showObjectives !== undefined ? project.showObjectives : true
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

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    try {
      setLoading(true);
      
      // Filter out empty objectives
      const cleanData = {
        ...formData,
        objectives: formData.objectives.filter(obj => obj.trim() !== ''),
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

            <Grid item xs={12} sm={4}>
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

            {/* Learning Scenario & Strategy */}
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
                  isTeamProject={true}
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
                  isTeamProject={true}
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
