import { 
  collection, 
  doc, 
  setDoc, 
  getDoc, 
  getDocs, 
  addDoc, 
  updateDoc,
  query,
  where,
  orderBy,
  serverTimestamp,
  Timestamp
} from "firebase/firestore";
import { db } from "../firebase/firestore";
import type { User } from "firebase/auth";

// User Profile Interface
export interface UserProfile {
  uid: string;
  email: string;
  displayName?: string;
  createdAt: Date;
  updatedAt: Date;
}

// Message Interface
export interface FirestoreMessage {
  id?: string;
  text: string;
  sender: 'user' | 'assistant';
  timestamp: Timestamp | Date;
  chatId: string;
}

// Chat History Interface
export interface FirestoreChatHistory {
  id?: string;
  userId: string;
  title: string;
  createdAt: Timestamp | Date;
  updatedAt: Timestamp | Date;
  messageCount: number;
}

/**
 * Save or update user profile in Firestore
 */
export async function saveUserProfile(user: User, displayName?: string): Promise<void> {
  try {
    const userRef = doc(db, "users", user.uid);
    const userData: UserProfile = {
      uid: user.uid,
      email: user.email || "",
      displayName: displayName || user.displayName || "",
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    // Check if user exists
    const userSnap = await getDoc(userRef);
    if (userSnap.exists()) {
      // Update existing user
      await updateDoc(userRef, {
        displayName: userData.displayName,
        email: userData.email,
        updatedAt: serverTimestamp(),
      });
    } else {
      // Create new user
      await setDoc(userRef, {
        ...userData,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });
    }
    console.log("✅ User profile saved to Firestore");
  } catch (error) {
    console.error("❌ Error saving user profile:", error);
    throw error;
  }
}

/**
 * Create a new chat in Firestore
 */
export async function createChat(userId: string, title: string = "New Chat"): Promise<string> {
  try {
    const chatsRef = collection(db, "chats");
    const chatData: Omit<FirestoreChatHistory, "id"> = {
      userId,
      title,
      createdAt: serverTimestamp() as any,
      updatedAt: serverTimestamp() as any,
      messageCount: 0,
    };

    const docRef = await addDoc(chatsRef, chatData);
    console.log("✅ Chat created:", docRef.id);
    return docRef.id;
  } catch (error) {
    console.error("❌ Error creating chat:", error);
    throw error;
  }
}

/**
 * Save a message to Firestore
 */
export async function saveMessage(
  chatId: string,
  message: Omit<FirestoreMessage, "id" | "timestamp">
): Promise<string> {
  try {
    const messagesRef = collection(db, "chats", chatId, "messages");
    const messageData = {
      ...message,
      timestamp: serverTimestamp(),
    };

    const docRef = await addDoc(messagesRef, messageData);
    
    // Update chat's message count and updatedAt
    const chatRef = doc(db, "chats", chatId);
    const chatSnap = await getDoc(chatRef);
    const currentCount = chatSnap.data()?.messageCount || 0;
    await updateDoc(chatRef, {
      messageCount: currentCount + 1,
      updatedAt: serverTimestamp(),
    });

    console.log("✅ Message saved:", docRef.id);
    return docRef.id;
  } catch (error) {
    console.error("❌ Error saving message:", error);
    throw error;
  }
}

/**
 * Load all chats for a user
 */
export async function loadUserChats(userId: string): Promise<FirestoreChatHistory[]> {
  try {
    const chatsRef = collection(db, "chats");
    const q = query(
      chatsRef,
      where("userId", "==", userId),
      orderBy("updatedAt", "desc")
    );

    const querySnapshot = await getDocs(q);
    const chats: FirestoreChatHistory[] = [];

    querySnapshot.forEach((doc) => {
      const data = doc.data();
      chats.push({
        id: doc.id,
        userId: data.userId,
        title: data.title,
        createdAt: data.createdAt?.toDate() || new Date(),
        updatedAt: data.updatedAt?.toDate() || new Date(),
        messageCount: data.messageCount || 0,
      });
    });

    console.log("✅ Loaded chats:", chats.length);
    return chats;
  } catch (error) {
    console.error("❌ Error loading chats:", error);
    return [];
  }
}

/**
 * Load messages for a chat
 */
export async function loadChatMessages(chatId: string): Promise<FirestoreMessage[]> {
  try {
    const messagesRef = collection(db, "chats", chatId, "messages");
    const q = query(messagesRef, orderBy("timestamp", "asc"));

    const querySnapshot = await getDocs(q);
    const messages: FirestoreMessage[] = [];

    querySnapshot.forEach((doc) => {
      const data = doc.data();
      messages.push({
        id: doc.id,
        text: data.text,
        sender: data.sender,
        timestamp: data.timestamp?.toDate() || new Date(),
        chatId: data.chatId,
      });
    });

    console.log("✅ Loaded messages:", messages.length);
    return messages;
  } catch (error) {
    console.error("❌ Error loading messages:", error);
    return [];
  }
}

/**
 * Update chat title
 */
export async function updateChatTitle(chatId: string, title: string): Promise<void> {
  try {
    const chatRef = doc(db, "chats", chatId);
    await updateDoc(chatRef, {
      title,
      updatedAt: serverTimestamp(),
    });
    console.log("✅ Chat title updated");
  } catch (error) {
    console.error("❌ Error updating chat title:", error);
    throw error;
  }
}

// Note: Google connection check is now handled by backend API
// See api.service.ts checkGoogleConnection()

