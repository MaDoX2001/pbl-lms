import React, { useEffect, useState } from 'react';
import { Box, Typography, Grid, TextField, InputAdornment, CircularProgress, FormControl, InputLabel, Select, MenuItem, Button } from '@mui/material';
import { useDispatch, useSelector } from 'react-redux';
import { useNavigate } from 'react-router-dom';
import SearchIcon from '@mui/icons-material/Search';
import AddIcon from '@mui/icons-material/Add';
import { fetchProjects } from '../redux/slices/projectSlice';
import ProjectCard from '../components/ProjectCard';
import { useAppSettings } from '../context/AppSettingsContext';

const ProjectsPage = () => {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const { t } = useAppSettings();
  const { projects, loading } = useSelector((state) => state.projects);
  const { user } = useSelector((state) => state.auth);

  const [filters, setFilters] = useState({
    search: '',
    difficulty: '',
    sort: 'recent',
  });

  useEffect(() => {
    dispatch(fetchProjects(filters));
  }, [dispatch, filters]);

  const handleFilterChange = (field, value) => {
    setFilters({
      ...filters,
      [field]: value,
    });
  };

  return (
    <Box>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
        <Box>
          <Typography variant="h3" component="h1" gutterBottom fontWeight={700}>
            {t('learningProjects')}
          </Typography>
          <Typography variant="body1" color="text.secondary">
            {t('exploreProjects')}
          </Typography>
        </Box>
        {(user?.role === 'teacher' || user?.role === 'admin') && (
          <Button
            variant="contained"
            startIcon={<AddIcon />}
            onClick={() => navigate('/create-project')}
            sx={{ minWidth: 150 }}
          >
            {t('createProject')}
          </Button>
        )}
      </Box>

      {/* Filters */}
      <Box sx={{ mb: 4 }}>
        <Grid container spacing={2}>
          <Grid item xs={12} md={4}>
            <TextField
              fullWidth
              id="project-search"
              name="search"
              placeholder={t('searchProject')}
              value={filters.search}
              onChange={(e) => handleFilterChange('search', e.target.value)}
              InputProps={{
                startAdornment: (
                  <InputAdornment position="start">
                    <SearchIcon />
                  </InputAdornment>
                ),
              }}
            />
          </Grid>
          <Grid item xs={12} sm={4} md={2}>
            <FormControl fullWidth>
              <InputLabel id="difficulty-label">{t('level')}</InputLabel>
              <Select
                labelId="difficulty-label"
                id="difficulty-filter"
                name="difficulty"
                value={filters.difficulty}
                onChange={(e) => handleFilterChange('difficulty', e.target.value)}
                label={t('level')}
              >
                <MenuItem value="">{t('all')}</MenuItem>
                <MenuItem value="beginner">{t('beginner')}</MenuItem>
                <MenuItem value="intermediate">{t('intermediate')}</MenuItem>
                <MenuItem value="advanced">{t('advanced')}</MenuItem>
              </Select>
            </FormControl>
          </Grid>
          <Grid item xs={12} sm={4} md={3}>
            <FormControl fullWidth>
              <InputLabel id="sort-label">{t('sort')}</InputLabel>
              <Select
                labelId="sort-label"
                id="sort-filter"
                name="sort"
                value={filters.sort}
                onChange={(e) => handleFilterChange('sort', e.target.value)}
                label={t('sort')}
              >
                <MenuItem value="recent">{t('recent')}</MenuItem>
                <MenuItem value="popular">{t('popular')}</MenuItem>
                <MenuItem value="title">{t('byTitle')}</MenuItem>
              </Select>
            </FormControl>
          </Grid>
        </Grid>
      </Box>

      {/* Projects Grid */}
      {loading ? (
        <Box sx={{ display: 'flex', justifyContent: 'center', py: 8 }}>
          <CircularProgress />
        </Box>
      ) : projects.length === 0 ? (
        <Box sx={{ textAlign: 'center', py: 8 }}>
          <Typography variant="h6" color="text.secondary">
            {t('noProjects')}
          </Typography>
        </Box>
      ) : (
        <Grid container spacing={3}>
          {projects.map((project) => (
            <Grid item xs={12} sm={6} md={4} key={project._id}>
              <ProjectCard project={project} />
            </Grid>
          ))}
        </Grid>
      )}
    </Box>
  );
};

export default ProjectsPage;
