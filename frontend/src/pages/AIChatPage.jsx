import React, { useState, useRef, useEffect, useCallback } from 'react';
import {
  Box, Typography, TextField, IconButton, Paper, Avatar,
  CircularProgress, Divider, Chip, Tooltip, Snackbar,
} from '@mui/material';
import SendIcon from '@mui/icons-material/Send';
import SmartToyIcon from '@mui/icons-material/SmartToy';
import PersonIcon from '@mui/icons-material/Person';
import DeleteOutlineIcon from '@mui/icons-material/DeleteOutline';
import ContentCopyIcon from '@mui/icons-material/ContentCopy';
import CheckIcon from '@mui/icons-material/Check';
import ReplyIcon from '@mui/icons-material/Reply';
import CloseIcon from '@mui/icons-material/Close';
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
  'ساعدني في كتابة معايير تقييم لمشروع Arduino',
  'اقترح أسئلة للتقييم الشفهي',
  'كيف أصمم مشروع PBL للمبتدئين؟',
  'اقترح طرق مساعدة طالب متعثر',
];
const SUGGESTIONS_EN_TEACHER = [
  'Help me write evaluation criteria for an Arduino project',
  'Suggest oral assessment questions',
  'How to design a PBL project for beginners?',
  'Suggest ways to help a struggling student',
];

// Stable React key generator for dynamically created messages
const makeKey = () => Math.random().toString(36).slice(2, 9);

