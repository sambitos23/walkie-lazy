import { initializeApp, getApps, getApp } from "firebase/app";
import { getMessaging, getToken, onMessage } from "firebase/messaging";

const firebaseConfig = {
    apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
    authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
    projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
    storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
    messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
    appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
};

// Initialize Firebase
const app = getApps().length > 0 ? getApp() : initializeApp(firebaseConfig);

export const messaging = async () => {
    const supported = await import("firebase/messaging").then(
        (m) => m.isSupported()
    );
    if (!supported) return null;
    return getMessaging(app);
};

let tokenRequestPromise: Promise<string | null> | null = null;

export const requestForToken = async () => {
    if (typeof window === 'undefined') return null;

    // Use a singleton pattern to prevent multiple simultaneous requests
    if (tokenRequestPromise) {
        console.log("Token request already in progress, joining existing request...");
        return tokenRequestPromise;
    }

    tokenRequestPromise = (async () => {
        try {
            // Check for basic support items
            if (!("Notification" in window)) {
                console.warn("This browser does not support desktop notification");
                return null;
            }

            if (!("serviceWorker" in navigator)) {
                console.warn("Service Workers are not supported in this browser");
                return null;
            }

            // Check if Brave is blocking push (Brave doesn't expose GCM/FCM by default)
            if ((navigator as any).brave && await (navigator as any).brave.isBrave()) {
                console.warn("Brave Browser detected. Ensure 'Google Services for Push Messaging' is enabled in brave://settings/privacy");
            }

            // Always request permission if not already granted
            if (Notification.permission === "default") {
                console.log("Requesting notification permission...");
                const permission = await Notification.requestPermission();
                if (permission !== "granted") {
                    console.warn("Notification permission denied by user");
                    return null;
                }
            } else if (Notification.permission === "denied") {
                console.warn("Notification permission is blocked. Please enable it in browser settings.");
                return null;
            }

            const msg = await messaging();
            if (!msg) {
                console.error("Firebase Messaging not supported in this browser environment");
                return null;
            }

            const vapidKey = process.env.NEXT_PUBLIC_FIREBASE_VAPID_KEY;
            if (!vapidKey) {
                console.error("VAPID Key missing from environment variables!");
                return null;
            }

            // 1. Explicitly register or get existing registration
            console.log("Syncing Service Worker...");
            const registration = await navigator.serviceWorker.register('/firebase-messaging-sw.js', {
                scope: '/'
            });

            // 2. Wait for the service worker to reach 'activated' state
            // This is more robust than just .ready
            if (registration.active?.state !== 'activated') {
                console.log("Waiting for Service Worker activation...");
                await new Promise((resolve) => {
                    const sw = registration.installing || registration.waiting || registration.active;
                    if (sw?.state === 'activated') {
                        resolve(null);
                    } else {
                        sw?.addEventListener('statechange', (e: any) => {
                            if (e.target.state === 'activated') resolve(null);
                        });
                        // Timeout safety
                        setTimeout(resolve, 5000);
                    }
                });
            }

            console.log("Fetching FCM token...");

            let currentToken = null;
            let retries = 0;
            const maxRetries = 1;

            while (retries <= maxRetries) {
                try {
                    currentToken = await getToken(msg, {
                        vapidKey: vapidKey,
                        serviceWorkerRegistration: registration,
                    });
                    if (currentToken) break;
                } catch (err: any) {
                    if (err.name === 'AbortError' && retries < maxRetries) {
                        console.warn(`FCM request aborted, retrying in 2s... (${retries + 1}/${maxRetries})`);
                        await new Promise(r => setTimeout(r, 2000));
                        retries++;
                        continue;
                    }
                    throw err; // Re-throw other errors or final abort
                }
                retries++;
            }

            if (currentToken) {
                console.log("FCM Token retrieved successfuly");
                return currentToken;
            } else {
                console.warn("No registration token available. Check VAPID key in Firebase Console.");
                return null;
            }
        } catch (err: any) {
            if (err.name === 'AbortError') {
                console.error("FCM Token request aborted (Final). Possible causes: \n1. Network firewall blocking mtalk.google.com \n2. Browser push service (GCM/FCM) is blocked, offline, or temporarily unavailable. \n3. VAPID key mismatch.");
            } else {
                console.error("Firebase Messaging Error:", err);
            }
            return null;
        } finally {
            tokenRequestPromise = null;
        }
    })();

    return tokenRequestPromise;
};


export const onMessageListener = async () => {
    const msg = await messaging();
    if (!msg) return null;
    return new Promise((resolve) => {
        onMessage(msg, (payload) => {
            resolve(payload);
        });
    });
};
