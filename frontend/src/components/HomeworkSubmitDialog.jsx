import { useState } from 'react';
import {
  Box,
  Button,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  Typography,
  LinearProgress,
  Alert,
  IconButton,
  Chip
} from '@mui/material';
import {
  CloudUpload,
  Close as CloseIcon,
  InsertDriveFile
} from '@mui/icons-material';
import { toast } from 'react-toastify';
import api from '../services/api';

const HomeworkSubmitDialog = ({ open, onClose, projectId, assignment, onSuccess }) => {
  const [file, setFile] = useState(null);
  const [fileTitle, setFileTitle] = useState('');
  const [comments, setComments] = useState('');
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [error, setError] = useState('');

  const handleFileChange = (event) => {
    const selectedFile = event.target.files[0];
    if (selectedFile) {
      // Check file size
      if (selectedFile.size > assignment.maxFileSize) {
        setError(
          `حجم الملف يتجاوز الحد المسموح (${(
            assignment.maxFileSize /
            1024 /
            1024
          ).toFixed(2)} MB)`
        );
        return;
      }

      // Check file type
      const ext = selectedFile.name.split('.').pop().toLowerCase();
      if (!assignment.allowedFileTypes.includes(ext)) {
        setError(
          `نوع الملف غير مسموح. الأنواع المسموحة: ${assignment.allowedFileTypes.join(
            ', '
          )}`
        );
        return;
      }

      setFile(selectedFile);
      setFileTitle(selectedFile.name);
      setError('');
    }
  };

  const handleSubmit = async () => {
    if (!file) {
      setError('يرجى اختيار ملف');
      return;
    }

    if (!fileTitle.trim()) {
      setError('يرجى إدخال عنوان للملف');
      return;
    }

    try {
      setUploading(true);
      setError('');

      const formData = new FormData();
      formData.append('file', file);
      formData.append('fileTitle', fileTitle);
      formData.append('comments', comments);

      const response = await api.post(
        `/submissions/projects/${projectId}/assignments/${assignment._id}/submit`,
        formData,
        {
          headers: {
            'Content-Type': 'multipart/form-data'
          },
          onUploadProgress: (progressEvent) => {
            const percentCompleted = Math.round(
              (progressEvent.loaded * 100) / progressEvent.total
            );
            setUploadProgress(percentCompleted);
          }
        }
      );

      toast.success('تم تسليم الواجب بنجاح');
      onSuccess(response.data.submission);
      handleClose();
    } catch (error) {
      console.error('Error submitting homework:', error);
      setError(error.response?.data?.message || 'فشل تسليم الواجب');
      toast.error(error.response?.data?.message || 'فشل تسليم الواجب');
    } finally {
      setUploading(false);
      setUploadProgress(0);
    }
  };

  const handleClose = () => {
    if (!uploading) {
      setFile(null);
      setFileTitle('');
      setComments('');
      setError('');
      setUploadProgress(0);
      onClose();
    }
  };

  // Check if assignment is overdue
  const isOverdue = assignment?.dueDate && new Date() > new Date(assignment.dueDate);

  return (
    <Dialog open={open} onClose={handleClose} maxWidth="sm" fullWidth>
      <DialogTitle>
        <Box display="flex" justifyContent="space-between" alignItems="center">
          تسليم الواجب: {assignment?.title}
          <IconButton onClick={handleClose} disabled={uploading}>
            <CloseIcon />
          </IconButton>
        </Box>
      </DialogTitle>
      <DialogContent>
        {error && (
          <Alert severity="error" sx={{ mb: 2 }}>
            {error}
          </Alert>
        )}

        {isOverdue && !assignment.allowLateSubmission && (
          <Alert severity="warning" sx={{ mb: 2 }}>
            انتهى موعد تسليم الواجب. لا يمكن التسليم بعد الآن.
          </Alert>
        )}

        {isOverdue && assignment.allowLateSubmission && (
          <Alert severity="info" sx={{ mb: 2 }}>
            التسليم متأخر. سيتم وضع علامة على هذا التسليم كمتأخر.
          </Alert>
        )}

        <Box sx={{ mb: 2 }}>
          <Typography variant="body2" color="text.secondary">
            <strong>آخر موعد للتسليم:</strong>{' '}
            {assignment?.dueDate
              ? new Date(assignment.dueDate).toLocaleDateString('ar-SA')
              : 'غير محدد'}
          </Typography>
          <Typography variant="body2" color="text.secondary">
            <strong>الدرجة القصوى:</strong> {assignment?.maxScore || 100}
          </Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
            <strong>الأنواع المسموحة:</strong>{' '}
            {assignment?.allowedFileTypes?.map((type) => (
              <Chip key={type} label={type} size="small" sx={{ mr: 0.5 }} />
            ))}
          </Typography>
          <Typography variant="body2" color="text.secondary">
            <strong>الحد الأقصى للحجم:</strong>{' '}
            {((assignment?.maxFileSize || 10485760) / 1024 / 1024).toFixed(2)} MB
          </Typography>
        </Box>

        {(!isOverdue || assignment.allowLateSubmission) && (
          <Box sx={{ mt: 2 }}>
            <input
              accept={assignment?.allowedFileTypes
                ?.map((ext) => `.${ext}`)
                .join(',')}
              style={{ display: 'none' }}
              id="homework-upload"
              type="file"
              onChange={handleFileChange}
              disabled={uploading}
            />
            <label htmlFor="homework-upload">
              <Button
                variant="outlined"
                component="span"
                startIcon={<CloudUpload />}
                fullWidth
                disabled={uploading}
                sx={{ mb: 2, py: 2 }}
              >
                {file ? 'تغيير الملف' : 'اختر ملف'}
              </Button>
            </label>

            {file && (
              <Box
                sx={{
                  p: 2,
                  border: '1px solid',
                  borderColor: 'divider',
                  borderRadius: 1,
                  mb: 2,
                  display: 'flex',
                  alignItems: 'center',
                  gap: 1
                }}
              >
                <InsertDriveFile color="primary" />
                <Box flex={1}>
                  <Typography variant="body2" noWrap>
                    {file.name}
                  </Typography>
                  <Typography variant="caption" color="text.secondary">
                    {(file.size / 1024 / 1024).toFixed(2)} MB
                  </Typography>
                </Box>
              </Box>
            )}

            <TextField
              fullWidth
              label="عنوان التسليم"
              value={fileTitle}
              onChange={(e) => setFileTitle(e.target.value)}
              disabled={uploading}
              sx={{ mb: 2 }}
              required
            />

            <TextField
              fullWidth
              label="ملاحظات (اختياري)"
              value={comments}
              onChange={(e) => setComments(e.target.value)}
              disabled={uploading}
              multiline
              rows={3}
              sx={{ mb: 2 }}
              placeholder="أضف أي ملاحظات أو تعليقات حول واجبك..."
            />

            {uploading && (
              <Box sx={{ mt: 2 }}>
                <Typography variant="body2" color="text.secondary" gutterBottom>
                  جاري التحميل... {uploadProgress}%
                </Typography>
                <LinearProgress variant="determinate" value={uploadProgress} />
              </Box>
            )}
          </Box>
        )}
      </DialogContent>
      <DialogActions>
        <Button onClick={handleClose} disabled={uploading}>
          إلغاء
        </Button>
        {(!isOverdue || assignment.allowLateSubmission) && (
          <Button
            onClick={handleSubmit}
            variant="contained"
            disabled={uploading || !file}
          >
            {uploading ? 'جاري التسليم...' : 'تسليم'}
          </Button>
        )}
      </DialogActions>
    </Dialog>
  );
};

export default HomeworkSubmitDialog;
