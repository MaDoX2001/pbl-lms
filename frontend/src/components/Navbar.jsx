import React from 'react';
import { AppBar, Toolbar, Typography, Box, Avatar, Menu, MenuItem, IconButton, Button } from '@mui/material';
import { Link, useNavigate } from 'react-router-dom';
import { useSelector, useDispatch } from 'react-redux';
import { logout } from '../redux/slices/authSlice';
import AccountCircleIcon from '@mui/icons-material/AccountCircle';
import MenuIcon from '@mui/icons-material/Menu';
import TranslateIcon from '@mui/icons-material/Translate';
import LightModeIcon from '@mui/icons-material/LightMode';
import DarkModeIcon from '@mui/icons-material/DarkMode';
import { useAppSettings } from '../context/AppSettingsContext';

const Navbar = ({ onMenuToggle }) => {
  const navigate = useNavigate();
  const dispatch = useDispatch();
  const { isAuthenticated, user } = useSelector((state) => state.auth);
  const { language, mode, direction, toggleLanguage, toggleMode, t } = useAppSettings();
  const isArabic = language === 'ar';
  const [anchorEl, setAnchorEl] = React.useState(null);

  const handleMenu = (event) => {
    setAnchorEl(event.currentTarget);
  };

  const handleClose = () => {
    setAnchorEl(null);
  };

  const handleLogout = () => {
    dispatch(logout());
    handleClose();
    navigate('/');
  };

  return (
    <AppBar position="sticky" sx={{ zIndex: (theme) => theme.zIndex.drawer + 1, boxShadow: '0 1px 3px rgba(0,0,0,0.12)' }}>
      <Toolbar
        sx={{
          minHeight: '52px !important',
          py: 0.5,
          direction,
          display: 'flex',
          flexDirection: direction === 'rtl' ? 'row-reverse' : 'row'
        }}
      >
        <IconButton
          color="inherit"
          aria-label="toggle menu"
          onClick={onMenuToggle}
          edge="start"
          size="medium"
          sx={{
            mx: 1,
            transition: 'background-color 0.2s ease',
            '&:hover': { backgroundColor: 'rgba(255,255,255,0.1)' }
          }}
        >
          <MenuIcon />
        </IconButton>
        
        <Typography
          variant="h6"
          component={Link}
          to="/"
          sx={{ 
            flexGrow: 1,
            order: direction === 'rtl' ? 0 : 1,
            marginInlineStart: direction === 'rtl' ? 0 : 1,
            textDecoration: 'none', 
            color: 'inherit',
            fontWeight: 700,
            fontSize: { xs: '0.95rem', sm: '1.2rem' },
            direction,
            textAlign: direction === 'rtl' ? 'right' : 'left'
          }}
        >
          {t('appName')}
        </Typography>

        <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
          <IconButton
            color="inherit"
            onClick={toggleLanguage}
            aria-label="toggle language"
            sx={{ borderRadius: 2, order: isArabic ? 3 : 1 }}
          >
            <TranslateIcon />
            <Typography variant="caption" sx={{ ml: 0.5, fontWeight: 700, color: 'white' }}>
              {language === 'ar' ? 'EN' : 'AR'}
            </Typography>
          </IconButton>

          <IconButton
            color="inherit"
            onClick={toggleMode}
            aria-label="toggle mode"
            sx={{ borderRadius: 2, order: 2 }}
          >
            {mode === 'dark' ? <LightModeIcon /> : <DarkModeIcon />}
          </IconButton>

          {isAuthenticated ? (
            <>
              <IconButton
                size="large"
                aria-label="account"
                aria-controls="menu-appbar"
                aria-haspopup="true"
                onClick={handleMenu}
                color="inherit"
                sx={{ order: isArabic ? 1 : 3 }}
              >
                {user?.avatar ? (
                  <Avatar src={user.avatar} sx={{ width: 32, height: 32 }} />
                ) : (
                  <AccountCircleIcon />
                )}
              </IconButton>
              <Menu
                id="menu-appbar"
                anchorEl={anchorEl}
                anchorOrigin={{
                  vertical: 'top',
                  horizontal: direction === 'rtl' ? 'left' : 'right',
                }}
                keepMounted
                transformOrigin={{
                  vertical: 'top',
                  horizontal: direction === 'rtl' ? 'left' : 'right',
                }}
                open={Boolean(anchorEl)}
                onClose={handleClose}
              >
                <MenuItem onClick={() => { navigate(`/profile/${user?._id}`); handleClose(); }}>
                  {t('profile')}
                </MenuItem>
                <MenuItem onClick={handleLogout}>{t('logout')}</MenuItem>
              </Menu>
            </>
          ) : (
            <Button color="inherit" component={Link} to="/login">
              {t('login')}
            </Button>
          )}
        </Box>
      </Toolbar>
    </AppBar>
  );
};

export default Navbar;
