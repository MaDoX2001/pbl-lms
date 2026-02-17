import React, { useState, useEffect } from 'react';
import {
  Container,
  Grid,
  Card,
  CardContent,
  Typography,
  Button,
  Box,
  Chip,
  TextField,
  MenuItem,
  CircularProgress,
  Rating,
  IconButton,
  Tooltip,
  Alert
} from '@mui/material';
import {
  Download as DownloadIcon,
  Delete as DeleteIcon,
  CloudUpload as CloudUploadIcon,
  Search as SearchIcon,
  Visibility as VisibilityIcon
} from '@mui/icons-material';
import api from '../services/api';
import SupportResourceUploadDialog from '../components/SupportResourceUploadDialog';

const ResourcesPage = () => {
  const [resources, setResources] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [uploadDialogOpen, setUploadDialogOpen] = useState(false);
  const [filters, setFilters] = useState({
    search: '',
    category: 'all',
    resourceType: 'all',
    difficulty: 'all',
    sort: 'newest'
  });
  const [favorites, setFavorites] = useState([]);
  const [userRole, setUserRole] = useState(null);

  const categories = [
    'all',
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
    'all',
    'image',
    'video',
    'pdf',
    'document',
    'link',
    'other'
  ];

  const difficulties = ['all', 'مبتدئ', 'متوسط', 'متقدم'];

  // Load user role once when component mounts
  useEffect(() => {
    const userData = JSON.parse(localStorage.getItem('user') || '{}');
    console.log('User data from localStorage:', userData);
    setUserRole(userData.role || null);
  }, []);

  // Fetch resources when filters change
  useEffect(() => {
    fetchResources();
  }, [filters]);

  const fetchResources = async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams();
      
      if (filters.search) params.append('search', filters.search);
      if (filters.category !== 'all') params.append('category', filters.category);
      if (filters.resourceType !== 'all') params.append('resourceType', filters.resourceType);
      if (filters.difficulty !== 'all') params.append('difficulty', filters.difficulty);
      if (filters.sort !== 'newest') params.append('sort', filters.sort);

      const response = await api.get(`/resources/support?${params.toString()}`);
      setResources(response.data.data || []);
      console.log('Resources fetched:', response.data.data);
      setError(null);
    } catch (err) {
      console.error('Error fetching resources:', err);
      setError('حدث خطأ في تحميل المصادر');
    } finally {
      setLoading(false);
    }
  };

  const handleSearch = (e) => {
    setFilters({ ...filters, search: e.target.value });
  };

  const handleFilterChange = (key, value) => {
    setFilters({ ...filters, [key]: value });
  };

  const handleDelete = async (resourceId) => {
    if (window.confirm('هل أنت متأكد من حذف هذا المصدر؟')) {
      try {
        await api.delete(`/resources/support/${resourceId}`);
        setResources(resources.filter(r => r._id !== resourceId));
      } catch (err) {
        console.error('Error deleting resource:', err);
        setError('خطأ في حذف المصدر');
      }
    }
  };

  const handleDownload = async (resource) => {
    try {
      // Update download count in backend
      await api.put(`/resources/support/${resource._id}/download`);
      // Redirect to file
      window.open(resource.fileUrl, '_blank');
    } catch (err) {
      console.error('Error recording download:', err);
    }
  };

  const handleRate = async (resourceId, rating) => {
    try {
      await api.put(`/resources/support/${resourceId}/rate`, { rating });
      // Refresh resources
      fetchResources();
    } catch (err) {
      console.error('Error rating resource:', err);
    }
  };

  const getResourceIcon = (type) => {
    switch (type) {
      case 'video': return '🎥';
      case 'pdf': return '📄';
      case 'image': return '🖼️';
      case 'document': return '📋';
      case 'link': return '🔗';
      default: return '📎';
    }
  };

  const getTypeLabel = (type) => {
    const labels = {
      image: 'صورة',
      video: 'فيديو',
      pdf: 'ملف PDF',
      document: 'مستند',
      link: 'رابط خارجي',
      other: 'ملف آخر'
    };
    return labels[type] || type;
  };

  return (
    <Container maxWidth="lg" sx={{ py: 4, direction: 'rtl' }}>
      {/* Header */}
      <Box sx={{ mb: 4, textAlign: 'right' }}>
        <Typography variant="h3" sx={{ mb: 2, fontWeight: 'bold', color: '#1976d2' }}>
          المصادر التعليمية الداعمة
        </Typography>
        <Typography variant="body1" sx={{ color: '#666', mb: 3 }}>
          اطلع على مكتبتنا من المصادر التعليمية. يمكنك البحث، التصفية، والتقييم، وتحميل المصادر
        </Typography>
        
        {(() => {
          const userData = JSON.parse(localStorage.getItem('user') || '{}');
          const role = userData?.role;
          if (role === 'teacher' || role === 'admin') {
            return (
              <Button
                variant="contained"
                startIcon={<CloudUploadIcon />}
                onClick={() => setUploadDialogOpen(true)}
                sx={{ 
                  backgroundColor: '#4caf50',
                  color: 'white',
                  fontWeight: 'bold',
                  '&:hover': { backgroundColor: '#388e3c' },
                  px: 3,
                  py: 1.5
                }}
                size="large"
              >
                📤 رفع مصدر جديد
              </Button>
            );
          }
          return null;
        })()}
      </Box>

      {error && <Alert severity="error" sx={{ mb: 3 }}>{error}</Alert>}

      {/* Filters */}
      <Card sx={{ mb: 4, p: 3, backgroundColor: '#f5f5f5' }}>
        <Grid container spacing={2}>
          <Grid item xs={12} sm={6} md={3}>
            <TextField
              fullWidth
              label="البحث"
              variant="outlined"
              startAdornment={<SearchIcon sx={{ mr: 1 }} />}
              value={filters.search}
              onChange={handleSearch}
              size="small"
              InputProps={{ style: { textAlign: 'right' } }}
            />
          </Grid>
          <Grid item xs={12} sm={6} md={3}>
            <TextField
              fullWidth
              select
              label="الفئة"
              value={filters.category}
              onChange={(e) => handleFilterChange('category', e.target.value)}
              size="small"
            >
              {categories.map(cat => (
                <MenuItem key={cat} value={cat}>
                  {cat === 'all' ? 'الكل' : cat}
                </MenuItem>
              ))}
            </TextField>
          </Grid>
          <Grid item xs={12} sm={6} md={3}>
            <TextField
              fullWidth
              select
              label="نوع المصدر"
              value={filters.resourceType}
              onChange={(e) => handleFilterChange('resourceType', e.target.value)}
              size="small"
            >
              {resourceTypes.map(type => (
                <MenuItem key={type} value={type}>
                  {type === 'all' ? 'الكل' : getTypeLabel(type)}
                </MenuItem>
              ))}
            </TextField>
          </Grid>
          <Grid item xs={12} sm={6} md={3}>
            <TextField
              fullWidth
              select
              label="الترتيب"
              value={filters.sort}
              onChange={(e) => handleFilterChange('sort', e.target.value)}
              size="small"
            >
              <MenuItem value="newest">الأحدث</MenuItem>
              <MenuItem value="popular">الأكثر مشاهدة</MenuItem>
              <MenuItem value="rated">الأعلى تقييماً</MenuItem>
              <MenuItem value="downloads">الأكثر تنزيلاً</MenuItem>
            </TextField>
          </Grid>
        </Grid>
      </Card>

      {/* Resources Grid */}
      {loading ? (
        <Box sx={{ display: 'flex', justifyContent: 'center', py: 8 }}>
          <CircularProgress />
        </Box>
      ) : resources.length === 0 ? (
        <Alert severity="info">لا توجد مصادر متطابقة مع معايير البحث</Alert>
      ) : (
        <Grid container spacing={3}>
          {resources.map(resource => (
            <Grid item xs={12} sm={6} md={4} key={resource._id}>
              <Card
                sx={{
                  height: '100%',
                  display: 'flex',
                  flexDirection: 'column',
                  transition: 'transform 0.3s, box-shadow 0.3s',
                  '&:hover': {
                    transform: 'translateY(-8px)',
                    boxShadow: 6
                  }
                }}
              >
                {/* Header with Icon */}
                <Box
                  sx={{
                    height: 120,
                    background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: '48px'
                  }}
                >
                  {getResourceIcon(resource.resourceType)}
                </Box>

                <CardContent sx={{ flexGrow: 1, textAlign: 'right' }}>
                  <Typography variant="h6" sx={{ mb: 1, fontWeight: 'bold' }}>
                    {resource.title}
                  </Typography>

                  <Typography variant="body2" color="textSecondary" sx={{ mb: 2 }}>
                    {resource.description}
                  </Typography>

                  {/* Type and Category Chips */}
                  <Box sx={{ mb: 2, display: 'flex', gap: 1, flexWrap: 'wrap', justifyContent: 'flex-end' }}>
                    <Chip
                      size="small"
                      label={getTypeLabel(resource.resourceType)}
                      variant="outlined"
                      color="primary"
                    />
                    <Chip
                      size="small"
                      label={resource.category}
                      variant="outlined"
                      color="secondary"
                    />
                    <Chip
                      size="small"
                      label={resource.difficulty}
                      variant="outlined"
                    />
                  </Box>

                  {/* Rating and Stats */}
                  <Box sx={{ mb: 2 }}>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, justifyContent: 'flex-end' }}>
                      <Rating
                        value={resource.rating.average}
                        readOnly
                        size="small"
                      />
                      <Typography variant="caption" color="textSecondary">
                        ({resource.rating.count})
                      </Typography>
                    </Box>
                    <Typography variant="caption" color="textSecondary" sx={{ display: 'block', mt: 1 }}>
                      👁️ {resource.views} مشاهدة | ⬇️ {resource.downloads} تنزيل
                    </Typography>
                  </Box>

                  {/* Uploader */}
                  <Typography variant="caption" color="textSecondary" sx={{ display: 'block' }}>
                    من: {resource.uploadedBy?.name || 'مستخدم'}
                  </Typography>
                </CardContent>

                {/* Action Buttons */}
                <Box sx={{ p: 2, borderTop: '1px solid #eee', display: 'flex', gap: 1, flexWrap: 'wrap', justifyContent: 'space-between', alignItems: 'center' }}>
                  <Box sx={{ display: 'flex', gap: 1 }}>
                    {/* View Button */}
                    <Tooltip title="عرض">
                      <IconButton
                        size="small"
                        color="info"
                        onClick={() => window.open(resource.fileUrl, '_blank')}
                      >
                        <VisibilityIcon />
                      </IconButton>
                    </Tooltip>

                    {/* Download Button */}
                    <Tooltip title="تحميل">
                      <IconButton
                        size="small"
                        color="primary"
                        onClick={() => handleDownload(resource)}
                      >
                        <DownloadIcon />
                      </IconButton>
                    </Tooltip>

                    {/* Delete Button - Only for owner or admin */}
                    {(() => {
                      const user = JSON.parse(localStorage.getItem('user') || '{}');
                      const isOwner = user?.id && resource?.uploadedBy && (
                        user.id === resource.uploadedBy._id || 
                        user.id === resource.uploadedBy
                      );
                      const isAdmin = user?.role === 'admin';
                      console.log('Delete check - User:', user, 'Resource uploaded by:', resource?.uploadedBy, 'isOwner:', isOwner, 'isAdmin:', isAdmin);
                      
                      if (isOwner || isAdmin) {
                        return (
                          <Tooltip title="حذف">
                            <IconButton
                              size="small"
                              color="error"
                              onClick={() => handleDelete(resource._id)}
                            >
                              <DeleteIcon />
                            </IconButton>
                          </Tooltip>
                        );
                      }
                      return null;
                    })()}
                  </Box>

                  {/* Rating */}
                  <Tooltip title="تقييم">
                    <Rating
                      size="small"
                      onChange={(_, value) => handleRate(resource._id, value)}
                    />
                  </Tooltip>
                </Box>
              </Card>
            </Grid>
          ))}
        </Grid>
      )}

      {/* Upload Dialog */}
      <SupportResourceUploadDialog
        open={uploadDialogOpen}
        onClose={() => setUploadDialogOpen(false)}
        onSuccess={() => {
          setUploadDialogOpen(false);
          fetchResources();
        }}
      />
    </Container>
  );
};

export default ResourcesPage;
