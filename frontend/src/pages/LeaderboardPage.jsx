import React, { useEffect, useState } from 'react';
import {
  Box,
  Typography,
  Paper,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Avatar,
  Chip,
  CircularProgress,
} from '@mui/material';
import EmojiEventsIcon from '@mui/icons-material/EmojiEvents';
import api from '../services/api';

const LeaderboardPage = () => {
  const [leaderboard, setLeaderboard] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchLeaderboard = async () => {
      try {
        const response = await api.get('/users/stats/leaderboard?limit=50');
        setLeaderboard(response.data.data);
      } catch (error) {
        console.error('Error fetching leaderboard:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchLeaderboard();
  }, []);

  const getMedalColor = (rank) => {
    if (rank === 1) return '#FFD700'; // Gold
    if (rank === 2) return '#C0C0C0'; // Silver
    if (rank === 3) return '#CD7F32'; // Bronze
    return 'transparent';
  };

  return (
    <Box>
      <Box sx={{ textAlign: 'center', mb: 4 }}>
        <EmojiEventsIcon sx={{ fontSize: 60, color: 'primary.main', mb: 2 }} />
        <Typography variant="h3" component="h1" gutterBottom fontWeight={700}>
          لوحة المتصدرين
        </Typography>
        <Typography variant="body1" color="text.secondary">
          أفضل الطلاب على المنصة حسب النقاط المكتسبة
        </Typography>
      </Box>

      {loading ? (
        <Box sx={{ display: 'flex', justifyContent: 'center', py: 8 }}>
          <CircularProgress />
        </Box>
      ) : (
        <TableContainer component={Paper}>
          <Table>
            <TableHead>
              <TableRow sx={{ bgcolor: 'grey.100' }}>
                <TableCell align="center" width={80}>
                  <strong>الترتيب</strong>
                </TableCell>
                <TableCell>
                  <strong>الطالب</strong>
                </TableCell>
                <TableCell align="center">
                  <strong>المستوى</strong>
                </TableCell>
                <TableCell align="center">
                  <strong>النقاط</strong>
                </TableCell>
                <TableCell align="center">
                  <strong>المشاريع المكتملة</strong>
                </TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {leaderboard.map((student, index) => (
                <TableRow
                  key={student._id}
                  sx={{
                    '&:hover': { bgcolor: 'grey.50' },
                    bgcolor: getMedalColor(index + 1) !== 'transparent' 
                      ? `${getMedalColor(index + 1)}15` 
                      : 'inherit',
                  }}
                >
                  <TableCell align="center">
                    <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 1 }}>
                      {index + 1 <= 3 && (
                        <Box
                          sx={{
                            width: 32,
                            height: 32,
                            borderRadius: '50%',
                            bgcolor: getMedalColor(index + 1),
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            fontWeight: 700,
                            color: 'white',
                          }}
                        >
                          {index + 1}
                        </Box>
                      )}
                      {index + 1 > 3 && (
                        <Typography fontWeight={600}>
                          {index + 1}
                        </Typography>
                      )}
                    </Box>
                  </TableCell>
                  <TableCell>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                      <Avatar src={student.avatar} alt={student.name}>
                        {student.name.charAt(0)}
                      </Avatar>
                      <Typography fontWeight={500}>
                        {student.name}
                      </Typography>
                    </Box>
                  </TableCell>
                  <TableCell align="center">
                    <Chip 
                      label={`المستوى ${student.level}`} 
                      color="primary" 
                      size="small" 
                    />
                  </TableCell>
                  <TableCell align="center">
                    <Typography fontWeight={600} color="primary.main">
                      {student.points}
                    </Typography>
                  </TableCell>
                  <TableCell align="center">
                    {student.completedProjects?.length || 0}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>
      )}

      {!loading && leaderboard.length === 0 && (
        <Paper sx={{ p: 4, textAlign: 'center' }}>
          <Typography color="text.secondary">
            لا توجد بيانات متاحة حالياً
          </Typography>
        </Paper>
      )}
    </Box>
  );
};

export default LeaderboardPage;
