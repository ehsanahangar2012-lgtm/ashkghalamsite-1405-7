import { ref, uploadBytesResumable, getDownloadURL } from "firebase/storage";
import { storage } from "../lib/firebase";

export interface UploadProgressCallback {
  (progress: number): void;
}

/**
 * Uploads a file (image or catalog asset) to Firebase Storage and returns the public download URL.
 * Includes explicit logging of start, progress, completion, and any failures.
 * 
 * @param file The File or Blob object to upload.
 * @param pathString The destination path inside Firebase Storage (e.g., 'catalogs/my-image.webp').
 * @param onProgress Optional callback to track upload progress (0 to 100).
 */
export const uploadImageToFirebase = (
  file: File | Blob,
  pathString: string,
  onProgress?: UploadProgressCallback
): Promise<string> => {
  return new Promise((resolve, reject) => {
    if (!storage) {
      const initError = new Error("Firebase Storage has not been initialized. Please check firebase-applet-config.json.");
      console.error("[Firebase Storage] Initialization Error:", initError);
      reject(initError);
      return;
    }

    console.log(`[Firebase Storage] Starting upload of ${file.size} bytes to path: '${pathString}'`);

    const storageRef = ref(storage, pathString);
    const uploadTask = uploadBytesResumable(storageRef, file);

    uploadTask.on(
      "state_changed",
      (snapshot) => {
        const progress = (snapshot.bytesTransferred / snapshot.totalBytes) * 100;
        const roundedProgress = Math.round(progress * 10) / 10;
        console.log(`[Firebase Storage] Upload progress for '${pathString}': ${roundedProgress}% (${snapshot.bytesTransferred}/${snapshot.totalBytes} bytes)`);
        
        if (onProgress) {
          onProgress(roundedProgress);
        }
      },
      (error) => {
        console.error(`[Firebase Storage] Upload failed for path '${pathString}':`, {
          code: error.code,
          message: error.message,
          name: error.name,
          serverError: error.serverResponse
        });
        reject(error);
      },
      async () => {
        try {
          console.log(`[Firebase Storage] Upload successful for '${pathString}'. Fetching public download URL...`);
          const downloadURL = await getDownloadURL(uploadTask.snapshot.ref);
          console.log(`[Firebase Storage] Public download URL retrieved: ${downloadURL}`);
          resolve(downloadURL);
        } catch (urlError: any) {
          console.error(`[Firebase Storage] Error retrieving download URL for '${pathString}':`, urlError);
          reject(urlError);
        }
      }
    );
  });
};
