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

const CreateAssignmentDialog = ({ open, onClose, projectId, onSuccess }) => {
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
      toast.success('تم إنشاء المهمة بنجاح');
      onSuccess();
      handleClose();
    } catch (error) {
      toast.error(error.response?.data?.message || 'حدث خطأ أثناء إنشاء المهمة');
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
      <DialogTitle>إنشاء مهمة جديدة</DialogTitle>
      <form onSubmit={handleSubmit}>
        <DialogContent>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
            <TextField
              label="عنوان المهمة"
              name="title"
              value={formData.title}
              onChange={handleChange}
              required
              fullWidth
            />

            <TextField
              label="الوصف"
              name="description"
              value={formData.description}
              onChange={handleChange}
              multiline
              rows={3}
              fullWidth
            />

            <TextField
              label="تاريخ التسليم"
              name="dueDate"
              type="datetime-local"
              value={formData.dueDate}
              onChange={handleChange}
              required
              fullWidth
              InputLabelProps={{ shrink: true }}
            />

            <TextField
              label="الدرجة القصوى"
              name="maxScore"
              type="number"
              value={formData.maxScore}
              onChange={handleChange}
              required
              fullWidth
              inputProps={{ min: 1 }}
            />

            <TextField
              label="الحد الأقصى لحجم الملف (بايت)"
              name="maxFileSize"
              type="number"
              value={formData.maxFileSize}
              onChange={handleChange}
              required
              fullWidth
              helperText={`${(formData.maxFileSize / 1024 / 1024).toFixed(2)} ميجابايت`}
              inputProps={{ min: 1024 }}
            />

            <Box>
              <Box sx={{ display: 'flex', gap: 1, mb: 1 }}>
                <TextField
                  label="إضافة نوع ملف"
                  value={newFileType}
                  onChange={(e) => setNewFileType(e.target.value.toLowerCase())}
                  size="small"
                  placeholder="مثال: pdf"
                />
                <Button onClick={handleAddFileType} variant="outlined">
                  إضافة
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
              label="السماح بالتسليم المتأخر"
            />
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleClose}>إلغاء</Button>
          <Button type="submit" variant="contained" disabled={loading}>
            {loading ? 'جاري الإنشاء...' : 'إنشاء'}
          </Button>
        </DialogActions>
      </form>
    </Dialog>
  );
};

export default CreateAssignmentDialog;
