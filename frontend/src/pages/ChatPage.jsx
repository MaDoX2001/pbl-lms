import React, { useState, useEffect, useRef } from 'react';
import { useSelector } from 'react-redux';
import {
  Box,
  Grid,
  Paper,
  List,
  ListItem,
  ListItemAvatar,
  ListItemText,
  Avatar,
  Typography,
  TextField,
  IconButton,
  Button,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Chip,
  Badge,
  InputAdornment,
  CircularProgress,
  Autocomplete
} from '@mui/material';
import SendIcon from '@mui/icons-material/Send';
import GroupAddIcon from '@mui/icons-material/GroupAdd';
import SearchIcon from '@mui/icons-material/Search';
import AttachFileIcon from '@mui/icons-material/AttachFile';
import { toast } from 'react-toastify';
import api from '../services/api';
import socketService from '../services/socket';
import { formatDistanceToNow } from 'date-fns';
import { ar } from 'date-fns/locale';

const ChatPage = () => {
  const { user, token } = useSelector((state) => state.auth);
  const [conversations, setConversations] = useState([]);
  const [selectedConversation, setSelectedConversation] = useState(null);
  const [messages, setMessages] = useState([]);
  const [messageText, setMessageText] = useState('');
  const [loading, setLoading] = useState(true);
  const [sendingMessage, setSendingMessage] = useState(false);
  const [groupDialogOpen, setGroupDialogOpen] = useState(false);
  const [newChatDialogOpen, setNewChatDialogOpen] = useState(false);
  const [users, setUsers] = useState([]);
  const [selectedUsers, setSelectedUsers] = useState([]);
  const [groupName, setGroupName] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [typingUsers, setTypingUsers] = useState(new Set());
  const messagesEndRef = useRef(null);
  const typingTimeoutRef = useRef(null);

  useEffect(() => {
    if (token) {
      socketService.connect(token);
      fetchConversations();
      fetchUsers();
    }

    return () => {
      socketService.disconnect();
    };
  }, [token]);

  useEffect(() => {
    socketService.onNewMessage((data) => {
      if (selectedConversation && data.conversationId === selectedConversation._id) {
        setMessages((prev) => [...prev, data]);
        scrollToBottom();
      }
      // Update conversation list
      fetchConversations();
    });

    socketService.onUserTyping((data) => {
      if (selectedConversation && data.conversationId === selectedConversation._id) {
        setTypingUsers((prev) => new Set([...prev, data.userId]));
      }
    });

    socketService.onUserStopTyping((data) => {
      setTypingUsers((prev) => {
        const newSet = new Set(prev);
        newSet.delete(data.userId);
        return newSet;
      });
    });

    return () => {
      socketService.offNewMessage();
    };
  }, [selectedConversation]);

  useEffect(() => {
    if (selectedConversation) {
      fetchMessages(selectedConversation._id);
      socketService.joinConversation(selectedConversation._id);
      markAsRead(selectedConversation._id);
    }
  }, [selectedConversation]);

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const fetchConversations = async () => {
    try {
      const response = await api.get('/chat/conversations');
      setConversations(response.data.data);
    } catch (error) {
      console.error('Error fetching conversations:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchMessages = async (conversationId) => {
    try {
      const response = await api.get(`/chat/conversations/${conversationId}/messages`);
      setMessages(response.data.data);
    } catch (error) {
      toast.error('فشل تحميل الرسائل');
    }
  };

  const fetchUsers = async () => {
    try {
      const response = await api.get('/chat/users');
      setUsers(response.data.data);
    } catch (error) {
      console.error('Error fetching users:', error);
    }
  };

  const markAsRead = async (conversationId) => {
    try {
      await api.put(`/chat/conversations/${conversationId}/read`);
      fetchConversations();
    } catch (error) {
      console.error('Error marking as read:', error);
    }
  };

  const handleSendMessage = async (e) => {
    e.preventDefault();
    if (!messageText.trim() || !selectedConversation) return;

    setSendingMessage(true);
    try {
      const response = await api.post(`/chat/conversations/${selectedConversation._id}/messages`, {
        content: messageText,
        type: 'text'
      });

      const newMessage = response.data.data;
      setMessages((prev) => [...prev, newMessage]);
      setMessageText('');

      // Emit via socket
      socketService.sendMessage({
        conversationId: selectedConversation._id,
        content: messageText,
        type: 'text'
      });

      fetchConversations();
    } catch (error) {
      toast.error('فشل إرسال الرسالة');
    } finally {
      setSendingMessage(false);
    }
  };

  const handleTyping = () => {
    if (selectedConversation) {
      socketService.emitTyping(selectedConversation._id);

      if (typingTimeoutRef.current) {
        clearTimeout(typingTimeoutRef.current);
      }

      typingTimeoutRef.current = setTimeout(() => {
        socketService.emitStopTyping(selectedConversation._id);
      }, 2000);
    }
  };

  const handleStartDirectChat = async (userId) => {
    try {
      const response = await api.post('/chat/conversations/direct', { userId });
      const conversation = response.data.data;
      setSelectedConversation(conversation);
      setNewChatDialogOpen(false);
      fetchConversations();
    } catch (error) {
      toast.error('فشل بدء المحادثة');
    }
  };

  const handleCreateGroup = async () => {
    if (!groupName.trim() || selectedUsers.length < 2) {
      toast.error('يجب إدخال اسم المجموعة واختيار عضوين على الأقل');
      return;
    }

    try {
      const response = await api.post('/chat/conversations/group', {
        name: groupName,
        participants: selectedUsers.map(u => u._id)
      });

      const newConversation = response.data.data;
      setConversations((prev) => [newConversation, ...prev]);
      setSelectedConversation(newConversation);
      setGroupDialogOpen(false);
      setGroupName('');
      setSelectedUsers([]);
      toast.success('تم إنشاء المجموعة بنجاح');
    } catch (error) {
      toast.error('فشل إنشاء المجموعة');
    }
  };

  const getConversationName = (conversation) => {
    if (conversation.type === 'group') {
      return conversation.name;
    }
    const otherUser = conversation.participants.find(p => p._id !== user.id);
    return otherUser?.name || 'مستخدم';
  };

  const getConversationAvatar = (conversation) => {
    if (conversation.type === 'group') {
      return conversation.avatar || '/group-default.png';
    }
    const otherUser = conversation.participants.find(p => p._id !== user.id);
    return otherUser?.avatar;
  };

  const getUnreadCount = (conversation) => {
    return conversation.unreadCount?.get?.(user.id) || 0;
  };

  const filteredConversations = conversations.filter((conv) =>
    getConversationName(conv).toLowerCase().includes(searchQuery.toLowerCase())
  );

  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', py: 8 }}>
        <CircularProgress />
      </Box>
    );
  }

  return (
    <Box sx={{ height: 'calc(100vh - 120px)' }}>
      <Grid container sx={{ height: '100%' }}>
        {/* Conversations List */}
        <Grid item xs={12} md={4} sx={{ borderRight: 1, borderColor: 'divider', height: '100%' }}>
          <Paper sx={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
            <Box sx={{ p: 2, borderBottom: 1, borderColor: 'divider' }}>
              <Typography variant="h6" gutterBottom>
                المحادثات
              </Typography>
              <TextField
                fullWidth
                size="small"
                placeholder="بحث..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                InputProps={{
                  startAdornment: (
                    <InputAdornment position="start">
                      <SearchIcon />
                    </InputAdornment>
                  )
                }}
                sx={{ mb: 1 }}
              />
              <Box sx={{ display: 'flex', gap: 1 }}>
                <Button
                  fullWidth
                  variant="outlined"
                  startIcon={<SearchIcon />}
                  onClick={() => setNewChatDialogOpen(true)}
                >
                  محادثة جديدة
                </Button>
                {(user?.role === 'teacher' || user?.role === 'admin') && (
                  <Button
                    fullWidth
                    variant="outlined"
                    startIcon={<GroupAddIcon />}
                    onClick={() => setGroupDialogOpen(true)}
                  >
                    مجموعة جديدة
                  </Button>
                )}
              </Box>
            </Box>
            <List sx={{ flex: 1, overflow: 'auto' }}>
              {filteredConversations.map((conversation) => (
                <ListItem
                  key={conversation._id}
                  button
                  selected={selectedConversation?._id === conversation._id}
                  onClick={() => setSelectedConversation(conversation)}
                >
                  <ListItemAvatar>
                    <Badge badgeContent={getUnreadCount(conversation)} color="error">
                      <Avatar src={getConversationAvatar(conversation)}>
                        {getConversationName(conversation)[0]}
                      </Avatar>
                    </Badge>
                  </ListItemAvatar>
                  <ListItemText
                    primary={getConversationName(conversation)}
                    secondary={
                      conversation.lastMessage?.text
                        ? `${conversation.lastMessage.text.substring(0, 30)}...`
                        : 'لا توجد رسائل'
                    }
                    secondaryTypographyProps={{
                      sx: { fontWeight: getUnreadCount(conversation) > 0 ? 'bold' : 'normal' }
                    }}
                  />
                  {conversation.lastMessage?.timestamp && (
                    <Typography variant="caption" color="text.secondary">
                      {formatDistanceToNow(new Date(conversation.lastMessage.timestamp), {
                        addSuffix: true,
                        locale: ar
                      })}
                    </Typography>
                  )}
                </ListItem>
              ))}
            </List>
          </Paper>
        </Grid>

        {/* Messages Area */}
        <Grid item xs={12} md={8} sx={{ height: '100%' }}>
          {selectedConversation ? (
            <Paper sx={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
              {/* Header */}
              <Box sx={{ p: 2, borderBottom: 1, borderColor: 'divider', display: 'flex', alignItems: 'center', gap: 2 }}>
                <Avatar src={getConversationAvatar(selectedConversation)}>
                  {getConversationName(selectedConversation)[0]}
                </Avatar>
                <Box>
                  <Typography variant="h6">{getConversationName(selectedConversation)}</Typography>
                  {selectedConversation.type === 'group' && (
                    <Typography variant="caption" color="text.secondary">
                      {selectedConversation.participants.length} عضو
                    </Typography>
                  )}
                </Box>
              </Box>

              {/* Messages */}
              <Box sx={{ flex: 1, overflow: 'auto', p: 2, bgcolor: '#f5f5f5' }}>
                {messages.map((message) => (
                  <Box
                    key={message._id}
                    sx={{
                      display: 'flex',
                      justifyContent: message.sender._id === user.id ? 'flex-end' : 'flex-start',
                      mb: 2
                    }}
                  >
                    <Box
                      sx={{
                        maxWidth: '70%',
                        bgcolor: message.sender._id === user.id ? 'primary.main' : 'white',
                        color: message.sender._id === user.id ? 'white' : 'text.primary',
                        p: 1.5,
                        borderRadius: 2,
                        boxShadow: 1
                      }}
                    >
                      {selectedConversation.type === 'group' && message.sender._id !== user.id && (
                        <Typography variant="caption" sx={{ fontWeight: 'bold', display: 'block', mb: 0.5 }}>
                          {message.sender.name}
                        </Typography>
                      )}
                      <Typography variant="body1">{message.content}</Typography>
                      <Typography variant="caption" sx={{ opacity: 0.7, display: 'block', mt: 0.5 }}>
                        {formatDistanceToNow(new Date(message.createdAt), { addSuffix: true, locale: ar })}
                      </Typography>
                    </Box>
                  </Box>
                ))}
                {typingUsers.size > 0 && (
                  <Typography variant="caption" color="text.secondary" sx={{ fontStyle: 'italic' }}>
                    يكتب...
                  </Typography>
                )}
                <div ref={messagesEndRef} />
              </Box>

              {/* Input */}
              <Box component="form" onSubmit={handleSendMessage} sx={{ p: 2, borderTop: 1, borderColor: 'divider' }}>
                <TextField
                  fullWidth
                  value={messageText}
                  onChange={(e) => {
                    setMessageText(e.target.value);
                    handleTyping();
                  }}
                  placeholder="اكتب رسالة..."
                  disabled={sendingMessage}
                  InputProps={{
                    endAdornment: (
                      <InputAdornment position="end">
                        <IconButton type="submit" disabled={!messageText.trim() || sendingMessage}>
                          <SendIcon />
                        </IconButton>
                      </InputAdornment>
                    )
                  }}
                />
              </Box>
            </Paper>
          ) : (
            <Box sx={{ height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <Typography variant="h6" color="text.secondary">
                اختر محادثة للبدء
              </Typography>
            </Box>
          )}
        </Grid>
      </Grid>

      {/* New Chat Dialog */}
      <Dialog open={newChatDialogOpen} onClose={() => setNewChatDialogOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>محادثة جديدة</DialogTitle>
        <DialogContent>
          <List>
            {users.map((user) => (
              <ListItem key={user._id} button onClick={() => handleStartDirectChat(user._id)}>
                <ListItemAvatar>
                  <Avatar src={user.avatar}>{user.name[0]}</Avatar>
                </ListItemAvatar>
                <ListItemText primary={user.name} secondary={user.email} />
                <Chip label={user.role} size="small" />
              </ListItem>
            ))}
          </List>
        </DialogContent>
      </Dialog>

      {/* Create Group Dialog */}
      <Dialog open={groupDialogOpen} onClose={() => setGroupDialogOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>إنشاء مجموعة جديدة</DialogTitle>
        <DialogContent>
          <TextField
            fullWidth
            label="اسم المجموعة"
            value={groupName}
            onChange={(e) => setGroupName(e.target.value)}
            sx={{ mb: 2, mt: 1 }}
          />
          <Autocomplete
            multiple
            options={users}
            getOptionLabel={(option) => option.name}
            value={selectedUsers}
            onChange={(e, newValue) => setSelectedUsers(newValue)}
            renderInput={(params) => <TextField {...params} label="إضافة أعضاء" />}
            renderOption={(props, option) => (
              <li {...props}>
                <Avatar src={option.avatar} sx={{ mr: 1, width: 32, height: 32 }}>
                  {option.name[0]}
                </Avatar>
                {option.name}
              </li>
            )}
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setGroupDialogOpen(false)}>إلغاء</Button>
          <Button onClick={handleCreateGroup} variant="contained">
            إنشاء
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default ChatPage;
