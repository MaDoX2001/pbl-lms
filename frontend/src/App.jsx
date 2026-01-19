import React, { useEffect, useState } from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { useDispatch, useSelector } from 'react-redux';
import { Box } from '@mui/material';

// Import components
import Navbar from './components/Navbar';
import Sidebar from './components/Sidebar';
import Footer from './components/Footer';
import PrivateRoute from './components/PrivateRoute';
import PreAssessmentGate from './components/PreAssessmentGate';

// Import pages
import HomePage from './pages/HomePage';
import LoginPage from './pages/LoginPage';
import RegisterPage from './pages/RegisterPage';
import PublicRegisterPage from './pages/PublicRegisterPage';
import ProjectsPage from './pages/ProjectsPage';
import ProjectDetailPage from './pages/ProjectDetailPage';
import DashboardPage from './pages/DashboardPage';
import ProfilePage from './pages/ProfilePage';
import CreateProjectPage from './pages/CreateProjectPage';
import EditProjectPage from './pages/EditProjectPage';
import LeaderboardPage from './pages/LeaderboardPage';
import ArduinoSimulatorPage from './pages/ArduinoSimulatorPage';
import AdminDashboardPage from './pages/AdminDashboardPage';
import TwoFactorSetupPage from './pages/TwoFactorSetupPage';
import TwoFactorAuthPage from './pages/TwoFactorAuthPage';
import EmailVerificationPage from './pages/EmailVerificationPage';
import ForgotPasswordPage from './pages/ForgotPasswordPage';
import ChatPage from './pages/ChatPage';
import LiveLecturesPage from './pages/LiveLecturesPage';
import PreAssessmentPage from './pages/PreAssessmentPage';
import TeamDashboard from './pages/TeamDashboard';
import TeamsManagement from './pages/TeamsManagement';
import TeamProjectPage from './pages/TeamProjectPage';
import ProjectSubmissionsManagement from './pages/ProjectSubmissionsManagement';

// Import actions
import { loadUser } from './redux/slices/authSlice';

function App() {
  const dispatch = useDispatch();
  const { isAuthenticated } = useSelector((state) => state.auth);
  const [sidebarOpen, setSidebarOpen] = useState(false);

  useEffect(() => {
    // Load user if token exists
    const token = localStorage.getItem('token');
    if (token) {
      dispatch(loadUser());
    }
  }, [dispatch]);

  const toggleSidebar = () => {
    setSidebarOpen(!sidebarOpen);
  };

  const closeSidebar = () => {
    setSidebarOpen(false);
  };

  // Lock body scroll when sidebar is open
  useEffect(() => {
    if (sidebarOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = 'unset';
    }
    
    return () => {
      document.body.style.overflow = 'unset';
    };
  }, [sidebarOpen]);

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', minHeight: '100vh' }}>
      <Navbar onMenuToggle={toggleSidebar} />
      <Box sx={{ display: 'flex', flex: 1 }}>
        <Sidebar open={sidebarOpen} onClose={closeSidebar} />
        <Box
          component="main"
          sx={{
            flex: 1,
            py: 3,
            px: { xs: 2, md: 3 },
            backgroundColor: '#fafafa',
            minHeight: 'calc(100vh - 56px)'
          }}
        >
          {/* Wrap routes with PreAssessmentGate - checks once at app level */}
          <PreAssessmentGate>
            <Routes>
              {/* Public routes */}
              <Route path="/" element={<HomePage />} />
              <Route path="/login" element={!isAuthenticated ? <LoginPage /> : <Navigate to="/dashboard" />} />
              <Route path="/register" element={!isAuthenticated ? <RegisterPage /> : <Navigate to="/dashboard" />} />
              <Route path="/signup" element={!isAuthenticated ? <PublicRegisterPage /> : <Navigate to="/dashboard" />} />
              <Route path="/verify-email" element={<EmailVerificationPage />} />
              <Route path="/forgot-password" element={<ForgotPasswordPage />} />
              <Route path="/projects" element={<ProjectsPage />} />
              <Route path="/projects/:id" element={<ProjectDetailPage />} />
              <Route path="/leaderboard" element={
                <PrivateRoute roles={['teacher', 'admin']}>
                  <LeaderboardPage />
                </PrivateRoute>
              } />
              <Route path="/arduino-simulator" element={<ArduinoSimulatorPage />} />
              <Route path="/live-lectures" element={
                <PrivateRoute>
                  <LiveLecturesPage />
                </PrivateRoute>
              } />

              {/* Pre-Assessment route */}
              <Route path="/preassessment" element={
                <PrivateRoute roles={['student']}>
                  <PreAssessmentPage />
                </PrivateRoute>
              } />

              {/* 2FA routes */}
              <Route path="/2fa-verify" element={<TwoFactorAuthPage />} />
              <Route path="/2fa-setup" element={
                <PrivateRoute>
                  <TwoFactorSetupPage />
                </PrivateRoute>
              } />

              {/* Private routes */}
              <Route path="/dashboard" element={
                <PrivateRoute>
                  <DashboardPage />
                </PrivateRoute>
              } />
              <Route path="/profile/:id" element={
                <PrivateRoute>
                  <ProfilePage />
                </PrivateRoute>
              } />
              <Route path="/chat" element={
                <PrivateRoute>
                  <ChatPage />
                </PrivateRoute>
              } />
              <Route path="/create-project" element={
                <PrivateRoute roles={['teacher', 'admin']}>
                  <CreateProjectPage />
                </PrivateRoute>
              } />
              <Route path="/edit-project/:id" element={
                <PrivateRoute roles={['teacher', 'admin']}>
                  <EditProjectPage />
                </PrivateRoute>
              } />
              <Route path="/admin" element={
                <PrivateRoute roles={['admin']}>
                  <AdminDashboardPage />
                </PrivateRoute>
              } />

              {/* Team Routes */}
              <Route path="/team/dashboard" element={
                <PrivateRoute roles={['student']}>
                  <TeamDashboard />
                </PrivateRoute>
              } />
              <Route path="/team/project/:projectId" element={
                <PrivateRoute roles={['student']}>
                  <TeamProjectPage />
                </PrivateRoute>
              } />
              <Route path="/admin/teams" element={
                <PrivateRoute roles={['admin']}>
                  <TeamsManagement />
                </PrivateRoute>
              } />
              <Route path="/projects/:projectId/submissions" element={
                <PrivateRoute roles={['teacher', 'admin']}>
                  <ProjectSubmissionsManagement />
                </PrivateRoute>
              } />

              {/* 404 */}
              <Route path="*" element={<Navigate to="/" />} />
            </Routes>
          </PreAssessmentGate>
        </Box>
      </Box>
      <Footer />
    </Box>
  );
}

export default App;
