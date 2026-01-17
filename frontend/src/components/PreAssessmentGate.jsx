import { useEffect } from 'react';
import { useSelector } from 'react-redux';
import { useNavigate, useLocation } from 'react-router-dom';
import { CircularProgress, Box } from '@mui/material';

/**
 * PreAssessmentGate Component
 * 
 * Ensures students complete the pre-assessment before accessing the platform.
 * Wraps the main app content and checks authentication status and pre-assessment completion.
 * 
 * Rules:
 * 1. If auth is loading, show loading spinner
 * 2. If user is not a student (teacher/admin), allow access
 * 3. If student's preAssessmentStatus is 'completed', allow access
 * 4. If student's preAssessmentStatus is 'not_started', redirect to /preassessment
 * 
 * Single Source of Truth: user.preAssessmentStatus comes from /api/users/me
 */
const PreAssessmentGate = ({ children }) => {
  const navigate = useNavigate();
  const location = useLocation();
  const { user, loading } = useSelector((state) => state.auth);

  useEffect(() => {
    // Don't check while auth is loading
    if (loading) return;

    // Don't check on the pre-assessment page itself
    if (location.pathname === '/preassessment') return;

    // Only enforce for students
    if (!user || user.role !== 'student') return;

    // Redirect students who haven't completed the assessment
    if (user.preAssessmentStatus === 'not_started') {
      navigate('/preassessment', { replace: true });
    }
  }, [user, loading, location.pathname, navigate]);

  // Show loading spinner while checking authentication
  if (loading) {
    return (
      <Box
        sx={{
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          minHeight: '100vh',
        }}
      >
        <CircularProgress />
      </Box>
    );
  }

  // Allow access
  return children;
};

export default PreAssessmentGate;
