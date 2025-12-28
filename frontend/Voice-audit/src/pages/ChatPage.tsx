import { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { logout } from '../firebase/auth';
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
    const userMessage: Message = {
      id: Date.now().toString(),
      text: text,
      sender: 'user',
      timestamp: new Date(),
    };

    setMessages((prev) => [...prev, userMessage]);

    // Simulate processing delay
    setTimeout(() => {
      const assistantMessage: Message = {
        id: (Date.now() + 1).toString(),
        text: 'I received your voice command. Processing your request...',
        sender: 'assistant',
        timestamp: new Date(),
      };
      setMessages((prev) => [...prev, assistantMessage]);
    }, 1000);
  };

  const handleNewChat = () => {
    const newChat: ChatHistory = {
      id: Date.now().toString(),
      title: 'New Chat',
      messages: [],
      createdAt: new Date(),
    };
    setChatHistories((prev) => [newChat, ...prev]);
    setCurrentChatId(newChat.id);
    setMessages([
      {
        id: '1',
        text: 'Hello! I\'m your voice audit. Record a command to get started.',
        sender: 'assistant',
        timestamp: new Date(),
      },
    ]);
  };

  const handleChatSelect = (chatId: string) => {
    const chat = chatHistories.find((c) => c.id === chatId);
    if (chat) {
      setCurrentChatId(chatId);
      setMessages(chat.messages.length > 0 ? chat.messages : [
        {
          id: '1',
          text: 'Hello! I\'m your voice audit. Record a command to get started.',
          sender: 'assistant',
          timestamp: new Date(),
        },
      ]);
    }
  };

  return (
    <div className="chat-page">
      <div className={`chat-sidebar ${sidebarCollapsed ? 'collapsed' : ''}`}>
        <div className="sidebar-header">
          {!sidebarCollapsed && (
            <>
              <h2>Voice Audit</h2>
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
          <h1>Voice Audit</h1>
        </div>
        <div className="chat-messages">
          {messages.map((message) => (
            <div
              key={message.id}
              className={`message ${message.sender === 'user' ? 'user-message' : 'assistant-message'}`}
            >
              <div className="message-content">
                {message.text}
              </div>
              <div className="message-time">
                {message.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
              </div>
            </div>
          ))}
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
              <button
                className={`record-btn-circle ${isRecording ? 'recording' : ''}`}
                onClick={isRecording ? stopRecording : startListening}
                title={isRecording ? 'Stop Recording' : 'Click to Start Recording'}
              >
                <i className={`bi ${isRecording ? 'bi-stop-fill' : 'bi-mic-fill'}`}></i>
              </button>
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

