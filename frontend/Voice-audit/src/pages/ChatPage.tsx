import { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { logout } from '../firebase/auth';
import { processText, getGoogleAuthUrl, checkBackendHealth, checkGoogleConnection } from '../services/api.service';
import { 
  createChat, 
  saveMessage, 
  loadUserChats, 
  loadChatMessages,
  updateChatTitle,
  loadUserProfile,
  updateUserProfile,
  uploadProfilePhoto,
  deleteProfilePhoto
} from '../services/firestore.service';
import { updateUserDisplayName } from '../firebase/auth';
import { initChromeExtension } from '../services/chromeExtension.service';
import './ChatPage.css';

interface Message {
  id: string;
  text: string;
  sender: 'user' | 'assistant';
  timestamp: Date;
}

interface ChatHistory {
  id: string;
  title: string;
  messages: Message[];
  createdAt: Date;
}

// Extend Window interface for webkitSpeechRecognition
declare global {
  interface Window {
    webkitSpeechRecognition: any;
    SpeechRecognition: any;
  }
}

const ChatPage = () => {
  const { currentUser } = useAuth();
  const navigate = useNavigate();
  const [messages, setMessages] = useState<Message[]>([]);
  const [isRecording, setIsRecording] = useState(false);
  const [transcribedText, setTranscribedText] = useState<string>('');
  const [isEditingText, setIsEditingText] = useState(false);
  const [editedText, setEditedText] = useState<string>('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [isGoogleConnected, setIsGoogleConnected] = useState(false);
  const recognitionRef = useRef<any>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const [chatHistories, setChatHistories] = useState<ChatHistory[]>([]);
  const [currentChatId, setCurrentChatId] = useState<string | null>(null);
  const [isLoadingChats, setIsLoadingChats] = useState(true);
  const [showAccountMenu, setShowAccountMenu] = useState(false);
  const [showEditProfile, setShowEditProfile] = useState(false);
  const [userProfile, setUserProfile] = useState<{ displayName: string; email: string; profilePhotoURL?: string } | null>(null);
  const [editDisplayName, setEditDisplayName] = useState('');
  const [editProfilePhoto, setEditProfilePhoto] = useState<File | null>(null);
  const [editProfilePhotoPreview, setEditProfilePhotoPreview] = useState<string | null>(null);
  const [isUpdatingProfile, setIsUpdatingProfile] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const [notification, setNotification] = useState<{ message: string; type: 'success' | 'error' } | null>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  useEffect(() => {
    return () => {
      if (recognitionRef.current) {
        recognitionRef.current.stop();
      }
    };
  }, []);

  useEffect(() => {
    if (!currentUser) {
      navigate('/auth');
      return;
    }

    // Load user data and chats on mount - always fetch from Firestore
    setIsLoadingChats(true);
    loadUserChats(currentUser.uid)
      .then((chats) => {
        if (chats.length > 0) {
          // Convert FirestoreChatHistory to ChatHistory format
          const formattedChats: ChatHistory[] = chats.map((chat) => ({
            id: chat.id || Date.now().toString(),
            title: chat.title,
            messages: [],
            createdAt: chat.createdAt instanceof Date ? chat.createdAt : new Date(),
          }));
          setChatHistories(formattedChats);
          
          // Load messages for the first chat (most recently updated)
          const firstChat = chats[0];
          if (firstChat.id) {
            setCurrentChatId(firstChat.id);
            loadChatMessages(firstChat.id).then((loadedMessages) => {
              if (loadedMessages.length > 0) {
                const formattedMessages: Message[] = loadedMessages.map((msg) => ({
                  id: msg.id || Date.now().toString(),
                  text: msg.text,
                  sender: msg.sender,
                  timestamp: msg.timestamp instanceof Date ? msg.timestamp : new Date(),
                }));
                setMessages(formattedMessages);
              } else {
                // Default welcome message if no messages exist
                setMessages([{
                  id: Date.now().toString(),
                  text: 'Hello! I\'m your voice audit. Record a command to get started.',
                  sender: 'assistant',
                  timestamp: new Date(),
                }]);
              }
              setIsLoadingChats(false);
            }).catch((error) => {
              console.error('Error loading messages:', error);
              setIsLoadingChats(false);
            });
          } else {
            setIsLoadingChats(false);
          }
        } else {
          // No chats exist - show welcome message without creating a chat
          // Chat will be created only when user sends their first message
          setChatHistories([]);
          setCurrentChatId(null);
          setMessages([{
            id: Date.now().toString(),
            text: 'Hello! I\'m your voice audit. Record a command to get started.',
            sender: 'assistant',
            timestamp: new Date(),
          }]);
          setIsLoadingChats(false);
        }
      })
      .catch((error) => {
        console.error('Error loading chats:', error);
        setIsLoadingChats(false);
      });

    // Check backend connection
    checkBackendHealth()
      .then(() => {
        showNotification('Backend connected successfully!', 'success');
      })
      .catch((error) => {
        showNotification(`⚠️ ${error.message}`, 'error');
      });

    // Check Google connection status
    if (currentUser) {
      checkGoogleConnection()
        .then((result) => {
          const connected = result.connected || false;
          setIsGoogleConnected(connected);
          if (connected) {
            console.log('✅ Google account is connected');
          } else {
            console.log('⚠️ Google account not connected');
          }
        })
        .catch((error) => {
          console.error('Error checking Google connection:', error);
          setIsGoogleConnected(false);
        });

      // Load user profile
      loadUserProfile(currentUser.uid)
        .then((profile) => {
          if (profile) {
            // Use custom photo if exists, otherwise fall back to Google photo
            const photoURL = profile.profilePhotoURL || currentUser.photoURL || '';
            setUserProfile({
              displayName: profile.displayName || currentUser.displayName || '',
              email: profile.email || currentUser.email || '',
              profilePhotoURL: photoURL,
            });
          } else {
            // If no profile exists, use auth data (including Google photo)
            setUserProfile({
              displayName: currentUser.displayName || '',
              email: currentUser.email || '',
              profilePhotoURL: currentUser.photoURL || '',
            });
          }
        })
        .catch((error) => {
          console.error('Error loading user profile:', error);
          // Fallback to auth data (including Google photo)
          setUserProfile({
            displayName: currentUser.displayName || '',
            email: currentUser.email || '',
            profilePhotoURL: currentUser.photoURL || '',
          });
        });
    }

    // Initialize Chrome extension integration
    const cleanupExtension = initChromeExtension((text: string) => {
      // When extension sends text, automatically submit it
      if (text.trim() && !isProcessing) {
        handleTextSubmit(text);
      }
    });

    // Cleanup on unmount
    return () => {
      cleanupExtension();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentUser, navigate]);

  const addSystemMessage = (text: string) => {
    const systemMessage: Message = {
      id: Date.now().toString(),
      text,
      sender: 'assistant',
      timestamp: new Date(),
    };
    setMessages((prev) => [...prev, systemMessage]);
  };

  const showNotification = (message: string, type: 'success' | 'error') => {
    setNotification({ message, type });
    setTimeout(() => {
      setNotification(null);
    }, 4000);
  };

  const startListening = () => {
    if (isRecording) return;

    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    
    if (!SpeechRecognition) {
      alert('Speech recognition is not supported in your browser. Please use Chrome or Edge.');
      return;
    }

    const recognition = new SpeechRecognition();
    recognition.lang = 'en-US';
    recognition.continuous = false;
    recognition.interimResults = false;

    recognition.onstart = () => {
      setIsRecording(true);
      setTranscribedText('');
    };

    recognition.onresult = (event: any) => {
      const text = event.results[0][0].transcript;
      setTranscribedText(text);
      setIsRecording(false);
    };

    recognition.onerror = (event: any) => {
      console.error('Speech recognition error:', event.error);
      setIsRecording(false);
      if (event.error === 'no-speech') {
        alert('No speech detected. Please try again.');
      } else if (event.error === 'not-allowed') {
        alert('Microphone permission denied. Please allow microphone access.');
      }
    };

    recognition.onend = () => {
      setIsRecording(false);
    };

    recognitionRef.current = recognition;
    recognition.start();
  };

  const stopRecording = () => {
    if (recognitionRef.current && isRecording) {
      recognitionRef.current.stop();
      setIsRecording(false);
    }
  };

  const handleSend = () => {
    const textToSend = isEditingText ? editedText : transcribedText;
    if (textToSend.trim()) {
      handleTextSubmit(textToSend);
      setTranscribedText('');
      setEditedText('');
      setIsEditingText(false);
    }
  };

  const handleCancel = () => {
    if (isRecording) {
      stopRecording();
    }
    setTranscribedText('');
    setEditedText('');
    setIsEditingText(false);
  };

  const handleEditClick = () => {
    setIsEditingText(true);
    setEditedText(transcribedText);
    // Focus the textarea after a short delay to ensure it's rendered
    setTimeout(() => {
      textareaRef.current?.focus();
      textareaRef.current?.setSelectionRange(
        textareaRef.current.value.length,
        textareaRef.current.value.length
      );
    }, 0);
  };

  const handleSaveEdit = () => {
    setTranscribedText(editedText);
    setIsEditingText(false);
  };

  const handleCancelEdit = () => {
    setEditedText('');
    setIsEditingText(false);
  };

  const handleRecordAgain = () => {
    handleCancel();
    startListening();
  };

  const handleTextSubmit = async (text: string) => {
    if (!text.trim() || isProcessing || !currentUser) return;

    // Ensure we have a chat ID - create chat only when user actually sends a message
    let chatId = currentChatId;
    if (!chatId) {
      // Create new chat only when user actually sends a message
      const newTitle = text.substring(0, 30) || 'New Chat';
      chatId = await createChat(currentUser.uid, newTitle);
      setCurrentChatId(chatId);
      
      // Add new chat to chatHistories
      const newChat: ChatHistory = {
        id: chatId,
        title: newTitle,
        messages: [],
        createdAt: new Date(),
      };
      setChatHistories((prev) => [newChat, ...prev]);
    }

    // Check if command likely requires Google (quick check before sending)
    const lowerText = text.toLowerCase();
    const needsGoogle = lowerText.includes('meeting') || lowerText.includes('schedule') || 
                       lowerText.includes('calendar') || lowerText.includes('event') ||
                       lowerText.includes('task') || lowerText.includes('todo') ||
                       lowerText.includes('email') || lowerText.includes('send') ||
                       lowerText.includes('gmail') || lowerText.includes('mail');

    // If command needs Google but not connected, show helpful message
    if (needsGoogle && !isGoogleConnected) {
      const userMessage: Message = {
        id: Date.now().toString(),
        text: text.trim(),
        sender: 'user',
        timestamp: new Date(),
      };
      setMessages((prev) => [...prev, userMessage]);

      const errorMessage: Message = {
        id: (Date.now() + 1).toString(),
        text: `❌ Google account not connected.\n\n💡 To use Calendar, Tasks, or Gmail features, please:\n1. Click the "🔗 Connect Google" button in the sidebar (bottom left)\n2. Complete the authorization\n3. Try your command again\n\nYour command: "${text.trim()}"`,
        sender: 'assistant',
        timestamp: new Date(),
      };
      setMessages((prev) => [...prev, errorMessage]);
      
      // Save both messages to Firestore even though command failed
      saveMessage(chatId, {
        text: text.trim(),
        sender: 'user',
        chatId,
      }).catch(console.error);
      
      saveMessage(chatId, {
        text: errorMessage.text,
        sender: 'assistant',
        chatId,
      }).catch(console.error);
      
      return;
    }

    const userMessage: Message = {
      id: Date.now().toString(),
      text: text.trim(),
      sender: 'user',
      timestamp: new Date(),
    };

    setMessages((prev) => [...prev, userMessage]);
    
    // Save user message to Firestore
    saveMessage(chatId, {
      text: text.trim(),
      sender: 'user',
      chatId,
    }).catch(console.error);

    setIsProcessing(true);

    try {
      const response = await processText(text.trim());
      
      // Check if response indicates Google auth is needed
      const needsAuth = !response.success && (
        response.message?.includes("not connected") || 
        response.message?.includes("authenticate") ||
        response.message?.includes("Connect Google")
      );
      
      let messageText = response.success 
        ? `✅ ${response.message}\n${response.data ? JSON.stringify(response.data, null, 2) : ''}`
        : `❌ ${response.message}`;
      
      // Add helpful message if Google auth is needed
      if (needsAuth && !isGoogleConnected) {
        messageText += `\n\n💡 Tip: Click the "Connect Google" button in the sidebar to enable Calendar, Tasks, and Gmail features.`;
      }
      
      const assistantMessage: Message = {
        id: (Date.now() + 1).toString(),
        text: messageText,
        sender: 'assistant',
        timestamp: new Date(),
      };
      
      setMessages((prev) => [...prev, assistantMessage]);
      
      // Save assistant message to Firestore
      saveMessage(chatId, {
        text: assistantMessage.text,
        sender: 'assistant',
        chatId,
      }).catch(console.error);

      // Update chat title if it's still "New Chat"
      const currentChat = chatHistories.find(c => c.id === chatId);
      if (currentChat && currentChat.title === 'New Chat') {
        const newTitle = text.substring(0, 30) || 'Chat';
        updateChatTitle(chatId, newTitle).catch(console.error);
        setChatHistories(prev => prev.map(c => 
          c.id === chatId ? { ...c, title: newTitle } : c
        ));
      }
      
      // Refresh chat list to ensure proper ordering (chats ordered by updatedAt)
      if (currentUser) {
        loadUserChats(currentUser.uid)
          .then((chats) => {
            if (chats.length > 0) {
              const formattedChats: ChatHistory[] = chats.map((chat) => ({
                id: chat.id || Date.now().toString(),
                title: chat.title,
                messages: [],
                createdAt: chat.createdAt instanceof Date ? chat.createdAt : new Date(),
              }));
              setChatHistories(formattedChats);
            }
          })
          .catch(console.error);
      }
    } catch (error: any) {
      const errorMessage: Message = {
        id: (Date.now() + 1).toString(),
        text: `❌ Error: ${error.message || 'Failed to process request. Make sure backend is running and you are authenticated.'}`,
        sender: 'assistant',
        timestamp: new Date(),
      };
      setMessages((prev) => [...prev, errorMessage]);
      
      // Save error message to Firestore
      saveMessage(chatId, {
        text: errorMessage.text,
        sender: 'assistant',
        chatId,
      }).catch(console.error);
      
      // Refresh chat list to ensure proper ordering
      if (currentUser) {
        loadUserChats(currentUser.uid)
          .then((chats) => {
            if (chats.length > 0) {
              const formattedChats: ChatHistory[] = chats.map((chat) => ({
                id: chat.id || Date.now().toString(),
                title: chat.title,
                messages: [],
                createdAt: chat.createdAt instanceof Date ? chat.createdAt : new Date(),
              }));
              setChatHistories(formattedChats);
            }
          })
          .catch(console.error);
      }
    } finally {
      setIsProcessing(false);
    }
  };

  const handleConnectGoogle = async () => {
    if (!currentUser) {
      addSystemMessage('❌ Please sign in first');
      return;
    }

    try {
      const authUrl = await getGoogleAuthUrl();
      
      // Open OAuth flow in popup window
      const popup = window.open(
        authUrl,
        'Google OAuth',
        'width=500,height=600,left=100,top=100'
      );

      if (!popup) {
        addSystemMessage('❌ Popup blocked. Please allow popups and try again.');
        return;
      }

      addSystemMessage('Opening Google OAuth... Please complete the authorization in the popup window.');

      // Listen for OAuth success message from popup
      const messageHandler = async (event: MessageEvent) => {
        // Security: In production, verify event.origin
        if (event.data && event.data.type === 'GOOGLE_OAUTH_SUCCESS') {
          window.removeEventListener('message', messageHandler);
          
          // Check Google connection status
          try {
            const status = await checkGoogleConnection();
            if (status.connected) {
              setIsGoogleConnected(true);
              addSystemMessage('✅ Google account connected successfully! You can now use Calendar, Tasks, and Gmail features.');
            } else {
              addSystemMessage('⚠️ OAuth completed but connection status unclear. Please try again.');
            }
          } catch (error: any) {
            console.error('Error checking Google connection:', error);
            addSystemMessage('⚠️ OAuth completed. Please refresh to verify connection.');
          }
        }
      };

      window.addEventListener('message', messageHandler);

      // Also check if popup is closed (fallback)
      const checkPopup = setInterval(async () => {
        if (popup.closed) {
          clearInterval(checkPopup);
          window.removeEventListener('message', messageHandler);
          
          // Only check if we didn't already get a success message
          setTimeout(async () => {
            try {
              const status = await checkGoogleConnection();
              if (status.connected && !isGoogleConnected) {
                setIsGoogleConnected(true);
                addSystemMessage('✅ Google account connected!');
              }
            } catch (error) {
              // Silent fail - user might have cancelled
            }
          }, 1000);
        }
      }, 1000);

      // Cleanup after 5 minutes
      setTimeout(() => {
        clearInterval(checkPopup);
        window.removeEventListener('message', messageHandler);
        if (!popup.closed) {
          popup.close();
        }
      }, 5 * 60 * 1000);

    } catch (error: any) {
      console.error('Error connecting Google:', error);
      addSystemMessage(`❌ Failed to connect Google: ${error.message}`);
    }
  };

  const handleNewChat = async () => {
    if (!currentUser) return;

    try {
      const chatId = await createChat(currentUser.uid, 'New Chat');
      const newChat: ChatHistory = {
        id: chatId,
        title: 'New Chat',
        messages: [],
        createdAt: new Date(),
      };
      setChatHistories((prev) => [newChat, ...prev]);
      setCurrentChatId(chatId);
      setMessages([
        {
          id: Date.now().toString(),
          text: 'Hello! I\'m your voice audit. Type a command to get started.',
          sender: 'assistant',
          timestamp: new Date(),
        },
      ]);
    } catch (error) {
      console.error('Error creating new chat:', error);
    }
  };

  const handleEditProfile = () => {
    setEditDisplayName(userProfile?.displayName || currentUser?.displayName || '');
    setEditProfilePhoto(null);
    // Show custom photo if exists, otherwise show Google photo as preview
    const currentPhoto = userProfile?.profilePhotoURL || currentUser?.photoURL || null;
    setEditProfilePhotoPreview(currentPhoto);
    setShowEditProfile(true);
    setShowAccountMenu(false);
  };

  const handlePhotoSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      // Validate file type
      if (!file.type.startsWith('image/')) {
        showNotification('Please select an image file', 'error');
        return;
      }
      
      // Validate file size (max 10MB - will be compressed before upload)
      if (file.size > 10 * 1024 * 1024) {
        showNotification('Image size must be less than 10MB', 'error');
        return;
      }
      
      setEditProfilePhoto(file);
      
      // Create preview
      const reader = new FileReader();
      reader.onloadend = () => {
        setEditProfilePhotoPreview(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleRemovePhoto = () => {
    setEditProfilePhoto(null);
    // If removing custom photo, fall back to Google photo if available
    const googlePhoto = currentUser?.photoURL || null;
    setEditProfilePhotoPreview(googlePhoto);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleSaveProfile = async () => {
    if (!currentUser || !editDisplayName.trim()) return;

    setIsUpdatingProfile(true);
    try {
      let photoURL: string | undefined = userProfile?.profilePhotoURL;
      
      // If user removes photo, set to empty string (will fall back to Google photo)
      if (editProfilePhotoPreview === null && userProfile?.profilePhotoURL) {
        // User removed custom photo - delete it and fall back to Google photo
        try {
          await deleteProfilePhoto(userProfile.profilePhotoURL);
        } catch (error) {
          console.error('Error deleting old photo:', error);
          // Continue even if deletion fails
        }
        photoURL = currentUser.photoURL || '';
      } else if (editProfilePhoto) {
        // Upload new photo if selected
        // Delete old custom photo if exists (but not Google photo)
        if (userProfile?.profilePhotoURL && !userProfile.profilePhotoURL.includes('googleusercontent.com')) {
          try {
            await deleteProfilePhoto(userProfile.profilePhotoURL);
          } catch (error) {
            console.error('Error deleting old photo:', error);
            // Continue even if deletion fails
          }
        }
        
        // Upload new photo with progress tracking
        photoURL = await uploadProfilePhoto(
          currentUser.uid, 
          editProfilePhoto,
          (progress) => setUploadProgress(progress)
        );
      } else if (!editProfilePhoto && !userProfile?.profilePhotoURL) {
        // If no custom photo exists, use Google photo
        photoURL = currentUser.photoURL || '';
      }
      
      // Update Firebase Auth displayName
      await updateUserDisplayName(editDisplayName.trim());
      
      // Update Firestore profile
      await updateUserProfile(currentUser.uid, editDisplayName.trim(), photoURL);
      
      // Update local state - use Google photo as fallback
      setUserProfile({
        displayName: editDisplayName.trim(),
        email: currentUser.email || '',
        profilePhotoURL: photoURL || currentUser.photoURL || '',
      });
      
      setShowEditProfile(false);
      setEditProfilePhoto(null);
      setEditProfilePhotoPreview(null);
      setUploadProgress(0);
      showNotification('Profile updated successfully!', 'success');
    } catch (error: any) {
      console.error('Error updating profile:', error);
      showNotification(`Failed to update profile: ${error.message}`, 'error');
    } finally {
      setIsUpdatingProfile(false);
      setUploadProgress(0);
    }
  };

  const handleChatSelect = async (chatId: string) => {
    const chat = chatHistories.find((c) => c.id === chatId);
    if (chat) {
      setCurrentChatId(chatId);
      
      // Load messages from Firestore
      try {
        const loadedMessages = await loadChatMessages(chatId);
        if (loadedMessages.length > 0) {
          const formattedMessages: Message[] = loadedMessages.map((msg) => ({
            id: msg.id || Date.now().toString(),
            text: msg.text,
            sender: msg.sender,
            timestamp: msg.timestamp instanceof Date ? msg.timestamp : new Date(),
          }));
          setMessages(formattedMessages);
        } else {
          setMessages([
            {
              id: Date.now().toString(),
              text: 'Hello! I\'m your voice audit. Type a command to get started.',
              sender: 'assistant',
              timestamp: new Date(),
            },
          ]);
        }
      } catch (error) {
        console.error('Error loading messages:', error);
        setMessages([
          {
            id: Date.now().toString(),
            text: 'Hello! I\'m your voice audit. Type a command to get started.',
            sender: 'assistant',
            timestamp: new Date(),
          },
        ]);
      }
    }
  };

  return (
    <div className="chat-page">
      {notification && (
        <div className={`notification notification-${notification.type}`}>
          <span className="notification-message">{notification.message}</span>
          <button 
            className="notification-close" 
            onClick={() => setNotification(null)}
            aria-label="Close notification"
          >
            <i className="bi bi-x-lg"></i>
          </button>
        </div>
      )}
      <div className={`chat-sidebar ${sidebarCollapsed ? 'collapsed' : ''}`}>
        <div className="sidebar-header">
          {!sidebarCollapsed && (
            <>
              <div className="sidebar-title-container">
                <img src="/logo3.png" alt="Voice Audit Logo" className="sidebar-logo" />
                <h2>Voice Audit</h2>
              </div>
              <button className="new-chat-btn" onClick={handleNewChat}>
                + New Chat
              </button>
            </>
          )}
          <button 
            className="sidebar-toggle-btn"
            onClick={() => setSidebarCollapsed(!sidebarCollapsed)}
            title={sidebarCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
          >
            <i className={`bi bi-chevron-${sidebarCollapsed ? 'right' : 'left'}`}></i>
          </button>
        </div>

        {!sidebarCollapsed && (
          <div className="chat-history">
            {isLoadingChats ? (
              <div className="chat-loading">
                <i className="bi bi-arrow-repeat"></i>
                <span>Loading chats...</span>
              </div>
            ) : chatHistories.length === 0 ? (
              <div className="chat-empty">
                <i className="bi bi-chat-left-text"></i>
                <span>No chats yet</span>
              </div>
            ) : (
              chatHistories.map((chat) => (
                <div
                  key={chat.id}
                  className={`chat-history-item ${currentChatId === chat.id ? 'active' : ''}`}
                  onClick={() => handleChatSelect(chat.id)}
                >
                  <i className="bi bi-chat-left-text chat-icon"></i>
                  <span className="chat-title">{chat.title}</span>
                </div>
              ))
            )}
          </div>
        )}

        {!sidebarCollapsed && (
          <div className="sidebar-footer">
            <button
              className="account-btn"
              onClick={() => setShowAccountMenu(!showAccountMenu)}
            >
              <div className="account-avatar">
                {(userProfile?.profilePhotoURL || currentUser?.photoURL) ? (
                  <img 
                    src={userProfile?.profilePhotoURL || currentUser?.photoURL || ''} 
                    alt="Profile" 
                    className="account-avatar-img"
                  />
                ) : userProfile?.displayName || currentUser?.displayName ? (
                  <span className="account-avatar-text">
                    {(userProfile?.displayName || currentUser?.displayName || '').charAt(0).toUpperCase()}
                  </span>
                ) : (
                  <i className="bi bi-person-circle account-icon"></i>
                )}
              </div>
              <div className="account-info">
                <div className="account-name">
                  {userProfile?.displayName || currentUser?.displayName || 'User'}
                </div>
                <div className="account-email">
                  {userProfile?.email || currentUser?.email || ''}
                </div>
              </div>
              <i className={`bi bi-chevron-${showAccountMenu ? 'up' : 'down'} account-chevron`}></i>
            </button>
          {showAccountMenu && (
            <div className="account-menu">
              <div className="account-menu-header">
                <div className="account-menu-avatar">
                  {(userProfile?.profilePhotoURL || currentUser?.photoURL) ? (
                    <img 
                      src={userProfile?.profilePhotoURL || currentUser?.photoURL || ''} 
                      alt="Profile" 
                      className="account-menu-avatar-img"
                    />
                  ) : userProfile?.displayName || currentUser?.displayName ? (
                    <span className="account-menu-avatar-text">
                      {(userProfile?.displayName || currentUser?.displayName || '').charAt(0).toUpperCase()}
                    </span>
                  ) : (
                    <i className="bi bi-person-circle"></i>
                  )}
                </div>
                <div className="account-menu-user-info">
                  <div className="account-menu-name">
                    {userProfile?.displayName || currentUser?.displayName || 'User'}
                  </div>
                  <div className="account-menu-email">{userProfile?.email || currentUser?.email}</div>
                </div>
              </div>
              <div className="account-menu-divider"></div>
              <div 
                className="account-menu-item"
                onClick={handleEditProfile}
              >
                <i className="bi bi-pencil"></i> <span>Edit Profile</span>
              </div>
              <div className="account-menu-item">
                <i className="bi bi-gear"></i> <span>Settings</span>
              </div>
              <div 
                className="account-menu-item"
                onClick={handleConnectGoogle}
              >
                {isGoogleConnected ? (
                  <>
                    <i className="bi bi-check-circle"></i> <span>Google Connected</span>
                  </>
                ) : (
                  <>
                    <i className="bi bi-google"></i> <span>Connect Google</span>
                  </>
                )}
              </div>
              <div className="account-menu-divider"></div>
              <div 
                className="account-menu-item account-menu-item-danger"
                onClick={async () => {
                  try {
                    await logout();
                    navigate('/auth');
                  } catch (error) {
                    console.error('Error signing out:', error);
                  }
                }}
              >
                <i className="bi bi-box-arrow-right"></i> <span>Sign Out</span>
              </div>
            </div>
          )}
          </div>
        )}
      </div>

      <div className="chat-main">
        <div className="chat-header">
          <div className="chat-header-title-container">
            <img src="/logo3.png" alt="Voice Audit Logo" className="chat-header-logo" />
            <h1>Voice Audit</h1>
          </div>
        </div>
        <div className="chat-messages">
          {messages.map((message, index) => (
            <div
              key={message.id}
              className={`message ${message.sender === 'user' ? 'user-message' : 'assistant-message'} ${message.sender === 'assistant' ? 'message-slide-in' : ''}`}
              style={{ animationDelay: `${index * 0.1}s` }}
            >
              {message.sender === 'assistant' && (
                <div className="assistant-avatar">
                  <div className="avatar-glow"></div>
                  <i className="bi bi-robot avatar-icon"></i>
                </div>
              )}
              <div className="message-content">
                {message.text}
              </div>
              <div className="message-time">
                {message.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
              </div>
            </div>
          ))}
          {isProcessing && (
            <div className="message assistant-message message-slide-in">
              <div className="assistant-avatar">
                <div className="avatar-glow"></div>
                <i className="bi bi-robot avatar-icon"></i>
              </div>
              <div className="message-content typing-indicator">
                <span></span>
                <span></span>
                <span></span>
              </div>
            </div>
          )}
          <div ref={messagesEndRef} />
        </div>

        <div className="chat-input-container">
          {transcribedText ? (
            <div className="voice-input-wrapper">
              <div className="recording-controls">
                <button
                  className="control-btn record-again-btn"
                  onClick={handleRecordAgain}
                  title="Record Again"
                >
                  <i className="bi bi-mic-fill"></i>
                </button>
                {!isEditingText && (
                  <button
                    className="control-btn edit-btn"
                    onClick={handleEditClick}
                    title="Edit Text"
                  >
                    <i className="bi bi-pencil-fill"></i>
                  </button>
                )}
                <button
                  className="control-btn cancel-btn"
                  onClick={handleCancel}
                  title="Cancel"
                >
                  <i className="bi bi-x-lg"></i>
                </button>
              </div>
              <div className="voice-input-text">
                {isEditingText ? (
                  <div className="text-edit-container">
                    <textarea
                      ref={textareaRef}
                      className="text-edit-textarea"
                      value={editedText}
                      onChange={(e) => setEditedText(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter' && !e.shiftKey) {
                          e.preventDefault();
                          handleSaveEdit();
                        } else if (e.key === 'Escape') {
                          handleCancelEdit();
                        }
                      }}
                      placeholder="Edit your message..."
                      rows={3}
                      autoFocus
                    />
                    <div className="text-edit-actions">
                      <button
                        className="text-edit-btn save-btn"
                        onClick={handleSaveEdit}
                        title="Save (Enter)"
                      >
                        <i className="bi bi-check-lg"></i>
                        <span>Save</span>
                      </button>
                      <button
                        className="text-edit-btn cancel-edit-btn"
                        onClick={handleCancelEdit}
                        title="Cancel (Esc)"
                      >
                        <i className="bi bi-x-lg"></i>
                        <span>Cancel</span>
                      </button>
                    </div>
                  </div>
                ) : (
                  <>
                    <p className="voice-input-title">
                      {transcribedText}
                    </p>
                    <p className="voice-input-subtitle">
                      Review your transcription, edit, or send
                    </p>
                  </>
                )}
              </div>
              {!isEditingText && (
                <button
                  className="send-btn-circle"
                  onClick={handleSend}
                  title="Send"
                >
                  <i className="bi bi-send-fill"></i>
                </button>
              )}
            </div>
          ) : (
            <div className="voice-input-wrapper">
              <div className="record-button-container">
                <button
                  className={`record-btn-circle ${isRecording ? 'recording' : ''}`}
                  onClick={isRecording ? stopRecording : startListening}
                  title={isRecording ? 'Stop Recording' : 'Click to Start Recording'}
                >
                  <i className={`bi ${isRecording ? 'bi-stop-fill' : 'bi-mic-fill'}`}></i>
                  {isRecording && (
                    <>
                      <div className="recording-ring ring-1"></div>
                      <div className="recording-ring ring-2"></div>
                      <div className="recording-ring ring-3"></div>
                      <div className="sound-waves">
                        <div className="wave wave-1"></div>
                        <div className="wave wave-2"></div>
                        <div className="wave wave-3"></div>
                        <div className="wave wave-4"></div>
                        <div className="wave wave-5"></div>
                      </div>
                    </>
                  )}
                </button>
              </div>
              <div className="voice-input-text">
                <p className="voice-input-title">
                  {isRecording ? 'Listening...' : 'Click to Start Recording'}
                </p>
                <p className="voice-input-subtitle">
                  Speak your command and click send
                </p>
              </div>
              <button
                className="send-btn-circle"
                onClick={handleSend}
                title="Send"
                disabled={!transcribedText}
              >
                <i className="bi bi-send-fill"></i>
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Edit Profile Modal */}
      {showEditProfile && (
        <div className="modal-overlay" onClick={() => setShowEditProfile(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2>Edit Profile</h2>
              <button
                className="modal-close-btn"
                onClick={() => setShowEditProfile(false)}
                title="Close"
              >
                <i className="bi bi-x-lg"></i>
              </button>
            </div>
            <div className="modal-body">
              <div className="form-group">
                <label>Profile Photo</label>
                <div className="profile-photo-upload">
                  <div className="profile-photo-preview">
                    {editProfilePhotoPreview ? (
                      <>
                        <img 
                          src={editProfilePhotoPreview} 
                          alt="Profile preview" 
                          className="profile-photo-img"
                        />
                        <button
                          type="button"
                          className="profile-photo-remove"
                          onClick={handleRemovePhoto}
                          title="Remove photo"
                        >
                          <i className="bi bi-x-lg"></i>
                        </button>
                      </>
                    ) : (
                      <div className="profile-photo-placeholder">
                        <i className="bi bi-person-circle"></i>
                      </div>
                    )}
                  </div>
                  <div className="profile-photo-actions">
                    <input
                      ref={fileInputRef}
                      type="file"
                      accept="image/*"
                      onChange={handlePhotoSelect}
                      className="profile-photo-input"
                      id="profilePhoto"
                    />
                    <label htmlFor="profilePhoto" className="profile-photo-btn">
                      <i className="bi bi-camera"></i>
                      {editProfilePhotoPreview ? 'Change Photo' : 'Upload Photo'}
                    </label>
                    {editProfilePhotoPreview && (
                      <button
                        type="button"
                        className="profile-photo-btn profile-photo-btn-secondary"
                        onClick={handleRemovePhoto}
                      >
                        <i className="bi bi-trash"></i>
                        Remove
                      </button>
                    )}
                  </div>
                  <small className="form-hint">Max size: 10MB (will be compressed automatically). Supported formats: JPG, PNG, GIF</small>
                </div>
              </div>
              <div className="form-group">
                <label htmlFor="displayName">Display Name</label>
                <input
                  id="displayName"
                  type="text"
                  className="form-input"
                  value={editDisplayName}
                  onChange={(e) => setEditDisplayName(e.target.value)}
                  placeholder="Enter your display name"
                  maxLength={50}
                />
              </div>
              <div className="form-group">
                <label htmlFor="email">Email</label>
                <input
                  id="email"
                  type="email"
                  className="form-input form-input-disabled"
                  value={userProfile?.email || currentUser?.email || ''}
                  disabled
                  title="Email cannot be changed"
                />
                <small className="form-hint">Email cannot be changed</small>
              </div>
            </div>
            <div className="modal-footer">
              <button
                className="modal-btn modal-btn-secondary"
                onClick={() => setShowEditProfile(false)}
                disabled={isUpdatingProfile}
              >
                Cancel
              </button>
              <button
                className="modal-btn modal-btn-primary"
                onClick={handleSaveProfile}
                disabled={isUpdatingProfile || !editDisplayName.trim()}
              >
                {isUpdatingProfile ? (
                  <>
                    <i className="bi bi-arrow-repeat"></i> 
                    {uploadProgress > 0 ? `Uploading... ${uploadProgress}%` : 'Saving...'}
                  </>
                ) : (
                  <>
                    <i className="bi bi-check-lg"></i> Save Changes
                  </>
                )}
              </button>
              {isUpdatingProfile && uploadProgress > 0 && (
                <div className="upload-progress-bar">
                  <div 
                    className="upload-progress-fill" 
                    style={{ width: `${uploadProgress}%` }}
                  ></div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ChatPage;

