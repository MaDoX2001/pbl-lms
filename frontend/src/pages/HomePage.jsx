import React from 'react';
import { Box, Container, Typography, Button, Grid, Paper } from '@mui/material';
import { useNavigate } from 'react-router-dom';
import { useSelector } from 'react-redux';
import CodeIcon from '@mui/icons-material/Code';
import SchoolIcon from '@mui/icons-material/School';
import EmojiEventsIcon from '@mui/icons-material/EmojiEvents';
import GroupsIcon from '@mui/icons-material/Groups';

const HomePage = () => {
  const navigate = useNavigate();
  const { isAuthenticated } = useSelector((state) => state.auth);

  const features = [
    {
      icon: <CodeIcon sx={{ fontSize: 50, color: 'primary.main' }} />,
      title: 'تعلم بالممارسة',
      description: 'اكتسب مهارات البرمجة من خلال مشاريع عملية وواقعية'
    },
    {
      icon: <SchoolIcon sx={{ fontSize: 50, color: 'primary.main' }} />,
      title: 'مسار تعليمي منظم',
      description: 'مشاريع متدرجة من المبتدئ إلى المحترف'
    },
    {
      icon: <EmojiEventsIcon sx={{ fontSize: 50, color: 'primary.main' }} />,
      title: 'نظام إنجازات',
      description: 'اكسب نقاط وإنجازات مع كل مشروع تكمله'
    },
    {
      icon: <GroupsIcon sx={{ fontSize: 50, color: 'primary.main' }} />,
      title: 'تعلم تعاوني',
      description: 'تفاعل مع زملائك والمعلمين في المنتديات'
    }
  ];

  return (
    <Box>
      {/* Hero Section */}
      <Box
        sx={{
          background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
          color: 'white',
          py: 12,
          mb: 6,
          borderRadius: 2,
        }}
      >
        <Container maxWidth="md">
          <Typography variant="h2" component="h1" gutterBottom fontWeight={700} align="center">
            تعلم البرمجة بأسلوب المشاريع
          </Typography>
          <Typography variant="h5" gutterBottom align="center" sx={{ mb: 4, opacity: 0.9 }}>
            منصة تعليمية متكاملة تساعدك على إتقان البرمجة من خلال مشاريع عملية
          </Typography>
          <Box sx={{ display: 'flex', gap: 2, justifyContent: 'center' }}>
            {!isAuthenticated ? (
              <>
                <Button 
                  variant="contained" 
                  size="large" 
                  color="secondary"
                  onClick={() => navigate('/register')}
                  sx={{ px: 4 }}
                >
                  ابدأ الآن مجاناً
                </Button>
                <Button 
                  variant="outlined" 
                  size="large"
                  onClick={() => navigate('/projects')}
                  sx={{ 
                    color: 'white', 
                    borderColor: 'white',
                    '&:hover': {
                      borderColor: 'white',
                      bgcolor: 'rgba(255,255,255,0.1)'
                    }
                  }}
                >
                  استكشف المشاريع
                </Button>
              </>
            ) : (
              <Button 
                variant="contained" 
                size="large" 
                color="secondary"
                onClick={() => navigate('/dashboard')}
                sx={{ px: 4 }}
              >
                انتقل إلى لوحة التحكم
              </Button>
            )}
          </Box>
        </Container>
      </Box>

      {/* Features Section */}
      <Container maxWidth="lg" sx={{ mb: 8 }}>
        <Typography variant="h3" component="h2" gutterBottom align="center" fontWeight={700} sx={{ mb: 6 }}>
          لماذا التعلم بالمشروعات؟
        </Typography>
        <Grid container spacing={4}>
          {features.map((feature, index) => (
            <Grid item xs={12} sm={6} md={3} key={index}>
              <Paper
                elevation={2}
                sx={{
                  p: 3,
                  height: '100%',
                  textAlign: 'center',
                  transition: 'transform 0.2s',
                  '&:hover': {
                    transform: 'translateY(-8px)',
                    boxShadow: 4,
                  }
                }}
              >
                <Box sx={{ mb: 2 }}>
                  {feature.icon}
                </Box>
                <Typography variant="h6" gutterBottom fontWeight={600}>
                  {feature.title}
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  {feature.description}
                </Typography>
              </Paper>
            </Grid>
          ))}
        </Grid>
      </Container>

      {/* Stats Section */}
      <Box sx={{ bgcolor: 'grey.100', py: 6, mb: 6 }}>
        <Container maxWidth="lg">
          <Grid container spacing={4} textAlign="center">
            <Grid item xs={12} md={4}>
              <Typography variant="h3" color="primary" fontWeight={700}>
                50+
              </Typography>
              <Typography variant="h6" color="text.secondary">
                مشروع تعليمي
              </Typography>
            </Grid>
            <Grid item xs={12} md={4}>
              <Typography variant="h3" color="primary" fontWeight={700}>
                1000+
              </Typography>
              <Typography variant="h6" color="text.secondary">
                طالب نشط
              </Typography>
            </Grid>
            <Grid item xs={12} md={4}>
              <Typography variant="h3" color="primary" fontWeight={700}>
                95%
              </Typography>
              <Typography variant="h6" color="text.secondary">
                معدل الرضا
              </Typography>
            </Grid>
          </Grid>
        </Container>
      </Box>

      {/* CTA Section */}
      <Container maxWidth="md" sx={{ mb: 8, textAlign: 'center' }}>
        <Typography variant="h4" gutterBottom fontWeight={700}>
          هل أنت مستعد لبدء رحلتك في البرمجة؟
        </Typography>
        <Typography variant="body1" color="text.secondary" sx={{ mb: 3 }}>
          انضم إلى آلاف الطلاب الذين يتعلمون البرمجة بطريقة عملية وممتعة
        </Typography>
        {!isAuthenticated && (
          <Button 
            variant="contained" 
            size="large" 
            onClick={() => navigate('/register')}
            sx={{ px: 5, py: 1.5 }}
          >
            انضم الآن
          </Button>
        )}
      </Container>
    </Box>
  );
};

export default HomePage;
