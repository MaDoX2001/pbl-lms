import React, { useState, useEffect, useRef } from 'react';
import {
  Box,
  Paper,
  Typography,
  Table,
  TableBody,
  TableCell,
  TableRow,
  Divider,
  Chip,
  Button,
  CircularProgress,
  Alert
} from '@mui/material';
import { Print as PrintIcon, PictureAsPdf as PdfIcon } from '@mui/icons-material';
import axios from 'axios';

/**
 * StudentReport Component
 * 
 * Generates a printable/PDF-ready report for a student's project evaluation
 * Contains all evaluation data from both phases
 */
const StudentReport = ({ projectId, studentId, onClose }) => {
  const [loading, setLoading] = useState(true);
  const [reportData, setReportData] = useState(null);
  const [error, setError] = useState('');
  const printRef = useRef();

  useEffect(() => {
    fetchReportData();
  }, [projectId, studentId]);

  const fetchReportData = async () => {
    try {
      setLoading(true);

      // Fetch student info
      const studentRes = await axios.get(`/api/users/${studentId}`, {
        headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
      });
      const student = studentRes.data.data;

      // Fetch project info
      const projectRes = await axios.get(`/api/projects/${projectId}`, {
        headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
      });
      const project = projectRes.data.data;

      // Fetch final evaluation
      const finalRes = await axios.get(`/api/assessment/final/${projectId}/${studentId}`, {
        headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
      });
      const finalEval = finalRes.data.data;

      // Fetch attempts history
      let attempts = [];
      try {
        const attemptsRes = await axios.get(`/api/assessment/attempts/${projectId}/${studentId}`, {
          headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
        });
        attempts = attemptsRes.data.data || [];
      } catch {
        attempts = [];
      }

      setReportData({
        student,
        project,
        finalEval,
        attempts
      });

      setLoading(false);
    } catch (err) {
      console.error(err);
      setError('فشل في تحميل بيانات التقرير');
      setLoading(false);
    }
  };

  const handlePrint = () => {
    window.print();
  };

  const getVerbalGrade = (percentage) => {
    if (percentage >= 85) return { text: 'ممتاز', color: 'success' };
    if (percentage >= 75) return { text: 'جيد جدًا', color: 'info' };
    if (percentage >= 65) return { text: 'جيد', color: 'primary' };
    if (percentage >= 60) return { text: 'مقبول', color: 'warning' };
    return { text: 'غير مجتاز', color: 'error' };
  };

  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', p: 5 }}>
        <CircularProgress />
      </Box>
    );
  }

  if (error) {
    return <Alert severity="error">{error}</Alert>;
  }

  if (!reportData || !reportData.finalEval) {
    return <Alert severity="info">لا توجد بيانات تقييم لهذا الطالب في هذا المشروع</Alert>;
  }

  const { student, project, finalEval, attempts } = reportData;
  const verbalGrade = getVerbalGrade(finalEval.finalPercentage);
  const isPassed = finalEval.finalPercentage >= 60;

  return (
    <Box>
      {/* Print Buttons - Hidden during print */}
      <Box sx={{ mb: 3, display: 'flex', gap: 2, '@media print': { display: 'none' } }}>
        <Button
          variant="contained"
          startIcon={<PrintIcon />}
          onClick={handlePrint}
        >
          طباعة التقرير
        </Button>
        <Button variant="outlined" onClick={onClose}>
          إغلاق
        </Button>
      </Box>

      {/* Report Content - Printable */}
      <Paper
        ref={printRef}
        elevation={0}
        sx={{
          p: 4,
          bgcolor: 'white',
          '@media print': {
            boxShadow: 'none',
            p: 2
          }
        }}
      >
        {/* Header */}
        <Box sx={{ textAlign: 'center', mb: 4 }}>
          <Typography variant="h4" fontWeight={700} gutterBottom>
            تقرير تقييم الطالب
          </Typography>
          <Typography variant="h6" color="text.secondary">
            نظام التعلم القائم على المشروعات (PBL)
          </Typography>
          <Divider sx={{ my: 2 }} />
        </Box>

        {/* Student Information */}
        <Box sx={{ mb: 3 }}>
          <Typography variant="h6" fontWeight={600} gutterBottom sx={{ bgcolor: 'primary.light', p: 1 }}>
            معلومات الطالب
          </Typography>
          <Table size="small">
            <TableBody>
              <TableRow>
                <TableCell sx={{ fontWeight: 600, width: '30%' }}>الاسم:</TableCell>
                <TableCell>{student.name}</TableCell>
              </TableRow>
              <TableRow>
                <TableCell sx={{ fontWeight: 600 }}>البريد الإلكتروني:</TableCell>
                <TableCell>{student.email}</TableCell>
              </TableRow>
              <TableRow>
                <TableCell sx={{ fontWeight: 600 }}>المستوى الحالي:</TableCell>
                <TableCell>
                  <Chip label={student.level || 1} size="small" color="primary" />
                </TableCell>
              </TableRow>
            </TableBody>
          </Table>
        </Box>

        {/* Project Information */}
        <Box sx={{ mb: 3 }}>
          <Typography variant="h6" fontWeight={600} gutterBottom sx={{ bgcolor: 'secondary.light', p: 1 }}>
            معلومات المشروع
          </Typography>
          <Table size="small">
            <TableBody>
              <TableRow>
                <TableCell sx={{ fontWeight: 600, width: '30%' }}>عنوان المشروع:</TableCell>
                <TableCell>{project.title}</TableCell>
              </TableRow>
              <TableRow>
                <TableCell sx={{ fontWeight: 600 }}>مستوى المشروع:</TableCell>
                <TableCell>{project.projectLevel || project.difficulty}</TableCell>
              </TableRow>
              {project.projectOrder && (
                <TableRow>
                  <TableCell sx={{ fontWeight: 600 }}>ترتيب المشروع:</TableCell>
                  <TableCell>{project.projectOrder} من 6</TableCell>
                </TableRow>
              )}
              <TableRow>
                <TableCell sx={{ fontWeight: 600 }}>نوع المشروع:</TableCell>
                <TableCell>{project.isTeamProject ? 'مشروع جماعي' : 'مشروع فردي'}</TableCell>
              </TableRow>
            </TableBody>
          </Table>
        </Box>

        {/* Evaluation Scores */}
        <Box sx={{ mb: 3 }}>
          <Typography variant="h6" fontWeight={600} gutterBottom sx={{ bgcolor: 'success.light', p: 1 }}>
            درجات التقييم
          </Typography>
          <Table size="small">
            <TableBody>
              {project.isTeamProject && finalEval.groupScore !== undefined && (
                <TableRow>
                  <TableCell sx={{ fontWeight: 600, width: '30%' }}>المرحلة الأولى - التقييم الجماعي:</TableCell>
                  <TableCell>
                    <Typography variant="h6" color="primary.main">
                      {finalEval.groupScore} / 100
                    </Typography>
                  </TableCell>
                </TableRow>
              )}
              <TableRow>
                <TableCell sx={{ fontWeight: 600 }}>المرحلة الثانية - التقييم الفردي والشفهي:</TableCell>
                <TableCell>
                  <Typography variant="h6" color="secondary.main">
                    {finalEval.individualScore} / 100
                  </Typography>
                </TableCell>
              </TableRow>
              <TableRow>
                <TableCell sx={{ fontWeight: 600 }}>الدرجة النهائية:</TableCell>
                <TableCell>
                  <Typography variant="h5" fontWeight={700} color="success.main">
                    {finalEval.finalScore} / {project.isTeamProject ? '200' : '100'}
                  </Typography>
                </TableCell>
              </TableRow>
              <TableRow>
                <TableCell sx={{ fontWeight: 600 }}>النسبة المئوية:</TableCell>
                <TableCell>
                  <Typography variant="h5" fontWeight={700}>
                    {finalEval.finalPercentage.toFixed(2)}%
                  </Typography>
                </TableCell>
              </TableRow>
              <TableRow>
                <TableCell sx={{ fontWeight: 600 }}>التقدير:</TableCell>
                <TableCell>
                  <Chip label={verbalGrade.text} color={verbalGrade.color} sx={{ fontWeight: 700 }} />
                </TableCell>
              </TableRow>
              <TableRow>
                <TableCell sx={{ fontWeight: 600 }}>النتيجة:</TableCell>
                <TableCell>
                  <Chip 
                    label={isPassed ? 'ناجح ✓' : 'غير مجتاز ✗'}
                    color={isPassed ? 'success' : 'error'}
                    sx={{ fontWeight: 700 }}
                  />
                </TableCell>
              </TableRow>
            </TableBody>
          </Table>
        </Box>

        {/* Calculation Method */}
        <Box sx={{ mb: 3, p: 2, bgcolor: 'grey.100', borderRadius: 1 }}>
          <Typography variant="subtitle2" fontWeight={600} gutterBottom>
            طريقة الحساب:
          </Typography>
          <Typography variant="body2">
            {project.isTeamProject 
              ? `الدرجة النهائية = درجة التقييم الجماعي + درجة التقييم الفردي`
              : `الدرجة النهائية = درجة التقييم الفردي`}
          </Typography>
          <Typography variant="body2">
            النسبة المئوية = (الدرجة النهائية / {project.isTeamProject ? '200' : '100'}) × 100
          </Typography>
          <Typography variant="body2" sx={{ mt: 1, fontWeight: 600 }}>
            الحد الأدنى للنجاح: 60%
          </Typography>
        </Box>

        {/* Teacher Feedback */}
        {finalEval.feedbackSummary && (
          <Box sx={{ mb: 3 }}>
            <Typography variant="h6" fontWeight={600} gutterBottom sx={{ bgcolor: 'warning.light', p: 1 }}>
              ملاحظات المعلم
            </Typography>
            <Box sx={{ p: 2, border: '1px solid', borderColor: 'divider', borderRadius: 1 }}>
              <Typography variant="body1" sx={{ whiteSpace: 'pre-wrap' }}>
                {finalEval.feedbackSummary}
              </Typography>
            </Box>
          </Box>
        )}

        {/* Attempts History */}
        {attempts.length > 1 && (
          <Box sx={{ mb: 3 }}>
            <Typography variant="h6" fontWeight={600} gutterBottom sx={{ bgcolor: 'info.light', p: 1 }}>
              سجل المحاولات
            </Typography>
            <Table size="small">
              <TableBody>
                {attempts.map((attempt, index) => (
                  <TableRow key={attempt._id}>
                    <TableCell sx={{ fontWeight: 600 }}>المحاولة {index + 1}:</TableCell>
                    <TableCell>
                      {attempt.finalPercentage?.toFixed(2)}% 
                      {index === attempts.length - 1 && ' (المحاولة الحالية)'}
                    </TableCell>
                    <TableCell>
                      {new Date(attempt.createdAt).toLocaleDateString('ar-EG')}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </Box>
        )}

        {/* Footer */}
        <Box sx={{ mt: 5, pt: 3, borderTop: '2px solid', borderColor: 'divider', textAlign: 'center' }}>
          <Typography variant="body2" color="text.secondary">
            تم إنشاء هذا التقرير في: {new Date().toLocaleDateString('ar-EG', { 
              year: 'numeric', 
              month: 'long', 
              day: 'numeric',
              hour: '2-digit',
              minute: '2-digit'
            })}
          </Typography>
          <Typography variant="caption" color="text.secondary" display="block" sx={{ mt: 1 }}>
            نظام التعلم القائم على المشروعات (PBL) - جميع الحقوق محفوظة
          </Typography>
        </Box>
      </Paper>
    </Box>
  );
};

export default StudentReport;
