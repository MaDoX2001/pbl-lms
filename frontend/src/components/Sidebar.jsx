import React, { useState } from 'react';
import { NavLink } from 'react-router-dom';
import { useSelector } from 'react-redux';
import {
  Drawer,
  List,
  ListItem,
  ListItemIcon,
  ListItemText,
  IconButton,
  Box,
  Divider,
  Tooltip
} from '@mui/material';
import MenuIcon from '@mui/icons-material/Menu';
import ChevronRightIcon from '@mui/icons-material/ChevronRight';
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
const COLLAPSED_WIDTH = 70;

const Sidebar = () => {
  const { isAuthenticated, user } = useSelector((state) => state.auth);
  const [collapsed, setCollapsed] = useState(false);

  const toggleCollapse = () => {
    setCollapsed(!collapsed);
  };

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
      authenticatedItems.push({ to: '/leaderboard', icon: <LeaderboardIcon />, label: 'لوحة المتصدرين' });
      authenticatedItems.push({ to: '/create-project', icon: <AddBoxIcon />, label: 'إنشاء مشروع' });
    }

    if (user?.role === 'admin') {
      authenticatedItems.push({ to: '/admin', icon: <AdminPanelSettingsIcon />, label: 'إدارة النظام' });
    }

    return [...baseItems, ...authenticatedItems];
  };

  const navItems = getNavItems();

  return (
    <Drawer
      variant="permanent"
      anchor="right"
      sx={{
        width: collapsed ? COLLAPSED_WIDTH : DRAWER_WIDTH,
        flexShrink: 0,
        '& .MuiDrawer-paper': {
          width: collapsed ? COLLAPSED_WIDTH : DRAWER_WIDTH,
          boxSizing: 'border-box',
          top: '64px', // Below navbar
          height: 'calc(100% - 64px)',
          transition: 'width 0.3s ease',
          backgroundColor: '#f8f9fa',
          borderLeft: '1px solid #e0e0e0',
          overflowX: 'hidden'
        }
      }}
    >
      {/* Collapse Toggle */}
      <Box sx={{ display: 'flex', justifyContent: 'flex-start', p: 1 }}>
        <IconButton onClick={toggleCollapse} size="small">
          {collapsed ? <MenuIcon /> : <ChevronRightIcon />}
        </IconButton>
      </Box>

      <Divider />

      {/* Navigation List */}
      <List sx={{ pt: 2 }}>
        {navItems.map((item) => (
          <Tooltip key={item.to} title={collapsed ? item.label : ''} placement="left">
            <ListItem
              component={NavLink}
              to={item.to}
              sx={{
                mb: 0.5,
                mx: 1,
                borderRadius: '8px',
                color: 'text.primary',
                textDecoration: 'none',
                transition: 'all 0.2s',
                '&:hover': {
                  backgroundColor: 'rgba(25, 118, 210, 0.08)'
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
              <ListItemIcon
                sx={{
                  minWidth: collapsed ? 0 : 40,
                  justifyContent: 'center',
                  color: 'inherit'
                }}
              >
                {item.icon}
              </ListItemIcon>
              {!collapsed && (
                <ListItemText
                  primary={item.label}
                  primaryTypographyProps={{
                    fontSize: '0.95rem',
                    fontWeight: 500
                  }}
                />
              )}
            </ListItem>
          </Tooltip>
        ))}
      </List>
    </Drawer>
  );
};

export default Sidebar;
