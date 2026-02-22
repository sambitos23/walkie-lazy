import admin from 'firebase-admin';

// Initialize Firebase Admin (Server Side)
function getFirebaseAdmin() {
    if (!admin.apps.length) {
        const projectId = process.env.FIREBASE_PROJECT_ID;
        const clientEmail = process.env.FIREBASE_CLIENT_EMAIL;
        let privateKey = process.env.FIREBASE_PRIVATE_KEY;

        if (!projectId || !clientEmail || !privateKey) {
            console.error('Firebase Admin credentials missing from environment variables');
            return null;
        }

        // Handle both literal newlines and escaped newlines (\n)
        if (privateKey.startsWith('"') && privateKey.endsWith('"')) {
            privateKey = privateKey.substring(1, privateKey.length - 1);
        }

        const formattedKey = privateKey.replace(/\\n/g, '\n');

        try {
            admin.initializeApp({
                credential: admin.credential.cert({
                    projectId,
                    clientEmail,
                    privateKey: formattedKey,
                }),
            });
            console.log('Firebase Admin initialized successfully');
        } catch (error) {
            console.error('Failed to initialize Firebase Admin:', error);
            return null;
        }
    }
    return admin;
}

export const firebaseAdmin = getFirebaseAdmin();

export function isFirebaseReady(): boolean {
    return firebaseAdmin !== null && admin.apps.length > 0;
}

export function getFirestore() {
    if (isFirebaseReady()) {
        return admin.firestore();
    }
    return null;
}

export function getMessaging() {
    if (isFirebaseReady()) {
        return admin.messaging();
    }
    return null;
}

export function initializeFirebase() {
    return getFirebaseAdmin();
}
