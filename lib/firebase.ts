import { initializeApp, getApps, getApp } from "firebase/app";
import { getMessaging, getToken, onMessage, deleteToken } from "firebase/messaging";
import { useState, useEffect } from "react";

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
let tokenRenewalTimer: NodeJS.Timeout | null = null;
let tokenValidationTimer: NodeJS.Timeout | null = null;

// Token management configuration
const TOKEN_STORAGE_KEY = "walkie_token";
const TOKEN_EXPIRATION_GRACE_PERIOD = 5 * 60 * 1000; // 5 minutes before expiration
const TOKEN_VALIDATION_INTERVAL = 5 * 60 * 1000; // Validate every 5 minutes
const TOKEN_PERSISTENCE_ENABLED = true;

// Encryption utilities (in production, use a secure key management system)
const encryptionKey = "walkie-lazy-token-key";

const encryptToken = (token: string): string => {
    // Simple XOR encryption for demonstration (replace with proper encryption in production)
    return token.split('').map((char, index) => {
        return String.fromCharCode(char.charCodeAt(0) ^ encryptionKey.charCodeAt(index % encryptionKey.length));
    }).join('');
};

const decryptToken = (encryptedToken: string): string => {
    // XOR decryption (same as encryption for XOR)
    return encryptedToken.split('').map((char, index) => {
        return String.fromCharCode(char.charCodeAt(0) ^ encryptionKey.charCodeAt(index % encryptionKey.length));
    }).join('');
};

export const saveTokenToStorage = (token: string | null) => {
    if (TOKEN_PERSISTENCE_ENABLED && token) {
        const encryptedToken = encryptToken(token);
        localStorage.setItem(TOKEN_STORAGE_KEY, encryptedToken);
        localStorage.setItem(`${TOKEN_STORAGE_KEY}_timestamp`, Date.now().toString());
    } else {
        localStorage.removeItem(TOKEN_STORAGE_KEY);
        localStorage.removeItem(`${TOKEN_STORAGE_KEY}_timestamp`);
    }
};

export const getTokenFromStorage = (): string | null => {
    if (!TOKEN_PERSISTENCE_ENABLED) return null;

    const encryptedToken = localStorage.getItem(TOKEN_STORAGE_KEY);
    if (!encryptedToken) return null;

    try {
        return decryptToken(encryptedToken);
    } catch (error) {
        console.error("Failed to decrypt token from storage", error);
        return null;
    }
};

const isTokenExpired = (token: string): boolean => {
    // In a real implementation, you would parse the JWT and check the exp claim
    // For now, we'll use a simple timestamp-based expiration
    const savedAt = localStorage.getItem(`${TOKEN_STORAGE_KEY}_timestamp`);
    if (!savedAt) return true;

    const tokenAge = Date.now() - parseInt(savedAt);
    const expirationTime = 24 * 60 * 60 * 1000; // 24 hours for demo

    return tokenAge > expirationTime;
};

export const validateToken = async (token: string): Promise<boolean> => {
    // In a real implementation, you would call your backend API to validate the token
    // For now, we'll assume the token is valid if it's not expired
    return !isTokenExpired(token);
};

export const requestForToken = async (): Promise<string | null> => {
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
                console.log("FCM Token retrieved successfully");

                // Save token to storage
                saveTokenToStorage(currentToken);

                // Schedule token renewal
                scheduleTokenRenewal(currentToken);

                // Schedule token validation
                scheduleTokenValidation(currentToken);

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

export const refreshToken = async (): Promise<string | null> => {
    try {
        console.log("Refreshing token...");
        const newToken = await requestForToken();

        if (newToken) {
            console.log("Token refreshed successfully");

            // Clear previous renewal timer
            if (tokenRenewalTimer) {
                clearTimeout(tokenRenewalTimer);
                tokenRenewalTimer = null;
            }

            // Schedule new renewal
            scheduleTokenRenewal(newToken);

            return newToken;
        } else {
            throw new Error("Failed to refresh token");
        }
    } catch (error) {
        console.error("Error refreshing token:", error);
        return null;
    }
};

export const invalidateToken = async (): Promise<void> => {
    try {
        const msg = await messaging();
        if (msg) {
            console.log("Invalidating token...");
            await deleteToken(msg);
            console.log("Token invalidated successfully");
        }
    } catch (error) {
        console.error("Error invalidating token:", error);
    } finally {
        // Clear storage
        saveTokenToStorage(null);

        // Clear timers
        if (tokenRenewalTimer) {
            clearTimeout(tokenRenewalTimer);
            tokenRenewalTimer = null;
        }
        if (tokenValidationTimer) {
            clearTimeout(tokenValidationTimer);
            tokenValidationTimer = null;
        }
    }
};

export const updateToken = async (newToken: string): Promise<boolean> => {
    try {
        const isValid = await validateToken(newToken);

        if (isValid) {
            console.log("Token updated successfully");

            // Save the updated token
            saveTokenToStorage(newToken);

            // Schedule renewal and validation
            scheduleTokenRenewal(newToken);
            scheduleTokenValidation(newToken);

            return true;
        } else {
            console.error("Invalid token provided");
            return false;
        }
    } catch (error) {
        console.error("Error updating token:", error);
        return false;
    }
};

const scheduleTokenRenewal = (token: string) => {
    // Calculate renewal time (5 minutes before expiration)
    const savedAt = localStorage.getItem(`${TOKEN_STORAGE_KEY}_timestamp`);
    if (!savedAt) return;

    const tokenAge = Date.now() - parseInt(savedAt);
    const timeUntilRenewal = (24 * 60 * 60 * 1000) - tokenAge - TOKEN_EXPIRATION_GRACE_PERIOD;

    // Clear previous renewal timer
    if (tokenRenewalTimer) {
        clearTimeout(tokenRenewalTimer);
    }

    // Schedule new renewal
    tokenRenewalTimer = setTimeout(() => {
        refreshToken();
    }, timeUntilRenewal);

    console.log(`Token renewal scheduled in ${timeUntilRenewal / (60 * 1000)} minutes`);
};

const scheduleTokenValidation = (token: string) => {
    // Clear previous validation timer
    if (tokenValidationTimer) {
        clearTimeout(tokenValidationTimer);
    }

    // Schedule token validation every 5 minutes
    tokenValidationTimer = setInterval(async () => {
        try {
            const isValid = await validateToken(token);
            if (!isValid) {
                console.log("Token validation failed, invalidating token");
                await invalidateToken();
            }
        } catch (error) {
            console.error("Error during token validation:", error);
        }
    }, TOKEN_VALIDATION_INTERVAL);

    console.log(`Token validation scheduled every ${TOKEN_VALIDATION_INTERVAL / (60 * 1000)} minutes`);
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