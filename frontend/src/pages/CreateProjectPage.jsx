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
  Alert
} from '@mui/material';
import { Add as AddIcon, Delete as DeleteIcon } from '@mui/icons-material';
import { toast } from 'react-toastify';
import api from '../services/api';

const CreateProjectPage = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    shortDescription: '',
    difficulty: 'beginner',
    objectives: [''],
    estimatedDuration: '',
    deadline: '',
    abcdModel: {
      audience: '',
      behavior: '',
      condition: '',
      degree: ''
    },
    points: 100,
    isPublished: false
  });

  const difficulties = [
    { value: 'beginner', label: 'مبتدئ' },
    { value: 'intermediate', label: 'متوسط' },
    { value: 'advanced', label: 'متقدم' }
  ];

  const handleChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value
    });
  };

  const handleAbcdChange = (field, value) => {
    setFormData({
      ...formData,
      abcdModel: {
        ...formData.abcdModel,
        [field]: value
      }
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

    // Validation
    if (!formData.title.trim()) {
      setError('يرجى إدخال عنوان المشروع');
      return;
    }
    if (!formData.description.trim()) {
      setError('يرجى إدخال وصف المشروع');
      return;
    }
    if (!formData.estimatedDuration || formData.estimatedDuration <= 0) {
      setError('يرجى إدخال مدة تقديرية صحيحة');
      return;
    }

    try {
      setLoading(true);
      
      // Filter out empty objectives
      const cleanData = {
        ...formData,
        objectives: formData.objectives.filter(obj => obj.trim() !== ''),
        estimatedDuration: Number(formData.estimatedDuration),
        points: Number(formData.points)
      };

      const response = await api.post('/projects', cleanData);
      
      toast.success('تم إنشاء المشروع بنجاح');
      navigate(`/projects/${response.data.data._id}`);
    } catch (error) {
      console.error('Error creating project:', error);
      setError(error.response?.data?.message || 'فشل إنشاء المشروع');
      toast.error('فشل إنشاء المشروع');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Box sx={{ maxWidth: 1200, mx: 'auto', p: 3 }}>
      <Typography variant="h4" component="h1" gutterBottom fontWeight={700}>
        إنشاء مشروع جديد
      </Typography>
      <Typography variant="body1" color="text.secondary" paragraph>
        قم بإنشاء مشروع تعليمي جديد للطلاب
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
                label="عنوان المشروع *"
                name="title"
                value={formData.title}
                onChange={handleChange}
                disabled={loading}
                required
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
                label="الوصف التفصيلي *"
                name="description"
                value={formData.description}
                onChange={handleChange}
                disabled={loading}
                multiline
                rows={6}
                required
                helperText="اشرح المشروع بالتفصيل: الأهداف، المتطلبات، ما سيتعلمه الطالب"
              />
            </Grid>

            <Grid item xs={12} sm={4}>
              <FormControl fullWidth>
                <InputLabel>المستوى *</InputLabel>
                <Select
                  name="difficulty"
                  value={formData.difficulty}
                  onChange={handleChange}
                  disabled={loading}
                  label="المستوى *"
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
                label="المدة التقديرية (ساعات) *"
                name="estimatedDuration"
                type="number"
                value={formData.estimatedDuration}
                onChange={handleChange}
                disabled={loading}
                required
              />
            </Grid>

            <Grid item xs={12} sm={4}>
              <TextField
                fullWidth
                label="الموعد النهائي"
                name="deadline"
                type="date"
                value={formData.deadline}
                onChange={handleChange}
                disabled={loading}
                InputLabelProps={{ shrink: true }}
                helperText="الموعد النهائي لإنهاء المشروع"
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
                <Button
                  startIcon={<AddIcon />}
                  onClick={handleAddObjective}
                  disabled={loading}
                >
                  إضافة هدف
                </Button>
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

            {/* ABCD Model */}
            <Grid item xs={12}>
              <Typography variant="h6" gutterBottom sx={{ mt: 2 }}>
                نموذج ABCD للأهداف التعليمية
              </Typography>
              <Typography variant="body2" color="text.secondary" paragraph>
                نموذج تصميم الأهداف التعليمية (Audience, Behavior, Condition, Degree)
              </Typography>
            </Grid>

            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                label="الجمهور المستهدف (Audience)"
                value={formData.abcdModel.audience}
                onChange={(e) => handleAbcdChange('audience', e.target.value)}
                disabled={loading}
                multiline
                rows={2}
                placeholder="من هم الطلاب المستهدفون؟ (مثال: طلاب السنة الثانية في علوم الحاسوب)"
                helperText="حدد المتعلمين المستهدفين"
              />
            </Grid>

            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                label="السلوك المتوقع (Behavior)"
                value={formData.abcdModel.behavior}
                onChange={(e) => handleAbcdChange('behavior', e.target.value)}
                disabled={loading}
                multiline
                rows={2}
                placeholder="ماذا سيفعل الطلاب؟ (مثال: تطوير تطبيق ويب كامل)"
                helperText="الإجراء أو المهارة القابلة للقياس"
              />
            </Grid>

            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                label="الظروف (Condition)"
                value={formData.abcdModel.condition}
                onChange={(e) => handleAbcdChange('condition', e.target.value)}
                disabled={loading}
                multiline
                rows={2}
                placeholder="في أي ظروف؟ (مثال: باستخدام React و Node.js)"
                helperText="البيئة أو الموارد المتاحة"
              />
            </Grid>

            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                label="الدرجة المطلوبة (Degree)"
                value={formData.abcdModel.degree}
                onChange={(e) => handleAbcdChange('degree', e.target.value)}
                disabled={loading}
                multiline
                rows={2}
                placeholder="ما مستوى الإتقان المطلوب؟ (مثال: بدقة 90% وبدون أخطاء)"
                helperText="معيار النجاح أو مستوى الأداء"
              />
            </Grid>

            {/* Submit Buttons */}
            <Grid item xs={12}>
              <Box sx={{ display: 'flex', gap: 2, justifyContent: 'flex-end', mt: 3 }}>
                <Button
                  variant="outlined"
                  onClick={() => navigate('/projects')}
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
                  {loading ? 'جاري الإنشاء...' : 'إنشاء المشروع'}
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
