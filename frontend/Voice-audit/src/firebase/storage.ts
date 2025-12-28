import { getStorage } from "firebase/storage";
import { app } from "./firebaseConfig";

export const storage = getStorage(app);

