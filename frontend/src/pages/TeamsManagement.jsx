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

/**
 * TeamsManagement Component
 * 
 * Admin interface to create and manage teams.
 * Access: Admin only
 */
const TeamsManagement = () => {
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
      toast.error(err.response?.data?.message || 'حدث خطأ في جلب الفرق');
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
        toast.error('اسم الفريق مطلوب');
        return;
      }

      if (formData.name.trim().length < 3) {
        toast.error('اسم الفريق يجب أن يكون 3 أحرف على الأقل');
        return;
      }

      if (formData.members.length < 2 || formData.members.length > 4) {
        toast.error('يجب اختيار من 2 إلى 4 أعضاء');
        return;
      }

      const payload = {
        name: formData.name,
        description: formData.description,
        members: formData.members.map(m => m._id)
      };

      if (editMode) {
        await api.put(`/teams/${currentTeam._id}`, payload);
        toast.success('تم تحديث الفريق بنجاح');
      } else {
        await api.post('/teams', payload);
        toast.success('تم إنشاء الفريق بنجاح');
      }

      handleCloseDialog();
      fetchTeams();
    } catch (err) {
      toast.error(err.response?.data?.message || 'حدث خطأ');
    }
  };

  const handleDelete = async (teamId) => {
    if (!window.confirm('هل أنت متأكد من حذف هذا الفريق؟')) {
      return;
    }

    try {
      await api.delete(`/teams/${teamId}`);
      toast.success('تم حذف الفريق بنجاح');
      fetchTeams();
    } catch (err) {
      toast.error(err.response?.data?.message || 'حدث خطأ في حذف الفريق');
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
          إدارة الفرق
        </Typography>
        <Button
          variant="contained"
          startIcon={<AddIcon />}
          onClick={() => handleOpenDialog()}
        >
          إنشاء فريق جديد
        </Button>
      </Box>

      {teams.length === 0 ? (
        <Alert severity="info">لا توجد فرق بعد. قم بإنشاء فريق جديد.</Alert>
      ) : (
        <TableContainer component={Paper}>
          <Table>
            <TableHead>
              <TableRow>
                <TableCell><strong>اسم الفريق</strong></TableCell>
                <TableCell><strong>الأعضاء</strong></TableCell>
                <TableCell><strong>الوصف</strong></TableCell>
                <TableCell><strong>تاريخ الإنشاء</strong></TableCell>
                <TableCell align="center"><strong>الإجراءات</strong></TableCell>
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
                    {new Date(team.createdAt).toLocaleDateString('ar-EG')}
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
          {editMode ? 'تعديل الفريق' : 'إنشاء فريق جديد'}
        </DialogTitle>
        <DialogContent>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, mt: 2 }}>
            <TextField
              label="اسم الفريق"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              fullWidth
              required
              error={formData.name.trim().length > 0 && formData.name.trim().length < 3}
              helperText={
                formData.name.trim().length > 0 && formData.name.trim().length < 3
                  ? 'اسم الفريق يجب أن يكون 3 أحرف على الأقل'
                  : ''
              }
            />

            <TextField
              label="الوصف (اختياري)"
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
                  label="اختر من 2 إلى 4 طلاب"
                  placeholder="ابحث عن طالب..."
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
              يجب اختيار من 2 إلى 4 أعضاء. عدد الأعضاء المختارين: {formData.members.length}
            </Alert>
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseDialog}>إلغاء</Button>
          <Button
            onClick={handleSubmit}
            variant="contained"
            disabled={formData.members.length < 2 || formData.members.length > 4}
          >
            {editMode ? 'تحديث' : 'إنشاء'}
          </Button>
        </DialogActions>
      </Dialog>
    </Container>
  );
};

export default TeamsManagement;
