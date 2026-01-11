import React, { useEffect } from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { useDispatch, useSelector } from 'react-redux';
import { Container } from '@mui/material';

// Import components
import Navbar from './components/Navbar';
import Footer from './components/Footer';
import PrivateRoute from './components/PrivateRoute';

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
import LeaderboardPage from './pages/LeaderboardPage';
import ArduinoSimulatorPage from './pages/ArduinoSimulatorPage';
import AdminDashboardPage from './pages/AdminDashboardPage';
import TwoFactorSetupPage from './pages/TwoFactorSetupPage';
import TwoFactorAuthPage from './pages/TwoFactorAuthPage';

// Import actions
import { loadUser } from './redux/slices/authSlice';

function App() {
  const dispatch = useDispatch();
  const { isAuthenticated } = useSelector((state) => state.auth);

  useEffect(() => {
    // Load user if token exists
    const token = localStorage.getItem('token');
    if (token) {
      dispatch(loadUser());
    }
  }, [dispatch]);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', minHeight: '100vh' }}>
      <Navbar />
      <Container component="main" sx={{ flex: 1, py: 4 }}>
        <Routes>
          {/* Public routes */}
          <Route path="/" element={<HomePage />} />
          <Route path="/login" element={!isAuthenticated ? <LoginPage /> : <Navigate to="/dashboard" />} />
          <Route path="/register" element={!isAuthenticated ? <RegisterPage /> : <Navigate to="/dashboard" />} />
          <Route path="/signup" element={!isAuthenticated ? <PublicRegisterPage /> : <Navigate to="/dashboard" />} />
          <Route path="/projects" element={<ProjectsPage />} />
          <Route path="/projects/:id" element={<ProjectDetailPage />} />
          <Route path="/leaderboard" element={<LeaderboardPage />} />
          <Route path="/arduino-simulator" element={<ArduinoSimulatorPage />} />

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
          <Route path="/create-project" element={
            <PrivateRoute roles={['teacher', 'admin']}>
              <CreateProjectPage />
            </PrivateRoute>
          } />
          <Route path="/admin" element={
            <PrivateRoute roles={['admin']}>
              <AdminDashboardPage />
            </PrivateRoute>
          } />

          {/* 404 */}
          <Route path="*" element={<Navigate to="/" />} />
        </Routes>
      </Container>
      <Footer />
    </div>
  );
}

export default App;
