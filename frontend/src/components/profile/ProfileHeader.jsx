import React from 'react';
import { Box, Avatar, Typography, Button, Paper } from '@mui/material';
import { Edit, Email, School, Verified } from '@mui/icons-material';

const ProfileHeader = ({ user, onEdit }) => {
  const getRoleBadge = (role) => {
    const badges = {
      student: { text: 'طالب', color: '#2196f3' },
      teacher: { text: 'معلم', color: '#4caf50' },
      admin: { text: 'مسؤول', color: '#ff9800' }
    };
    return badges[role] || badges.student;
  };

  const badge = getRoleBadge(user.role);

  return (
    <Paper 
      elevation={2}
      sx={{ 
        p: 4, 
        mb: 3, 
        background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
        color: 'white',
        borderRadius: 3
      }}
    >
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 3, flexWrap: 'wrap' }}>
        {/* Avatar */}
        <Avatar
          src={user.avatar}
          alt={user.name}
          sx={{ 
            width: 120, 
            height: 120, 
            border: '4px solid white',
            boxShadow: 3
          }}
        >
          {user.name?.charAt(0)}
        </Avatar>

        {/* Info */}
        <Box sx={{ flex: 1, minWidth: 250 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 1 }}>
            <Typography variant="h4" sx={{ fontWeight: 'bold' }}>
              {user.name}
            </Typography>
            {user.isVerified && (
              <Verified sx={{ color: '#4caf50' }} />
            )}
          </Box>

          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
            <Box
              sx={{
                px: 2,
                py: 0.5,
                borderRadius: 2,
                bgcolor: badge.color,
                display: 'inline-flex',
                alignItems: 'center',
                gap: 1
              }}
            >
              <School sx={{ fontSize: 18 }} />
              <Typography variant="body2" sx={{ fontWeight: 'bold' }}>
                {badge.text}
              </Typography>
            </Box>
          </Box>

          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, opacity: 0.9 }}>
            <Email sx={{ fontSize: 18 }} />
            <Typography variant="body1">{user.email}</Typography>
          </Box>
        </Box>

        {/* Edit Button */}
        {onEdit && (
          <Button
            variant="contained"
            startIcon={<Edit />}
            onClick={onEdit}
            sx={{
              bgcolor: 'white',
              color: '#667eea',
              '&:hover': {
                bgcolor: 'rgba(255,255,255,0.9)'
              },
              fontWeight: 'bold',
              px: 3,
              py: 1.5,
              borderRadius: 2
            }}
          >
            تعديل الملف الشخصي
          </Button>
        )}
      </Box>
    </Paper>
  );
};

export default ProfileHeader;
