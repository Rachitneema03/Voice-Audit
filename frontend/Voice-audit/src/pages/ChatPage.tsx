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
  deleteChat,
  loadUserProfile,
  updateUserProfile,
  uploadProfilePhoto,
  deleteProfilePhoto
} from '../services/firestore.service';
import { updateUserDisplayName } from '../firebase/auth';
import { initChromeExtension } from '../services/chromeExtension.service';
import { VoicePromptBox } from '../components/ui/VoicePromptBox';
import { Tiles } from '../components/ui/Tiles';
import { UserDropdown } from '../components/ui/UserDropdown';
import { ShiningText } from '../components/ui/ShiningText';
import { TextShimmer } from '../components/ui/TextShimmer';
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
  const [editedText, setEditedText] = useState<string>('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [isGoogleConnected, setIsGoogleConnected] = useState(false);
  const recognitionRef = useRef<any>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const [chatHistories, setChatHistories] = useState<ChatHistory[]>([]);
  const [currentChatId, setCurrentChatId] = useState<string | null>(null);
  const [isLoadingChats, setIsLoadingChats] = useState(true);
  const [showEditProfile, setShowEditProfile] = useState(false);
  const [userProfile, setUserProfile] = useState<{ displayName: string; email: string; profilePhotoURL?: string } | null>(null);
  const [editDisplayName, setEditDisplayName] = useState('');
  const [editProfilePhoto, setEditProfilePhoto] = useState<File | null>(null);
  const [editProfilePhotoPreview, setEditProfilePhotoPreview] = useState<string | null>(null);
  const [isUpdatingProfile, setIsUpdatingProfile] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const [notification, setNotification] = useState<{ message: string; type: 'success' | 'error' } | null>(null);
  const [openMenuChatId, setOpenMenuChatId] = useState<string | null>(null);

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

  /**
   * Refresh chats from Firestore using user ID
   * This function always fetches the latest chats from Firestore database
   */
  const refreshChatsFromFirestore = async (loadFirstChatMessages: boolean = false) => {
    if (!currentUser) {
      console.warn('⚠️ No current user, cannot refresh chats');
      return;
    }

    console.log(`📡 Refreshing chats from Firestore for user ID: ${currentUser.uid}`);
    setIsLoadingChats(true);
    
    try {
      // Always fetch from Firestore using user ID
      const chats = await loadUserChats(currentUser.uid);
      console.log(`✅ Fetched ${chats.length} chats from Firestore for user ${currentUser.uid}:`, chats);
      
      if (chats.length > 0) {
        // Convert FirestoreChatHistory to ChatHistory format
        const formattedChats: ChatHistory[] = chats.map((chat) => ({
          id: chat.id || Date.now().toString(),
          title: chat.title,
          messages: [],
          createdAt: chat.createdAt instanceof Date ? chat.createdAt : new Date(),
        }));
        setChatHistories(formattedChats);
        
        // Load messages for the first chat (most recently updated) if requested
        if (loadFirstChatMessages) {
          const firstChat = chats[0];
          if (firstChat.id) {
            setCurrentChatId(firstChat.id);
            try {
              const loadedMessages = await loadChatMessages(firstChat.id);
              console.log(`✅ Fetched ${loadedMessages.length} messages for chat ${firstChat.id}`);
              
              if (loadedMessages.length > 0) {
                const formattedMessages: Message[] = loadedMessages.map((msg) => ({
                  id: msg.id || Date.now().toString(),
                  text: msg.text,
                  sender: msg.sender,
                  timestamp: msg.timestamp instanceof Date ? msg.timestamp : new Date(),
                }));
                setMessages(formattedMessages);
              } else {
                // No messages - show welcome component
                setMessages([]);
              }
            } catch (error: any) {
              console.error('❌ Error loading messages:', error);
              showNotification(`Failed to load messages: ${error.message}`, 'error');
            }
          }
        }
      } else {
        // No chats exist - show welcome component
        console.log(`ℹ️ No chats found for user ${currentUser.uid}`);
        setChatHistories([]);
        if (loadFirstChatMessages) {
          setCurrentChatId(null);
          setMessages([]);
        }
      }
    } catch (error: any) {
      console.error(`❌ Error refreshing chats for user ${currentUser.uid}:`, error);
      showNotification(`Failed to load chats: ${error.message}`, 'error');
      // Show welcome component even on error
      setChatHistories([]);
      if (loadFirstChatMessages) {
        setCurrentChatId(null);
        setMessages([]);
      }
    } finally {
      setIsLoadingChats(false);
    }
  };

  useEffect(() => {
    if (!currentUser) {
      navigate('/auth');
      return;
    }

    // Load user data and chats on mount - always fetch from Firestore using user ID
    refreshChatsFromFirestore(true);

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
      setEditedText(text); // Set editedText immediately so text is directly editable
      setIsRecording(false);
      // Focus the textarea after a short delay to ensure it's rendered
      setTimeout(() => {
        textareaRef.current?.focus();
        textareaRef.current?.setSelectionRange(
          textareaRef.current.value.length,
          textareaRef.current.value.length
        );
      }, 100);
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
    // Always use editedText when transcribedText exists (text is always editable)
    const textToSend = transcribedText ? editedText : transcribedText;
    if (textToSend.trim()) {
      handleTextSubmit(textToSend);
      setTranscribedText('');
      setEditedText('');
    }
  };

  const handleCancel = () => {
    if (isRecording) {
      stopRecording();
    }
    setTranscribedText('');
    setEditedText('');
  };

  /**
   * Format action result for display
   */
  const formatActionResult = (result: any): string => {
    if (!result.success) {
      return `❌ ${result.message}`;
    }

    const { action, message, data } = result;
    
    switch (action) {
      case "calendar":
        return `📅 ${message}\n\n` +
               `Event: ${data?.title || 'N/A'}\n` +
               `Start: ${data?.start || 'N/A'}\n` +
               `End: ${data?.end || 'N/A'}\n` +
               (data?.location ? `Location: ${data.location}\n` : '') +
               (data?.description ? `Description: ${data.description}\n` : '');
      
      case "task":
        return `✅ ${message}\n\n` +
               `Task: ${data?.title || 'N/A'}\n` +
               `Due: ${data?.due || 'N/A'}\n` +
               (data?.notes ? `Notes: ${data.notes}\n` : '') +
               (data?.status ? `Status: ${data.status}\n` : '');
      
      case "email":
        return `📧 ${message}\n\n` +
               `━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n` +
               `📮 Recipient: ${data?.recipient || 'N/A'}\n` +
               `📋 Subject: ${data?.subject || 'N/A'}\n` +
               `━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n\n` +
               `💬 Email Content:\n${data?.body || 'N/A'}\n` +
               `━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`;
      
      default:
        return `${message}\n${data ? JSON.stringify(data, null, 2) : ''}`;
    }
  };

  const handleRecordAgain = () => {
    handleCancel();
    startListening();
  };

  const handleTextSubmit = async (text: string) => {
    if (!text.trim() || isProcessing || !currentUser) return;

    // Don't create chat yet - wait for valid response
    let chatId = currentChatId;

    // Check if command likely requires Google (quick check before sending)
    const lowerText = text.toLowerCase();
    const needsGoogle = lowerText.includes('meeting') || lowerText.includes('schedule') || 
                       lowerText.includes('calendar') || lowerText.includes('event') ||
                       lowerText.includes('task') || lowerText.includes('todo') ||
                       lowerText.includes('email') || lowerText.includes('send') ||
                       lowerText.includes('gmail') || lowerText.includes('mail');

    // If command needs Google but not connected, show helpful message
    if (needsGoogle && !isGoogleConnected) {
      // Ensure we have a chat ID - create chat if needed
      if (!chatId) {
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
      // chatId is guaranteed to be a string at this point
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
    
    // Don't save user message yet - wait for valid response
    let shouldSaveMessages = false;

    setIsProcessing(true);

    try {
      const response = await processText(text.trim());
      
      // Check if this is a valid response (not an error or Gemini failure)
      // Valid if: success is true, OR has results array with items, OR action is not "unknown"
      const hasValidAction = response.action && 
        response.action !== "unknown" && 
        !response.message?.includes("Could not determine");
      
      const hasValidResults = response.results && 
        Array.isArray(response.results) && 
        response.results.length > 0 &&
        response.results.some((r: any) => r.success && r.action !== "unknown");
      
      const isNotError = !response.message?.includes("Gemini API Error") && 
        !response.message?.includes("Failed to process") &&
        !response.message?.includes("GEMINI_ERROR") &&
        !response.message?.includes("Could not determine");
      
      // Only save if we got a valid response with actual action
      shouldSaveMessages = (response.success && hasValidAction) || hasValidResults || isNotError;
      
      // Check if response indicates Google auth is needed
      const needsAuth = !response.success && (
        response.message?.includes("not connected") || 
        response.message?.includes("authenticate") ||
        response.message?.includes("Connect Google")
      );
      
      let messageText = "";
      
      // Handle multiple actions response
      if (response.results && Array.isArray(response.results)) {
        messageText = `${response.message}\n\n`;
        response.results.forEach((result: any, index: number) => {
          messageText += `\n${index + 1}. ${formatActionResult(result)}\n`;
        });
      } else {
        // Single action response
        if (response.success) {
          messageText = formatActionResult(response);
        } else {
          messageText = `❌ ${response.message}`;
        }
      }
      
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
      
      // Only save messages to Firestore if we got a valid response
      if (shouldSaveMessages) {
        // Create chat if it doesn't exist yet (only when we have valid response)
        if (!chatId) {
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
        
        // Save user message
        saveMessage(chatId, {
          text: text.trim(),
          sender: 'user',
          chatId,
        }).catch(console.error);
        
        // Save assistant message
        saveMessage(chatId, {
          text: assistantMessage.text,
          sender: 'assistant',
          chatId,
        }).catch(console.error);
      } else {
        // If no valid response, don't save anything to database
        console.log("⚠️ No valid response from Gemini - not saving to database");
      }

      // Update chat title if it's still "New Chat" (only if chat was created)
      if (chatId) {
        const currentChat = chatHistories.find(c => c.id === chatId);
        if (currentChat && currentChat.title === 'New Chat') {
          const newTitle = text.substring(0, 30) || 'Chat';
          updateChatTitle(chatId, newTitle).catch(console.error);
          setChatHistories(prev => prev.map(c => 
            c.id === chatId ? { ...c, title: newTitle } : c
          ));
        }
        
        // Refresh chat list from Firestore to ensure proper ordering (chats ordered by updatedAt)
        await refreshChatsFromFirestore(false);
      }
    } catch (error: any) {
      const errorMessage: Message = {
        id: (Date.now() + 1).toString(),
        text: `❌ Error: ${error.message || 'Failed to process request. Make sure backend is running and you are authenticated.'}`,
        sender: 'assistant',
        timestamp: new Date(),
      };
      setMessages((prev) => [...prev, errorMessage]);
      
      // Don't save error messages to Firestore - no valid conversation happened
      console.log("⚠️ Error occurred - not saving to database");
      
      // If chat was just created and has no saved messages, we could optionally delete it
      // But for now, just don't save the messages
      
      // Refresh chat list from Firestore to ensure proper ordering
      await refreshChatsFromFirestore(false);
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
      console.log(`✅ Created new chat ${chatId} for user ${currentUser.uid}`);
      
      // Refresh chats from Firestore to get the latest list
      await refreshChatsFromFirestore(false);
      
      // Set the new chat as current
      setCurrentChatId(chatId);
      setMessages([]); // Empty messages to show welcome component
      
      // Close mobile sidebar after creating new chat
      setMobileSidebarOpen(false);
    } catch (error) {
      console.error('Error creating new chat:', error);
      showNotification('Failed to create new chat', 'error');
    }
  };

  const handleEditProfile = () => {
    setEditDisplayName(userProfile?.displayName || currentUser?.displayName || '');
    setEditProfilePhoto(null);
    // Show custom photo if exists, otherwise show Google photo as preview
    const currentPhoto = userProfile?.profilePhotoURL || currentUser?.photoURL || null;
    setEditProfilePhotoPreview(currentPhoto);
    setShowEditProfile(true);
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
      setOpenMenuChatId(null); // Close menu when selecting chat
      setMobileSidebarOpen(false); // Close mobile sidebar when selecting chat
      
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
          // No messages - show welcome component
          setMessages([]);
        }
      } catch (error) {
        console.error('Error loading messages:', error);
        // On error - show welcome component
        setMessages([]);
      }
    }
  };

  // Close menu when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as HTMLElement;
      // Check if click is on a menu button (to allow toggling)
      const menuButton = target.closest('.chat-item-menu-btn');
      if (menuButton) {
        return; // Allow menu button clicks to handle toggle
      }
      
      // Check if click is inside any menu dropdown
      const menuDropdown = target.closest('.chat-item-menu-dropdown');
      if (menuDropdown) {
        return; // Click is inside menu, don't close
      }
      
      // Click is outside menu, close it
      setOpenMenuChatId(null);
    };

    if (openMenuChatId) {
      // Use a small delay to avoid closing immediately when opening
      const timeoutId = setTimeout(() => {
        document.addEventListener('mousedown', handleClickOutside);
      }, 100);

      return () => {
        clearTimeout(timeoutId);
        document.removeEventListener('mousedown', handleClickOutside);
      };
    }
  }, [openMenuChatId]);

  const handleDeleteChat = async (chatId: string, e: React.MouseEvent) => {
    e.stopPropagation(); // Prevent chat selection
    setOpenMenuChatId(null);

    if (!window.confirm('Are you sure you want to delete this chat? This action cannot be undone.')) {
      return;
    }

    try {
      await deleteChat(chatId);
      
      // Remove from local state
      setChatHistories(prev => prev.filter(chat => chat.id !== chatId));
      
      // If deleted chat was current, clear it
      if (currentChatId === chatId) {
        setCurrentChatId(null);
        setMessages([]); // Show welcome component
      }
      
      showNotification('Chat deleted successfully', 'success');
    } catch (error: any) {
      console.error('Error deleting chat:', error);
      showNotification(`Failed to delete chat: ${error.message}`, 'error');
    }
  };

  const handleExportChat = async (chatId: string, e: React.MouseEvent) => {
    e.stopPropagation(); // Prevent chat selection
    setOpenMenuChatId(null);

    try {
      // Load messages for this chat
      const loadedMessages = await loadChatMessages(chatId);
      const chat = chatHistories.find(c => c.id === chatId);
      
      if (loadedMessages.length === 0) {
        showNotification('This chat has no messages to export', 'error');
        return;
      }

      // Format messages for export
      let exportText = `Chat: ${chat?.title || 'Untitled Chat'}\n`;
      exportText += `Exported on: ${new Date().toLocaleString()}\n`;
      exportText += `${'='.repeat(50)}\n\n`;

      loadedMessages.forEach((msg) => {
        const timestamp = msg.timestamp instanceof Date 
          ? msg.timestamp.toLocaleString() 
          : new Date().toLocaleString();
        const sender = msg.sender === 'user' ? 'You' : 'Assistant';
        exportText += `[${timestamp}] ${sender}:\n${msg.text}\n\n`;
      });

      // Create blob and download
      const blob = new Blob([exportText], { type: 'text/plain' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${chat?.title || 'chat'}_${new Date().toISOString().split('T')[0]}.txt`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);

      showNotification('Chat exported successfully', 'success');
    } catch (error: any) {
      console.error('Error exporting chat:', error);
      showNotification(`Failed to export chat: ${error.message}`, 'error');
    }
  };

  const handleShareChat = async (chatId: string, e: React.MouseEvent) => {
    e.stopPropagation(); // Prevent chat selection
    setOpenMenuChatId(null);

    try {
      // Load messages for this chat
      const loadedMessages = await loadChatMessages(chatId);
      const chat = chatHistories.find(c => c.id === chatId);
      
      if (loadedMessages.length === 0) {
        showNotification('This chat has no messages to share', 'error');
        return;
      }

      // Format messages for sharing
      let shareText = `Chat: ${chat?.title || 'Untitled Chat'}\n`;
      shareText += `${'='.repeat(50)}\n\n`;

      loadedMessages.forEach((msg) => {
        const timestamp = msg.timestamp instanceof Date 
          ? msg.timestamp.toLocaleString() 
          : new Date().toLocaleString();
        const sender = msg.sender === 'user' ? 'You' : 'Assistant';
        shareText += `[${timestamp}] ${sender}:\n${msg.text}\n\n`;
      });

      // Copy to clipboard
      if (navigator.clipboard && navigator.clipboard.writeText) {
        await navigator.clipboard.writeText(shareText);
        showNotification('Chat copied to clipboard!', 'success');
      } else {
        // Fallback for older browsers
        const textArea = document.createElement('textarea');
        textArea.value = shareText;
        textArea.style.position = 'fixed';
        textArea.style.opacity = '0';
        document.body.appendChild(textArea);
        textArea.select();
        document.execCommand('copy');
        document.body.removeChild(textArea);
        showNotification('Chat copied to clipboard!', 'success');
      }
    } catch (error: any) {
      console.error('Error sharing chat:', error);
      showNotification(`Failed to share chat: ${error.message}`, 'error');
    }
  };

  const toggleChatMenu = (chatId: string, e: React.MouseEvent) => {
    e.stopPropagation(); // Prevent chat selection
    setOpenMenuChatId(openMenuChatId === chatId ? null : chatId);
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
      
      {/* Animated Burger Menu Button */}
      <label className="burger" aria-label="Toggle menu">
        <input 
          type="checkbox" 
          checked={mobileSidebarOpen}
          onChange={(e) => setMobileSidebarOpen(e.target.checked)}
        />
        <span></span>
        <span></span>
        <span></span>
      </label>
      
      {/* Mobile Sidebar Overlay */}
      {mobileSidebarOpen && (
        <div 
          className="mobile-sidebar-overlay"
          onClick={() => setMobileSidebarOpen(false)}
        />
      )}
      
      <div className={`chat-sidebar ${mobileSidebarOpen ? 'mobile-open' : ''}`}>
        <div className="sidebar-header">
          <div className="sidebar-title-container">
            <h2>Voice Audit</h2>
          </div>
          <button className="new-chat-btn" onClick={handleNewChat}>
            + New Chat
          </button>
        </div>

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
                  <div className="chat-item-menu-container">
                    <button
                      className="chat-item-menu-btn"
                      onClick={(e) => toggleChatMenu(chat.id, e)}
                      title="Chat options"
                    >
                      <i className="bi bi-three-dots-vertical"></i>
                    </button>
                    {openMenuChatId === chat.id && (
                      <div className="chat-item-menu-dropdown">
                        <button
                          className="chat-menu-item"
                          onClick={(e) => handleExportChat(chat.id, e)}
                        >
                          <i className="bi bi-download"></i>
                          <span>Export</span>
                        </button>
                        <button
                          className="chat-menu-item"
                          onClick={(e) => handleShareChat(chat.id, e)}
                        >
                          <i className="bi bi-share"></i>
                          <span>Share</span>
                        </button>
                        <button
                          className="chat-menu-item chat-menu-item-danger"
                          onClick={(e) => handleDeleteChat(chat.id, e)}
                        >
                          <i className="bi bi-trash"></i>
                          <span>Delete</span>
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              ))
            )}
          </div>

        <div className="sidebar-footer">
            <UserDropdown
              user={{
                name: userProfile?.displayName || currentUser?.displayName || 'User',
                email: userProfile?.email || currentUser?.email || '',
                avatar: userProfile?.profilePhotoURL || currentUser?.photoURL || undefined,
                initials: (userProfile?.displayName || currentUser?.displayName || 'U').charAt(0).toUpperCase(),
                status: 'online'
              }}
              isGoogleConnected={isGoogleConnected}
              onEditProfile={handleEditProfile}
              onConnectGoogle={handleConnectGoogle}
              onLogout={async () => {
                try {
                  await logout();
                  navigate('/auth');
                } catch (error) {
                  console.error('Error signing out:', error);
                }
              }}
            />
          </div>
      </div>

      <div className="chat-main">
        <div className="chat-header">
        </div>
        <div className="chat-messages">
          {/* Tiles Background */}
          <Tiles rows={50} cols={20} tileSize="md" />
          
          {/* Welcome Message when no messages */}
          {messages.length === 0 && !isProcessing && (
            <div className="welcome-message">
              <div className="welcome-icon">
                <i className="bi bi-robot"></i>
              </div>
              <h2 className="welcome-title">
                <TextShimmer duration={2.5} className="large">
                  Hi! How can I help you today?
                </TextShimmer>
              </h2>
              <p className="welcome-subtitle">
                Use your voice to send commands. I can help with tasks, reminders, and more.
              </p>
            </div>
          )}
          
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
              <div className="message-content thinking-message">
                <ShiningText text="Thinking..." />
              </div>
            </div>
          )}
          <div ref={messagesEndRef} />
        </div>

        {/* Voice Prompt Box - Bottom Center */}
        <VoicePromptBox
          ref={textareaRef}
          isRecording={isRecording}
          transcribedText={transcribedText}
          editedText={editedText}
          onEditedTextChange={setEditedText}
          onStartRecording={startListening}
          onStopRecording={stopRecording}
          onSend={handleSend}
          onCancel={handleCancel}
          onRecordAgain={handleRecordAgain}
          isProcessing={isProcessing}
        />
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

