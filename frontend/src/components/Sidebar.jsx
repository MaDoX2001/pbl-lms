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
  Divider
} from '@mui/material';
import DashboardIcon from '@mui/icons-material/Dashboard';
import FolderIcon from '@mui/icons-material/Folder';
import CodeIcon from '@mui/icons-material/Code';
import ChatIcon from '@mui/icons-material/Chat';
import VideocamIcon from '@mui/icons-material/Videocam';
import LeaderboardIcon from '@mui/icons-material/Leaderboard';
import AdminPanelSettingsIcon from '@mui/icons-material/AdminPanelSettings';
import AddBoxIcon from '@mui/icons-material/AddBox';
import HomeIcon from '@mui/icons-material/Home';

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
      { to: '/projects', icon: <VideocamIcon />, label: 'المحاضرات المباشرة' }
    ];

    if (user?.role === 'teacher' || user?.role === 'admin') {
      authenticatedItems.push({ to: '/leaderboard', icon: <LeaderboardIcon />, label: 'لوحة المتصدرين', teacher: true });
      authenticatedItems.push({ to: '/create-project', icon: <AddBoxIcon />, label: 'إنشاء مشروع', teacher: true });
    }

    if (user?.role === 'admin') {
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
            top: '56px',
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: 'rgba(0, 0, 0, 0.3)',
            zIndex: (theme) => theme.zIndex.drawer - 1,
            transition: 'opacity 0.3s ease'
          }}
        />
      )}
      
      {/* Sidebar Drawer */}
      <Drawer
        anchor="right"
        open={open}
        onClose={onClose}
        variant="temporary"
        ModalProps={{
          keepMounted: true // Better mobile performance
        }}
        sx={{
          '& .MuiDrawer-paper': {
            width: DRAWER_WIDTH,
            boxSizing: 'border-box',
            top: '56px',
            height: 'calc(100vh - 56px)',
            backgroundColor: '#ffffff',
            borderLeft: '1px solid #e0e0e0',
            boxShadow: '-2px 0 8px rgba(0,0,0,0.1)',
            transition: 'transform 0.3s ease-in-out'
          }
        }}
      >
        {/* Header */}
        <Box sx={{ p: 2, backgroundColor: '#f5f5f5', borderBottom: '1px solid #e0e0e0' }}>
          <Box sx={{ fontSize: '1.1rem', fontWeight: 600, color: '#1976d2', textAlign: 'center' }}>
            القائمة الرئيسية
          </Box>
        </Box>

        <Divider />

        <Divider />

        {/* Navigation List */}
        <List sx={{ pt: 2, px: 1 }}>
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
      </Drawer>
    </>
  );
};

export default Sidebar;
