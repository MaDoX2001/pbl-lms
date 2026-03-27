import React, { useState, useRef, useEffect, useCallback } from 'react';
import {
  Box, Typography, TextField, IconButton, Paper, Avatar,
  CircularProgress, Divider, Chip, Tooltip, Snackbar,
  Button, Dialog, DialogTitle, DialogContent, DialogActions,
  FormControl, InputLabel, Select, MenuItem, Alert
} from '@mui/material';
import SendIcon from '@mui/icons-material/Send';
import SmartToyIcon from '@mui/icons-material/SmartToy';
import PersonIcon from '@mui/icons-material/Person';
import DeleteOutlineIcon from '@mui/icons-material/DeleteOutline';
import ContentCopyIcon from '@mui/icons-material/ContentCopy';
import CheckIcon from '@mui/icons-material/Check';
import ReplyIcon from '@mui/icons-material/Reply';
import CloseIcon from '@mui/icons-material/Close';
import AutoFixHighIcon from '@mui/icons-material/AutoFixHigh';
import LightbulbIcon from '@mui/icons-material/Lightbulb';
import AssessmentIcon from '@mui/icons-material/Assessment';
import StorageIcon from '@mui/icons-material/Storage';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import ErrorOutlineIcon from '@mui/icons-material/ErrorOutline';
import { useAppSettings } from '../context/AppSettingsContext';
import { useSelector } from 'react-redux';
import api from '../services/api';

const STORAGE_KEY = 'ai_chat_messages';
const SUMMARY_KEY = 'ai_chat_summary';

const SUGGESTIONS_AR_STUDENT = [
  'اشرح لي كيفية استخدام LED مع Arduino',
  'ما الفرق بين analogRead و digitalRead؟',
  'كيف أربط sensor الحرارة DHT11؟',
  'ما هي خطوتي التالية في المنصة؟',
];
const SUGGESTIONS_EN_STUDENT = [
  'Explain how to use LED with Arduino',
  'What is the difference between analogRead and digitalRead?',
  'How to connect DHT11 temperature sensor?',
  'What is my next step on the platform?',
];
const SUGGESTIONS_AR_TEACHER = [
  'قولي مين الطلاب اللي عندي على المنصة حالياً',
  'هل هناك طلاب متعثرون؟',
  'ساعدني في كتابة معايير تقييم لمشروع Arduino',
  'اعطني نظرة عامة على المنصة',
];
const SUGGESTIONS_EN_TEACHER = [
  'List all students on the platform',
  'Are there any struggling students?',
  'Help me write evaluation criteria for an Arduino project',
  'Give me a platform overview',
];

// Stable React key generator — counter + timestamp guarantees no collision
let _keySeq = 0;
const makeKey = () => `${Date.now()}-${++_keySeq}`;

const ARABIC_CHAR_REGEX = /[\u0600-\u06FF\u0750-\u077F\u08A0-\u08FF]/;
const detectTextRTL = (text = '') => ARABIC_CHAR_REGEX.test(text);

// Map function names to Arabic labels
const ACTION_LABELS = {
  list_students: 'عرض قائمة الطلاب',
  get_student_details: 'جلب تفاصيل الطالب',
  get_project_stats: 'إحصاءات المشروع',
  list_teams: 'عرض الفرق',
  get_struggling_students: 'رصد الطلاب المتعثرين',
  grant_retake: 'منح إذن إعادة التقييم',
  get_platform_overview: 'نظرة عامة على المنصة',
};

// Action card shown in chat when AI executed a DB function
const ActionCard = ({ name, result }) => {
  const label = ACTION_LABELS[name] || name;
  const success = result?.success !== false;
  return (
    <Box sx={{
      display: 'inline-flex', alignItems: 'flex-start', gap: 1,
      bgcolor: success ? 'success.50' : 'error.50',
      border: '1px solid',
      borderColor: success ? 'success.200' : 'error.200',
      borderRadius: 2, px: 1.5, py: 0.75, mb: 0.5, maxWidth: '100%',
    }}>
      <StorageIcon sx={{ fontSize: 16, color: success ? 'success.main' : 'error.main', mt: 0.25, flexShrink: 0 }} />
      <Box>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
          {success
            ? <CheckCircleIcon sx={{ fontSize: 14, color: 'success.main' }} />
            : <ErrorOutlineIcon sx={{ fontSize: 14, color: 'error.main' }} />}
          <Typography variant="caption" fontWeight={700} color={success ? 'success.dark' : 'error.dark'}>
            {label}
          </Typography>
        </Box>
        {result?.error && (
          <Typography variant="caption" color="error.main" sx={{ display: 'block', mt: 0.25 }}>
            {result.error}
          </Typography>
        )}
        {result?.message && (
          <Typography variant="caption" color="success.dark" sx={{ display: 'block', mt: 0.25 }}>
            {result.message}
          </Typography>
        )}
      </Box>
    </Box>
  );
};

