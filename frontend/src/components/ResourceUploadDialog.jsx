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
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  IconButton
} from '@mui/material';
import {
  CloudUpload,
  Close as CloseIcon,
  InsertDriveFile
} from '@mui/icons-material';
import { toast } from 'react-toastify';
import api from '../services/api';
import { useAppSettings } from '../context/AppSettingsContext';

const ResourceUploadDialog = ({ open, onClose, projectId, onSuccess }) => {
  const { t } = useAppSettings();
  const [file, setFile] = useState(null);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [fileType, setFileType] = useState('');
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [error, setError] = useState('');

  const handleFileChange = (event) => {
    const selectedFile = event.target.files[0];
    if (selectedFile) {
      // Check file size (max 100MB)
      if (selectedFile.size > 100 * 1024 * 1024) {
        setError(t('fileSizeExceeds100MB'));
        return;
      }
      setFile(selectedFile);
      setTitle(selectedFile.name);
      setError('');
      
      // Auto-detect file type
      const ext = selectedFile.name.split('.').pop().toLowerCase();
      if (['mp4', 'avi', 'mov', 'wmv'].includes(ext)) setFileType('video');
      else if (ext === 'pdf') setFileType('pdf');
      else if (['doc', 'docx', 'txt'].includes(ext)) setFileType('document');
      else if (['jpg', 'jpeg', 'png', 'gif'].includes(ext)) setFileType('image');
      else if (['zip', 'rar'].includes(ext)) setFileType('zip');
      else setFileType('other');
    }
  };

  const handleSubmit = async () => {
    if (!file) {
      setError(t('pleaseChooseFile'));
      return;
    }

    if (!title.trim()) {
      setError(t('pleaseEnterFileTitle'));
      return;
    }

    try {
      setUploading(true);
      setError('');

      const formData = new FormData();
      formData.append('file', file);
      formData.append('title', title);
      formData.append('description', description);
      formData.append('fileType', fileType);

      const response = await api.post(
        `/resources/${projectId}/materials`,
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

      toast.success(t('fileUploadedSuccessfully'));
      onSuccess(response.data.material);
      handleClose();
    } catch (error) {
      console.error('Error uploading file:', error);
      setError(error.response?.data?.message || t('fileUploadFailed'));
      toast.error(error.response?.data?.message || t('fileUploadFailed'));
    } finally {
      setUploading(false);
      setUploadProgress(0);
    }
  };

  const handleClose = () => {
    if (!uploading) {
      setFile(null);
      setTitle('');
      setDescription('');
      setFileType('');
      setError('');
      setUploadProgress(0);
      onClose();
    }
  };

  return (
    <Dialog open={open} onClose={handleClose} maxWidth="sm" fullWidth>
      <DialogTitle>
        <Box display="flex" justifyContent="space-between" alignItems="center">
          {t('uploadMaterial')}
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

        <Box sx={{ mt: 2 }}>
          <input
            accept="*/*"
            style={{ display: 'none' }}
            id="file-upload"
            type="file"
            onChange={handleFileChange}
            disabled={uploading}
          />
          <label htmlFor="file-upload">
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
            label={t('fileTitle')}
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            disabled={uploading}
            sx={{ mb: 2 }}
            required
          />

          <TextField
            fullWidth
            label={t('fileDescriptionOptional')}
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            disabled={uploading}
            multiline
            rows={3}
            sx={{ mb: 2 }}
          />

          <FormControl fullWidth sx={{ mb: 2 }}>
            <InputLabel>{t('fileType')}</InputLabel>
            <Select
              value={fileType}
              onChange={(e) => setFileType(e.target.value)}
              disabled={uploading}
              label={t('fileType')}
            >
              <MenuItem value="video">{t('typeVideo')}</MenuItem>
              <MenuItem value="pdf">PDF</MenuItem>
              <MenuItem value="document">{t('typeDocument')}</MenuItem>
              <MenuItem value="image">{t('typeImage')}</MenuItem>
              <MenuItem value="zip">{t('compressedFile')}</MenuItem>
              <MenuItem value="other">{t('catOther')}</MenuItem>
            </Select>
          </FormControl>

          {uploading && (
            <Box sx={{ mt: 2 }}>
              <Typography variant="body2" color="text.secondary" gutterBottom>
                {t('uploading')} {uploadProgress}%
              </Typography>
              <LinearProgress variant="determinate" value={uploadProgress} />
            </Box>
          )}
        </Box>
      </DialogContent>
      <DialogActions>
        <Button onClick={handleClose} disabled={uploading}>
          {t('cancel')}
        </Button>
        <Button
          onClick={handleSubmit}
          variant="contained"
          disabled={uploading || !file}
        >
          {uploading ? t('uploading') : t('upload')}
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default ResourceUploadDialog;
