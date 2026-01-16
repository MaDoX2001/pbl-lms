import React from 'react';
import { useSelector } from 'react-redux';
import { Container } from '@mui/material';
import StudentProfile from '../components/profile/StudentProfile';
import TeacherProfile from '../components/profile/TeacherProfile';

const NewProfilePage = () => {
  const { user } = useSelector((state) => state.auth);

  if (!user) {
    return null;
  }

  return (
    <Container maxWidth="xl" sx={{ py: 4 }}>
      {user.role === 'student' ? (
        <StudentProfile user={user} />
      ) : user.role === 'teacher' || user.role === 'admin' ? (
        <TeacherProfile user={user} />
      ) : null}
    </Container>
  );
};

export default NewProfilePage;
