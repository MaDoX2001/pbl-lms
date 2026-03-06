/**
 * MilestoneTimeline
 *
 * Visual timeline of project milestones.
 * Shows each milestone in order with optional deadline-based estimated dates.
 * Completed milestones are highlighted based on the provided completedIds set.
 */
import { Box, Typography, Chip, Tooltip, Paper } from '@mui/material';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import RadioButtonUncheckedIcon from '@mui/icons-material/RadioButtonUnchecked';
import LockIcon from '@mui/icons-material/Lock';
import { useAppSettings } from '../context/AppSettingsContext';

// Distribute milestones across the available time window equally
const estimateDates = (milestones, deadline) => {
  if (!deadline || !milestones?.length) return {};
  const nowMs = Date.now();
  const endMs = new Date(deadline).getTime();
  if (endMs <= nowMs) return {};
  const step = (endMs - nowMs) / milestones.length;
  return Object.fromEntries(
    milestones.map((m, i) => [String(m._id), new Date(nowMs + step * (i + 1))])
  );
};

const MilestoneTimeline = ({ milestones = [], deadline = null, completedIds = new Set() }) => {
  const { language } = useAppSettings();
  const isAr = language === 'ar';

  if (!milestones.length) return null;

  const sorted = [...milestones].sort((a, b) => (a.order ?? 0) - (b.order ?? 0));
  const dates = estimateDates(sorted, deadline);

  return (
    <Box sx={{ position: 'relative', py: 1 }}>
      {/* Vertical connector line */}
      <Box sx={{
        position: 'absolute',
        [isAr ? 'right' : 'left']: 20,
        top: 0,
        bottom: 0,
        width: 3,
        bgcolor: 'divider',
        zIndex: 0,
      }} />

      {sorted.map((ms, idx) => {
        const id = String(ms._id);
        const done = completedIds.has(id);
        // Lock it if the previous milestone is not done (optional UX)
        const prevDone = idx === 0 ? true : completedIds.has(String(sorted[idx - 1]._id));
        const locked = !done && !prevDone && idx > 0;

        return (
          <Box
            key={id}
            sx={{
              display: 'flex',
              alignItems: 'flex-start',
              gap: 2,
              mb: 2.5,
              position: 'relative',
              flexDirection: isAr ? 'row-reverse' : 'row',
            }}
          >
            {/* Icon */}
            <Box sx={{ zIndex: 1, flexShrink: 0, mt: 0.5 }}>
              {done
                ? <CheckCircleIcon color="success" sx={{ fontSize: 26 }} />
                : locked
                  ? <Tooltip title={isAr ? 'أكمل المرحلة السابقة أولاً' : 'Complete previous milestone first'}>
                      <LockIcon color="disabled" sx={{ fontSize: 26 }} />
                    </Tooltip>
                  : <RadioButtonUncheckedIcon color="primary" sx={{ fontSize: 26 }} />
              }
            </Box>

            {/* Content */}
            <Paper
              variant="outlined"
              sx={{
                flex: 1,
                p: 1.5,
                borderColor: done ? 'success.main' : locked ? 'divider' : 'primary.main',
                bgcolor: done ? 'success.light' : 'background.paper',
                opacity: locked ? 0.55 : 1,
                borderRadius: 2,
              }}
            >
              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 1 }}>
                <Typography
                  variant="body1"
                  fontWeight={600}
                  sx={{ textDecoration: done ? 'line-through' : 'none', color: done ? 'text.secondary' : 'text.primary' }}
                >
                  {idx + 1}. {ms.title}
                </Typography>
                <Box sx={{ display: 'flex', gap: 0.5, flexWrap: 'wrap' }}>
                  {ms.points > 0 && (
                    <Chip size="small" label={`${ms.points} ${isAr ? 'نقطة' : 'pts'}`} color="info" variant="outlined" />
                  )}
                  {done && <Chip size="small" label={isAr ? 'مكتمل ✓' : 'Done ✓'} color="success" />}
                  {dates[id] && !done && (
                    <Chip
                      size="small"
                      label={`${isAr ? 'حتى' : 'by'} ${dates[id].toLocaleDateString(isAr ? 'ar-EG' : 'en-GB')}`}
                      variant="outlined"
                      color="warning"
                    />
                  )}
                </Box>
              </Box>
              {ms.description && (
                <Typography variant="caption" color="text.secondary" display="block" sx={{ mt: 0.5 }}>
                  {ms.description}
                </Typography>
              )}
            </Paper>
          </Box>
        );
      })}
    </Box>
  );
};

export default MilestoneTimeline;
