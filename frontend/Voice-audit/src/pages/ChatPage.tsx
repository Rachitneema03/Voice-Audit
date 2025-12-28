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
  updateChatTitle
} from '../services/firestore.service';
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
  const [messages, setMessages] = useState<Message[]>([
    {
      id: '1',
      text: 'Hello! I\'m your voice audit. Record a command to get started.',
      sender: 'assistant',
      timestamp: new Date(),
    },
  ]);
  const [isRecording, setIsRecording] = useState(false);
  const [transcribedText, setTranscribedText] = useState<string>('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [isGoogleConnected, setIsGoogleConnected] = useState(false);
  const recognitionRef = useRef<any>(null);
  const [chatHistories, setChatHistories] = useState<ChatHistory[]>([
    {
      id: '1',
      title: 'New Chat',
      messages: [],
      createdAt: new Date(),
    },
  ]);
  const [currentChatId, setCurrentChatId] = useState('1');
  const [showAccountMenu, setShowAccountMenu] = useState(false);
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

    // Load user data and chats on mount
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
          
          // Load messages for the first chat
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
                // Default welcome message
                setMessages([{
                  id: '1',
                  text: 'Hello! I\'m your voice audit. Record a command to get started.',
                  sender: 'assistant',
                  timestamp: new Date(),
                }]);
              }
            });
          }
        } else {
          // Create first chat if none exists
          createChat(currentUser.uid, 'New Chat').then((chatId) => {
            setCurrentChatId(chatId);
            setChatHistories([{
              id: chatId,
              title: 'New Chat',
              messages: [],
              createdAt: new Date(),
            }]);
          });
        }
      })
      .catch((error) => {
        console.error('Error loading chats:', error);
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
    if (transcribedText.trim()) {
      handleTextSubmit(transcribedText);
      setTranscribedText('');
    }
  };

  const handleCancel = () => {
    if (isRecording) {
      stopRecording();
    }
    setTranscribedText('');
  };

  const handleRecordAgain = () => {
    handleCancel();
    startListening();
  };

  const handleTextSubmit = async (text: string) => {
    if (!text.trim() || isProcessing || !currentUser) return;

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
      return;
    }

    // Ensure we have a chat ID
    let chatId = currentChatId;
    if (chatId === '1' || !chatId) {
      // Create new chat if needed
      chatId = await createChat(currentUser.uid, text.substring(0, 30) || 'New Chat');
      setCurrentChatId(chatId);
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
          id: '1',
          text: 'Hello! I\'m your voice audit. Type a command to get started.',
          sender: 'assistant',
          timestamp: new Date(),
        },
      ]);
    } catch (error) {
      console.error('Error creating new chat:', error);
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
              id: '1',
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
            id: '1',
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
            ×
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
            {chatHistories.map((chat) => (
              <div
                key={chat.id}
                className={`chat-history-item ${currentChatId === chat.id ? 'active' : ''}`}
                onClick={() => handleChatSelect(chat.id)}
              >
                <span className="chat-icon">💬</span>
                <span className="chat-title">{chat.title}</span>
              </div>
            ))}
          </div>
        )}

        {!sidebarCollapsed && (
          <div className="sidebar-footer">
            <button
              className="account-btn"
              onClick={() => setShowAccountMenu(!showAccountMenu)}
            >
              <span className="account-icon">👤</span>
              <span>{currentUser?.displayName || currentUser?.email || 'Account'}</span>
            </button>
          {showAccountMenu && (
            <div className="account-menu">
              <div className="account-menu-user-info">
                <div className="account-menu-email">{currentUser?.email}</div>
                {currentUser?.displayName && (
                  <div className="account-menu-name">{currentUser.displayName}</div>
                )}
              </div>
              <div className="account-menu-divider"></div>
              <div className="account-menu-item">Profile</div>
              <div className="account-menu-item">Settings</div>
              <div 
                className="account-menu-item"
                onClick={handleConnectGoogle}
              >
                {isGoogleConnected ? '✓ Google Connected' : 'Connect Google'}
              </div>
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
                Sign Out
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
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="avatar-icon">
                    <circle cx="12" cy="8" r="4"></circle>
                    <path d="M6 21v-2a4 4 0 0 1 4-4h4a4 4 0 0 1 4 4v2"></path>
                  </svg>
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
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="avatar-icon">
                  <circle cx="12" cy="8" r="4"></circle>
                  <path d="M6 21v-2a4 4 0 0 1 4-4h4a4 4 0 0 1 4 4v2"></path>
                </svg>
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
                <button
                  className="control-btn cancel-btn"
                  onClick={handleCancel}
                  title="Cancel"
                >
                  <i className="bi bi-x-lg"></i>
                </button>
              </div>
              <div className="voice-input-text">
                <p className="voice-input-title">
                  {transcribedText}
                </p>
                <p className="voice-input-subtitle">
                  Review your transcription or send
                </p>
              </div>
              <button
                className="send-btn-circle"
                onClick={handleSend}
                title="Send"
              >
                <i className="bi bi-send-fill"></i>
              </button>
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
    </div>
  );
};

export default ChatPage;

