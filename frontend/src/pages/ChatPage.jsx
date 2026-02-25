import React, { useState, useEffect, useRef, useMemo } from 'react';
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
  Autocomplete,
  Tabs,
  Tab,
  Divider
} from '@mui/material';
import SendIcon from '@mui/icons-material/Send';
import GroupAddIcon from '@mui/icons-material/GroupAdd';
import SearchIcon from '@mui/icons-material/Search';
import AttachFileIcon from '@mui/icons-material/AttachFile';
import GroupIcon from '@mui/icons-material/Group';
import GroupsIcon from '@mui/icons-material/Groups';
import PublicIcon from '@mui/icons-material/Public';
import PersonIcon from '@mui/icons-material/Person';
import ErrorOutlineIcon from '@mui/icons-material/ErrorOutline';
import RefreshIcon from '@mui/icons-material/Refresh';
import Skeleton from '@mui/material/Skeleton';
import { toast } from 'react-toastify';
import api from '../services/api';
import socketService from '../services/socket';
import { formatDistanceToNow, format, isToday, isYesterday, isSameDay } from 'date-fns';
import { ar } from 'date-fns/locale';
import DoneIcon from '@mui/icons-material/Done';
import DoneAllIcon from '@mui/icons-material/DoneAll';
import CloseIcon from '@mui/icons-material/Close';
import KeyboardArrowUpIcon from '@mui/icons-material/KeyboardArrowUp';
import KeyboardArrowDownIcon from '@mui/icons-material/KeyboardArrowDown';
import { useAppSettings } from '../context/AppSettingsContext';