// Render message content: parse ```code``` blocks
const MessageContent = ({ content, isUser, streaming = false }) => {
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
          <Typography key={i} variant="body2" sx={{ whiteSpace: 'pre-wrap', lineHeight: 1.8 }}>
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
            ml: 0.25,
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
  const isRTL = direction === 'rtl';
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
  const messagesEndRef = useRef(null);
  const inputRef = useRef(null);
  const isSendingRef = useRef(false);       // deduplication guard — prevents double-send on rapid clicks
  const lastSendTimeRef = useRef(0);        // client-side rate guard (2s minimum between manual sends)
  const summarySaveTimerRef = useRef(null); // debounces POST /ai/summary/save DB writes

  const suggestions = isTeacher
    ? (language === 'ar' ? SUGGESTIONS_AR_TEACHER : SUGGESTIONS_EN_TEACHER)
    : (language === 'ar' ? SUGGESTIONS_AR_STUDENT : SUGGESTIONS_EN_STUDENT);

  // All roles: load messages + summary from DB on mount.
  // DB is the source of truth — wins over localStorage for summary.
  // For non-admin, localStorage messages are used as initial state (fast); DB may
  // contain more recent messages from other devices which will replace localStorage ones.
  useEffect(() => {
    setHistoryLoading(true);
    api.get('/ai/history')
      .then(res => {
        const data = res.data.data || {};
        if (data.messages?.length > 0) setMessages(data.messages);
        if (data.summary) setSummary(data.summary); // DB wins over localStorage
      })
      .catch(() => {}) // silent fail — localStorage values remain as fallback
      .finally(() => setHistoryLoading(false));
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

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

  const sendMessage = async (text) => {
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
    let streamedText = ''; // declared here so catch block can check if any content arrived

    try {
      // Add streaming placeholder — content fills in progressively
      const placeholderKey = makeKey();
      setMessages([...newMessages, { role: 'assistant', content: '', streaming: true, suggestions: [], _key: placeholderKey }]);

      const token = localStorage.getItem('token');
      const baseURL = api.defaults.baseURL || '';
      const response = await fetch(`${baseURL}/ai/chat`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({ message: fullText, history, summary }),
      });

      if (!response.ok || !response.body) {
        const msg = response.status === 429
          ? (t('aiRateLimited') || 'طلبات كثيرة جداً، انتظر دقيقة ثم حاول.')
          : (t('aiError') || 'AI service temporarily unavailable.');
        throw new Error(msg);
      }

      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let buf = '';
      let finalSuggestions = [];
      let finalGuardTriggered = false;

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        buf += decoder.decode(value, { stream: true });
        const lines = buf.split('\n');
        buf = lines.pop() ?? '';
        for (const line of lines) {
          if (!line.startsWith('data: ')) continue;
          let event;
          try { event = JSON.parse(line.slice(6)); } catch { continue; }
          if (event.type === 'chunk') {
            streamedText += event.text;
            const snapshot = streamedText; // capture value for functional update closure
            setMessages(prev => {
              const updated = [...prev];
              const last = updated[updated.length - 1];
              if (last?.role === 'assistant') {
                updated[updated.length - 1] = { ...last, content: snapshot };
              }
              return updated;
            });
          } else if (event.type === 'done') {
            finalSuggestions = event.suggestions || [];
            finalGuardTriggered = !!event.guardTriggered;
          } else if (event.type === 'error') {
            throw new Error(event.message || 'Stream error');
          }
        }
      }

      // Finalize: strip streaming flag, attach suggestions and context-guard info
      const finalMsg = { role: 'assistant', content: streamedText, suggestions: finalSuggestions, guardTriggered: finalGuardTriggered, _key: placeholderKey };
      const updatedMessages = [...newMessages, finalMsg];
      setMessages(updatedMessages);
      if (updatedMessages.length >= 12 && updatedMessages.length % 6 === 0) {
        triggerSummarize(updatedMessages.slice(-12, -6), summary);
      }
    } catch (err) {
      if (!streamedText) {
        // /api/ai/chat only speaks SSE — no JSON fallback is available
        setMessages(prev => [
          ...prev.filter(m => !(m.role === 'assistant' && m.streaming)),
          {
            role: 'assistant',
            content: err.message || t('aiError') || 'AI service temporarily unavailable.',
            error: true,
            _key: makeKey(),
          },
        ]);
        return;
      }
      // Partial content already visible — just remove the streaming flag and keep what arrived
      setMessages(prev => {
        const updated = [...prev];
        const last = updated[updated.length - 1];
        if (last?.role === 'assistant') {
          updated[updated.length - 1] = { ...last, streaming: false };
        }
        return updated;
      });
    } finally {
      setLoading(false);
      isSendingRef.current = false;
      inputRef.current?.focus();
    }
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  const clearChat = () => {
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
    <Box sx={{ height: 'calc(100vh - 64px)', display: 'flex', flexDirection: 'column', direction }}>
      {/* Header */}
      <Box sx={{
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        px: 3, py: 1.5, borderBottom: '1px solid', borderColor: 'divider',
        flexDirection: isRTL ? 'row-reverse' : 'row',
      }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, flexDirection: isRTL ? 'row-reverse' : 'row' }}>
          <SmartToyIcon sx={{ color: 'primary.main', fontSize: 28 }} />
          <Box>
            <Typography variant="h6" fontWeight={700}>{t('aiAssistantTitle')}</Typography>
            <Typography variant="caption" color="text.secondary">{t('aiPoweredBy')}</Typography>
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
        {historyLoading ? (
          <Box sx={{ display: 'flex', justifyContent: 'center', mt: 6 }}>
            <CircularProgress />
          </Box>
        ) : messages.length === 0 ? (
          <Box sx={{ textAlign: 'center', mt: 6 }}>
            <SmartToyIcon sx={{ fontSize: 64, color: 'primary.main', opacity: 0.5, mb: 2 }} />
            <Typography variant="h6" fontWeight={600} gutterBottom>{t('aiWelcome')}</Typography>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 4 }}>{t('aiWelcomeDesc')}</Typography>
            <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1, justifyContent: 'center' }}>
              {suggestions.map((s, i) => (
                <Chip
                  key={i}
                  label={s}
                  onClick={() => sendMessage(s)}
                  variant="outlined"
                  color="primary"
                  sx={{ cursor: 'pointer', '&:hover': { bgcolor: 'primary.light', color: 'white' } }}
                />
              ))}
            </Box>
          </Box>
        ) : (
          messages.map((msg, i) => (
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
                  elevation={0}
                  sx={{
                    px: 2, py: 1.5,
                    bgcolor: msg.role === 'user' ? 'primary.main' : (msg.error ? 'error.light' : 'action.hover'),
                    color: msg.role === 'user' ? 'white' : 'text.primary',
                    borderRadius: msg.role === 'user'
                      ? (isRTL ? '16px 4px 16px 16px' : '4px 16px 16px 16px')
                      : (isRTL ? '4px 16px 16px 16px' : '16px 4px 16px 16px'),
                    textAlign: isRTL ? 'right' : 'left',
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
                        display: 'block', whiteSpace: 'pre-wrap',
                        color: msg.role === 'user' ? 'rgba(255,255,255,0.75)' : 'text.secondary',
                        overflow: 'hidden', textOverflow: 'ellipsis',
                        display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical',
                      }}>
                        {msg.replyTo.content}
                      </Typography>
                    </Box>
                  )}
                  {msg.role === 'user' ? (
                    <Typography variant="body2" sx={{ whiteSpace: 'pre-wrap', lineHeight: 1.7 }}>
                      {msg.content}
                    </Typography>
                  ) : (
                    <MessageContent content={msg.content} streaming={!!msg.streaming} />
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
                {/* Suggestion chips below assistant messages */}
                {msg.role === 'assistant' && !msg.error && msg.suggestions?.length > 0 && (
                  <Box sx={{
                    display: 'flex', flexWrap: 'wrap', gap: 0.75, mt: 0.75,
                    ...(isRTL ? { mr: 0.5 } : { ml: 0.5 }),
                  }}>
                    {msg.suggestions.map((s, si) => (
                      <Chip
                        key={si}
                        label={s}
                        size="small"
                        variant="outlined"
                        color="primary"
                        onClick={() => sendMessage(s)}
                        disabled={loading}
                        sx={{
                          cursor: 'pointer',
                          fontSize: '0.71rem',
                          height: 26,
                          direction,
                          '&:hover': { bgcolor: 'primary.light', color: 'white', borderColor: 'primary.light' },
                        }}
                      />
                    ))}
                  </Box>
                )}
              </Box>
            </Box>
          ))
        )}

        {/* Loading bubble — hidden while a streaming placeholder is already visible */}
        {loading && !messages.some(m => m.streaming) && (
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
          fullWidth
          multiline
          maxRows={4}
          placeholder={t('aiInputPlaceholder')}
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={handleKeyDown}
          disabled={loading}
          size="small"
          sx={{ '& .MuiInputBase-root': { borderRadius: 3, direction } }}
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
    </Box>
  );
};

export default AIChatPage;
