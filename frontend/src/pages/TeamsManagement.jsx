import { useState, useEffect } from 'react';
import {
  Container,
  Paper,
  Typography,
  Box,
  Button,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  IconButton,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  Chip,
  CircularProgress,
  Alert,
  Autocomplete,
  Avatar,
  Tooltip,
} from '@mui/material';
import {
  Add as AddIcon,
  Edit as EditIcon,
  Delete as DeleteIcon,
  Visibility as VisibilityIcon,
} from '@mui/icons-material';
import { toast } from 'react-toastify';
import api from '../services/api';
import { useAppSettings } from '../context/AppSettingsContext';

/**
 * TeamsManagement Component
 * 
 * Admin interface to create and manage teams.
 * Access: Admin only
 */
const TeamsManagement = () => {
  const { t, language } = useAppSettings();
  const [teams, setTeams] = useState([]);
  const [students, setStudents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [openDialog, setOpenDialog] = useState(false);
  const [editMode, setEditMode] = useState(false);
  const [currentTeam, setCurrentTeam] = useState(null);
  
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    members: []
  });

  useEffect(() => {
    fetchTeams();
    fetchStudents();
  }, []);

  const fetchTeams = async () => {
    try {
      const response = await api.get('/teams');
      setTeams(response.data.data);
      setLoading(false);
    } catch (err) {
      toast.error(err.response?.data?.message || t('failedToFetchTeams'));
      setLoading(false);
    }
  };

  const fetchStudents = async () => {
    try {
      const response = await api.get('/users?role=student');
      // Filter to ensure ONLY students are shown in the selection list
      const studentsOnly = (response.data.data || []).filter(user => user.role === 'student');
      setStudents(studentsOnly);
    } catch (err) {
      console.error('Error fetching students:', err);
    }
  };

  const handleOpenDialog = (team = null) => {
    if (team) {
      setEditMode(true);
      setCurrentTeam(team);
      setFormData({
        name: team.name,
        description: team.description || '',
        members: team.members
      });
    } else {
      setEditMode(false);
      setCurrentTeam(null);
      setFormData({
        name: '',
        description: '',
        members: []
      });
    }
    setOpenDialog(true);
  };

  const handleCloseDialog = () => {
    setOpenDialog(false);
    setEditMode(false);
    setCurrentTeam(null);
    setFormData({
      name: '',
      description: '',
      members: []
    });
  };

  const handleSubmit = async () => {
    try {
      // Validation
      if (!formData.name.trim()) {
        toast.error(t('teamNameRequired'));
        return;
      }

      if (formData.name.trim().length < 3) {
        toast.error(t('teamNameMin3'));
        return;
      }

      if (formData.members.length < 2 || formData.members.length > 4) {
        toast.error(t('membersCount2To4'));
        return;
      }

      const payload = {
        name: formData.name,
        description: formData.description,
        members: formData.members.map(m => m._id)
      };

      if (editMode) {
        await api.put(`/teams/${currentTeam._id}`, payload);
        toast.success(t('teamUpdatedSuccess'));
      } else {
        await api.post('/teams', payload);
        toast.success(t('teamCreatedSuccess'));
      }

      handleCloseDialog();
      fetchTeams();
    } catch (err) {
      toast.error(err.response?.data?.message || t('genericError'));
    }
  };

  const handleDelete = async (teamId) => {
    if (!window.confirm(t('confirmDeleteTeam'))) {
      return;
    }

    try {
      await api.delete(`/teams/${teamId}`);
      toast.success(t('teamDeletedSuccess'));
      fetchTeams();
    } catch (err) {
      toast.error(err.response?.data?.message || t('teamDeleteFailed'));
    }
  };

  if (loading) {
    return (
      <Container maxWidth="lg" sx={{ mt: 4, display: 'flex', justifyContent: 'center' }}>
        <CircularProgress />
      </Container>
    );
  }

  return (
    <Container maxWidth="lg" sx={{ mt: 4, mb: 4 }}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Typography variant="h4">
          {t('teamsManagementTitle')}
        </Typography>
        <Button
          variant="contained"
          startIcon={<AddIcon />}
          onClick={() => handleOpenDialog()}
        >
          {t('createNewTeam')}
        </Button>
      </Box>

      {teams.length === 0 ? (
        <Alert severity="info">{t('noTeamsYetCreateOne')}</Alert>
      ) : (
        <TableContainer component={Paper}>
          <Table>
            <TableHead>
              <TableRow>
                <TableCell><strong>{t('teamName')}</strong></TableCell>
                <TableCell><strong>{t('members')}</strong></TableCell>
                <TableCell><strong>{t('description')}</strong></TableCell>
                <TableCell><strong>{t('creationDate')}</strong></TableCell>
                <TableCell align="center"><strong>{t('actions')}</strong></TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {teams.map((team) => (
                <TableRow key={team._id}>
                  <TableCell>
                    <Typography variant="body1" sx={{ fontWeight: 'bold' }}>
                      {team.name}
                    </Typography>
                  </TableCell>
                  <TableCell>
                    <Box sx={{ display: 'flex', gap: 0.5, flexWrap: 'wrap' }}>
                      {team.members.map((member) => (
                        <Tooltip key={member._id} title={member.email}>
                          <Chip
                            avatar={<Avatar>{member.name.charAt(0)}</Avatar>}
                            label={member.name}
                            size="small"
                            variant="outlined"
                          />
                        </Tooltip>
                      ))}
                    </Box>
                  </TableCell>
                  <TableCell>
                    {team.description ? (
                      <Typography variant="body2" color="text.secondary">
                        {team.description.substring(0, 50)}...
                      </Typography>
                    ) : (
                      <Typography variant="body2" color="text.secondary">-</Typography>
                    )}
                  </TableCell>
                  <TableCell>
                    {new Date(team.createdAt).toLocaleDateString(language === 'en' ? 'en-US' : 'ar-EG')}
                  </TableCell>
                  <TableCell align="center">
                    <IconButton
                      color="primary"
                      onClick={() => handleOpenDialog(team)}
                      size="small"
                    >
                      <EditIcon />
                    </IconButton>
                    <IconButton
                      color="error"
                      onClick={() => handleDelete(team._id)}
                      size="small"
                    >
                      <DeleteIcon />
                    </IconButton>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>
      )}

      {/* Create/Edit Dialog */}
      <Dialog open={openDialog} onClose={handleCloseDialog} maxWidth="sm" fullWidth>
        <DialogTitle>
          {editMode ? t('editTeam') : t('createNewTeam')}
        </DialogTitle>
        <DialogContent>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, mt: 2 }}>
            <TextField
              label={t('teamName')}
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              fullWidth
              required
              error={formData.name.trim().length > 0 && formData.name.trim().length < 3}
              helperText={
                formData.name.trim().length > 0 && formData.name.trim().length < 3
                  ? t('teamNameMin3')
                  : ''
              }
            />

            <TextField
              label={t('descriptionOptional')}
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              fullWidth
              multiline
              rows={2}
            />

            <Autocomplete
              multiple
              options={students}
              getOptionLabel={(option) => `${option.name} (${option.email})`}
              value={formData.members}
              onChange={(e, newValue) => {
                if (newValue.length <= 4) {
                  setFormData({ ...formData, members: newValue });
                }
              }}
              isOptionEqualToValue={(option, value) => option._id === value._id}
              renderInput={(params) => (
                <TextField
                  {...params}
                  label={t('choose2To4Students')}
                  placeholder={t('searchStudent')}
                  required
                />
              )}
              renderTags={(value, getTagProps) =>
                value.map((option, index) => (
                  <Chip
                    label={option.name}
                    {...getTagProps({ index })}
                    avatar={<Avatar>{option.name.charAt(0)}</Avatar>}
                  />
                ))
              }
            />
            
            <Alert severity="info">
              {t('membersSelectionCount', { count: formData.members.length })}
            </Alert>
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseDialog}>{t('cancel')}</Button>
          <Button
            onClick={handleSubmit}
            variant="contained"
            disabled={formData.members.length < 2 || formData.members.length > 4}
          >
            {editMode ? t('update') : t('create')}
          </Button>
        </DialogActions>
      </Dialog>
    </Container>
  );
};

export default TeamsManagement;
