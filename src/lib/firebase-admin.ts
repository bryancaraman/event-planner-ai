import { initializeApp, getApps, cert } from 'firebase-admin/app';
import { getAuth } from 'firebase-admin/auth';
import { getFirestore } from 'firebase-admin/firestore';

// Initialize Firebase Admin
const firebaseAdminConfig = {
  credential: cert({
    projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
    clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
    privateKey: process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n'),
  }),
};

const adminApp = getApps().find(app => app?.name === 'admin') || 
  initializeApp(firebaseAdminConfig, 'admin');

export const adminAuth = getAuth(adminApp);
export const adminDb = getFirestore(adminApp);

// Verify Firebase ID token
export async function verifyFirebaseToken(token: string) {
  if (!token) {
    console.error('No token provided');
    return null;
  }

  try {
    const decodedToken = await adminAuth.verifyIdToken(token);
    return decodedToken;
  } catch (error) {
    console.error('Error verifying Firebase token:', error);
    return null;
  }
}

// Get user from token
export async function getUserFromToken(token: string) {
  try {
    const decodedToken = await verifyFirebaseToken(token);
    if (!decodedToken) {
      console.error('Failed to verify token');
      return null;
    }

    const user = await adminAuth.getUser(decodedToken.uid);
    return {
      id: user.uid,
      email: user.email!,
      name: user.displayName || 'Anonymous',
      picture: user.photoURL,
    };
  } catch (error) {
    console.error('Error getting user from token:', error);
    return null;
  }
} 