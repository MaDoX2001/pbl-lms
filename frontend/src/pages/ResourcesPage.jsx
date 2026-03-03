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
  Alert,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions
} from '@mui/material';
import {
  Download as DownloadIcon,
  Delete as DeleteIcon,
  CloudUpload as CloudUploadIcon,
  Search as SearchIcon,
  Visibility as VisibilityIcon,
  AddPhotoAlternate as AddPhotoIcon,
  PlayCircle as PlayCircleIcon,
  Close as CloseIcon
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
  // id of the resource currently having its thumbnail updated (for loading state)
  const [updatingThumbFor, setUpdatingThumbFor] = useState(null);
  const thumbnailInputRef = React.useRef(null);
  const targetResourceIdRef = React.useRef(null);
  // video player popup
  const [videoPlayer, setVideoPlayer] = useState({ open: false, resource: null });

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

  // ── Video player helpers ─────────────────────────────────────────────────
  const getYouTubeEmbedUrl = (url) => {
    try {
      const u = new URL(url);
      // youtu.be/ID  or  youtube.com/watch?v=ID  or  youtube.com/embed/ID
      let id = null;
      if (u.hostname === 'youtu.be') id = u.pathname.slice(1);
      else if (u.hostname.includes('youtube.com')) {
        id = u.searchParams.get('v') || u.pathname.split('/').pop();
      }
      if (id) return `https://www.youtube.com/embed/${id}?autoplay=1`;
    } catch (_) {}
    return null;
  };

  const isEmbeddableLink = (url) =>
    getYouTubeEmbedUrl(url) !== null ||
    url.includes('vimeo.com') ||
    url.includes('dailymotion.com');

  const getEmbedUrl = (url) => {
    const yt = getYouTubeEmbedUrl(url);
    if (yt) return yt;
    if (url.includes('vimeo.com')) {
      const id = url.split('/').pop();
      return `https://player.vimeo.com/video/${id}?autoplay=1`;
    }
    return url;
  };

  const canPlayInline = (resource) =>
    resource.resourceType === 'video' ||
    (resource.resourceType === 'link' && isEmbeddableLink(resource.fileUrl));
  // ────────────────────────────────────────────────────────────────────────

  const handleRate = async (resourceId, rating) => {    try {
      await api.put(`/resources/support/${resourceId}/rate`, { rating });
      // Refresh resources
      fetchResources();
    } catch (err) {
      console.error('Error rating resource:', err);
    }
  };

  const handleUpdateThumbnail = (resourceId) => {
    targetResourceIdRef.current = resourceId;
    thumbnailInputRef.current?.click();
  };

  const handleThumbnailFileChange = async (e) => {
    const file = e.target.files[0];
    e.target.value = '';
    if (!file || !targetResourceIdRef.current) return;

    const resourceId = targetResourceIdRef.current;
    setUpdatingThumbFor(resourceId);
    try {
      const formData = new FormData();
      formData.append('thumbnail', file);
      await api.put(`/resources/support/${resourceId}/thumbnail`, formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });
      fetchResources();
    } catch (err) {
      console.error('Error updating thumbnail:', err);
      setError(t('deleteResourceError'));
    } finally {
      setUpdatingThumbFor(null);
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
    // dir={direction} mirrors what AppSettingsContext already sets on <html>.
    // It is kept here as a safeguard for any MUI portal children that do not
    // inherit the root dir attribute. The actual CSS flipping (padding, margin,
    // borders, icons) is handled globally by stylis-plugin-rtl via the Emotion
    // RTL cache configured in main.jsx — no local overrides needed.
    <Container
      maxWidth="lg"
      dir={direction}
      sx={{ py: 4 }}
    >
      {/* Header */}
      <Box sx={{ mb: 4 }}>
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
          {/* Search */}
          <Grid item xs={12} sm={6} md={3}>
            <TextField
              fullWidth
              label={t('search')}
              variant="outlined"
              value={filters.search}
              onChange={handleSearch}
              size="small"
              InputProps={{
                startAdornment: <SearchIcon sx={{ mr: 1, color: 'action.active' }} />,
              }}
            />
          </Grid>

          {/* Category */}
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

          {/* Difficulty */}
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

          {/* Resource type */}
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

          {/* Sort */}
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
                {/* Thumbnail / icon header */}
                <Box
                  sx={{
                    height: 120,
                    background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: '48px',
                    overflow: 'hidden'
                  }}
                >
                  {resource.thumbnail || (resource.resourceType === 'image' ? resource.fileUrl : null) ? (
                    <Box
                      component="img"
                      src={resource.thumbnail || resource.fileUrl}
                      alt={resource.title}
                      sx={{ width: '100%', height: '100%', objectFit: 'cover' }}
                    />
                  ) : (
                    getResourceIcon(resource.resourceType)
                  )}
                </Box>

                <CardContent sx={{ flexGrow: 1 }}>
                  <Typography variant="h6" sx={{ mb: 1, fontWeight: 'bold' }}>
                    {resource.title}
                  </Typography>

                  <Typography variant="body2" color="textSecondary" sx={{ mb: 2 }}>
                    {resource.description}
                  </Typography>

                  {/* Type / Category / Difficulty chips */}
                  <Box sx={{ mb: 2, display: 'flex', gap: 1, flexWrap: 'wrap' }}>
                    <Chip size="small" label={getTypeLabel(resource.resourceType)} variant="outlined" color="primary" />
                    <Chip size="small" label={getCategoryLabel(resource.category)} variant="outlined" color="secondary" />
                    <Chip size="small" label={getDifficultyLabel(resource.difficulty)} variant="outlined" />
                  </Box>

                  {/* Rating and stats */}
                  <Box sx={{ mb: 2 }}>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                      <Rating value={resource.rating.average} readOnly size="small" />
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

                {/* Action buttons */}
                <Box
                  sx={{
                    p: 2,
                    borderTop: '1px solid #eee',
                    display: 'flex',
                    gap: 1,
                    flexWrap: 'wrap',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                  }}
                >
                  <Box sx={{ display: 'flex', gap: 1 }}>
                    {/* Play inline for videos / embeddable links */}
                    {canPlayInline(resource) ? (
                      <Tooltip title={t('play') || 'تشغيل'}>
                        <IconButton
                          size="small"
                          color="success"
                          onClick={() => setVideoPlayer({ open: true, resource })}
                        >
                          <PlayCircleIcon />
                        </IconButton>
                      </Tooltip>
                    ) : null}

                    <Tooltip title={t('view')}>
                      <IconButton size="small" color="info" onClick={() => window.open(resource.fileUrl, '_blank')}>
                        <VisibilityIcon />
                      </IconButton>
                    </Tooltip>

                    <Tooltip title={t('download')}>
                      <IconButton size="small" color="primary" onClick={() => handleDownload(resource)}>
                        <DownloadIcon />
                      </IconButton>
                    </Tooltip>

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
                          <>
                            <Tooltip title={t('updateThumbnail') || 'تحديث الصورة المصغرة'}>
                              <span>
                                <IconButton
                                  size="small"
                                  color="secondary"
                                  onClick={() => handleUpdateThumbnail(resource._id)}
                                  disabled={updatingThumbFor === resource._id}
                                >
                                  {updatingThumbFor === resource._id
                                    ? <CircularProgress size={16} />
                                    : <AddPhotoIcon fontSize="small" />}
                                </IconButton>
                              </span>
                            </Tooltip>
                            <Tooltip title={t('delete')}>
                              <IconButton size="small" color="error" onClick={() => handleDelete(resource._id)}>
                                <DeleteIcon />
                              </IconButton>
                            </Tooltip>
                          </>
                        );
                      }
                      return null;
                    })()}
                  </Box>

                  <Tooltip title={t('rate')}>
                    <Rating size="small" onChange={(_, value) => handleRate(resource._id, value)} />
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

      {/* Hidden file input for thumbnail updates */}
      <input
        ref={thumbnailInputRef}
        type="file"
        accept="image/*"
        style={{ display: 'none' }}
        onChange={handleThumbnailFileChange}
      />

      {/* ── Inline Video Player Dialog ────────────────────────────────────── */}
      <Dialog
        open={videoPlayer.open}
        onClose={() => setVideoPlayer({ open: false, resource: null })}
        maxWidth="md"
        fullWidth
        dir={direction}
        PaperProps={{ sx: { bgcolor: '#000', borderRadius: 2, overflow: 'hidden' } }}
      >
        {videoPlayer.resource && (
          <>
            <DialogTitle
              sx={{
                color: '#fff',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                py: 1,
                px: 2,
                bgcolor: '#111'
              }}
            >
              <Typography variant="subtitle1" sx={{ fontWeight: 'bold', color: '#fff' }}>
                {videoPlayer.resource.title}
              </Typography>
              <IconButton
                size="small"
                onClick={() => setVideoPlayer({ open: false, resource: null })}
                sx={{ color: '#fff' }}
              >
                <CloseIcon />
              </IconButton>
            </DialogTitle>

            <DialogContent sx={{ p: 0, bgcolor: '#000', aspectRatio: '16/9', display: 'flex', alignItems: 'center' }}>
              {isEmbeddableLink(videoPlayer.resource.fileUrl) ? (
                // YouTube / Vimeo etc.
                <Box
                  component="iframe"
                  src={getEmbedUrl(videoPlayer.resource.fileUrl)}
                  title={videoPlayer.resource.title}
                  allow="autoplay; fullscreen; picture-in-picture"
                  allowFullScreen
                  sx={{ width: '100%', height: '100%', border: 'none', minHeight: 360 }}
                />
              ) : (
                // Direct video file from R2
                <Box
                  component="video"
                  src={videoPlayer.resource.fileUrl}
                  controls
                  autoPlay
                  playsInline
                  sx={{ width: '100%', maxHeight: '70vh', display: 'block' }}
                />
              )}
            </DialogContent>

            <DialogActions sx={{ bgcolor: '#111', py: 1, px: 2, gap: 1, justifyContent: 'flex-start' }}>
              <Button
                size="small"
                variant="outlined"
                startIcon={<DownloadIcon />}
                onClick={() => handleDownload(videoPlayer.resource)}
                sx={{ color: '#fff', borderColor: '#555' }}
              >
                {t('download')}
              </Button>
              <Button
                size="small"
                variant="outlined"
                startIcon={<VisibilityIcon />}
                onClick={() => window.open(videoPlayer.resource.fileUrl, '_blank')}
                sx={{ color: '#fff', borderColor: '#555' }}
              >
                {t('openInNewTab') || 'فتح في تبويب جديد'}
              </Button>
            </DialogActions>
          </>
        )}
      </Dialog>
    </Container>
  );
};

export default ResourcesPage;
