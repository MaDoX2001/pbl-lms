import React, { useState, useRef, useEffect } from 'react';
import {
  Box, Typography, TextField, IconButton, Paper, Avatar,
  CircularProgress, Divider, Chip
} from '@mui/material';
import SendIcon from '@mui/icons-material/Send';
import SmartToyIcon from '@mui/icons-material/SmartToy';
import PersonIcon from '@mui/icons-material/Person';
import DeleteOutlineIcon from '@mui/icons-material/DeleteOutline';
import { useAppSettings } from '../context/AppSettingsContext';
import api from '../services/api';

const SUGGESTIONS_AR = [
  'اشرح لي كيفية استخدام LED مع Arduino',
  'ما الفرق بين analogRead و digitalRead؟',
  'كيف أربط sensor الحرارة DHT11؟',
  'اشرح لي مفهوم الـ loop في Arduino',
];

const SUGGESTIONS_EN = [
  'Explain how to use LED with Arduino',
  'What is the difference between analogRead and digitalRead?',
  'How to connect DHT11 temperature sensor?',
  'Explain the loop concept in Arduino',
];

const AIChatPage = () => {
  const { t, direction, language } = useAppSettings();
  const isRTL = direction === 'rtl';
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const messagesEndRef = useRef(null);
  const inputRef = useRef(null);

  const suggestions = language === 'ar' ? SUGGESTIONS_AR : SUGGESTIONS_EN;

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, loading]);

  const sendMessage = async (text) => {
    const userText = (text || input).trim();
    if (!userText || loading) return;

    const userMsg = { role: 'user', content: userText };
    const newMessages = [...messages, userMsg];
    setMessages(newMessages);
    setInput('');
    setLoading(true);

    try {
      const history = newMessages.slice(0, -1); // exclude current msg
      const res = await api.post('/ai/chat', { message: userText, history });
      setMessages([...newMessages, { role: 'assistant', content: res.data.data.reply }]);
    } catch (err) {
      setMessages([...newMessages, {
        role: 'assistant',
        content: t('aiError'),
        error: true,
      }]);
    } finally {
      setLoading(false);
      inputRef.current?.focus();
    }
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  const clearChat = () => setMessages([]);

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
        {messages.length === 0 ? (
          /* Empty state with suggestions */
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
              key={i}
              sx={{
                display: 'flex',
                mb: 2,
                flexDirection: isRTL
                  ? (msg.role === 'user' ? 'row' : 'row-reverse')
                  : (msg.role === 'user' ? 'row-reverse' : 'row'),
                alignItems: 'flex-start',
                gap: 1.5,
              }}
            >
              <Avatar sx={{
                bgcolor: msg.role === 'user' ? 'primary.main' : 'success.main',
                width: 36, height: 36, flexShrink: 0,
              }}>
                {msg.role === 'user' ? <PersonIcon fontSize="small" /> : <SmartToyIcon fontSize="small" />}
              </Avatar>
              <Paper
                elevation={0}
                sx={{
                  px: 2, py: 1.5,
                  maxWidth: '75%',
                  bgcolor: msg.role === 'user' ? 'primary.main' : (msg.error ? 'error.light' : 'action.hover'),
                  color: msg.role === 'user' ? 'white' : 'text.primary',
                  borderRadius: msg.role === 'user'
                    ? (isRTL ? '16px 4px 16px 16px' : '4px 16px 16px 16px')
                    : (isRTL ? '4px 16px 16px 16px' : '16px 4px 16px 16px'),
                  textAlign: isRTL ? 'right' : 'left',
                }}
              >
                <Typography variant="body2" sx={{ whiteSpace: 'pre-wrap', lineHeight: 1.7 }}>
                  {msg.content}
                </Typography>
              </Paper>
            </Box>
          ))
        )}

        {/* Loading bubble */}
        {loading && (
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
    </Box>
  );
};

export default AIChatPage;
