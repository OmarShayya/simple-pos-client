import { initializeApp } from "firebase/app";
import {
  getStorage,
  ref,
  uploadBytes,
  getDownloadURL,
  deleteObject,
} from "firebase/storage";

const firebaseConfig = {
  apiKey: "AIzaSyCt03pqwsJnRvnZnzcXhtmLYXX2II8VKu4",
  authDomain: "simple-pos-430a0.firebaseapp.com",
  projectId: "simple-pos-430a0",
  storageBucket: "simple-pos-430a0.firebasestorage.app",
  messagingSenderId: "678513059599",
  appId: "1:678513059599:web:3d134367c7286f46d0c07a",
  measurementId: "G-5KXGQVQN2Y",
};

const app = initializeApp(firebaseConfig);
const storage = getStorage(app);

export const uploadImageToFirebase = async (
  file: File,
  folder: string = "images"
): Promise<string> => {
  try {
    const timestamp = Date.now();
    const randomString = Math.random().toString(36).substring(2, 9);
    const fileName = `${timestamp}_${randomString}_${file.name}`;
    const filePath = `${folder}/${fileName}`;

    const storageRef = ref(storage, filePath);

    const metadata = {
      contentType: file.type,
      customMetadata: {
        uploadedAt: new Date().toISOString(),
      },
    };

    const snapshot = await uploadBytes(storageRef, file, metadata);
    const downloadURL = await getDownloadURL(snapshot.ref);

    console.log("Image uploaded successfully:", downloadURL);
    return downloadURL;
  } catch (error) {
    console.error("Error uploading image to Firebase:", error);
    throw new Error("Failed to upload image");
  }
};

export const deleteImageFromFirebase = async (
  imageUrl: string
): Promise<void> => {
  try {
    const urlObj = new URL(imageUrl);
    const pathStart = urlObj.pathname.indexOf("/o/") + 3;
    const pathEnd = urlObj.pathname.indexOf("?");
    const filePath = decodeURIComponent(
      urlObj.pathname.substring(pathStart, pathEnd)
    );

    const fileRef = ref(storage, filePath);
    await deleteObject(fileRef);
  } catch (error) {
    console.error("Error deleting image from Firebase:", error);
    throw new Error("Failed to delete image");
  }
};

export const getFilePathFromUrl = (imageUrl: string): string => {
  try {
    const urlObj = new URL(imageUrl);
    const pathStart = urlObj.pathname.indexOf("/o/") + 3;
    const pathEnd = urlObj.pathname.indexOf("?");
    return decodeURIComponent(urlObj.pathname.substring(pathStart, pathEnd));
  } catch (error) {
    console.error("Error parsing Firebase URL:", error);
    return "";
  }
};
