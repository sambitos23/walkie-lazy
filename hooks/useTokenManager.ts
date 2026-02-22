import { useState, useEffect, useRef, useCallback } from "react";
import { requestForToken, onMessageListener } from "../lib/firebase";

// Token Manager Hook
// Provides comprehensive token management with automatic renewal, validation, and real-time updates
export const useTokenManager = () => {
    const [token, setToken] = useState<string | null>(null);
    const [isTokenValid, setIsTokenValid] = useState<boolean>(false);
    const [isLoading, setIsLoading] = useState<boolean>(true);
    const [error, setError] = useState<string | null>(null);
    const [connectionStatus, setConnectionStatus] = useState<'online' | 'offline'>('online');
    const tokenRef = useRef<string | null>(null);
    const renewalTimerRef = useRef<NodeJS.Timeout | null>(null);
    const validationTimerRef = useRef<NodeJS.Timeout | null>(null);

    // Encryption key (in production, use a secure key management system)
    const encryptionKey = "walkie-lazy-token-key";

    // Helper functions
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

    const saveTokenToStorage = (token: string | null) => {
        if (token) {
            const encryptedToken = encryptToken(token);
            localStorage.setItem("walkie_token", encryptedToken);
            localStorage.setItem("walkie_token_saved_at", Date.now().toString());
        } else {
            localStorage.removeItem("walkie_token");
            localStorage.removeItem("walkie_token_saved_at");
        }
    };

    const getTokenFromStorage = (): string | null => {
        const encryptedToken = localStorage.getItem("walkie_token");
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
        const savedAt = localStorage.getItem("walkie_token_saved_at");
        if (!savedAt) return true;

        const tokenAge = Date.now() - parseInt(savedAt);
        const expirationTime = 24 * 60 * 60 * 1000; // 24 hours for demo

        return tokenAge > expirationTime;
    };

    const validateToken = async (token: string): Promise<boolean> => {
        // In a real implementation, you would call your backend API to validate the token
        // For now, we'll assume the token is valid if it's not expired
        return !isTokenExpired(token);
    };

    const refreshToken = async (): Promise<string | null> => {
        try {
            console.log("Refreshing token...");
            const newToken = await requestForToken();

            if (newToken) {
                setToken(newToken);
                setIsTokenValid(true);
                saveTokenToStorage(newToken);
                console.log("Token refreshed successfully");

                // Schedule next renewal (5 minutes before expiration)
                const renewalTime = 24 * 60 * 60 * 1000 - 5 * 60 * 1000; // 5 minutes before expiration
                if (renewalTimerRef.current) {
                    clearTimeout(renewalTimerRef.current);
                }
                renewalTimerRef.current = setTimeout(() => {
                    refreshToken();
                }, renewalTime);

                return newToken;
            } else {
                throw new Error("Failed to refresh token");
            }
        } catch (error) {
            console.error("Error refreshing token:", error);
            setIsTokenValid(false);
            setError("Token refresh failed");
            return null;
        }
    };

    const initializeToken = useCallback(async () => {
        setIsLoading(true);
        setError(null);

        try {
            // Check for existing token in storage
            const storedToken = getTokenFromStorage();

            if (storedToken) {
                console.log("Found stored token, validating...");
                const isValid = await validateToken(storedToken);

                if (isValid) {
                    console.log("Stored token is valid");
                    setToken(storedToken);
                    setIsTokenValid(true);

                    // Schedule renewal if token is close to expiration
                    const renewalTime = 24 * 60 * 60 * 1000 - 5 * 60 * 1000; // 5 minutes before expiration
                    if (renewalTimerRef.current) {
                        clearTimeout(renewalTimerRef.current);
                    }
                    renewalTimerRef.current = setTimeout(() => {
                        refreshToken();
                    }, renewalTime);

                    return;
                } else {
                    console.log("Stored token is invalid or expired");
                    saveTokenToStorage(null);
                }
            }

            // Request new token
            console.log("Requesting new token...");
            const newToken = await requestForToken();

            if (newToken) {
                setToken(newToken);
                setIsTokenValid(true);
                saveTokenToStorage(newToken);
                console.log("New token obtained successfully");

                // Schedule next renewal
                const renewalTime = 24 * 60 * 60 * 1000 - 5 * 60 * 1000; // 5 minutes before expiration
                if (renewalTimerRef.current) {
                    clearTimeout(renewalTimerRef.current);
                }
                renewalTimerRef.current = setTimeout(() => {
                    refreshToken();
                }, renewalTime);
            } else {
                console.log("No token available");
                setToken(null);
                setIsTokenValid(false);
            }
        } catch (error) {
            console.error("Error initializing token:", error);
            setError("Token initialization failed");
            setToken(null);
            setIsTokenValid(false);
        } finally {
            setIsLoading(false);
        }
    }, []);

    const updateToken = useCallback(async (newToken: string) => {
        try {
            const isValid = await validateToken(newToken);

            if (isValid) {
                setToken(newToken);
                setIsTokenValid(true);
                saveTokenToStorage(newToken);
                console.log("Token updated successfully");

                // Clear previous error
                setError(null);

                return true;
            } else {
                console.error("Invalid token provided");
                return false;
            }
        } catch (error) {
            console.error("Error updating token:", error);
            return false;
        }
    }, []);

    const invalidateToken = useCallback(() => {
        setToken(null);
        setIsTokenValid(false);
        saveTokenToStorage(null);
        console.log("Token invalidated");
    }, []);

    const handleTokenUpdate = useCallback(async (payload: any) => {
        console.log("Received token update:", payload);

        if (payload?.token) {
            await updateToken(payload.token);
        }
    }, [updateToken]);

    // Handle real-time token updates
    useEffect(() => {
        let isMounted = true;

        onMessageListener().then((payload) => {
            if (isMounted && payload) {
                handleTokenUpdate(payload);
            }
        }).catch((error) => {
            console.error("Error handling message:", error);
        });


        return () => {
            isMounted = false;
        };
    }, [handleTokenUpdate]);

    // Handle connection status
    useEffect(() => {
        const handleOnline = () => {
            setConnectionStatus('online');
            console.log("Connection status: online");

            // Attempt to refresh token when connection is restored
            if (token && !isTokenValid) {
                refreshToken();
            }
        };

        const handleOffline = () => {
            setConnectionStatus('offline');
            console.log("Connection status: offline");
        };

        window.addEventListener('online', handleOnline);
        window.addEventListener('offline', handleOffline);

        return () => {
            window.removeEventListener('online', handleOnline);
            window.removeEventListener('offline', handleOffline);
        };
    }, [token, isTokenValid]);

    // Cleanup timers on unmount
    useEffect(() => {
        return () => {
            if (renewalTimerRef.current) {
                clearTimeout(renewalTimerRef.current);
            }
            if (validationTimerRef.current) {
                clearTimeout(validationTimerRef.current);
            }
        };
    }, []);

    // Auto-validate token periodically
    useEffect(() => {
        const validationInterval = setInterval(async () => {
            if (token && isTokenValid) {
                try {
                    const isValid = await validateToken(token);
                    if (!isValid) {
                        console.log("Token validation failed, invalidating token");
                        invalidateToken();
                    }
                } catch (error) {
                    console.error("Error during token validation:", error);
                }
            }
        }, 5 * 60 * 1000); // Validate every 5 minutes

        return () => clearInterval(validationInterval);
    }, [token, isTokenValid, invalidateToken]);

    return {
        token,
        isTokenValid,
        isLoading,
        error,
        connectionStatus,
        initializeToken,
        refreshToken,
        updateToken,
        invalidateToken,
        validateToken: () => validateToken(token || ""),
        saveTokenToStorage,
        getTokenFromStorage,
    };
};