import React, { useState } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  Button,
  Box,
  Typography,
  Alert,
  CircularProgress,
  MenuItem,
  FormControl,
  InputLabel,
  Select,
  LinearProgress,
  Chip
} from '@mui/material';
import { CloudUpload as CloudUploadIcon } from '@mui/icons-material';
import api from '../services/api';

const SupportResourceUploadDialog = ({ open, onClose, onSuccess }) => {
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    resourceType: '',
    category: 'أخرى',
    difficulty: 'متوسط',
    tags: ''
  });
  const [file, setFile] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [uploadProgress, setUploadProgress] = useState(0);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleFileChange = (e) => {
    const selectedFile = e.target.files[0];
    if (selectedFile) {
      if (selectedFile.size > 100 * 1024 * 1024) {
        setError('حجم الملف يجب أن لا يتجاوز 100 ميجابايت');
        return;
      }
      setFile(selectedFile);
      setError(null);
    }
  };

  const detectResourceType = (file) => {
    const mimeType = file.type.toLowerCase();
    if (mimeType.startsWith('video/')) return 'video';
    if (mimeType.startsWith('image/')) return 'image';
    if (mimeType.includes('pdf')) return 'pdf';
    if (mimeType.includes('word') || mimeType.includes('document')) return 'document';
    return 'other';
  };

  const handleSubmit = async () => {
    try {
      if (!formData.title.trim()) {
        setError('العنوان مطلوب');
        return;
      }

      if (!file && !formData.resourceType) {
        setError('يجب اختيار نوع المصدر أو رفع ملف');
        return;
      }

      setLoading(true);
      setError(null);
      setUploadProgress(0);

      const uploadFormData = new FormData();
      uploadFormData.append('title', formData.title);
      uploadFormData.append('description', formData.description);
      uploadFormData.append('category', formData.category);
      uploadFormData.append('difficulty', formData.difficulty);
      uploadFormData.append('tags', formData.tags);

      if (file) {
        uploadFormData.append('file', file);
        const detectedType = detectResourceType(file);
        uploadFormData.append('resourceType', detectedType);
      } else {
        uploadFormData.append('resourceType', formData.resourceType);
      }

      const config = {
        headers: {
          'Content-Type': 'multipart/form-data'
        },
        onUploadProgress: (progressEvent) => {
          const percentCompleted = Math.round(
            (progressEvent.loaded * 100) / progressEvent.total
          );
          setUploadProgress(percentCompleted);
        }
      };

      await api.post('/resources/support/upload', uploadFormData, config);

      setFormData({
        title: '',
        description: '',
        resourceType: '',
        category: 'أخرى',
        difficulty: 'متوسط',
        tags: ''
      });
      setFile(null);
      onSuccess?.();
    } catch (err) {
      console.error('Error uploading resource:', err);
      setError(err.response?.data?.message || 'حدث خطأ في رفع المصدر');
    } finally {
      setLoading(false);
      setUploadProgress(0);
    }
  };

  const categories = [
    'الإلكترونيات',
    'البرمجة',
    'الدوائر الكهربائية',
    'المحاكاة',
    'الأنظمة الذكية',
    'التعليمات والشروحات',
    'مراجع عامة',
    'أخرى'
  ];

  const resourceTypes = [
    { value: 'image', label: '🖼️ صورة' },
    { value: 'video', label: '🎥 فيديو' },
    { value: 'pdf', label: '📄 ملف PDF' },
    { value: 'document', label: '📋 مستند' },
    { value: 'link', label: '🔗 رابط خارجي' },
    { value: 'other', label: '📎 ملف آخر' }
  ];

  const difficulties = ['مبتدئ', 'متوسط', 'متقدم'];

  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
      <DialogTitle sx={{ textAlign: 'right', fontWeight: 'bold', backgroundColor: '#f5f5f5' }}>
        📚 رفع مصدر تعليمي جديد
      </DialogTitle>

      <DialogContent sx={{ direction: 'rtl', mt: 2 }}>
        {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}

        {uploadProgress > 0 && uploadProgress < 100 && (
          <Box sx={{ mb: 2 }}>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
              <Typography variant="caption">جاري الرفع</Typography>
              <Typography variant="caption">{uploadProgress}%</Typography>
            </Box>
            <LinearProgress variant="determinate" value={uploadProgress} />
          </Box>
        )}

        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
          {/* Title */}
          <TextField
            fullWidth
            label="عنوان المصدر"
            name="title"
            value={formData.title}
            onChange={handleChange}
            placeholder="مثال: شرح how to use Arduino"
            disabled={loading}
          />

          {/* Description */}
          <TextField
            fullWidth
            multiline
            rows={3}
            label="الوصف"
            name="description"
            value={formData.description}
            onChange={handleChange}
            placeholder="اكتب وصفاً مختصراً للمصدر..."
            disabled={loading}
          />

          {/* File Upload */}
          <Box>
            <Typography variant="subtitle2" sx={{ mb: 1 }}>
              📦 الملف (اختياري للروابط الخارجية)
            </Typography>
            <Button
              variant="outlined"
              component="label"
              fullWidth
              startIcon={<CloudUploadIcon />}
              disabled={loading}
            >
              {file ? `✓ ${file.name}` : 'اختر ملفاً للرفع'}
              <input
                type="file"
                hidden
                onChange={handleFileChange}
                accept="image/*,video/*,.pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx"
                disabled={loading}
              />
            </Button>
          </Box>

          {/* Resource Type */}
          <FormControl fullWidth disabled={loading}>
            <InputLabel>نوع المصدر</InputLabel>
            <Select
              name="resourceType"
              value={formData.resourceType}
              onChange={handleChange}
              label="نوع المصدر"
            >
              {resourceTypes.map(type => (
                <MenuItem key={type.value} value={type.value}>
                  {type.label}
                </MenuItem>
              ))}
            </Select>
          </FormControl>

          {/* Category */}
          <FormControl fullWidth disabled={loading}>
            <InputLabel>الفئة</InputLabel>
            <Select
              name="category"
              value={formData.category}
              onChange={handleChange}
              label="الفئة"
            >
              {categories.map(cat => (
                <MenuItem key={cat} value={cat}>
                  {cat}
                </MenuItem>
              ))}
            </Select>
          </FormControl>

          {/* Difficulty */}
          <FormControl fullWidth disabled={loading}>
            <InputLabel>مستوى الصعوبة</InputLabel>
            <Select
              name="difficulty"
              value={formData.difficulty}
              onChange={handleChange}
              label="مستوى الصعوبة"
            >
              {difficulties.map(diff => (
                <MenuItem key={diff} value={diff}>
                  {diff}
                </MenuItem>
              ))}
            </Select>
          </FormControl>

          {/* Tags */}
          <TextField
            fullWidth
            label="الكلمات المفتاحية"
            name="tags"
            value={formData.tags}
            onChange={handleChange}
            placeholder="مثال: إلكترونيات, برمجة, Arduino"
            helperText="افصل الكلمات بفواصل"
            disabled={loading}
          />
        </Box>
      </DialogContent>

      <DialogActions sx={{ p: 2, gap: 1 }}>
        <Button
          onClick={onClose}
          variant="outlined"
          disabled={loading}
        >
          إلغاء
        </Button>
        <Button
          onClick={handleSubmit}
          variant="contained"
          disabled={loading || !formData.title.trim()}
        >
          {loading ? (
            <>
              <CircularProgress size={20} sx={{ mr: 1 }} />
              جاري الرفع...
            </>
          ) : (
            'رفع المصدر'
          )}
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default SupportResourceUploadDialog;
