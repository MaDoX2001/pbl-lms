import React from 'react';
import { AppBar, Toolbar, Typography, Box, Avatar, Menu, MenuItem, IconButton, Button } from '@mui/material';
import { Link, useNavigate } from 'react-router-dom';
import { useSelector, useDispatch } from 'react-redux';
import { logout } from '../redux/slices/authSlice';
import AccountCircleIcon from '@mui/icons-material/AccountCircle';
import MenuIcon from '@mui/icons-material/Menu';

const Navbar = ({ onMenuToggle }) => {
  const navigate = useNavigate();
  const dispatch = useDispatch();
  const { isAuthenticated, user } = useSelector((state) => state.auth);
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
      <Toolbar sx={{ minHeight: '52px !important', py: 0.5, direction: 'ltr' }}>
        <IconButton
          color="inherit"
          aria-label="toggle menu"
          onClick={onMenuToggle}
          edge="start"
          size="medium"
          sx={{ 
            mr: 2,
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
            direction: 'rtl'
          }}
        >
          منصة التعلم بالمشروعات
        </Typography>

        <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
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
                <MenuItem onClick={() => { navigate(`/profile/${user?.id}`); handleClose(); }}>
                  الملف الشخصي
                </MenuItem>
                <MenuItem onClick={handleLogout}>تسجيل الخروج</MenuItem>
              </Menu>
            </>
          ) : (
            <Button color="inherit" component={Link} to="/login">
              تسجيل الدخول
            </Button>
          )}
        </Box>
      </Toolbar>
    </AppBar>
  );
};

export default Navbar;
