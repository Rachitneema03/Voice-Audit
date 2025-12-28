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
import { ref, uploadBytes, getDownloadURL, deleteObject } from "firebase/storage";
import { db } from "../firebase/firestore";
import { storage } from "../firebase/storage";
import type { User } from "firebase/auth";
import { compressImage } from "../utils/imageCompression";

// User Profile Interface
export interface UserProfile {
  uid: string;
  email: string;
  displayName?: string;
  profilePhotoURL?: string;
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
 * Load user profile from Firestore
 */
export async function loadUserProfile(userId: string): Promise<UserProfile | null> {
  try {
    const userRef = doc(db, "users", userId);
    const userSnap = await getDoc(userRef);
    
    if (userSnap.exists()) {
      const data = userSnap.data();
      return {
        uid: data.uid,
        email: data.email,
        displayName: data.displayName || "",
        profilePhotoURL: data.profilePhotoURL || "", // Will fall back to Google photoURL in component
        createdAt: data.createdAt?.toDate() || new Date(),
        updatedAt: data.updatedAt?.toDate() || new Date(),
      };
    }
    return null;
  } catch (error) {
    console.error("❌ Error loading user profile:", error);
    return null;
  }
}

/**
 * Upload profile photo to Firebase Storage
 * Automatically compresses image before upload for faster uploads
 */
export async function uploadProfilePhoto(userId: string, file: File, onProgress?: (progress: number) => void): Promise<string> {
  try {
    // Validate file type
    if (!file.type.startsWith('image/')) {
      throw new Error('File must be an image');
    }

    // Validate file size (max 10MB before compression)
    if (file.size > 10 * 1024 * 1024) {
      throw new Error('Image size must be less than 10MB');
    }

    // Compress image before upload (max 800x800, quality 0.85)
    onProgress?.(10);
    const compressedFile = await compressImage(file, 800, 800, 0.85);
    onProgress?.(50);

    // Create storage reference
    const storageRef = ref(storage, `profile-photos/${userId}/${Date.now()}_${compressedFile.name}`);
    
    // Upload compressed file
    onProgress?.(60);
    const snapshot = await uploadBytes(storageRef, compressedFile);
    onProgress?.(90);
    
    // Get download URL
    const downloadURL = await getDownloadURL(snapshot.ref);
    onProgress?.(100);
    
    console.log("✅ Profile photo uploaded:", downloadURL);
    return downloadURL;
  } catch (error) {
    console.error("❌ Error uploading profile photo:", error);
    throw error;
  }
}

/**
 * Delete profile photo from Firebase Storage
 */
export async function deleteProfilePhoto(photoURL: string): Promise<void> {
  try {
    if (!photoURL) return;
    
    // Extract path from URL
    const urlParts = photoURL.split('/');
    const pathIndex = urlParts.findIndex(part => part === 'o');
    if (pathIndex === -1) return;
    
    const encodedPath = urlParts[pathIndex + 1].split('?')[0];
    const decodedPath = decodeURIComponent(encodedPath);
    
    const storageRef = ref(storage, decodedPath);
    await deleteObject(storageRef);
    
    console.log("✅ Profile photo deleted");
  } catch (error) {
    console.error("❌ Error deleting profile photo:", error);
    // Don't throw - deletion is not critical
  }
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
      profilePhotoURL: user.photoURL || "", // Use Google photo as default
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    // Check if user exists
    const userSnap = await getDoc(userRef);
    if (userSnap.exists()) {
      // Update existing user - only update photoURL if it doesn't exist (preserve custom uploads)
      const existingData = userSnap.data();
      const updateData: any = {
        displayName: userData.displayName,
        email: userData.email,
        updatedAt: serverTimestamp(),
      };
      
      // Only set Google photoURL if user doesn't have a custom photo
      if (!existingData.profilePhotoURL && user.photoURL) {
        updateData.profilePhotoURL = user.photoURL;
      }
      
      await updateDoc(userRef, updateData);
    } else {
      // Create new user with Google photo as default
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
 * Update user profile display name and photo
 */
export async function updateUserProfile(userId: string, displayName: string, profilePhotoURL?: string): Promise<void> {
  try {
    const userRef = doc(db, "users", userId);
    const updateData: any = {
      displayName,
      updatedAt: serverTimestamp(),
    };
    
    if (profilePhotoURL !== undefined) {
      updateData.profilePhotoURL = profilePhotoURL;
    }
    
    await updateDoc(userRef, updateData);
    console.log("✅ User profile updated");
  } catch (error) {
    console.error("❌ Error updating user profile:", error);
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

