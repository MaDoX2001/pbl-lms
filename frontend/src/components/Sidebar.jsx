import React from 'react';
import { NavLink } from 'react-router-dom';
import { useSelector } from 'react-redux';
import {
  Drawer,
  List,
  ListItem,
  ListItemIcon,
  ListItemText,
  Box,
  Divider,
  IconButton
} from '@mui/material';
import CloseIcon from '@mui/icons-material/Close';
import DashboardIcon from '@mui/icons-material/Dashboard';
import FolderIcon from '@mui/icons-material/Folder';
import CodeIcon from '@mui/icons-material/Code';
import ChatIcon from '@mui/icons-material/Chat';
import VideocamIcon from '@mui/icons-material/Videocam';
import LeaderboardIcon from '@mui/icons-material/Leaderboard';
import AdminPanelSettingsIcon from '@mui/icons-material/AdminPanelSettings';
import AddBoxIcon from '@mui/icons-material/AddBox';
import HomeIcon from '@mui/icons-material/Home';
import GroupsIcon from '@mui/icons-material/Groups';

const DRAWER_WIDTH = 280;

const Sidebar = ({ open, onClose }) => {
  const { isAuthenticated, user } = useSelector((state) => state.auth);

  // Navigation items based on user role
  const getNavItems = () => {
    const baseItems = [
      { to: '/', icon: <HomeIcon />, label: 'الرئيسية', public: true },
      { to: '/projects', icon: <FolderIcon />, label: 'المشاريع', public: true },
      { to: '/arduino-simulator', icon: <CodeIcon />, label: 'محاكي Arduino', public: true }
    ];

    if (!isAuthenticated) {
      return baseItems;
    }

    const authenticatedItems = [
      { to: '/dashboard', icon: <DashboardIcon />, label: 'لوحة التحكم' },
      { to: '/chat', icon: <ChatIcon />, label: 'المحادثات' },
      { to: '/live-lectures', icon: <VideocamIcon />, label: 'المحاضرات المباشرة' }
    ];

    if (user?.role === 'student') {
      authenticatedItems.push({ to: '/team/dashboard', icon: <GroupsIcon />, label: 'فريقي', student: true });
    }

    if (user?.role === 'teacher' || user?.role === 'admin') {
      authenticatedItems.push({ to: '/leaderboard', icon: <LeaderboardIcon />, label: 'لوحة المتصدرين', teacher: true });
      authenticatedItems.push({ to: '/create-project', icon: <AddBoxIcon />, label: 'إنشاء مشروع', teacher: true });
    }

    if (user?.role === 'admin') {
      authenticatedItems.push({ to: '/admin/teams', icon: <GroupsIcon />, label: 'إدارة الفرق', admin: true });
      authenticatedItems.push({ to: '/admin', icon: <AdminPanelSettingsIcon />, label: 'إدارة النظام', admin: true });
    }

    return [...baseItems, ...authenticatedItems];
  };

  const navItems = getNavItems();

  return (
    <>
      {/* Backdrop */}
      {open && (
        <Box
          onClick={onClose}
          sx={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: 'rgba(0, 0, 0, 0.25)',
            zIndex: (theme) => theme.zIndex.drawer - 1,
            transition: 'opacity 0.3s cubic-bezier(0.4, 0, 0.2, 1)'
          }}
        />
      )}
      
      {/* Sidebar Drawer */}
      <Drawer
        anchor="left"
        open={open}
        onClose={onClose}
        variant="temporary"
        ModalProps={{
          keepMounted: true
        }}
        sx={{
          '& .MuiDrawer-paper': {
            width: { xs: '85vw', sm: '320px', md: '280px' },
            maxWidth: '320px',
            boxSizing: 'border-box',
            top: 0,
            height: '100vh',
            backgroundColor: '#ffffff',
            borderRight: '1px solid #e0e0e0',
            boxShadow: '4px 0 12px rgba(0,0,0,0.15)',
            transition: 'transform 0.35s cubic-bezier(0.4, 0, 0.2, 1)',
            display: 'flex',
            flexDirection: 'column',
            overflowY: 'auto'
          }
        }}
      >
        {/* Header - Fixed at top */}
        <Box 
          sx={{ 
            display: 'flex', 
            alignItems: 'center', 
            justifyContent: 'space-between',
            px: 2.5,
            py: 1.5,
            backgroundColor: '#1976d2',
            color: 'white',
            minHeight: '52px',
            flexShrink: 0
          }}
        >
          <Box sx={{ fontSize: '1.05rem', fontWeight: 600 }}>
            منصة التعلم بالمشروعات
          </Box>
          <IconButton 
            onClick={onClose}
            size="small"
            sx={{ 
              color: 'white',
              '&:hover': { backgroundColor: 'rgba(255,255,255,0.1)' }
            }}
          >
            <CloseIcon />
          </IconButton>
        </Box>

        <Divider />

        {/* Scrollable Navigation Content */}
        <Box sx={{ flex: 1, overflowY: 'auto', overflowX: 'hidden' }}>
          {/* Navigation List */}
          <List sx={{ pt: 2, px: 1, pb: 3 }}>
          {/* Public/Base Items */}
          {navItems.filter(item => item.public).map((item) => (
            <ListItem
              key={item.to}
              component={NavLink}
              to={item.to}
              onClick={onClose}
              sx={{
                mb: 1,
                borderRadius: '8px',
                color: 'text.primary',
                textDecoration: 'none',
                transition: 'all 0.2s',
                '&:hover': {
                  backgroundColor: 'rgba(25, 118, 210, 0.08)',
                  transform: 'translateX(-4px)'
                },
                '&.active': {
                  backgroundColor: 'primary.main',
                  color: 'white',
                  '& .MuiListItemIcon-root': {
                    color: 'white'
                  }
                }
              }}
            >
              <ListItemIcon sx={{ minWidth: 40, color: 'inherit' }}>
                {item.icon}
              </ListItemIcon>
              <ListItemText
                primary={item.label}
                primaryTypographyProps={{ fontSize: '0.95rem', fontWeight: 500 }}
              />
            </ListItem>
          ))}

          {isAuthenticated && (
            <>
              <Divider sx={{ my: 2 }} />
              
              {/* Authenticated Items */}
              {navItems.filter(item => !item.public && !item.admin && !item.teacher).map((item) => (
                <ListItem
                  key={item.to}
                  component={NavLink}
                  to={item.to}
                  onClick={onClose}
                  sx={{
                    mb: 1,
                    borderRadius: '8px',
                    color: 'text.primary',
                    textDecoration: 'none',
                    transition: 'all 0.2s',
                    '&:hover': {
                      backgroundColor: 'rgba(25, 118, 210, 0.08)',
                      transform: 'translateX(-4px)'
                    },
                    '&.active': {
                      backgroundColor: 'primary.main',
                      color: 'white',
                      '& .MuiListItemIcon-root': {
                        color: 'white'
                      }
                    }
                  }}
                >
                  <ListItemIcon sx={{ minWidth: 40, color: 'inherit' }}>
                    {item.icon}
                  </ListItemIcon>
                  <ListItemText
                    primary={item.label}
                    primaryTypographyProps={{ fontSize: '0.95rem', fontWeight: 500 }}
                  />
                </ListItem>
              ))}

              {/* Teacher/Admin Section */}
              {(user?.role === 'teacher' || user?.role === 'admin') && (
                <>
                  <Divider sx={{ my: 2 }} />
                  <Box sx={{ px: 2, py: 1, fontSize: '0.75rem', color: 'text.secondary', fontWeight: 600 }}>
                    إدارة المحتوى
                  </Box>
                  {navItems.filter(item => item.teacher).map((item) => (
                    <ListItem
                      key={item.to}
                      component={NavLink}
                      to={item.to}
                      onClick={onClose}
                      sx={{
                        mb: 1,
                        borderRadius: '8px',
                        color: 'text.primary',
                        textDecoration: 'none',
                        transition: 'all 0.2s',
                        '&:hover': {
                          backgroundColor: 'rgba(25, 118, 210, 0.08)',
                          transform: 'translateX(-4px)'
                        },
                        '&.active': {
                          backgroundColor: 'primary.main',
                          color: 'white',
                          '& .MuiListItemIcon-root': {
                            color: 'white'
                          }
                        }
                      }}
                    >
                      <ListItemIcon sx={{ minWidth: 40, color: 'inherit' }}>
                        {item.icon}
                      </ListItemIcon>
                      <ListItemText
                        primary={item.label}
                        primaryTypographyProps={{ fontSize: '0.95rem', fontWeight: 500 }}
                      />
                    </ListItem>
                  ))}
                </>
              )}

              {/* Admin Section */}
              {user?.role === 'admin' && navItems.filter(item => item.admin).map((item) => (
                <>
                  <Divider sx={{ my: 2 }} />
                  <Box sx={{ px: 2, py: 1, fontSize: '0.75rem', color: 'text.secondary', fontWeight: 600 }}>
                    الإدارة
                  </Box>
                  <ListItem
                    key={item.to}
                    component={NavLink}
                    to={item.to}
                    onClick={onClose}
                    sx={{
                      mb: 1,
                      borderRadius: '8px',
                      color: 'text.primary',
                      textDecoration: 'none',
                      transition: 'all 0.2s',
                      '&:hover': {
                        backgroundColor: 'rgba(211, 47, 47, 0.08)',
                        transform: 'translateX(-4px)'
                      },
                      '&.active': {
                        backgroundColor: '#d32f2f',
                        color: 'white',
                        '& .MuiListItemIcon-root': {
                          color: 'white'
                        }
                      }
                    }}
                  >
                    <ListItemIcon sx={{ minWidth: 40, color: 'inherit' }}>
                      {item.icon}
                    </ListItemIcon>
                    <ListItemText
                      primary={item.label}
                      primaryTypographyProps={{ fontSize: '0.95rem', fontWeight: 500 }}
                    />
                  </ListItem>
                </>
              ))}
            </>
          )}
        </List>
        </Box>
      </Drawer>
    </>
  );
};

export default Sidebar;
