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
  CircularProgress
} from '@mui/material';
import { Add as AddIcon, Delete as DeleteIcon } from '@mui/icons-material';
import { toast } from 'react-toastify';
import api from '../services/api';

const EditProjectPage = () => {
  const { id } = useParams();
  const navigate = useNavigate();
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

  const difficulties = [
    { value: 'beginner', label: 'مبتدئ' },
    { value: 'intermediate', label: 'متوسط' },
    { value: 'advanced', label: 'متقدم' }
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
    } catch (error) {
      console.error('Error fetching project:', error);
      toast.error('فشل تحميل بيانات المشروع');
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
      
      toast.success('تم تحديث المشروع بنجاح');
      navigate(`/projects/${id}`);
    } catch (error) {
      console.error('Error updating project:', error);
      setError(error.response?.data?.message || 'فشل تحديث المشروع');
      toast.error('فشل تحديث المشروع');
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
        تعديل المشروع
      </Typography>
      <Typography variant="body1" color="text.secondary" paragraph>
        قم بتعديل تفاصيل المشروع
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
                المعلومات الأساسية
              </Typography>
            </Grid>

            <Grid item xs={12}>
              <TextField
                fullWidth
                label="عنوان المشروع"
                name="title"
                value={formData.title}
                onChange={handleChange}
                disabled={loading}
              />
            </Grid>

            <Grid item xs={12}>
              <TextField
                fullWidth
                label="وصف مختصر"
                name="shortDescription"
                value={formData.shortDescription}
                onChange={handleChange}
                disabled={loading}
                multiline
                rows={2}
                helperText="وصف قصير يظهر في قائمة المشاريع (حتى 200 حرف)"
              />
            </Grid>

            <Grid item xs={12}>
              <TextField
                fullWidth
                label="الوصف التفصيلي"
                name="description"
                value={formData.description}
                onChange={handleChange}
                disabled={loading}
                multiline
                rows={6}
                helperText="اشرح المشروع بالتفصيل: الأهداف، المتطلبات، ما سيتعلمه الطالب"
              />
            </Grid>

            <Grid item xs={12} sm={4}>
              <FormControl fullWidth>
                <InputLabel>المستوى</InputLabel>
                <Select
                  name="difficulty"
                  value={formData.difficulty}
                  onChange={handleChange}
                  disabled={loading}
                  label="المستوى"
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
                label="المدة التقديرية (ساعات)"
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
                label="الموعد النهائي"
                name="deadline"
                type="datetime-local"
                value={formData.deadline}
                onChange={handleChange}
                disabled={loading}
                InputLabelProps={{ shrink: true }}
                helperText="الموعد النهائي لإنهاء المشروع (التاريخ والوقت)"
              />
            </Grid>

            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                label="النقاط"
                name="points"
                type="number"
                value={formData.points}
                onChange={handleChange}
                disabled={loading}
                helperText="النقاط التي يحصل عليها الطالب عند إكمال المشروع"
              />
            </Grid>

            <Grid item xs={12} sm={6}>
              <FormControl fullWidth>
                <InputLabel>الحالة</InputLabel>
                <Select
                  name="isPublished"
                  value={formData.isPublished}
                  onChange={handleChange}
                  disabled={loading}
                  label="الحالة"
                >
                  <MenuItem value={false}>مسودة (غير منشور)</MenuItem>
                  <MenuItem value={true}>منشور</MenuItem>
                </Select>
              </FormControl>
            </Grid>

            {/* Objectives */}
            <Grid item xs={12}>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
                <Typography variant="h6">
                  أهداف المشروع
                </Typography>
                <Box sx={{ display: 'flex', gap: 1 }}>
                  <Button
                    variant="outlined"
                    onClick={() => setFormData({ ...formData, showObjectives: !formData.showObjectives })}
                    disabled={loading}
                  >
                    {formData.showObjectives ? 'إخفاء الأهداف في المشروع' : 'إظهار الأهداف في المشروع'}
                  </Button>
                  <Button
                    startIcon={<AddIcon />}
                    onClick={handleAddObjective}
                    disabled={loading}
                  >
                    إضافة هدف
                  </Button>
                </Box>
              </Box>
              {formData.objectives.map((objective, index) => (
                <Box key={index} sx={{ display: 'flex', gap: 1, mb: 2 }}>
                  <TextField
                    fullWidth
                    label={`الهدف ${index + 1}`}
                    value={objective}
                    onChange={(e) => handleObjectiveChange(index, e.target.value)}
                    disabled={loading}
                    placeholder="ماذا سيتعلم الطالب من هذا المشروع؟"
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
                السيناريو والاستراتيجية التعليمية
              </Typography>
            </Grid>

            <Grid item xs={12}>
              <TextField
                fullWidth
                label="السيناريو التعليمي للمشروع"
                name="learningScenario"
                value={formData.learningScenario}
                onChange={handleChange}
                disabled={loading}
                multiline
                rows={8}
                placeholder="1. يبدأ المتعلم بقراءة وصف المشكلة التعليمية لفهم التحدي المطلوب&#10;2. يراجع مصادر التعلم الرقمية المرتبطة بالمشروع&#10;3. يخطط لحل المشكلة من خلال تصميم الفكرة المبدئية للنظام&#10;..."
                helperText="اكتب خطوات تنفيذ المشروع بشكل مفصل"
              />
            </Grid>

            <Grid item xs={12}>
              <TextField
                fullWidth
                label="الاستراتيجية التعليمية المستخدمة"
                name="teachingStrategy"
                value={formData.teachingStrategy}
                onChange={handleChange}
                disabled={loading}
                multiline
                rows={3}
                placeholder="1. التعلم القائم على المشروعات&#10;2. التعلم التعاوني"
                helperText="حدد الاستراتيجيات التعليمية المطبقة في المشروع"
              />
            </Grid>

            <Grid item xs={12}>
              <TextField
                fullWidth
                label="ملاحظة التقرير النهائي"
                name="finalReportNote"
                value={formData.finalReportNote}
                onChange={handleChange}
                disabled={loading}
                multiline
                rows={2}
                placeholder="يقوم المتعلم بإعداد تقرير شامل عن المشروع باستخدام النموذج المرفق ويُعد هذا التقرير هو المنتج النهائي للمشروع"
                helperText="ملاحظة حول التقرير النهائي المطلوب من الطلاب"
              />
            </Grid>

            {/* Submit Buttons */}
            <Grid item xs={12}>
              <Box sx={{ display: 'flex', gap: 2, justifyContent: 'flex-end', mt: 3 }}>
                <Button
                  variant="outlined"
                  onClick={() => navigate(`/projects/${id}`)}
                  disabled={loading}
                >
                  إلغاء
                </Button>
                <Button
                  type="submit"
                  variant="contained"
                  disabled={loading}
                  size="large"
                >
                  {loading ? 'جاري التحديث...' : 'حفظ التعديلات'}
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
