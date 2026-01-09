import React from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useSelector } from 'react-redux';
import { CircularProgress, Box } from '@mui/material';

const PrivateRoute = ({ children, roles = [] }) => {
  const { isAuthenticated, loading, user, requireSetup } = useSelector((state) => state.auth);
  const location = useLocation();

  if (loading) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" minHeight="60vh">
        <CircularProgress />
      </Box>
    );
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  // Check if 2FA setup is required (mandatory for all users)
  // Allow access to 2FA setup page itself and profile page
  const allowedPathsWithoutSetup = ['/2fa-setup', '/profile'];
  const currentPath = location.pathname;
  
  if (requireSetup || (user && user.twoFactorSetupRequired && !user.twoFactorEnabled)) {
    if (!allowedPathsWithoutSetup.includes(currentPath)) {
      return <Navigate to="/2fa-setup" replace />;
    }
  }

  if (roles.length > 0 && user && !roles.includes(user.role)) {
    return <Navigate to="/dashboard" replace />;
  }

  return children;
};

export default PrivateRoute;
