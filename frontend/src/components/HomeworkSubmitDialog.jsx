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
import { useAppSettings } from '../context/AppSettingsContext';

const HomeworkSubmitDialog = ({ open, onClose, projectId, assignment, onSuccess }) => {
  const { t, language } = useAppSettings();
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
          `${t('fileSizeExceedsLimit')} (${(
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
          `${t('fileTypeNotAllowed')}. ${t('allowedTypes')}: ${assignment.allowedFileTypes.join(
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
      setError(t('pleaseChooseFile'));
      return;
    }

    if (!fileTitle.trim()) {
      setError(t('pleaseEnterFileTitle'));
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

      toast.success(t('homeworkSubmittedSuccess'));
      onSuccess(response.data.submission);
      handleClose();
    } catch (error) {
      console.error('Error submitting homework:', error);
      setError(error.response?.data?.message || t('homeworkSubmitFailed'));
      toast.error(error.response?.data?.message || t('homeworkSubmitFailed'));
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
          {t('submitHomework')}: {assignment?.title}
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
            {t('assignmentDeadlinePassedNoSubmit')}
          </Alert>
        )}

        {isOverdue && assignment.allowLateSubmission && (
          <Alert severity="info" sx={{ mb: 2 }}>
            {t('lateSubmissionWillBeMarked')}
          </Alert>
        )}

        <Box sx={{ mb: 2 }}>
          <Typography variant="body2" color="text.secondary">
            <strong>{t('latestSubmissionDateLabel')}</strong>{' '}
            {assignment?.dueDate
              ? new Date(assignment.dueDate).toLocaleDateString(language === 'en' ? 'en-US' : 'ar-SA')
              : t('notSpecified')}
          </Typography>
          <Typography variant="body2" color="text.secondary">
            <strong>{t('maximumScoreLabel')}</strong> {assignment?.maxScore || 100}
          </Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
            <strong>{t('allowedTypesLabel')}</strong>{' '}
            {assignment?.allowedFileTypes?.map((type) => (
              <Chip key={type} label={type} size="small" sx={{ mr: 0.5 }} />
            ))}
          </Typography>
          <Typography variant="body2" color="text.secondary">
            <strong>{t('maximumSizeLabel')}</strong>{' '}
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
                {file ? t('changeFile') : t('chooseFile')}
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
              label={t('submissionTitle')}
              value={fileTitle}
              onChange={(e) => setFileTitle(e.target.value)}
              disabled={uploading}
              sx={{ mb: 2 }}
              required
            />

            <TextField
              fullWidth
              label={t('notesOptional')}
              value={comments}
              onChange={(e) => setComments(e.target.value)}
              disabled={uploading}
              multiline
              rows={3}
              sx={{ mb: 2 }}
              placeholder={t('homeworkNotesPlaceholder')}
            />

            {uploading && (
              <Box sx={{ mt: 2 }}>
                <Typography variant="body2" color="text.secondary" gutterBottom>
                  {t('uploading')} {uploadProgress}%
                </Typography>
                <LinearProgress variant="determinate" value={uploadProgress} />
              </Box>
            )}
          </Box>
        )}
      </DialogContent>
      <DialogActions>
        <Button onClick={handleClose} disabled={uploading}>
          {t('cancel')}
        </Button>
        {(!isOverdue || assignment.allowLateSubmission) && (
          <Button
            onClick={handleSubmit}
            variant="contained"
            disabled={uploading || !file}
          >
            {uploading ? t('submitting') : t('submit')}
          </Button>
        )}
      </DialogActions>
    </Dialog>
  );
};

export default HomeworkSubmitDialog;
