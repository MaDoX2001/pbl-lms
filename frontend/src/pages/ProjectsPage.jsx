import React, { useEffect, useState } from 'react';
import { Box, Typography, Grid, TextField, InputAdornment, CircularProgress, FormControl, InputLabel, Select, MenuItem } from '@mui/material';
import { useDispatch, useSelector } from 'react-redux';
import SearchIcon from '@mui/icons-material/Search';
import { fetchProjects } from '../redux/slices/projectSlice';
import ProjectCard from '../components/ProjectCard';

const ProjectsPage = () => {
  const dispatch = useDispatch();
  const { projects, loading } = useSelector((state) => state.projects);

  const [filters, setFilters] = useState({
    search: '',
    difficulty: '',
    category: '',
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
      <Typography variant="h3" component="h1" gutterBottom fontWeight={700}>
        المشاريع التعليمية
      </Typography>
      <Typography variant="body1" color="text.secondary" sx={{ mb: 4 }}>
        استكشف مجموعة متنوعة من المشاريع البرمجية التعليمية
      </Typography>

      {/* Filters */}
      <Box sx={{ mb: 4 }}>
        <Grid container spacing={2}>
          <Grid item xs={12} md={4}>
            <TextField
              fullWidth
              placeholder="ابحث عن مشروع..."
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
              <InputLabel>المستوى</InputLabel>
              <Select
                value={filters.difficulty}
                onChange={(e) => handleFilterChange('difficulty', e.target.value)}
                label="المستوى"
              >
                <MenuItem value="">الكل</MenuItem>
                <MenuItem value="beginner">مبتدئ</MenuItem>
                <MenuItem value="intermediate">متوسط</MenuItem>
                <MenuItem value="advanced">متقدم</MenuItem>
              </Select>
            </FormControl>
          </Grid>
          <Grid item xs={12} sm={4} md={3}>
            <FormControl fullWidth>
              <InputLabel>التصنيف</InputLabel>
              <Select
                value={filters.category}
                onChange={(e) => handleFilterChange('category', e.target.value)}
                label="التصنيف"
              >
                <MenuItem value="">الكل</MenuItem>
                <MenuItem value="web">تطوير ويب</MenuItem>
                <MenuItem value="mobile">تطوير موبايل</MenuItem>
                <MenuItem value="desktop">تطوير سطح المكتب</MenuItem>
                <MenuItem value="data-science">علم البيانات</MenuItem>
                <MenuItem value="ai-ml">ذكاء اصطناعي</MenuItem>
                <MenuItem value="game-dev">تطوير ألعاب</MenuItem>
              </Select>
            </FormControl>
          </Grid>
          <Grid item xs={12} sm={4} md={3}>
            <FormControl fullWidth>
              <InputLabel>الترتيب</InputLabel>
              <Select
                value={filters.sort}
                onChange={(e) => handleFilterChange('sort', e.target.value)}
                label="الترتيب"
              >
                <MenuItem value="recent">الأحدث</MenuItem>
                <MenuItem value="popular">الأكثر شعبية</MenuItem>
                <MenuItem value="title">حسب العنوان</MenuItem>
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
            لا توجد مشاريع متاحة
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
