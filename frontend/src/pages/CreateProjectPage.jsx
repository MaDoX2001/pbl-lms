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

const CreateProjectPage = () => {
  const navigate = useNavigate();
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
    learningScenario: `1. يبدأ المتعلم بقراءة وصف المشكلة التعليمية لفهم التحدي المطلوب
2. يراجع مصادر التعلم الرقمية المرتبطة بالمشروع
3. يخطط لحل المشكلة من خلال تصميم الفكرة المبدئية للنظام
4. ينفذ الكود البرمجي باستخدام محاكي Arduino
5. يختبر النظام ويجري التعديلات اللازمة
6. يشارك في مناقشة مرحلية مع زملائه لمتابعة تقدم المشروع وتبادل الآراء
7. يسلّم تقرير المشروع النهائي وفق النموذج المرفق`,
    teachingStrategy: `1. التعلم القائم على المشروعات
2. التعلم التعاوني`,
    finalReportNote: 'يقوم المتعلم بإعداد تقرير شامل عن المشروع باستخدام النموذج المرفق ويُعد هذا التقرير هو المنتج النهائي للمشروع',
    points: 100,
    isPublished: false,
    showObjectives: true
  });

  // Observation cards state
  const [groupCard, setGroupCard] = useState(null);
  const [individualCard, setIndividualCard] = useState(null);
  const [savingCards, setSavingCards] = useState(false);

  const difficulties = [
    { value: 'beginner', label: 'مبتدئ' },
    { value: 'intermediate', label: 'متوسط' },
    { value: 'advanced', label: 'متقدم' }
  ];

  const categories = [
    { value: 'web', label: 'تطوير ويب' },
    { value: 'mobile', label: 'تطبيقات جوال' },
    { value: 'desktop', label: 'تطبيقات سطح المكتب' },
    { value: 'data-science', label: 'علم البيانات' },
    { value: 'ai-ml', label: 'ذكاء اصطناعي' },
    { value: 'game-dev', label: 'تطوير الألعاب' },
    { value: 'other', label: 'أخرى' }
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
          toast.success('تم إنشاء المشروع وبطاقات الملاحظات بنجاح');
        } catch (cardError) {
          console.error('Error saving observation cards:', cardError);
          toast.warning('تم إنشاء المشروع لكن فشل حفظ بطاقات الملاحظات');
        }
        setSavingCards(false);
      } else {
        toast.success('تم إنشاء المشروع بنجاح');
      }
      
      navigate(`/projects/${projectId}`);
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
              <Alert severity="info" sx={{ mb: 2 }}>
                <Typography variant="body2" fontWeight={600} gutterBottom>
                  اكتب الأهداف بأسلوب ABCD (الجمهور، السلوك، الظروف، الدرجة):
                </Typography>
                <Typography variant="body2">
                  <strong>مثال:</strong> أن يتمكن <em>(الطلاب)</em> من <em>(تصميم وتطوير تطبيق ويب تفاعلي)</em> باستخدام <em>(React و Node.js)</em> بدقة <em>(لا تقل عن 85%)</em>
                </Typography>
              </Alert>
              {formData.objectives.map((objective, index) => (
                <Box key={index} sx={{ display: 'flex', gap: 1, mb: 2 }}>
                  <TextField
                    fullWidth
                    label={`الهدف ${index + 1}`}
                    value={objective}
                    onChange={(e) => handleObjectiveChange(index, e.target.value)}
                    disabled={loading}
                    placeholder="مثال: أن يتمكن الطلاب من تصميم وتطوير..."
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

            {/* Observation Cards Section */}
            <Grid item xs={12}>
              <Divider sx={{ my: 3 }} />
              <Typography variant="h6" gutterBottom sx={{ mt: 2 }}>
                بطاقات التقييم الرقمي
              </Typography>
              <ObservationCardStatus projectId={null} />
              <Alert severity="info" sx={{ mb: 3 }}>
                قم بإنشاء بطاقتي الملاحظات للتقييم الثنائي المرحلي (التقييم الجماعي + التقييم الفردي والشفهي)
              </Alert>
            </Grid>

            {/* Group Observation Card */}
            <Grid item xs={12}>
              <Paper variant="outlined" sx={{ p: 3, mb: 2 }}>
                <Typography variant="h6" gutterBottom color="primary">
                  بطاقة الملاحظات – التقييم الجماعي (المرحلة الأولى)
                </Typography>
                <Typography variant="body2" color="text.secondary" gutterBottom>
                  تُستخدم لتقييم أداء الفريق ككل في المشروع
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
                  بطاقة الملاحظات – التقييم الفردي والشفهي (المرحلة الثانية)
                </Typography>
                <Typography variant="body2" color="text.secondary" gutterBottom>
                  تُستخدم لتقييم أداء كل طالب حسب دوره + التقييم الشفهي
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
                  إلغاء
                </Button>
                <Button
                  type="submit"
                  variant="contained"
                  disabled={loading || savingCards}
                  size="large"
                >
                  {loading || savingCards ? 'جاري الإنشاء...' : 'إنشاء المشروع'}
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
