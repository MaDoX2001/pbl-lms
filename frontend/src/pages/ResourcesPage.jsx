import React, { useState, useEffect } from 'react';
import { useSelector } from 'react-redux';
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
import { useAppSettings } from '../context/AppSettingsContext';

const ResourcesPage = () => {
  // Get user from Redux
  const reduxUser = useSelector(state => state.auth?.user);
  const { t, direction } = useAppSettings();
  
  const [resources, setResources] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [uploadDialogOpen, setUploadDialogOpen] = useState(false);
  const [userRole, setUserRole] = useState(null);
  const [filters, setFilters] = useState({
    search: '',
    category: 'all',
    resourceType: 'all',
    difficulty: 'all',
    sort: 'newest'
  });
  const [favorites, setFavorites] = useState([]);

  const categories = [
    { value: 'all', label: t('all') },
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
    'all',
    'image',
    'video',
    'pdf',
    'document',
    'link',
    'other'
  ];

  const difficulties = [
    { value: 'all', label: t('all') },
    { value: t('difficultyBeginnerValue'), label: t('beginner') },
    { value: t('difficultyIntermediateValue'), label: t('intermediate') },
    { value: t('difficultyAdvancedValue'), label: t('advanced') }
  ];

  // Load user role from Redux or localStorage
  useEffect(() => {
    // Try Redux first
    let role = reduxUser?.role;
    
    // Fallback to localStorage
    if (!role) {
      const userData = JSON.parse(localStorage.getItem('user') || '{}');
      role = userData?.role;
    }
    
    setUserRole(role || null);
  }, [reduxUser]);

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
      setError(null);
    } catch (err) {
      console.error('Error fetching resources:', err);
      setError(t('loadResourcesError'));
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
    if (window.confirm(t('confirmDeleteResource'))) {
      try {
        await api.delete(`/resources/support/${resourceId}`);
        setResources(resources.filter(r => r._id !== resourceId));
      } catch (err) {
        console.error('Error deleting resource:', err);
        setError(t('deleteResourceError'));
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
      image: t('typeImage'),
      video: t('typeVideo'),
      pdf: t('typePdf'),
      document: t('typeDocument'),
      link: t('typeLink'),
      other: t('typeOther')
    };
    return labels[type] || type;
  };

  const getCategoryLabel = (category) => {
    const labels = {
      [t('catElectronicsValue')]: t('catElectronics'),
      [t('catProgrammingValue')]: t('catProgramming'),
      [t('catCircuitsValue')]: t('catCircuits'),
      [t('catSimulationValue')]: t('catSimulation'),
      [t('catSmartSystemsValue')]: t('catSmartSystems'),
      [t('catInstructionsValue')]: t('catInstructions'),
      [t('catReferencesValue')]: t('catReferences'),
      [t('catOtherValue')]: t('catOther')
    };
    return labels[category] || category;
  };

  const getDifficultyLabel = (difficulty) => {
    const labels = {
      [t('difficultyBeginnerValue')]: t('beginner'),
      [t('difficultyIntermediateValue')]: t('intermediate'),
      [t('difficultyAdvancedValue')]: t('advanced')
    };
    return labels[difficulty] || difficulty;
  };

  return (
    <Container maxWidth="lg" sx={{ py: 4, direction }}>
      {/* Header */}
      <Box sx={{ mb: 4, textAlign: direction === 'rtl' ? 'right' : 'left' }}>
        <Typography variant="h3" sx={{ mb: 2, fontWeight: 'bold', color: '#1976d2' }}>
          {t('resourcesTitle')}
        </Typography>
        <Typography variant="body1" sx={{ color: '#666', mb: 3 }}>
          {t('resourcesSubtitle')}
        </Typography>
        
        {userRole && (userRole === 'teacher' || userRole === 'admin') && (
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
            📤 {t('uploadNewResource')}
          </Button>
        )}
        {!userRole && <Alert severity="warning">{t('roleNotDetected')}</Alert>}
      </Box>

      {error && <Alert severity="error" sx={{ mb: 3 }}>{error}</Alert>}

      {/* Filters */}
      <Card sx={{ mb: 4, p: 3, backgroundColor: '#f5f5f5' }}>
        <Grid container spacing={2}>
          <Grid item xs={12} sm={6} md={3}>
            <TextField
              fullWidth
              label={t('search')}
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
              label={t('category')}
              value={filters.category}
              onChange={(e) => handleFilterChange('category', e.target.value)}
              size="small"
            >
              {categories.map(cat => (
                <MenuItem key={cat.value} value={cat.value}>
                  {cat.label}
                </MenuItem>
              ))}
            </TextField>
          </Grid>
          <Grid item xs={12} sm={6} md={3}>
            <TextField
              fullWidth
              select
              label={t('difficultyLevel')}
              value={filters.difficulty}
              onChange={(e) => handleFilterChange('difficulty', e.target.value)}
              size="small"
            >
              {difficulties.map(level => (
                <MenuItem key={level.value} value={level.value}>
                  {level.label}
                </MenuItem>
              ))}
            </TextField>
          </Grid>
          <Grid item xs={12} sm={6} md={3}>
            <TextField
              fullWidth
              select
              label={t('resourceType')}
              value={filters.resourceType}
              onChange={(e) => handleFilterChange('resourceType', e.target.value)}
              size="small"
            >
              {resourceTypes.map(type => (
                <MenuItem key={type} value={type}>
                  {type === 'all' ? t('all') : getTypeLabel(type)}
                </MenuItem>
              ))}
            </TextField>
          </Grid>
          <Grid item xs={12} sm={6} md={3}>
            <TextField
              fullWidth
              select
              label={t('sort')}
              value={filters.sort}
              onChange={(e) => handleFilterChange('sort', e.target.value)}
              size="small"
            >
              <MenuItem value="newest">{t('newest')}</MenuItem>
              <MenuItem value="popular">{t('mostViewed')}</MenuItem>
              <MenuItem value="rated">{t('topRated')}</MenuItem>
              <MenuItem value="downloads">{t('mostDownloaded')}</MenuItem>
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
        <Alert severity="info">{t('noResourcesFound')}</Alert>
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
                      label={getCategoryLabel(resource.category)}
                      variant="outlined"
                      color="secondary"
                    />
                    <Chip
                      size="small"
                      label={getDifficultyLabel(resource.difficulty)}
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
                      👁️ {resource.views} {t('viewsCount')} | ⬇️ {resource.downloads} {t('downloadsCount')}
                    </Typography>
                  </Box>

                  {/* Uploader */}
                  <Typography variant="caption" color="textSecondary" sx={{ display: 'block' }}>
                    {t('from')}: {resource.uploadedBy?.name || t('user')}
                  </Typography>
                </CardContent>

                {/* Action Buttons */}
                <Box sx={{ p: 2, borderTop: '1px solid #eee', display: 'flex', gap: 1, flexWrap: 'wrap', justifyContent: 'space-between', alignItems: 'center' }}>
                  <Box sx={{ display: 'flex', gap: 1 }}>
                    {/* View Button */}
                    <Tooltip title={t('view')}>
                      <IconButton
                        size="small"
                        color="info"
                        onClick={() => window.open(resource.fileUrl, '_blank')}
                      >
                        <VisibilityIcon />
                      </IconButton>
                    </Tooltip>

                    {/* Download Button */}
                    <Tooltip title={t('download')}>
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
                      const reduxUserId = reduxUser?.id;
                      const localUser = JSON.parse(localStorage.getItem('user') || '{}');
                      const localUserId = localUser?.id;
                      const userId = reduxUserId || localUserId;
                      const userRole = reduxUser?.role || localUser?.role;
                      
                      const isOwner = userId && resource?.uploadedBy && (
                        userId === resource.uploadedBy._id || 
                        userId === resource.uploadedBy
                      );
                      const isAdmin = userRole === 'admin';
                      
                      if (isOwner || isAdmin) {
                        return (
                          <Tooltip title={t('delete')}>
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
                  <Tooltip title={t('rate')}>
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
