import { firebaseAdmin, getFirestore, getMessaging, isFirebaseReady } from './firebaseInit';

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

// Token validation configuration
const TOKEN_EXPIRATION_TIME = 24 * 60 * 60 * 1000; // 24 hours
const TOKEN_BLACKLIST_COLLECTION = 'blacklistedTokens';

// Validate token format
export function isValidTokenFormat(token: string): boolean {
    // Basic format validation - should be a non-empty string with reasonable length
    return typeof token === 'string' && token.length >= 50 && token.length <= 500;
}

// Check if token is blacklisted
export async function isTokenBlacklisted(token: string): Promise<boolean> {
    try {
        const firebaseAdmin = getFirebaseAdmin();
        if (!firebaseAdmin) return false;

        const blacklistRef = firebaseAdmin.firestore().collection(TOKEN_BLACKLIST_COLLECTION);
        const blacklistDoc = await blacklistRef.doc(token).get();

        return blacklistDoc.exists;
    } catch (error) {
        console.error('Error checking token blacklist:', error);
        return false; // Be permissive on error
    }
}

// Check token in Firebase
export async function isTokenInFirebase(token: string): Promise<boolean> {
    try {
        const firebaseAdmin = getFirebaseAdmin();
        if (!firebaseAdmin) return false;

        const tokenRef = firebaseAdmin.firestore().collection('tokens').doc(token);
        const tokenDoc = await tokenRef.get();

        return tokenDoc.exists;
    } catch (error) {
        console.error('Error checking token in Firebase:', error);
        return false; // Be permissive on error
    }
}

// Check token invalidation status
export async function isTokenInvalidated(token: string): Promise<boolean> {
    try {
        const firebaseAdmin = getFirebaseAdmin();
        if (!firebaseAdmin) return false;

        const tokenRef = firebaseAdmin.firestore().collection('tokens').doc(token);
        const tokenDoc = await tokenRef.get();

        if (!tokenDoc.exists) return false;

        const tokenData = tokenDoc.data();
        return tokenData?.invalidated === true;
    } catch (error) {
        console.error('Error checking token invalidation:', error);
        return false; // Be permissive on error
    }
}

// Check token expiration
export async function isTokenExpired(token: string): Promise<boolean> {
    try {
        const firebaseAdmin = getFirebaseAdmin();
        if (!firebaseAdmin) return true; // Assume expired if can't check

        const tokenRef = firebaseAdmin.firestore().collection('tokens').doc(token);
        const tokenDoc = await tokenRef.get();

        if (!tokenDoc.exists) return true;

        const tokenData = tokenDoc.data();
        const createdAt = tokenData?.createdAt?.toDate();

        if (!createdAt) return true;

        const tokenAge = Date.now() - createdAt.getTime();
        return tokenAge > TOKEN_EXPIRATION_TIME;
    } catch (error) {
        console.error('Error checking token expiration:', error);
        return true; // Be conservative on error
    }
}

// Check token in Firebase Messaging
export async function isTokenValidInMessaging(token: string): Promise<boolean> {
    try {
        // This would require Firebase Admin SDK's messaging API
        // For now, we'll return true as a placeholder
        // In a real implementation, you would use firebaseAdmin.messaging().send() with dryRun: true
        return true;
    } catch (error) {
        console.error('Error checking token in Firebase Messaging:', error);
        return false;
    }
}

// Main token validation function
export async function validateToken(token: string): Promise<boolean> {
    if (!isValidTokenFormat(token)) {
        return false;
    }

    try {
        const [isBlacklisted, isInFirebase, isInvalidated, isExpired, isValidInMessaging] = await Promise.all([
            isTokenBlacklisted(token),
            isTokenInFirebase(token),
            isTokenInvalidated(token),
            isTokenExpired(token),
            isTokenValidInMessaging(token)
        ]);

        // Token is valid if:
        // - Not blacklisted
        // - Exists in Firebase
        // - Not invalidated
        // - Not expired
        // - Valid in Firebase Messaging
        return !isBlacklisted && isInFirebase && !isInvalidated && !isExpired && isValidInMessaging;

    } catch (error) {
        console.error('Error during token validation:', error);
        return false;
    }
}

// Validate token with detailed info
export async function validateTokenWithInfo(token: string): Promise<{
    valid: boolean;
    reasons: string[];
    details?: any;
}> {
    const reasons: string[] = [];
    let details: any = {};

    if (!isValidTokenFormat(token)) {
        reasons.push('Invalid token format');
        return { valid: false, reasons };
    }

    try {
        const [isBlacklisted, isInFirebase, isInvalidated, isExpired, isValidInMessaging] = await Promise.all([
            isTokenBlacklisted(token),
            isTokenInFirebase(token),
            isTokenInvalidated(token),
            isTokenExpired(token),
            isTokenValidInMessaging(token)
        ]);

        details = {
            isBlacklisted,
            isInFirebase,
            isInvalidated,
            isExpired,
            isValidInMessaging
        };

        if (isBlacklisted) reasons.push('Token is blacklisted');
        if (!isInFirebase) reasons.push('Token not found in Firebase');
        if (isInvalidated) reasons.push('Token has been invalidated');
        if (isExpired) reasons.push('Token has expired');
        if (!isValidInMessaging) reasons.push('Token invalid in Firebase Messaging');

        const isValid = reasons.length === 0;
        return { valid: isValid, reasons, details };

    } catch (error) {
        console.error('Error during detailed token validation:', error);
        reasons.push('Validation error occurred');
        return { valid: false, reasons, details: { error: error.message } };
    }
}

// Add token to blacklist
export async function blacklistToken(token: string): Promise<boolean> {
    try {
        const firebaseAdmin = getFirebaseAdmin();
        if (!firebaseAdmin) return false;

        const blacklistRef = firebaseAdmin.firestore().collection(TOKEN_BLACKLIST_COLLECTION);
        await blacklistRef.doc(token).set({
            token,
            blacklistedAt: admin.firestore.FieldValue.serverTimestamp(),
            reason: 'Security concern'
        });

        console.log(`Token blacklisted: ${token}`);
        return true;
    } catch (error) {
        console.error('Error blacklisting token:', error);
        return false;
    }
}

// Remove token from blacklist
export async function removeTokenFromBlacklist(token: string): Promise<boolean> {
    try {
        const firebaseAdmin = getFirebaseAdmin();
        if (!firebaseAdmin) return false;

        const blacklistRef = firebaseAdmin.firestore().collection(TOKEN_BLACKLIST_COLLECTION);
        await blacklistRef.doc(token).delete();

        console.log(`Token removed from blacklist: ${token}`);
        return true;
    } catch (error) {
        console.error('Error removing token from blacklist:', error);
        return false;
    }
}