const ChatPage = () => {
  const { user, token } = useSelector((state) => state.auth);
  const { t } = useAppSettings();
  
  console.log('ChatPage - User:', user);
  console.log('ChatPage - User role:', user?.role);
  
  const [conversations, setConversations] = useState([]);
  const [selectedConversation, setSelectedConversation] = useState(null);
  const [messages, setMessages] = useState([]);
  const [messageText, setMessageText] = useState('');
  const [loading, setLoading] = useState(true);
  const [sendingMessage, setSendingMessage] = useState(false);
  const [chatType, setChatType] = useState('direct'); // direct, team, team_teachers, general
  const [groupDialogOpen, setGroupDialogOpen] = useState(false);
  const [newChatDialogOpen, setNewChatDialogOpen] = useState(false);
  const [users, setUsers] = useState([]);
  const [selectedUsers, setSelectedUsers] = useState([]);
  const [groupName, setGroupName] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [debouncedSearchQuery, setDebouncedSearchQuery] = useState('');
  const [typingUsers, setTypingUsers] = useState(new Map()); // userId -> userName
  const [messagePage, setMessagePage] = useState(1);
  const [hasMoreMessages, setHasMoreMessages] = useState(false);
  const [loadingMessages, setLoadingMessages] = useState(false);
  const messagesEndRef = useRef(null);
  const typingTimeoutRef = useRef(null);
  const messagesContainerRef = useRef(null);
  const [userIsNearBottom, setUserIsNearBottom] = useState(true);
  const [inChatSearch, setInChatSearch] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [currentSearchIndex, setCurrentSearchIndex] = useState(0);
  const [showSearch, setShowSearch] = useState(false);
  const [lastReadMessageId, setLastReadMessageId] = useState(null);

  // Debounce search query for better performance
  useEffect(() => {
    const timeoutId = setTimeout(() => {
      setDebouncedSearchQuery(searchQuery);
    }, 300);

    return () => clearTimeout(timeoutId);
  }, [searchQuery]);

  // Debug: Watch chatType changes
  useEffect(() => {
    console.log('chatType changed to:', chatType);
  }, [chatType]);

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
    fetchConversations();
  }, [chatType]);

  useEffect(() => {
    const handleNewMessage = (data) => {
      console.log('🔔 New message received:', data);
      if (selectedConversation && data.conversationId === selectedConversation._id) {
        setMessages((prev) => [...prev, data]);
        scrollToBottom();
      }
      
      // Update conversation list with last message instead of re-fetching
      setConversations((prevConvs) => {
        const convExists = prevConvs.some((conv) => conv._id === data.conversationId);
        
        // If conversation doesn't exist in list, fetch all conversations
        if (!convExists) {
          console.log('⚠️ Conversation not in list, re-fetching all conversations');
          fetchConversations();
          return prevConvs;
        }
        
        const updated = prevConvs.map((conv) => {
          if (conv._id === data.conversationId) {
            return {
              ...conv,
              lastMessage: {
                text: data.content,
                timestamp: data.createdAt,
                sender: data.sender
              },
              updatedAt: data.createdAt
            };
          }
          return conv;
        });
        
        // Sort by updatedAt
        return updated.sort((a, b) => new Date(b.updatedAt) - new Date(a.updatedAt));
      });
    };

    const handleUserTyping = (data) => {
      if (selectedConversation && data.conversationId === selectedConversation._id) {
        setTypingUsers((prev) => new Map(prev).set(data.userId, data.userName || t('user')));
      }
    };

    const handleUserStopTyping = (data) => {
      setTypingUsers((prev) => {
        const newMap = new Map(prev);
        newMap.delete(data.userId);
        return newMap;
      });
    };

    socketService.onNewMessage(handleNewMessage);
    socketService.onUserTyping(handleUserTyping);
    socketService.onUserStopTyping(handleUserStopTyping);

    return () => {
      socketService.offNewMessage();
      socketService.offUserTyping();
      socketService.offUserStopTyping();
    };
  }, [selectedConversation]);

  useEffect(() => {
    if (selectedConversation) {
      setMessagePage(1);
      setMessages([]);
      fetchMessages(selectedConversation._id, 1);
      socketService.joinConversation(selectedConversation._id);
      markAsRead(selectedConversation._id);
      // Reset search
      setInChatSearch('');
      setShowSearch(false);
      // Set last read message for "new messages" divider
      if (selectedConversation.unreadCount > 0 && messages.length > 0) {
        const unreadIndex = messages.length - selectedConversation.unreadCount;
        if (unreadIndex > 0) {
          setLastReadMessageId(messages[unreadIndex - 1]._id);
        }
      } else {
        setLastReadMessageId(null);
      }
    }
  }, [selectedConversation]);

  useEffect(() => {
    if (userIsNearBottom) {
      scrollToBottom();
    }
  }, [messages, userIsNearBottom]);

  // Check if user is near bottom
  const handleScroll = () => {
    if (messagesContainerRef.current) {
      const { scrollTop, scrollHeight, clientHeight } = messagesContainerRef.current;
      const isNearBottom = scrollHeight - scrollTop - clientHeight < 100;
      setUserIsNearBottom(isNearBottom);
    }
  };

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  // Helper: Get date header text
  const getDateHeader = (date) => {
    if (isToday(date)) return t('today');
    if (isYesterday(date)) return t('yesterday');
    return format(date, 'd MMMM yyyy', { locale: ar });
  };

  // Helper: Should show date separator
  const shouldShowDateSeparator = (currentMsg, previousMsg) => {
    if (!previousMsg) return true;
    return !isSameDay(new Date(currentMsg.createdAt), new Date(previousMsg.createdAt));
  };

  // In-chat search
  useEffect(() => {
    if (inChatSearch.trim()) {
      const results = messages.filter(msg => 
        msg.content?.toLowerCase().includes(inChatSearch.toLowerCase())
      );
      setSearchResults(results);
      setCurrentSearchIndex(0);
    } else {
      setSearchResults([]);
      setCurrentSearchIndex(0);
    }
  }, [inChatSearch, messages]);

  const handleSearchNavigation = (direction) => {
    if (searchResults.length === 0) return;
    const newIndex = direction === 'next' 
      ? (currentSearchIndex + 1) % searchResults.length
      : (currentSearchIndex - 1 + searchResults.length) % searchResults.length;
    setCurrentSearchIndex(newIndex);
    // Scroll to result
    const resultMsg = searchResults[newIndex];
    document.getElementById(`msg-${resultMsg._id}`)?.scrollIntoView({ behavior: 'smooth', block: 'center' });
  };

  const fetchConversations = async () => {
    try {
      const response = await api.get(`/chat/conversations?type=${chatType}`);
      console.log('Fetched conversations:', response.data.data.length, 'conversations');
      console.log('Conversations IDs:', response.data.data.map(c => ({ id: c._id, name: getConversationName(c) })));
      setConversations(response.data.data);
    } catch (error) {
      console.error('Error fetching conversations:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchMessages = async (conversationId, page = 1) => {
    try {
      setLoadingMessages(true);
      const response = await api.get(`/chat/conversations/${conversationId}/messages?page=${page}&limit=20`);
      const newMessages = response.data.data;
      
      if (page === 1) {
        setMessages(newMessages);
      } else {
        // Prepend older messages
        setMessages((prev) => [...newMessages, ...prev]);
      }
      
      // Check if there are more messages
      setHasMoreMessages(newMessages.length === 20);
      setMessagePage(page);
    } catch (error) {
      toast.error(t('loadMessagesFailed'));
    } finally {
      setLoadingMessages(false);
    }
  };

  const loadMoreMessages = () => {
    if (selectedConversation && !loadingMessages && hasMoreMessages) {
      fetchMessages(selectedConversation._id, messagePage + 1);
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

    const tempId = `temp-${Date.now()}`;
    const optimisticMessage = {
      _id: tempId,
      content: messageText,
      sender: { _id: user.id, name: user.name },
      createdAt: new Date().toISOString(),
      status: 'sending'
    };

    // Optimistic UI - show message immediately
    setMessages((prev) => [...prev, optimisticMessage]);
    const contentToSend = messageText;
    setMessageText('');
    setSendingMessage(true);

    try {
      const response = await api.post(`/chat/conversations/${selectedConversation._id}/messages`, {
        content: contentToSend,
        type: 'text'
      });

      const newMessage = response.data.data;
      // Replace temp message with real one
      setMessages((prev) => prev.map(msg => msg._id === tempId ? newMessage : msg));

      // Emit via socket
      socketService.sendMessage({
        conversationId: selectedConversation._id,
        content: contentToSend,
        type: 'text'
      });

      fetchConversations();
    } catch (error) {
      // Mark message as failed
      setMessages((prev) => prev.map(msg => 
        msg._id === tempId ? { ...msg, status: 'failed' } : msg
      ));
      toast.error(t('sendMessageFailed'));
    } finally {
      setSendingMessage(false);
    }
  };

  const handleRetryMessage = async (message) => {
    const tempId = message._id;
    // Update status to sending
    setMessages((prev) => prev.map(msg => 
      msg._id === tempId ? { ...msg, status: 'sending' } : msg
    ));

    try {
      const response = await api.post(`/chat/conversations/${selectedConversation._id}/messages`, {
        content: message.content,
        type: 'text'
      });

      const newMessage = response.data.data;
      setMessages((prev) => prev.map(msg => msg._id === tempId ? newMessage : msg));

      socketService.sendMessage({
        conversationId: selectedConversation._id,
        content: message.content,
        type: 'text'
      });

      fetchConversations();
    } catch (error) {
      setMessages((prev) => prev.map(msg => 
        msg._id === tempId ? { ...msg, status: 'failed' } : msg
      ));
      toast.error(t('retrySendFailed'));
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
      setChatType('direct');
      fetchConversations();
    } catch (error) {
      toast.error(t('startConversationFailed'));
    }
  };

  const handleOpenTeamChat = async () => {
    console.log('handleOpenTeamChat called');
    try {
      console.log('Sending POST request to /chat/conversations/team');
      const response = await api.post('/chat/conversations/team');
      console.log('Team chat response:', response.data);
      const conversation = response.data.data;
      setSelectedConversation(conversation);
      fetchConversations();
    } catch (error) {
      const errorMsg = error.response?.data?.message || t('openTeamChatFailed');
      console.error('Team chat error:', error);
      console.error('Error response:', error.response?.data);
      toast.error(errorMsg);
    }
  };

  const handleOpenTeamTeachersChat = async () => {
    console.log('handleOpenTeamTeachersChat called');
    try {
      console.log('Sending POST request to /chat/conversations/team-teachers');
      const response = await api.post('/chat/conversations/team-teachers');
      console.log('Team+Teachers chat response:', response.data);
      const conversation = response.data.data;
      setSelectedConversation(conversation);
      fetchConversations();
    } catch (error) {
      const errorMsg = error.response?.data?.message || t('openTeamTeachersChatFailed');
      console.error('Team teachers chat error:', error);
      console.error('Error response:', error.response?.data);
      toast.error(errorMsg);
    }
  };

  const handleOpenGeneralChat = async () => {
    try {
      const response = await api.post('/chat/conversations/general');
      const conversation = response.data.data;
      setSelectedConversation(conversation);
      fetchConversations();
    } catch (error) {
      const errorMsg = error.response?.data?.message || t('openGeneralChatFailed');
      toast.error(errorMsg);
      console.error('General chat error:', error);
    }
  };

  const handleCreateGroup = async () => {
    if (!groupName.trim() || selectedUsers.length < 2) {
      toast.error(t('groupNameAndTwoMembersRequired'));
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
      toast.success(t('groupCreatedSuccess'));
    } catch (error) {
      toast.error(t('groupCreateFailed'));
    }
  };

  const getConversationName = (conversation) => {
    if (!conversation) return t('conversation');
    
    if (conversation.type === 'team') {
      return conversation.name || `${conversation.team?.name || 'الفريق'} - محادثة الفريق`;
    }
    if (conversation.type === 'team_teachers') {
      return conversation.name || `${conversation.team?.name || 'الفريق'} + المعلمين`;
    }
    if (conversation.type === 'general') {
      return conversation.name || t('generalConversation');
    }
    if (conversation.type === 'group') {
      return conversation.name || t('group');
    }
    // Direct conversation
    if (!conversation.participants || conversation.participants.length === 0) {
      return t('directConversation');
    }
    const otherUser = conversation.participants.find(p => p?._id !== user.id);
    return otherUser?.name || t('user');
  };

  const getConversationAvatar = (conversation) => {
    if (!conversation) return null;
    
    if (conversation.type === 'team') {
      return null; // Will show icon
    }
    if (conversation.type === 'team_teachers') {
      return null; // Will show icon
    }
    if (conversation.type === 'general') {
      return null; // Will show icon
    }
    if (conversation.type === 'group') {
      return conversation.avatar || '/group-default.png';
    }
    if (!conversation.participants || conversation.participants.length === 0) {
      return null;
    }
    const otherUser = conversation.participants.find(p => p?._id !== user.id);
    return otherUser?.avatar;
  };

  const getConversationIcon = (conversation) => {
    if (conversation.type === 'team') return <GroupIcon />;
    if (conversation.type === 'team_teachers') return <GroupsIcon />;
    if (conversation.type === 'general') return <PublicIcon />;
    return null;
  };

  const getUnreadCount = (conversation) => {
    return conversation.unreadCount?.get?.(user.id) || 0;
  };

  const filteredConversations = useMemo(() => {
    const filtered = conversations.filter((conv) =>
      getConversationName(conv).toLowerCase().includes(debouncedSearchQuery.toLowerCase())
    );
    console.log('Filtered conversations:', filtered.length, 'from', conversations.length, 'total');
    return filtered;
  }, [conversations, debouncedSearchQuery, user.id]);

  const handleTabChange = async (event, newValue) => {
    console.log('handleTabChange called with:', newValue);
    console.log('Current user role:', user?.role);
    
    setChatType(newValue);
    setSelectedConversation(null);
    setMessages([]);
    
    try {
      // Auto-open team/team_teachers/general chats when switching to their tabs
      if (newValue === 'team' && user?.role === 'student') {
        console.log('Opening team chat...');
        await handleOpenTeamChat();
      } else if (newValue === 'team_teachers' && user?.role === 'student') {
        console.log('Opening team+teachers chat...');
        await handleOpenTeamTeachersChat();
      } else if (newValue === 'general') {
        console.log('Opening general chat...');
        await handleOpenGeneralChat();
      }
    } catch (error) {
      console.error('Error in handleTabChange:', error);
    }
  };

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
                {t('chats')}
              </Typography>
              
              {/* Chat Type Tabs */}
              <Tabs 
                value={chatType} 
                onChange={handleTabChange} 
                variant="scrollable"
                scrollButtons="auto"
                sx={{ mb: 2, borderBottom: 1, borderColor: 'divider' }}
              >
                <Tab 
                  value="direct" 
                  label={t('privateChats')} 
                  icon={<PersonIcon />}
                  iconPosition="start"
                />
                {user?.role === 'student' && (
                  <Tab 
                    value="team" 
                    label={t('team')} 
                    icon={<GroupIcon />}
                    iconPosition="start"
                  />
                )}
                {user?.role === 'student' && (
                  <Tab 
                    value="team_teachers" 
                    label={t('teamTeachers')} 
                    icon={<GroupsIcon />}
                    iconPosition="start"
                  />
                )}
                <Tab 
                  value="general" 
                  label={t('general')} 
                  icon={<PublicIcon />}
                  iconPosition="start"
                />
              </Tabs>

              <TextField
                fullWidth
                size="small"
                id="conversation-search"
                name="conversationSearch"
                placeholder={t('search') + '...'}
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

              {/* Action Buttons based on chat type */}
              {chatType === 'direct' && (
                <Button
                  fullWidth
                  variant="outlined"
                  startIcon={<SearchIcon />}
                  onClick={() => setNewChatDialogOpen(true)}
                >
                  {t('newConversation')}
                </Button>
              )}
              {chatType === 'team' && user?.role === 'student' && filteredConversations.length === 0 && (
                <Button
                  fullWidth
                  variant="contained"
                  startIcon={<GroupIcon />}
                  onClick={handleOpenTeamChat}
                >
                  فتح محادثة الفريق
                </Button>
              )}
              {chatType === 'team_teachers' && user?.role === 'student' && filteredConversations.length === 0 && (
                <Button
                  fullWidth
                  variant="contained"
                  startIcon={<GroupsIcon />}
                  onClick={handleOpenTeamTeachersChat}
                >
                  فتح محادثة الفريق + المعلمين
                </Button>
              )}
              {chatType === 'general' && filteredConversations.length === 0 && (
                <Button
                  fullWidth
                  variant="contained"
                  startIcon={<PublicIcon />}
                  onClick={handleOpenGeneralChat}
                >
                  فتح المحادثة العامة
                </Button>
              )}
            </Box>
            
            <List sx={{ flex: 1, overflow: 'auto' }}>
              {filteredConversations.length === 0 ? (
                <Box sx={{ textAlign: 'center', py: 4 }}>
                  <Typography variant="body2" color="text.secondary">
                    {chatType === 'direct' && t('noPrivateChats')}
                    {chatType === 'team' && t('noTeamChat')}
                    {chatType === 'team_teachers' && t('noTeamTeachersChat')}
                    {chatType === 'general' && t('noGeneralChat')}
                  </Typography>
                </Box>
              ) : (
                filteredConversations.map((conversation) => (
                  <ListItem
                    key={conversation._id}
                    button
                    selected={selectedConversation?._id === conversation._id}
                    onClick={() => setSelectedConversation(conversation)}
                  >
                    <ListItemAvatar>
                      <Badge badgeContent={getUnreadCount(conversation)} color="error">
                        <Avatar src={getConversationAvatar(conversation)}>
                          {getConversationIcon(conversation) || getConversationName(conversation)[0]}
                        </Avatar>
                      </Badge>
                    </ListItemAvatar>
                    <ListItemText
                      primary={getConversationName(conversation)}
                      secondary={
                        conversation.lastMessage?.text
                          ? `${conversation.lastMessage.text.substring(0, 30)}...`
                          : t('noMessages')
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
                ))
              )}
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
                  {getConversationIcon(selectedConversation) || getConversationName(selectedConversation)[0]}
                </Avatar>
                <Box sx={{ flex: 1 }}>
                  <Typography variant="h6">{getConversationName(selectedConversation)}</Typography>
                  <Typography variant="caption" color="text.secondary">
                    {selectedConversation.participants.length} عضو
                  </Typography>
                </Box>
                <IconButton onClick={() => setShowSearch(!showSearch)} size="small">
                  {showSearch ? <CloseIcon /> : <SearchIcon />}
                </IconButton>
              </Box>

              {/* In-chat Search Bar */}
              {showSearch && (
                <Box sx={{ p: 1, borderBottom: 1, borderColor: 'divider', display: 'flex', alignItems: 'center', gap: 1 }}>
                  <TextField
                    fullWidth
                    size="small"
                    id="in-chat-search"
                    name="inChatSearch"
                    placeholder={t('searchInConversation')}
                    value={inChatSearch}
                    onChange={(e) => setInChatSearch(e.target.value)}
                    InputProps={{
                      startAdornment: (
                        <InputAdornment position="start">
                          <SearchIcon fontSize="small" />
                        </InputAdornment>
                      ),
                    }}
                  />
                  {searchResults.length > 0 && (
                    <>
                      <Typography variant="caption" sx={{ whiteSpace: 'nowrap' }}>
                        {currentSearchIndex + 1}/{searchResults.length}
                      </Typography>
                      <IconButton size="small" onClick={() => handleSearchNavigation('prev')}>
                        <KeyboardArrowUpIcon />
                      </IconButton>
                      <IconButton size="small" onClick={() => handleSearchNavigation('next')}>
                        <KeyboardArrowDownIcon />
                      </IconButton>
                    </>
                  )}
                </Box>
              )}

              {/* Messages */}
              <Box 
                sx={{ flex: 1, overflow: 'auto', p: 2, bgcolor: '#f5f5f5' }} 
                ref={messagesContainerRef}
                onScroll={handleScroll}
              >
                {hasMoreMessages && (
                  <Box sx={{ display: 'flex', justifyContent: 'center', mb: 2 }}>
                    <Button
                      size="small"
                      onClick={loadMoreMessages}
                      disabled={loadingMessages}
                      variant="outlined"
                    >
                      {loadingMessages ? <CircularProgress size={20} /> : t('loadMore')}
                    </Button>
                  </Box>
                )}
                {loadingMessages && messages.length === 0 && (
                  <Box>
                    {[1, 2, 3].map((i) => (
                      <Box key={i} sx={{ display: 'flex', mb: 2, justifyContent: i % 2 === 0 ? 'flex-end' : 'flex-start' }}>
                        <Box sx={{ maxWidth: '70%' }}>
                          <Skeleton variant="rectangular" width={200} height={60} sx={{ borderRadius: 2 }} />
                        </Box>
                      </Box>
                    ))}
                  </Box>
                )}
                {messages.map((message, index) => {
                  if (!message.sender) return null;
                  
                  const isSending = message.status === 'sending';
                  const isFailed = message.status === 'failed';
                  const isOwn = message.sender._id === user.id;
                  
                  const showDateSeparator = shouldShowDateSeparator(message, messages[index - 1]);
                  const showNewMessagesDivider = lastReadMessageId && message._id === lastReadMessageId;
                  
                  const isSearchResult = searchResults.some(r => r._id === message._id);
                  const isCurrentSearchResult = searchResults[currentSearchIndex]?._id === message._id;
                  
                  return (
                    <React.Fragment key={message._id}>
                      {/* Date Separator */}
                      {showDateSeparator && (
                        <Box sx={{ display: 'flex', justifyContent: 'center', my: 2 }}>
                          <Chip 
                            label={getDateHeader(new Date(message.createdAt))} 
                            size="small" 
                            sx={{ bgcolor: 'grey.200' }}
                          />
                        </Box>
                      )}
                      
                      {/* New Messages Divider */}
                      {showNewMessagesDivider && (
                        <Box sx={{ display: 'flex', alignItems: 'center', my: 2 }}>
                          <Divider sx={{ flex: 1 }} />
                          <Chip 
                            label={t('newMessages')} 
                            size="small" 
                            color="primary" 
                            sx={{ mx: 1 }}
                          />
                          <Divider sx={{ flex: 1 }} />
                        </Box>
                      )}
                      
                      <Box
                        id={`msg-${message._id}`}
                        sx={{
                          display: 'flex',
                          justifyContent: isOwn ? 'flex-end' : 'flex-start',
                          mb: 2,
                          alignItems: 'center',
                          gap: 1
                        }}
                      >
                        {isFailed && isOwn && (
                          <IconButton 
                            size="small" 
                            color="error"
                            onClick={() => handleRetryMessage(message)}
                            title={t('retrySend')}
                          >
                            <RefreshIcon fontSize="small" />
                          </IconButton>
                        )}
                        <Box
                          sx={{
                            maxWidth: '70%',
                            color: isOwn ? 'white' : 'text.primary',
                            p: 1.5,
                            borderRadius: 2,
                            boxShadow: 1,
                            opacity: isSending ? 0.6 : 1,
                            border: isFailed ? '1px solid #d32f2f' 
                              : isCurrentSearchResult ? '2px solid #ff9800'
                              : isSearchResult ? '1px solid #2196f3'
                              : 'none',
                            bgcolor: isSearchResult && !isOwn ? '#fff3e0' : (isOwn ? 'primary.main' : 'white'),
                            transition: 'all 0.3s'
                          }}
                        >
                          {(selectedConversation.type === 'team' || 
                            selectedConversation.type === 'team_teachers' || 
                            selectedConversation.type === 'general' ||
                            selectedConversation.type === 'group') && 
                            !isOwn && (
                            <Typography variant="caption" sx={{ fontWeight: 'bold', display: 'block', mb: 0.5 }}>
                              {message.sender.name}
                            </Typography>
                          )}
                          <Typography variant="body1">{message.content}</Typography>
                          <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, mt: 0.5 }}>
                            <Typography variant="caption" sx={{ opacity: 0.7 }}>
                              {formatDistanceToNow(new Date(message.createdAt), { addSuffix: true, locale: ar })}
                            </Typography>
                            {isSending && (
                              <CircularProgress size={10} sx={{ color: isOwn ? 'white' : 'primary.main' }} />
                            )}
                            {isFailed && (
                              <ErrorOutlineIcon sx={{ fontSize: 12, color: '#d32f2f' }} />
                            )}
                            {!isSending && !isFailed && isOwn && (
                              message.read ? (
                                <DoneAllIcon sx={{ fontSize: 14, color: '#2196f3' }} />
                              ) : (
                                <DoneIcon sx={{ fontSize: 14, opacity: 0.7 }} />
                              )
                            )}
                          </Box>
                        </Box>
                      </Box>
                    </React.Fragment>
                  );
                })}
                {typingUsers.size > 0 && (
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    <CircularProgress size={12} />
                    <Typography variant="caption" color="text.secondary" sx={{ fontStyle: 'italic' }}>
                      {Array.from(typingUsers.values()).join('، ')} {t('typing')}
                    </Typography>
                  </Box>
                )}
                <div ref={messagesEndRef} />
              </Box>

              {/* Input */}
              <Box component="form" onSubmit={handleSendMessage} sx={{ p: 2, borderTop: 1, borderColor: 'divider' }}>
                <TextField
                  fullWidth
                  multiline
                  maxRows={4}
                  id="message-input"
                  name="message"
                  value={messageText}
                  onChange={(e) => {
                    setMessageText(e.target.value);
                    handleTyping();
                  }}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && !e.shiftKey) {
                      e.preventDefault();
                      if (messageText.trim() && !sendingMessage) {
                        handleSendMessage(e);
                      }
                    }
                  }}
                  placeholder={t('typeMessageHint')}
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
                {t('selectConversationToStart')}
              </Typography>
            </Box>
          )}
        </Grid>
      </Grid>

      {/* New Chat Dialog */}
      <Dialog open={newChatDialogOpen} onClose={() => setNewChatDialogOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>{t('newConversation')}</DialogTitle>
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
        <DialogTitle>{t('createNewGroup')}</DialogTitle>
        <DialogContent>
          <TextField
            fullWidth
            id="group-name"
            name="groupName"
            label={t('groupName')}
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
            renderInput={(params) => <TextField {...params} label={t('addMembers')} />}
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
          <Button onClick={() => setGroupDialogOpen(false)}>{t('cancel')}</Button>
          <Button onClick={handleCreateGroup} variant="contained">
            {t('create')}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default ChatPage;
