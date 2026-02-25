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
import { useAppSettings } from '../context/AppSettingsContext';

const SupportResourceUploadDialog = ({ open, onClose, onSuccess }) => {
  const { t } = useAppSettings();
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    resourceType: '',
    externalUrl: '',
    category: t('catOtherValue'),
    difficulty: t('difficultyIntermediateValue'),
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
      // Cloudinary free tier max is 10MB
      const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB
      
      if (selectedFile.size > MAX_FILE_SIZE) {
        const sizeMB = (selectedFile.size / (1024 * 1024)).toFixed(2);
        setError(t('supportResourceFileTooLarge', { sizeMB }));
        setFile(null);
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
        setError(t('titleRequired'));
        return;
      }

      if (!file && !formData.externalUrl.trim()) {
        setError(t('supportResourceNeedFileOrLink'));
        return;
      }

      if (!file && !formData.resourceType) {
        setError(t('supportResourceSelectTypeForLink'));
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
      uploadFormData.append('externalUrl', formData.externalUrl.trim());

      if (file) {
        uploadFormData.append('file', file);
        const detectedType = detectResourceType(file);
        uploadFormData.append('resourceType', detectedType);
      } else {
        uploadFormData.append('resourceType', formData.resourceType || 'link');
        uploadFormData.append('fileUrl', formData.externalUrl.trim());
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
        externalUrl: '',
        category: t('catOtherValue'),
        difficulty: t('difficultyIntermediateValue'),
        tags: ''
      });
      setFile(null);
      setUploadProgress(0);
      onSuccess?.();
    } catch (err) {
      console.error('Error uploading resource:', err);
      const errorMessage = err.response?.data?.message || err.message || t('supportResourceUploadFailed');
      setError(errorMessage);
    } finally {
      setLoading(false);
      setUploadProgress(0);
    }
  };

  const categories = [
    { value: t('catElectronicsValue'), label: t('catElectronics') },
    { value: t('catProgrammingValue'), label: t('catProgramming') },
    { value: t('catCircuitsValue'), label: t('catCircuits') },
    { value: t('catSimulationValue'), label: t('catSimulation') },
    { value: t('catSmartSystemsValue'), label: t('catSmartSystems') },
    { value: t('catInstructionsValue'), label: t('catInstructions') },
    { value: t('catReferencesValue'), label: t('catReferences') },
    { value: t('catOtherValue'), label: t('catOther') }
  ];

  const resourceTypes = [
    { value: 'image', label: `🖼️ ${t('typeImage')}` },
    { value: 'video', label: `🎥 ${t('typeVideo')}` },
    { value: 'pdf', label: `📄 ${t('typePdf')}` },
    { value: 'document', label: `📋 ${t('typeDocument')}` },
    { value: 'link', label: `🔗 ${t('typeLink')}` },
    { value: 'other', label: `📎 ${t('typeOther')}` }
  ];

  const difficulties = [
    { value: t('difficultyBeginnerValue'), label: t('beginner') },
    { value: t('difficultyIntermediateValue'), label: t('intermediate') },
    { value: t('difficultyAdvancedValue'), label: t('advanced') }
  ];

  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
      <DialogTitle sx={{ textAlign: 'right', fontWeight: 'bold', backgroundColor: '#f5f5f5' }}>
        📚 {t('uploadNewResource')}
      </DialogTitle>

      <DialogContent sx={{ direction: 'rtl', mt: 2 }}>
        {error && (
          <Alert severity="error" sx={{ mb: 2 }}>
            <Typography variant="body2">{error}</Typography>
          </Alert>
        )}

        {uploadProgress > 0 && uploadProgress < 100 && (
          <Box sx={{ mb: 2 }}>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
              <Typography variant="caption">{t('uploading')}</Typography>
              <Typography variant="caption">{uploadProgress}%</Typography>
            </Box>
            <LinearProgress variant="determinate" value={uploadProgress} />
          </Box>
        )}

        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
          {/* Title */}
          <TextField
            fullWidth
            label={t('resourceTitle')}
            name="title"
            value={formData.title}
            onChange={handleChange}
            placeholder={t('supportResourceTitlePlaceholder')}
            disabled={loading}
          />

          {/* Description */}
          <TextField
            fullWidth
            multiline
            rows={3}
            label={t('description')}
            name="description"
            value={formData.description}
            onChange={handleChange}
            placeholder={t('supportResourceDescriptionPlaceholder')}
            disabled={loading}
          />

          {/* File Upload */}
          <Box>
            <Typography variant="subtitle2" sx={{ mb: 1 }}>
              📦 {t('supportResourceFileOptionalLabel')}
            </Typography>
            <Button
              variant="outlined"
              component="label"
              fullWidth
              startIcon={<CloudUploadIcon />}
              disabled={loading}
            >
              {file ? `✓ ${file.name} (${(file.size / (1024 * 1024)).toFixed(2)} MB)` : t('supportResourceChooseFile')}
              <input
                type="file"
                hidden
                onChange={handleFileChange}
                accept="image/*,video/*,.pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx"
                disabled={loading}
              />
            </Button>
            {file && (
              <Typography variant="caption" sx={{ mt: 1, display: 'block', color: '#666' }}>
                {t('supportResourceFileSize')}: {(file.size / (1024 * 1024)).toFixed(2)} MB
              </Typography>
            )}
          </Box>

          {/* External URL */}
          <TextField
            fullWidth
            label={t('supportResourceExternalUrlLabel')}
            name="externalUrl"
            value={formData.externalUrl}
            onChange={handleChange}
            placeholder={t('supportResourceExternalUrlPlaceholder')}
            helperText={t('supportResourceExternalUrlHelper')}
            disabled={loading}
          />

          {/* Resource Type */}
          <FormControl fullWidth disabled={loading}>
            <InputLabel>{t('resourceType')}</InputLabel>
            <Select
              name="resourceType"
              value={formData.resourceType}
              onChange={handleChange}
              label={t('resourceType')}
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
            <InputLabel>{t('category')}</InputLabel>
            <Select
              name="category"
              value={formData.category}
              onChange={handleChange}
              label={t('category')}
            >
              {categories.map(cat => (
                <MenuItem key={cat.value} value={cat.value}>
                  {cat.label}
                </MenuItem>
              ))}
            </Select>
          </FormControl>

          {/* Difficulty */}
          <FormControl fullWidth disabled={loading}>
            <InputLabel>{t('difficultyLevel')}</InputLabel>
            <Select
              name="difficulty"
              value={formData.difficulty}
              onChange={handleChange}
              label={t('difficultyLevel')}
            >
              {difficulties.map(diff => (
                <MenuItem key={diff.value} value={diff.value}>
                  {diff.label}
                </MenuItem>
              ))}
            </Select>
          </FormControl>

          {/* Tags */}
          <TextField
            fullWidth
            label={t('keywords')}
            name="tags"
            value={formData.tags}
            onChange={handleChange}
            placeholder={t('supportResourceTagsPlaceholder')}
            helperText={t('supportResourceTagsHelper')}
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
          {t('cancel')}
        </Button>
        <Button
          onClick={handleSubmit}
          variant="contained"
          disabled={loading || !formData.title.trim()}
        >
          {loading ? (
            <>
              <CircularProgress size={20} sx={{ mr: 1 }} />
              {t('uploading')}
            </>
          ) : (
            t('uploadResource')
          )}
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default SupportResourceUploadDialog;