// Render message content: parse ```code``` blocks
const MessageContent = ({ content, streaming = false, isRTL = false }) => {
  const [copied, setCopied] = useState(null);

  const copyCode = useCallback((code, index) => {
    navigator.clipboard.writeText(code).then(() => {
      setCopied(index);
      setTimeout(() => setCopied(null), 2000);
    });
  }, []);

  const parts = content.split(/(```[\s\S]*?```)/g);

  return (
    <Box>
      {parts.map((part, i) => {
        if (part.startsWith('```')) {
          const withoutFences = part.replace(/^```\w*\n?/, '').replace(/\n?```$/, '');
          return (
            <Box key={i} sx={{ position: 'relative', my: 1 }}>
              <Box
                component="pre"
                sx={{
                  bgcolor: '#1e1e1e',
                  color: '#d4d4d4',
                  p: 1.5,
                  pr: 5,
                  borderRadius: 1,
                  fontFamily: 'Consolas, Monaco, monospace',
                  fontSize: '0.78rem',
                  whiteSpace: 'pre-wrap',
                  wordBreak: 'break-word',
                  overflowX: 'auto',
                  m: 0,
                }}
              >
                {withoutFences}
              </Box>
              <Tooltip title={copied === i ? 'Copied!' : 'Copy code'}>
                <IconButton
                  size="small"
                  onClick={() => copyCode(withoutFences, i)}
                  sx={{
                    position: 'absolute', top: 4, right: 4,
                    color: copied === i ? 'success.main' : 'grey.400',
                    bgcolor: 'rgba(255,255,255,0.05)',
                    '&:hover': { bgcolor: 'rgba(255,255,255,0.15)' },
                  }}
                >
                  {copied === i ? <CheckIcon sx={{ fontSize: 14 }} /> : <ContentCopyIcon sx={{ fontSize: 14 }} />}
                </IconButton>
              </Tooltip>
            </Box>
          );
        }
        return (
          <Typography
            key={i}
            variant="body2"
            dir={isRTL ? 'rtl' : 'ltr'}
            sx={{ whiteSpace: 'pre-wrap', lineHeight: 1.8, textAlign: isRTL ? 'right' : 'left', unicodeBidi: 'plaintext' }}
          >
            {part}
          </Typography>
        );
      })}
      {streaming && (
        <Box
          component="span"
          sx={{
            display: 'inline-block',
            width: '2px',
            height: '0.85em',
            bgcolor: 'text.primary',
            ...(isRTL ? { mr: 0.25 } : { ml: 0.25 }),
            verticalAlign: 'middle',
            animation: 'cursorBlink 1s step-end infinite',
            '@keyframes cursorBlink': { '50%': { opacity: 0 } },
          }}
        />
      )}
    </Box>
  );
};

