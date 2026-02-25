import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
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
  OutlinedInput,
  IconButton,
  Alert,
  Divider
} from '@mui/material';
import { Add as AddIcon, Delete as DeleteIcon } from '@mui/icons-material';
import { toast } from 'react-toastify';
import api from '../services/api';
import ObservationCardBuilder from '../components/ObservationCardBuilder';
import ObservationCardStatus from '../components/ObservationCardStatus';
import { useAppSettings } from '../context/AppSettingsContext';

const CreateProjectPage = () => {
  const navigate = useNavigate();
  const { t } = useAppSettings();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    shortDescription: '',
    difficulty: 'beginner',
    category: 'web',
    technologies: [],
    objectives: [''],
    estimatedDuration: '',
    deadline: '',
    learningScenario: t('createProjectDefaultLearningScenario'),
    teachingStrategy: t('teachingStrategyPlaceholder'),
    finalReportNote: t('finalReportNotePlaceholder'),
    points: 100,
    isPublished: false,
    showObjectives: true
  });

  // Observation cards state
  const [groupCard, setGroupCard] = useState(null);
  const [individualCard, setIndividualCard] = useState(null);
  const [savingCards, setSavingCards] = useState(false);

  const difficulties = [
    { value: 'beginner', label: t('beginner') },
    { value: 'intermediate', label: t('intermediate') },
    { value: 'advanced', label: t('advanced') }
  ];

  const categories = [
    { value: 'web', label: t('categoryWebDev') },
    { value: 'mobile', label: t('categoryMobileApps') },
    { value: 'desktop', label: t('categoryDesktopApps') },
    { value: 'data-science', label: t('categoryDataScience') },
    { value: 'ai-ml', label: t('categoryAiMl') },
    { value: 'game-dev', label: t('categoryGameDev') },
    { value: 'other', label: t('catOther') }
  ];

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

      const response = await api.post('/projects', cleanData);
      const projectId = response.data.data._id;

      // Save observation cards if they exist
      if (groupCard || individualCard) {
        setSavingCards(true);
        try {
          if (groupCard) {
            await api.post('/assessment/observation-card', {
              projectId,
              phase: 'group',
              sections: groupCard.sections
            });
          }
          if (individualCard) {
            await api.post('/assessment/observation-card', {
              projectId,
              phase: 'individual_oral',
              sections: individualCard.sections
            });
          }
          toast.success(t('projectAndCardsCreatedSuccess'));
        } catch (cardError) {
          console.error('Error saving observation cards:', cardError);
          toast.warning(t('projectCreatedButCardsFailed'));
        }
        setSavingCards(false);
      } else {
        toast.success(t('projectCreatedSuccess'));
      }
      
      navigate(`/projects/${projectId}`);
    } catch (error) {
      console.error('Error creating project:', error);
      setError(error.response?.data?.message || t('projectCreateFailed'));
      toast.error(t('projectCreateFailed'));
    } finally {
      setLoading(false);
    }
  };

  return (
    <Box sx={{ maxWidth: 1200, mx: 'auto', p: 3 }}>
      <Typography variant="h4" component="h1" gutterBottom fontWeight={700}>
        {t('createProject')}
      </Typography>
      <Typography variant="body1" color="text.secondary" paragraph>
        {t('createProjectSubtitle')}
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
                id="project-title"
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
                id="project-short-description"
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
                id="project-description"
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
                <InputLabel id="difficulty-label">{t('level')}</InputLabel>
                <Select
                  id="difficulty"
                  name="difficulty"
                  labelId="difficulty-label"
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
                id="estimated-duration"
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
                id="project-deadline"
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
                id="project-points"
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
                <InputLabel id="isPublished-label">{t('status')}</InputLabel>
                <Select
                  id="isPublished"
                  name="isPublished"
                  labelId="isPublished-label"
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
              <Alert severity="info" sx={{ mb: 2 }}>
                <Typography variant="body2" fontWeight={600} gutterBottom>
                  {t('writeBehavioralObjectives')}
                </Typography>
                <Typography variant="body2">
                  <strong>{t('exampleLabel')}</strong> {t('behavioralObjectiveExample')}
                </Typography>
              </Alert>
              {formData.objectives.map((objective, index) => (
                <Box key={index} sx={{ display: 'flex', gap: 1, mb: 2 }}>
                  <TextField
                    fullWidth
                    id={`objective-${index}`}
                    label={t('objectiveWithNumber', { number: index + 1 })}
                    name={`objective-${index}`}
                    value={objective}
                    onChange={(e) => handleObjectiveChange(index, e.target.value)}
                    disabled={loading}
                    placeholder={t('projectObjectivePlaceholder')}
                    multiline
                    rows={2}
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
                id="learning-scenario"
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
                id="teaching-strategy"
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
                id="final-report-note"
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
              <ObservationCardStatus projectId={null} />
              <Alert severity="info" sx={{ mb: 3 }}>
                {t('createBothObservationCardsHint')}
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
                  projectId={null}
                  phase="group"
                  isTeamProject={true}
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
                  projectId={null}
                  phase="individual_oral"
                  isTeamProject={true}
                  onSave={setIndividualCard}
                />
              </Paper>
            </Grid>

            {/* Submit Buttons */}
            <Grid item xs={12}>
              <Box sx={{ display: 'flex', gap: 2, justifyContent: 'flex-end', mt: 3 }}>
                <Button
                  variant="outlined"
                  onClick={() => navigate('/projects')}
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
                  {loading || savingCards ? t('creating') : t('createProject')}
                </Button>
              </Box>
            </Grid>
          </Grid>
        </form>
      </Paper>
    </Box>
  );
};

export default CreateProjectPage;
