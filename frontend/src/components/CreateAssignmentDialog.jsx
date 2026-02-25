import React, { useState } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  Button,
  Box,
  FormControlLabel,
  Checkbox,
  Chip,
  Stack,
} from '@mui/material';
import { toast } from 'react-toastify';
import api from '../services/api';
import { useAppSettings } from '../context/AppSettingsContext';

const CreateAssignmentDialog = ({ open, onClose, projectId, onSuccess }) => {
  const { t } = useAppSettings();
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    dueDate: '',
    maxScore: 100,
    allowedFileTypes: ['pdf', 'docx', 'pptx', 'zip'],
    maxFileSize: 10485760, // 10MB default
    allowLateSubmission: false,
  });
  const [loading, setLoading] = useState(false);
  const [newFileType, setNewFileType] = useState('');

  const handleChange = (e) => {
    const { name, value, checked } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: e.target.type === 'checkbox' ? checked : value,
    }));
  };

  const handleAddFileType = () => {
    if (newFileType && !formData.allowedFileTypes.includes(newFileType)) {
      setFormData((prev) => ({
        ...prev,
        allowedFileTypes: [...prev.allowedFileTypes, newFileType],
      }));
      setNewFileType('');
    }
  };

  const handleRemoveFileType = (typeToRemove) => {
    setFormData((prev) => ({
      ...prev,
      allowedFileTypes: prev.allowedFileTypes.filter((type) => type !== typeToRemove),
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);

    try {
      await api.post(`/resources/${projectId}/assignments`, formData);
      toast.success(t('createAssignmentSuccess'));
      onSuccess();
      handleClose();
    } catch (error) {
      toast.error(error.response?.data?.message || t('createAssignmentError'));
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
    setFormData({
      title: '',
      description: '',
      dueDate: '',
      maxScore: 100,
      allowedFileTypes: ['pdf', 'docx', 'pptx', 'zip'],
      maxFileSize: 10485760,
      allowLateSubmission: false,
    });
    setNewFileType('');
    onClose();
  };

  return (
    <Dialog open={open} onClose={handleClose} maxWidth="sm" fullWidth>
      <DialogTitle>{t('createNewAssignment')}</DialogTitle>
      <form onSubmit={handleSubmit}>
        <DialogContent>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
            <TextField
              label={t('assignmentTitle')}
              name="title"
              value={formData.title}
              onChange={handleChange}
              required
              fullWidth
            />

            <TextField
              label={t('description')}
              name="description"
              value={formData.description}
              onChange={handleChange}
              multiline
              rows={3}
              fullWidth
            />

            <TextField
              label={t('dueDate')}
              name="dueDate"
              type="datetime-local"
              value={formData.dueDate}
              onChange={handleChange}
              required
              fullWidth
              InputLabelProps={{ shrink: true }}
            />

            <TextField
              label={t('maxScore')}
              name="maxScore"
              type="number"
              value={formData.maxScore}
              onChange={handleChange}
              required
              fullWidth
              inputProps={{ min: 1 }}
            />

            <TextField
              label={t('maxFileSizeBytes')}
              name="maxFileSize"
              type="number"
              value={formData.maxFileSize}
              onChange={handleChange}
              required
              fullWidth
              helperText={`${(formData.maxFileSize / 1024 / 1024).toFixed(2)} ${t('megabytes')}`}
              inputProps={{ min: 1024 }}
            />

            <Box>
              <Box sx={{ display: 'flex', gap: 1, mb: 1 }}>
                <TextField
                  label={t('addFileType')}
                  value={newFileType}
                  onChange={(e) => setNewFileType(e.target.value.toLowerCase())}
                  size="small"
                  placeholder={t('examplePdf')}
                />
                <Button onClick={handleAddFileType} variant="outlined">
                  {t('add')}
                </Button>
              </Box>
              <Stack direction="row" spacing={1} flexWrap="wrap">
                {formData.allowedFileTypes.map((type) => (
                  <Chip
                    key={type}
                    label={type}
                    onDelete={() => handleRemoveFileType(type)}
                    color="primary"
                    size="small"
                  />
                ))}
              </Stack>
            </Box>

            <FormControlLabel
              control={
                <Checkbox
                  name="allowLateSubmission"
                  checked={formData.allowLateSubmission}
                  onChange={handleChange}
                />
              }
              label={t('allowLateSubmission')}
            />
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleClose}>{t('cancel')}</Button>
          <Button type="submit" variant="contained" disabled={loading}>
            {loading ? t('creating') : t('create')}
          </Button>
        </DialogActions>
      </form>
    </Dialog>
  );
};

export default CreateAssignmentDialog;