const AIChatPage = () => {
  const { t, direction, language } = useAppSettings();
  const { user } = useSelector((state) => state.auth);
  const isRTL = language === 'ar';
  const pageDirection = isRTL ? 'rtl' : 'ltr';
  const pageTextAlign = isRTL ? 'right' : 'left';
  const isTeacher = user?.role === 'teacher' || user?.role === 'admin';

  const [messages, setMessages] = useState(() => {
    try {
      if (user?.role === 'admin') return []; // will load from DB
      const saved = localStorage.getItem(STORAGE_KEY);
      return saved ? JSON.parse(saved).slice(-20) : [];
    } catch { return []; }
  });
  const [summary, setSummary] = useState(() => {
    try {
      if (user?.role === 'admin') return ''; // will load from DB
      return localStorage.getItem(SUMMARY_KEY) || '';
    } catch { return ''; }
  });
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [copySnack, setCopySnack] = useState(false);
  const [rateSnack, setRateSnack] = useState(false); // shown when sending too fast
  const [replyTo, setReplyTo] = useState(null); // { role, content }

  // AI Tools state
  const [aiProjects, setAiProjects] = useState([]);
  const [analyticsDialog, setAnalyticsDialog] = useState(false);
  const [analyticsProjectId, setAnalyticsProjectId] = useState('');
  const [analyticsLoading, setAnalyticsLoading] = useState(false);
  const [analyticsResult, setAnalyticsResult] = useState('');
  const [remedialDialog, setRemedialDialog] = useState(false);
  const [remedialLoading, setRemedialLoading] = useState(false);
  const [remedialResult, setRemedialResult] = useState('');
  const [ideasDialog, setIdeasDialog] = useState(false);
  const [ideasLoading, setIdeasLoading] = useState(false);
  const [ideasResult, setIdeasResult] = useState('');
  const messagesEndRef = useRef(null);
  const inputRef = useRef(null);
  const isSendingRef = useRef(false);       // deduplication guard — prevents double-send on rapid clicks
  const lastSendTimeRef = useRef(0);        // client-side rate guard (2s minimum between manual sends)
  const summarySaveTimerRef = useRef(null); // debounces POST /ai/summary/save DB writes
  const newMsgCountRef = useRef(0);         // counts new messages added this session (for summarize trigger)

  const suggestions = isTeacher
    ? (language === 'ar' ? SUGGESTIONS_AR_TEACHER : SUGGESTIONS_EN_TEACHER)
    : (language === 'ar' ? SUGGESTIONS_AR_STUDENT : SUGGESTIONS_EN_STUDENT);
  const inputIsRTL = input.trim() ? detectTextRTL(input) : isRTL;

  // All roles: load messages + summary from DB on mount.
  // DB is the source of truth — wins over localStorage for summary.
  // For non-admin, localStorage messages are used as initial state (fast); DB may
  // contain more recent messages from other devices which will replace localStorage ones.
  useEffect(() => {
    setHistoryLoading(true);
    api.get('/ai/history')
      .then(res => {
        const data = res.data.data || {};
        // Assign stable _key to every message coming from DB so React key stays consistent
        if (data.messages?.length > 0) setMessages(data.messages.map(m => ({ ...m, _key: makeKey() })));
        if (data.summary) setSummary(data.summary); // DB wins over localStorage
      })
      .catch(() => {}) // silent fail — localStorage values remain as fallback
      .finally(() => setHistoryLoading(false));
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // Cleanup: cancel pending debounced summary write when the component unmounts
  useEffect(() => {
    return () => clearTimeout(summarySaveTimerRef.current);
  }, []);

  // Load projects for teacher analytics dialog
  useEffect(() => {
    if (isTeacher) {
      api.get('/projects').then(res => setAiProjects(res.data.data || [])).catch(() => {});
    }
  }, [isTeacher]);

  const handleTeacherAnalytics = async () => {
    if (!analyticsProjectId) return;
    setAnalyticsLoading(true);
    setAnalyticsResult('');
    try {
      const res = await api.post('/ai/teacher-analytics', { projectId: analyticsProjectId });
      setAnalyticsResult(res.data.data?.analysis || '');
    } catch (err) {
      setAnalyticsResult(err.response?.data?.message || 'حدثت مشكلة أثناء إنشاء التقرير.');
    } finally {
      setAnalyticsLoading(false);
    }
  };

  const handleRemedialActivities = async () => {
    setRemedialDialog(true);
    if (remedialResult) return;
    setRemedialLoading(true);
    try {
      const res = await api.post('/ai/remedial');
      setRemedialResult(res.data.data?.activities || '');
    } catch (err) {
      setRemedialResult(err.response?.data?.message || 'حدثت مشكلة.');
    } finally {
      setRemedialLoading(false);
    }
  };

  const handleProjectIdeas = async () => {
    setIdeasDialog(true);
    if (ideasResult) return;
    setIdeasLoading(true);
    try {
      const res = await api.get('/ai/project-ideas');
      setIdeasResult(res.data.data?.ideas || '');
    } catch (err) {
      setIdeasResult(err.response?.data?.message || 'حدثت مشكلة.');
    } finally {
      setIdeasLoading(false);
    }
  };

  // Non-admin: persist messages to localStorage (capped at 20 to mirror DB limit)
  useEffect(() => {
    if (user?.role === 'admin') return;
    try {
      const trimmed = messages.slice(-20);
      localStorage.setItem(STORAGE_KEY, JSON.stringify(trimmed));
    } catch {}
  }, [messages, user?.role]);

  // Non-admin: persist summary to localStorage
  useEffect(() => {
    if (user?.role === 'admin') return;
    try {
      if (summary) localStorage.setItem(SUMMARY_KEY, summary);
      else localStorage.removeItem(SUMMARY_KEY);
    } catch {}
  }, [summary, user?.role]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, loading]);

  // Background summarization: called silently after new messages arrive
  const triggerSummarize = useCallback(async (batch, prevSummary) => {
    try {
      const res = await api.post('/ai/summarize', { previousSummary: prevSummary, messages: batch });
      const newSummary = res.data.data.summary;
      setSummary(newSummary);
      // Debounced DB write: if two summarisations fire close together, only the last one writes
      clearTimeout(summarySaveTimerRef.current);
      summarySaveTimerRef.current = setTimeout(() => {
        api.post('/ai/summary/save', { summary: newSummary }).catch(() => {});
      }, 2000);
    } catch (err) {
      console.warn('Background summarize failed silently:', err.message);
    }
  }, []);

  const sendMessage = useCallback(async (text) => {
    const userText = (text || input).trim();
    if (!userText || loading || isSendingRef.current) return;
    // 2-second client-side rate guard — only applies to manual keyboard/button sends,
    // not to suggestion-chip clicks (those pass `text` explicitly)
    if (!text) {
      const now = Date.now();
      if (now - lastSendTimeRef.current < 2000) { setRateSnack(true); return; }
      lastSendTimeRef.current = now;
    }
    isSendingRef.current = true;

    // Prepend quoted message so AI sees the reply context
    const fullText = replyTo
      ? `[رد على: "${replyTo.content.slice(0, 120)}${replyTo.content.length > 120 ? '...' : ''}"]
${userText}`
      : userText;

    const userMsg = { role: 'user', content: userText, replyTo: replyTo || undefined, _key: makeKey() };
    const newMessages = [...messages, userMsg];
    setMessages(newMessages);
    setInput('');
    setReplyTo(null);
    setLoading(true);

    const history = newMessages.slice(0, -1).slice(-6);

    try {
      const placeholderKey = makeKey();
      setMessages([...newMessages, { role: 'assistant', content: '', loading: true, suggestions: [], projectProgress: null, _key: placeholderKey }]);

      const res = await api.post('/ai/chat', { message: fullText, history, summary });
      const {
        text,
        suggestions: finalSuggestions = [],
        projectProgress = null,
        guardTriggered: finalGuardTriggered = false,
        agentAction,
      } = res.data;

      setMessages(prev => {
        const updated = [...prev];
        const last = updated[updated.length - 1];
        if (last?._key === placeholderKey) {
          updated[updated.length - 1] = {
            ...last,
            content: text,
            loading: false,
            suggestions: finalSuggestions,
            projectProgress,
            guardTriggered: finalGuardTriggered,
            actions: agentAction ? [{ name: agentAction.name, result: agentAction.result }] : [],
          };
        }
        return updated;
      });

      const updatedMessages = [...newMessages, { role: 'assistant', content: text, suggestions: finalSuggestions, projectProgress, guardTriggered: finalGuardTriggered, _key: placeholderKey }];
      newMsgCountRef.current += 2;
      if (newMsgCountRef.current >= 6 && newMsgCountRef.current % 6 === 0) {
        triggerSummarize(updatedMessages.slice(-12, -6), summary);
      }
    } catch (err) {
      const errMsg = err.response?.status === 429
        ? (t('aiRateLimited') || 'خدمة الذكاء الاصطناعي مزدحمة حالياً، حاول بعد دقيقة.')
        : err.response?.data?.message || err.message || t('aiError') || 'AI service temporarily unavailable.';
      setMessages(prev => [
        ...prev.filter(m => !(m.role === 'assistant' && m.loading)),
        { role: 'assistant', content: errMsg, error: true, _key: makeKey() },
      ]);
    } finally {
      setLoading(false);
      isSendingRef.current = false;
      inputRef.current?.focus();
    }
  }, [input, loading, messages, summary, replyTo, t, triggerSummarize]); // eslint-disable-line react-hooks/exhaustive-deps

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  const clearChat = () => {
    clearTimeout(summarySaveTimerRef.current); // cancel any pending debounced DB summary write
    setMessages([]);
    setSummary('');
    // Clear DB (messages + summary) for all roles — getHistory/clearHistory now open to all
    api.delete('/ai/history').catch(() => {});
    // Also clear localStorage for non-admin
    try {
      localStorage.removeItem(STORAGE_KEY);
      localStorage.removeItem(SUMMARY_KEY);
    } catch {}
  };

  const copyMessage = (content) => {
    navigator.clipboard.writeText(content).then(() => setCopySnack(true));
  };

  return (
    <Box sx={{ height: 'calc(100vh - 64px)', display: 'flex', flexDirection: 'column', direction: pageDirection, textAlign: pageTextAlign }}>
      {/* Header */}
      <Box sx={{
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        px: 3, py: 0.75, borderBottom: '1px solid', borderColor: 'divider',
        flexDirection: isRTL ? 'row-reverse' : 'row',
      }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, flexDirection: isRTL ? 'row-reverse' : 'row' }}>
          <SmartToyIcon sx={{ color: 'primary.main', fontSize: 22 }} />
          <Box>
            <Typography variant="subtitle2" fontWeight={700} lineHeight={1.2}>{t('aiAssistantTitle')}</Typography>
            <Typography variant="caption" color="text.secondary" sx={{ fontSize: '0.65rem' }}>{t('aiPoweredBy')}</Typography>
          </Box>
        </Box>
        {messages.length > 0 && (
          <IconButton onClick={clearChat} size="small" title={t('aiClearChat')}>
            <DeleteOutlineIcon fontSize="small" />
          </IconButton>
        )}
      </Box>

      {/* Messages */}
      <Box sx={{ flex: 1, overflowY: 'auto', px: { xs: 1.5, md: 3 }, py: 2 }}>
        {historyLoading && messages.length === 0 ? (
          // Only show full-page spinner when there are no messages yet (e.g. admin with no localStorage).
          // Non-admin users see their localStorage messages immediately while the DB fetch runs.
          <Box sx={{ display: 'flex', justifyContent: 'center', mt: 6 }}>
            <CircularProgress />
          </Box>
        ) : messages.length === 0 ? (
          <Box sx={{ textAlign: pageTextAlign, mt: 6 }}>
            <SmartToyIcon sx={{ fontSize: 64, color: 'primary.main', opacity: 0.5, mb: 2 }} />
            <Typography variant="h6" fontWeight={600} gutterBottom>{t('aiWelcome')}</Typography>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 4 }}>{t('aiWelcomeDesc')}</Typography>
            <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1, justifyContent: isRTL ? 'flex-start' : 'flex-end' }}>
              {suggestions.map((s, i) => (
                <Chip
                  key={i}
                  label={<span dir={pageDirection}>{s}</span>}
                  onClick={() => sendMessage(s)}
                  variant="outlined"
                  color="primary"
                  sx={{ cursor: 'pointer', '&:hover': { bgcolor: 'primary.light', color: 'white' } }}
                />
              ))}
            </Box>

            {/* AI Quick Tool Buttons */}
            <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1.5, justifyContent: isRTL ? 'flex-start' : 'flex-end', mt: 3 }}>
              {isTeacher ? (
                <Button
                  variant="outlined"
                  startIcon={<AssessmentIcon />}
                  onClick={() => { setAnalyticsDialog(true); setAnalyticsResult(''); }}
                  size="small"
                >
                  تقرير تحليلي للطلاب
                </Button>
              ) : (
                <>
                  <Button
                    variant="outlined"
                    color="secondary"
                    startIcon={<AutoFixHighIcon />}
                    onClick={handleRemedialActivities}
                    size="small"
                  >
                    أنشطة علاجية مقترحة
                  </Button>
                  <Button
                    variant="outlined"
                    color="success"
                    startIcon={<LightbulbIcon />}
                    onClick={handleProjectIdeas}
                    size="small"
                  >
                    أفكار مشاريع Arduino
                  </Button>
                </>
              )}
            </Box>
          </Box>
        ) : (
          messages.map((msg, i) => (
            (() => {
              const messageIsRTL = detectTextRTL(msg.content || '');
              return (
            <Box
              key={msg._key || i}
              sx={{
                display: 'flex',
                mb: 2,
                flexDirection: isRTL
                  ? (msg.role === 'user' ? 'row' : 'row-reverse')
                  : (msg.role === 'user' ? 'row-reverse' : 'row'),
                alignItems: 'flex-start',
                gap: 1.5,
                '&:hover .reply-btn': { opacity: 1 },
              }}
            >
              <Avatar sx={{
                bgcolor: msg.role === 'user' ? 'primary.main' : 'success.main',
                width: 36, height: 36, flexShrink: 0,
              }}>
                {msg.role === 'user' ? <PersonIcon fontSize="small" /> : <SmartToyIcon fontSize="small" />}
              </Avatar>
              <Box sx={{ maxWidth: '75%', position: 'relative' }}>
                <Paper
                  dir="auto"
                  elevation={0}
                  sx={{
                    px: 2, py: 1.5,
                    bgcolor: msg.role === 'user' ? 'primary.main' : (msg.error ? 'error.light' : 'action.hover'),
                    color: msg.role === 'user' ? 'white' : 'text.primary',
                    borderRadius: msg.role === 'user'
                      ? (isRTL ? '16px 4px 16px 16px' : '4px 16px 16px 16px')
                      : (isRTL ? '4px 16px 16px 16px' : '16px 4px 16px 16px'),
                    direction: msg.role === 'assistant' ? (messageIsRTL ? 'rtl' : 'ltr') : 'inherit',
                    textAlign: msg.role === 'assistant' ? (messageIsRTL ? 'right' : 'left') : 'start',
                    unicodeBidi: 'plaintext',
                  }}
                >
                  {/* Quoted reply preview inside bubble */}
                  {msg.replyTo && (
                    <Box sx={{
                      borderLeft: isRTL ? 'none' : '3px solid',
                      borderRight: isRTL ? '3px solid' : 'none',
                      borderColor: msg.role === 'user' ? 'rgba(255,255,255,0.5)' : 'primary.main',
                      pl: isRTL ? 0 : 1, pr: isRTL ? 1 : 0,
                      mb: 1, opacity: 0.85,
                    }}>
                      <Typography variant="caption" sx={{
                        display: 'block', fontWeight: 600,
                        color: msg.role === 'user' ? 'rgba(255,255,255,0.8)' : 'primary.main',
                        mb: 0.25,
                      }}>
                        {msg.replyTo.role === 'user' ? (language === 'ar' ? 'أنت' : 'You') : (language === 'ar' ? 'المساعد' : 'Assistant')}
                      </Typography>
                      <Typography variant="caption" sx={{
                        whiteSpace: 'pre-wrap',
                        color: msg.role === 'user' ? 'rgba(255,255,255,0.75)' : 'text.secondary',
                        overflow: 'hidden', textOverflow: 'ellipsis',
                        display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical',
                      }}>
                        {msg.replyTo.content}
                      </Typography>
                    </Box>
                  )}
                  {msg.role === 'user' ? (
                    <Typography variant="body2" dir="auto" sx={{ whiteSpace: 'pre-wrap', lineHeight: 1.7, textAlign: 'start', unicodeBidi: 'plaintext' }}>
                      {msg.content}
                    </Typography>
                  ) : (
                    <>
                      {msg.actions?.length > 0 && (
                        <Box sx={{ mb: 0.75, display: 'flex', flexDirection: 'column', gap: 0.5 }}>
                          {msg.actions.map((a, i) => (
                            <ActionCard key={i} name={a.name} result={a.result} />
                          ))}
                        </Box>
                      )}
                      <MessageContent content={msg.content} streaming={!!msg.loading} isRTL={messageIsRTL} />
                    </>
                  )}
                </Paper>
                {/* Action buttons row */}
                <Box sx={{ display: 'flex', alignItems: 'center', mt: 0.25, ...(isRTL ? { mr: 0.5 } : { ml: 0.5 }) }}>
                  <Tooltip title={language === 'ar' ? 'رد' : 'Reply'}>
                    <IconButton
                      size="small"
                      className="reply-btn"
                      onClick={() => { setReplyTo({ role: msg.role, content: msg.content }); inputRef.current?.focus(); }}
                      sx={{ opacity: 0, transition: 'opacity 0.15s', color: 'text.disabled', '&:hover': { color: 'text.secondary' } }}
                    >
                      <ReplyIcon sx={{ fontSize: 14 }} />
                    </IconButton>
                  </Tooltip>
                  {msg.role === 'assistant' && !msg.error && (
                    <Tooltip title={language === 'ar' ? 'نسخ' : 'Copy'}>
                      <IconButton
                        size="small"
                        onClick={() => copyMessage(msg.content)}
                        sx={{ color: 'text.disabled', '&:hover': { color: 'text.secondary' } }}
                      >
                        <ContentCopyIcon sx={{ fontSize: 14 }} />
                      </IconButton>
                    </Tooltip>
                  )}
                </Box>
                {/* Context-trimmed badge — shown when the token guard fired on this response */}
                {msg.role === 'assistant' && msg.guardTriggered && (
                  <Chip
                    size="small"
                    label={language === 'ar' ? '⚠ تم تقليص السياق' : '⚠ Context trimmed to fit limits'}
                    sx={{
                      mt: 0.5, ...(isRTL ? { mr: 0.5 } : { ml: 0.5 }),
                      fontSize: '0.67rem', height: 22,
                      bgcolor: 'warning.light', color: 'warning.dark',
                      border: '1px solid', borderColor: 'warning.main',
                    }}
                  />
                )}
                {/* Project progress panel for student replies */}
                {msg.role === 'assistant' && !msg.error && msg.projectProgress && (
                  <Paper
                    variant="outlined"
                    sx={{
                      mt: 0.75,
                      p: 1,
                      ...(isRTL ? { mr: 0.5 } : { ml: 0.5 }),
                      borderColor: 'info.light',
                      bgcolor: 'info.50',
                    }}
                  >
                    <Typography variant="caption" fontWeight={700} color="info.dark" sx={{ display: 'block', mb: 0.5 }}>
                      {language === 'ar' ? 'حالة مشروعك الحالية' : 'Current project status'}
                    </Typography>
                    <Typography variant="caption" sx={{ display: 'block', mb: 0.5 }}>
                      {language === 'ar' ? 'المشروع:' : 'Project:'} {msg.projectProgress.projectTitle}
                    </Typography>
                    <Typography variant="caption" sx={{ display: 'block', mb: 0.5 }}>
                      {language === 'ar' ? 'تم إنجاز:' : 'Completed:'} {msg.projectProgress.completedMilestones?.length || 0}
                    </Typography>
                    {!!msg.projectProgress.pendingMilestones?.length && (
                      <Typography variant="caption" sx={{ display: 'block' }}>
                        {language === 'ar' ? 'التالي:' : 'Next:'} {msg.projectProgress.pendingMilestones[0]}
                      </Typography>
                    )}
                  </Paper>
                )}
                {/* Suggestion chips below assistant messages */}
                {msg.role === 'assistant' && !msg.error && msg.suggestions?.length > 0 && (
                  <Box sx={{
                    display: 'flex', flexWrap: 'wrap', gap: 0.75, mt: 0.75,
                    ...(isRTL ? { mr: 0.5 } : { ml: 0.5 }),
                  }}>
                    {msg.suggestions.map((s, si) => (
                      <Chip
                        key={si}
                        label={<span dir={pageDirection}>{s}</span>}
                        size="small"
                        variant="outlined"
                        color="primary"
                        onClick={() => sendMessage(s)}
                        disabled={loading}
                        sx={{
                          cursor: 'pointer',
                          fontSize: '0.71rem',
                          height: 26,
                          direction: pageDirection,
                          '&:hover': { bgcolor: 'primary.light', color: 'white', borderColor: 'primary.light' },
                        }}
                      />
                    ))}
                  </Box>
                )}
              </Box>
            </Box>
              );
            })()
          ))
        )}

        {/* Loading bubble — hidden while a placeholder is already visible */}
        {loading && !messages.some(m => m.loading) && (
          <Box sx={{ display: 'flex', gap: 1.5, mb: 2, flexDirection: isRTL ? 'row-reverse' : 'row', alignItems: 'center' }}>
            <Avatar sx={{ bgcolor: 'success.main', width: 36, height: 36 }}>
              <SmartToyIcon fontSize="small" />
            </Avatar>
            <Paper elevation={0} sx={{ px: 2, py: 1.5, bgcolor: 'action.hover', borderRadius: 3 }}>
              <CircularProgress size={16} />
            </Paper>
          </Box>
        )}
        <div ref={messagesEndRef} />
      </Box>

      <Divider />

      {/* Reply preview bar */}
      {replyTo && (
        <Box sx={{
          px: { xs: 1.5, md: 3 }, py: 0.75,
          bgcolor: 'action.selected',
          borderLeft: isRTL ? 'none' : '3px solid',
          borderRight: isRTL ? '3px solid' : 'none',
          borderColor: 'primary.main',
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          flexDirection: isRTL ? 'row-reverse' : 'row',
          gap: 1,
        }}>
          <Box sx={{ overflow: 'hidden', flex: 1 }}>
            <Typography variant="caption" fontWeight={700} color="primary.main" display="block">
              {replyTo.role === 'user' ? (language === 'ar' ? 'رد على رسالتك' : 'Replying to yourself') : (language === 'ar' ? 'رد على المساعد' : 'Replying to Assistant')}
            </Typography>
            <Typography variant="caption" color="text.secondary" noWrap display="block">
              {replyTo.content.slice(0, 100)}{replyTo.content.length > 100 ? '...' : ''}
            </Typography>
          </Box>
          <IconButton size="small" onClick={() => setReplyTo(null)}>
            <CloseIcon sx={{ fontSize: 16 }} />
          </IconButton>
        </Box>
      )}

      {/* Input */}
      <Box sx={{
        px: { xs: 1.5, md: 3 }, py: 1.5,
        display: 'flex', gap: 1, alignItems: 'flex-end',
        flexDirection: isRTL ? 'row-reverse' : 'row',
      }}>
        <TextField
          inputRef={inputRef}
          id="ai-chat-input"
          name="ai-chat-input"
          dir="auto"
          fullWidth
          multiline
          maxRows={4}
          placeholder={t('aiInputPlaceholder')}
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={handleKeyDown}
          disabled={loading}
          size="small"
          autoComplete="off"
          inputProps={{
            dir: 'auto',
            style: { textAlign: 'start', direction: 'auto', unicodeBidi: 'plaintext' },
          }}
          sx={{
            '& .MuiInputBase-root': { borderRadius: 3 },
            '& .MuiInputBase-input': { textAlign: 'start' },
            '& textarea': { textAlign: 'start', direction: 'auto', unicodeBidi: 'plaintext' },
          }}
        />
        <IconButton
          color="primary"
          onClick={() => sendMessage()}
          disabled={!input.trim() || loading}
          sx={{
            bgcolor: 'primary.main', color: 'white', mb: 0.5,
            transform: isRTL ? 'scaleX(-1)' : 'none',
            '&:hover': { bgcolor: 'primary.dark' },
            '&:disabled': { bgcolor: 'action.disabledBackground', color: 'action.disabled' },
          }}
        >
          <SendIcon />
        </IconButton>
      </Box>

      <Snackbar
        open={copySnack}
        autoHideDuration={2000}
        onClose={() => setCopySnack(false)}
        message={language === 'ar' ? 'تم النسخ' : 'Copied'}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
      />
      <Snackbar
        open={rateSnack}
        autoHideDuration={2000}
        onClose={() => setRateSnack(false)}
        message={language === 'ar' ? 'انتظر لحظة قبل إرسال رسالة أخرى' : 'Please wait before sending another message'}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
      />

      {/* Teacher Analytics Dialog */}
      <Dialog open={analyticsDialog} onClose={() => setAnalyticsDialog(false)} maxWidth="md" fullWidth>
        <DialogTitle sx={{ textAlign: pageTextAlign }}>تقرير تحليلي لأداء الطلاب بالذكاء الاصطناعي</DialogTitle>
        <DialogContent dividers>
          <FormControl fullWidth sx={{ mb: 2 }}>
            <InputLabel id="analytics-project-label">اختر المشروع</InputLabel>
            <Select
              labelId="analytics-project-label"
              value={analyticsProjectId}
              onChange={e => { setAnalyticsProjectId(e.target.value); setAnalyticsResult(''); }}
              label="اختر المشروع"
            >
              {aiProjects.map(p => (
                <MenuItem key={p._id} value={p._id}>{p.title}</MenuItem>
              ))}
            </Select>
          </FormControl>
          {analyticsLoading && <Box sx={{ textAlign: 'center', py: 3 }}><CircularProgress /></Box>}
          {analyticsResult && (
            <Paper variant="outlined" sx={{ p: 2, whiteSpace: 'pre-line', lineHeight: 2, direction: pageDirection, textAlign: pageTextAlign }}>
              <Typography variant="body2">{analyticsResult}</Typography>
            </Paper>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setAnalyticsDialog(false)}>إغلاق</Button>
          <Button
            variant="contained"
            onClick={handleTeacherAnalytics}
            disabled={!analyticsProjectId || analyticsLoading}
            startIcon={analyticsLoading ? <CircularProgress size={16} /> : <AssessmentIcon />}
          >
            إنشاء التقرير
          </Button>
        </DialogActions>
      </Dialog>

      {/* Remedial Activities Dialog */}
      <Dialog open={remedialDialog} onClose={() => setRemedialDialog(false)} maxWidth="md" fullWidth>
        <DialogTitle sx={{ textAlign: pageTextAlign }}>أنشطة علاجية مقترحة بالذكاء الاصطناعي</DialogTitle>
        <DialogContent dividers>
          {remedialLoading && <Box sx={{ textAlign: 'center', py: 3 }}><CircularProgress /></Box>}
          {remedialResult && (
            <Paper variant="outlined" sx={{ p: 2, whiteSpace: 'pre-line', lineHeight: 2, direction: pageDirection, textAlign: pageTextAlign }}>
              <Typography variant="body2">{remedialResult}</Typography>
            </Paper>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setRemedialDialog(false)}>إغلاق</Button>
          <Button variant="outlined" onClick={() => { setRemedialResult(''); handleRemedialActivities(); }}>
            تحديث المقترحات
          </Button>
        </DialogActions>
      </Dialog>

      {/* Project Ideas Dialog */}
      <Dialog open={ideasDialog} onClose={() => setIdeasDialog(false)} maxWidth="md" fullWidth>
        <DialogTitle sx={{ textAlign: pageTextAlign }}>أفكار مشاريع Arduino المقترحة</DialogTitle>
        <DialogContent dividers>
          {ideasLoading && <Box sx={{ textAlign: 'center', py: 3 }}><CircularProgress /></Box>}
          {ideasResult && (
            <Paper variant="outlined" sx={{ p: 2, whiteSpace: 'pre-line', lineHeight: 2, direction: pageDirection, textAlign: pageTextAlign }}>
              <Typography variant="body2">{ideasResult}</Typography>
            </Paper>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setIdeasDialog(false)}>إغلاق</Button>
          <Button variant="outlined" onClick={() => { setIdeasResult(''); handleProjectIdeas(); }}>
            اقتراحات جديدة
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default AIChatPage;
