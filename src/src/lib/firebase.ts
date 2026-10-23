import { initializeApp, getApps } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';

const firebaseConfig = {
  projectId: "ai-studio-ashkghalamsmartp-6be2937d-91b1-4f3a-87eb-06c7f657b0f0",
  apiKey: "AIzaSyCpMf8KXpE6gc4uiQt_XolK08hI0Fy2TAY",
  authDomain: "ai-studio-ashkghalamsmartp-6be2937d-91b1-4f3a-87eb-06c7f657b0f0.firebaseapp.com",
};

const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApps()[0];
export const auth = getAuth(app);
export const db = getFirestore(app);
export default app;
