import React, { useEffect, useState } from 'react';
import {
  Dialog,
  DialogContent,
  Box,
  Typography,
  Button,
  IconButton,
  Fade,
  Zoom
} from '@mui/material';
import {
  EmojiEvents as TrophyIcon,
  Close as CloseIcon,
  Star as StarIcon
} from '@mui/icons-material';
import Confetti from 'react-confetti';
import { useWindowSize } from 'react-use';
import { useAppSettings } from '../context/AppSettingsContext';

/**
 * BadgeCelebrationPopup Component
 * 
 * Displays a celebratory popup with confetti animation when a student
 * earns a badge for the first time.
 * 
 * Features:
 * - Confetti animation
 * - Badge icon and details
 * - Auto-dismiss after 5 seconds
 * - Shows once per badge
 * 
 * @param {boolean} open - Control popup visibility
 * @param {function} onClose - Close handler
 * @param {object} badge - Badge data { name, description, icon }
 */
const BadgeCelebrationPopup = ({ open, onClose, badge = {} }) => {
  const { t } = useAppSettings();
  const { width, height } = useWindowSize();
  const [showConfetti, setShowConfetti] = useState(false);

  useEffect(() => {
    if (open) {
      setShowConfetti(true);
      // Auto-hide confetti after 3 seconds
      const timer = setTimeout(() => {
        setShowConfetti(false);
      }, 3000);
      
      return () => clearTimeout(timer);
    }
  }, [open]);

  const handleClose = () => {
    setShowConfetti(false);
    onClose();
  };

  return (
    <>
      {showConfetti && (
        <Confetti
          width={width}
          height={height}
          recycle={false}
          numberOfPieces={200}
          gravity={0.3}
        />
      )}
      
      <Dialog
        open={open}
        onClose={handleClose}
        maxWidth="sm"
        fullWidth
        TransitionComponent={Zoom}
        TransitionProps={{ timeout: 500 }}
        PaperProps={{
          sx: {
            borderRadius: 4,
            boxShadow: '0 20px 60px rgba(0,0,0,0.3)',
            overflow: 'visible'
          }
        }}
      >
        <IconButton
          onClick={handleClose}
          sx={{
            position: 'absolute',
            right: 8,
            top: 8,
            color: 'grey.500',
            zIndex: 1
          }}
        >
          <CloseIcon />
        </IconButton>

        <DialogContent sx={{ textAlign: 'center', py: 5, px: 4 }}>
          {/* Animated Badge Icon */}
          <Fade in={open} timeout={800}>
            <Box
              sx={{
                display: 'inline-block',
                position: 'relative',
                animation: 'bounce 1s ease-in-out infinite',
                '@keyframes bounce': {
                  '0%, 100%': { transform: 'translateY(0)' },
                  '50%': { transform: 'translateY(-20px)' }
                }
              }}
            >
              <Box
                sx={{
                  width: 120,
                  height: 120,
                  borderRadius: '50%',
                  background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  boxShadow: '0 10px 30px rgba(102, 126, 234, 0.4)',
                  margin: '0 auto',
                  mb: 3
                }}
              >
                <Typography variant="h1" sx={{ fontSize: '4rem' }}>
                  {badge.icon || '🏆'}
                </Typography>
              </Box>
              
              {/* Sparkle effects */}
              <StarIcon 
                sx={{ 
                  position: 'absolute', 
                  top: -10, 
                  right: 0, 
                  color: '#FFD700',
                  animation: 'sparkle 1.5s ease-in-out infinite',
                  '@keyframes sparkle': {
                    '0%, 100%': { opacity: 0.3, transform: 'scale(1)' },
                    '50%': { opacity: 1, transform: 'scale(1.3)' }
                  }
                }} 
              />
              <StarIcon 
                sx={{ 
                  position: 'absolute', 
                  bottom: 10, 
                  left: -5, 
                  color: '#FFD700',
                  animation: 'sparkle 1.5s ease-in-out infinite 0.5s',
                  '@keyframes sparkle': {
                    '0%, 100%': { opacity: 0.3, transform: 'scale(1)' },
                    '50%': { opacity: 1, transform: 'scale(1.3)' }
                  }
                }} 
              />
            </Box>
          </Fade>

          {/* Congratulations Text */}
          <Typography 
            variant="h4" 
            gutterBottom 
            sx={{ 
              fontWeight: 700,
              background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
              backgroundClip: 'text',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
              mb: 2
            }}
          >
            {t('badgeCelebrationCongrats')}
          </Typography>

          <Typography variant="h6" gutterBottom sx={{ fontWeight: 600, mb: 1 }}>
            {badge.name || t('badgeCelebrationNewBadge')}
          </Typography>

          <Typography variant="body1" color="text.secondary" sx={{ mb: 3 }}>
            {badge.description || t('badgeCelebrationEarnedMessage')}
          </Typography>

          {/* Motivational message */}
          <Box 
            sx={{ 
              bgcolor: 'primary.50', 
              borderRadius: 2, 
              p: 2, 
              mb: 3 
            }}
          >
            <Typography variant="body2" sx={{ fontStyle: 'italic' }}>
              {t('badgeCelebrationMotivation')}
            </Typography>
          </Box>

          <Button
            variant="contained"
            size="large"
            onClick={handleClose}
            sx={{
              px: 4,
              py: 1.5,
              borderRadius: 3,
              textTransform: 'none',
              fontWeight: 600,
              background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
              '&:hover': {
                background: 'linear-gradient(135deg, #764ba2 0%, #667eea 100%)',
              }
            }}
          >
            {t('badgeCelebrationAwesome')}
          </Button>
        </DialogContent>
      </Dialog>
    </>
  );
};

export default BadgeCelebrationPopup;
