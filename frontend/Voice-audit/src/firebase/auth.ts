import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signInWithPopup,
  GoogleAuthProvider,
  signOut,
  updateProfile,
} from "firebase/auth";
import type { User, UserCredential } from "firebase/auth";
import { auth } from "./firebaseConfig";

const googleProvider = new GoogleAuthProvider();

export const signUpWithEmail = async (
  email: string,
  password: string
): Promise<UserCredential> => {
  return await createUserWithEmailAndPassword(auth, email, password);
};

export const signInWithEmail = async (
  email: string,
  password: string
): Promise<UserCredential> => {
  return await signInWithEmailAndPassword(auth, email, password);
};

export const signInWithGoogle = async (): Promise<UserCredential> => {
  return await signInWithPopup(auth, googleProvider);
};

export const logout = async (): Promise<void> => {
  return await signOut(auth);
};

export const getCurrentUser = (): User | null => {
  return auth.currentUser;
};

export const updateUserDisplayName = async (displayName: string): Promise<void> => {
  const user = auth.currentUser;
  if (user) {
    await updateProfile(user, { displayName });
  } else {
    throw new Error("No user is currently signed in");
  }
};

