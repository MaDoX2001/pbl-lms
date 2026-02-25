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
  const { language, mode, direction, toggleLanguage, toggleMode } = useAppSettings();
  const [anchorEl, setAnchorEl] = React.useState(null);

  const text = {
    title: language === 'ar' ? 'منصة التعلم بالمشروعات' : 'PBL Learning Platform',
    profile: language === 'ar' ? 'الملف الشخصي' : 'Profile',
    logout: language === 'ar' ? 'تسجيل الخروج' : 'Logout',
    login: language === 'ar' ? 'تسجيل الدخول' : 'Login',
    language: language === 'ar' ? 'EN' : 'AR',
  };

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
      <Toolbar sx={{ minHeight: '52px !important', py: 0.5, direction }}>
        <IconButton
          color="inherit"
          aria-label="toggle menu"
          onClick={onMenuToggle}
          edge="start"
          size="medium"
          sx={{ 
            mr: direction === 'rtl' ? 0 : 2,
            ml: direction === 'rtl' ? 2 : 0,
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
            textDecoration: 'none', 
            color: 'inherit',
            fontWeight: 700,
            fontSize: { xs: '0.95rem', sm: '1.2rem' },
            direction,
            textAlign: direction === 'rtl' ? 'right' : 'left'
          }}
        >
          {text.title}
        </Typography>

        <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
          <IconButton
            color="inherit"
            onClick={toggleLanguage}
            aria-label="toggle language"
            sx={{ borderRadius: 2 }}
          >
            <TranslateIcon />
            <Typography variant="caption" sx={{ ml: 0.5, fontWeight: 700, color: 'white' }}>
              {text.language}
            </Typography>
          </IconButton>

          <IconButton
            color="inherit"
            onClick={toggleMode}
            aria-label="toggle mode"
            sx={{ borderRadius: 2 }}
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
                  horizontal: 'right',
                }}
                keepMounted
                transformOrigin={{
                  vertical: 'top',
                  horizontal: 'right',
                }}
                open={Boolean(anchorEl)}
                onClose={handleClose}
              >
                <MenuItem onClick={() => { navigate(`/profile/${user?._id}`); handleClose(); }}>
                  {text.profile}
                </MenuItem>
                <MenuItem onClick={handleLogout}>{text.logout}</MenuItem>
              </Menu>
            </>
          ) : (
            <Button color="inherit" component={Link} to="/login">
              {text.login}
            </Button>
          )}
        </Box>
      </Toolbar>
    </AppBar>
  );
};

export default Navbar;
