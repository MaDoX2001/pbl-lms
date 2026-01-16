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
          backgroundImage: 'url(/images/arduino-hero.jpg)',
          backgroundSize: 'cover',
          backgroundPosition: 'center',
          backgroundRepeat: 'no-repeat',
          position: 'relative',
          color: 'white',
          py: 12,
          mb: 6,
          borderRadius: 2,
          '&::before': {
            content: '""',
            position: 'absolute',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: 'rgba(0, 20, 40, 0.75)',
            borderRadius: 2,
          }
        }}
      >
        <Container maxWidth="md" sx={{ position: 'relative', zIndex: 1 }}>
          <Typography variant="h2" component="h1" gutterBottom fontWeight={700} align="center" sx={{ textShadow: '2px 2px 4px rgba(0,0,0,0.5)' }}>
            تعلم البرمجة بأسلوب المشاريع
          </Typography>
          <Typography variant="h5" gutterBottom align="center" sx={{ mb: 4, textShadow: '1px 1px 3px rgba(0,0,0,0.5)' }}>
            منصة تعليمية متكاملة تساعدك على إتقان البرمجة من خلال مشاريع عملية
          </Typography>
          <Box sx={{ display: 'flex', gap: 2, justifyContent: 'center' }}>
            {!isAuthenticated ? (
              <>
                <Button 
                  variant="contained" 
                  size="large" 
                  onClick={() => navigate('/register')}
                  sx={{ 
                    px: 4,
                    bgcolor: '#00bcd4',
                    color: 'white',
                    fontWeight: 700,
                    boxShadow: '0 4px 14px rgba(0, 188, 212, 0.4)',
                    '&:hover': {
                      bgcolor: '#00acc1',
                      boxShadow: '0 6px 20px rgba(0, 188, 212, 0.6)',
                    }
                  }}
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
                    borderWidth: 2,
                    fontWeight: 600,
                    '&:hover': {
                      borderColor: '#00bcd4',
                      bgcolor: 'rgba(0, 188, 212, 0.2)',
                      borderWidth: 2,
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
                elevation={0}
                sx={{
                  p: 3,
                  height: '100%',
                  textAlign: 'center',
                  background: index === 0 ? 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)' :
                             index === 1 ? 'linear-gradient(135deg, #f093fb 0%, #f5576c 100%)' :
                             index === 2 ? 'linear-gradient(135deg, #4facfe 0%, #00f2fe 100%)' :
                             'linear-gradient(135deg, #43e97b 0%, #38f9d7 100%)',
                  color: 'white',
                  border: '2px solid rgba(255, 255, 255, 0.2)',
                  backdropFilter: 'blur(10px)',
                  transition: 'all 0.3s ease',
                  '&:hover': {
                    transform: 'translateY(-12px) scale(1.02)',
                    boxShadow: '0 12px 24px rgba(0, 0, 0, 0.2)',
                    border: '2px solid rgba(255, 255, 255, 0.4)',
                  }
                }}
              >
                <Box sx={{ mb: 2 }}>
                  {React.cloneElement(feature.icon, { sx: { fontSize: 50, color: 'white' } })}
                </Box>
                <Typography variant="h6" gutterBottom fontWeight={700}>
                  {feature.title}
                </Typography>
                <Typography variant="body2" sx={{ opacity: 0.95 }}>
                  {feature.description}
                </Typography>
              </Paper>
            </Grid>
          ))}
        </Grid>
      </Container>


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
