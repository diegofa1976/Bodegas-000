import { ref, uploadString, getDownloadURL } from 'firebase/storage';
import { storage } from '../firebase';

export const uploadImageToStorage = async (
  userId: string, 
  wineName: string, 
  sceneType: string, 
  base64Image: string,
  timestamp: number
): Promise<string> => {
  try {
    // Remove data:image/png;base64, prefix if present
    const base64Data = base64Image.includes(',') ? base64Image.split(',')[1] : base64Image;
    
    const cleanWineName = wineName.toLowerCase().replace(/[^a-z0-9]/g, '-').replace(/-+/g, '-').replace(/^-|-$/g, '');
    const cleanSceneType = sceneType.toLowerCase().replace(/[^a-z0-9]/g, '-').replace(/-+/g, '-').replace(/^-|-$/g, '');
    
    const fileName = `${cleanWineName}-${cleanSceneType}-${timestamp}.png`;
    const storageRef = ref(storage, `users/${userId}/images/${fileName}`);
    
    await uploadString(storageRef, base64Data, 'base64');
    const downloadURL = await getDownloadURL(storageRef);
    
    return downloadURL;
  } catch (error) {
    console.error('Error uploading image to storage:', error);
    throw error;
  }
};
