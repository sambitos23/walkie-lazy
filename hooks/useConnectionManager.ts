// Connection Manager Hook - Enhanced Version
// Provides comprehensive connection management with state machine, real-time monitoring, and robust error handling

import { useEffect, useRef, useState, useCallback } from 'react';
import Peer, { MediaConnection } from 'peerjs';
import {
  requestForToken,
  refreshToken,
  invalidateToken,
  validateToken,
} from '../lib/firebase';
import {
  ConnectionState,
  ConnectionError,
  ConnectionStatus,
  ConnectionConfig,
  PeerConnection,
  TokenManager,
  ConnectionManager,
  ConnectionEvent,
  NetworkStatus,
  RetryConfig,
  TimeoutConfig,
  SecurityConfig,
  DebugConfig,
  ConnectionManagerConfig,
} from '../types/connection';

// Enhanced default configuration with comprehensive settings
const defaultConfig: ConnectionManagerConfig = {
  retry: {
    baseDelay: 1000,
    maxDelay: 30000,
    backoffMultiplier: 2,
    maxRetries: 5,
  },
  timeout: {
    connectionTimeout: 30000,
    tokenValidationTimeout: 10000,
    keepAliveInterval: 30000,
  },
  security: {
    tokenEncryptionEnabled: true,
    tokenValidationEndpoint: '/api/tokens/verify',
    tokenRefreshThreshold: 300000, // 5 minutes
  },
  debug: {
    enableLogging: process.env.NODE_ENV !== 'production',
    logLevel: 'info',
    maxLogHistory: 100,
  },
  autoReconnect: true,
};

// Connection Manager Hook
export const useConnectionManager = (
  peerId: string,
  remotePeerId: string,
  config?: Partial<ConnectionManagerConfig>
) => {
  // Merge configuration with defaults
  const {
    retry: {
      baseDelay = defaultConfig.retry.baseDelay,
      maxDelay = defaultConfig.retry.maxDelay,
      backoffMultiplier = defaultConfig.retry.backoffMultiplier,
      maxRetries = defaultConfig.retry.maxRetries,
    } = {},
    timeout: {
      connectionTimeout = defaultConfig.timeout.connectionTimeout,
      tokenValidationTimeout = defaultConfig.timeout.tokenValidationTimeout,
      keepAliveInterval = defaultConfig.timeout.keepAliveInterval,
    } = {},
    security: {
      tokenEncryptionEnabled = defaultConfig.security.tokenEncryptionEnabled,
      tokenValidationEndpoint = defaultConfig.security.tokenValidationEndpoint,
      tokenRefreshThreshold = defaultConfig.security.tokenRefreshThreshold,
    } = {},
    debug: {
      enableLogging = defaultConfig.debug.enableLogging,
      logLevel = defaultConfig.debug.logLevel,
      maxLogHistory = defaultConfig.debug.maxLogHistory,
    } = {},
    autoReconnect = defaultConfig.autoReconnect,
  } = config || {};

  // State management
  const [status, setStatus] = useState<ConnectionStatus>({
    state: 'disconnected',
    retryCount: 0,
    isOnline: navigator.onLine,
  });

  const [tokenManager, setTokenManager] = useState<TokenManager>({
    token: null,
    isTokenValid: false,
    isLoading: true,
    error: null,
    connectionStatus: 'online',
  });

  const [peerConnection, setPeerConnection] = useState<PeerConnection>({
    peer: null,
    call: null,
    stream: null,
  });

  // Refs for managing timers and cleanup
  const peerRef = useRef<Peer | null>(null);
  const retryTimerRef = useRef<NodeJS.Timeout | null>(null);
  const connectionTimerRef = useRef<NodeJS.Timeout | null>(null);
  const tokenRefreshTimerRef = useRef<NodeJS.Timeout | null>(null);
  const keepAliveTimerRef = useRef<NodeJS.Timeout | null>(null);
  const isMountedRef = useRef(false);

  // Event listeners for network changes and other events
  const eventListenersRef = useRef<{
    online?: () => void;
    offline?: () => void;
    beforeunload?: () => void;
  }>({});

  // =======================
  // Token Management
  // =======================

  const initializeToken = useCallback(async () => {
    if (enableLogging && logLevel === 'debug') {
      console.debug('Initializing token...');
    }

    setTokenManager(prev => ({ ...prev, isLoading: true, error: null }));

    try {
      // Check if we already have a valid token
      if (tokenManager.token && tokenManager.isTokenValid) {
        if (enableLogging && logLevel === 'debug') {
          console.debug('Using existing valid token');
        }
        return;
      }

      // Request new token
      const token = await requestForToken();
      if (token) {
        const isValid = await validateToken(token);

        setTokenManager({
          token,
          isTokenValid: isValid,
          isLoading: false,
          error: null,
          connectionStatus: navigator.onLine ? 'online' : 'offline',
        });

        if (enableLogging && logLevel === 'info') {
          console.info('Token initialized successfully');
        }

        // Schedule token validation
        scheduleTokenValidation();
      } else {
        throw new Error('Failed to obtain token');
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Token initialization failed';
      setTokenManager(prev => ({
        ...prev,
        isLoading: false,
        error: errorMessage,
        isTokenValid: false,
      }));

      if (enableLogging && logLevel === 'error') {
        console.error('Token initialization failed:', error);
      }
    }
  }, [tokenManager, enableLogging, logLevel]);

  const refreshConnectionToken = useCallback(async () => {
    if (enableLogging && logLevel === 'debug') {
      console.debug('Refreshing connection token...');
    }

    if (!tokenManager.token || !tokenManager.isTokenValid) return;

    try {
      const newToken = await refreshToken();
      if (newToken) {
        const isValid = await validateToken(newToken);

        setTokenManager({
          token: newToken,
          isTokenValid: isValid,
          isLoading: false,
          error: null,
          connectionStatus: navigator.onLine ? 'online' : 'offline',
        });

        if (enableLogging && logLevel === 'info') {
          console.info('Connection token refreshed successfully');
        }
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Token refresh failed';
      setTokenManager(prev => ({
        ...prev,
        error: errorMessage,
        isTokenValid: false,
      }));

      if (enableLogging && logLevel === 'error') {
        console.error('Token refresh failed:', error);
      }
    }
  }, [tokenManager, enableLogging, logLevel]);

  const validateToken = useCallback(async (token: string): Promise<boolean> => {
    if (enableLogging && logLevel === 'debug') {
      console.debug('Validating token...');
    }

    try {
      // In a real implementation, you would call your backend API to validate the token
      // For now, we'll assume the token is valid if it's not expired
      // You can implement JWT validation or call your validation endpoint here

      // Simulate validation with timeout
      await new Promise((resolve, reject) => {
        const timer = setTimeout(() => {
          resolve(true); // Assume valid for demo
        }, tokenValidationTimeout);

        return () => clearTimeout(timer);
      });

      return true;
    } catch (error) {
      if (enableLogging && logLevel === 'error') {
        console.error('Token validation failed:', error);
      }
      return false;
    }
  }, [tokenValidationTimeout, enableLogging, logLevel]);

  const scheduleTokenValidation = useCallback(() => {
    if (tokenRefreshTimerRef.current) {
      clearTimeout(tokenRefreshTimerRef.current);
    }

    tokenRefreshTimerRef.current = setTimeout(async () => {
      if (isMountedRef.current && tokenManager.token && tokenManager.isTokenValid) {
        try {
          const isValid = await validateToken(tokenManager.token);
          if (!isValid) {
            if (enableLogging && logLevel === 'warn') {
              console.warn('Token validation failed, invalidating token');
            }

            await invalidateToken();
            setTokenManager(prev => ({
              ...prev,
              token: null,
              isTokenValid: false,
              error: 'Token validation failed',
            }));
          } else {
            // Schedule next validation
            scheduleTokenValidation();
          }
        } catch (error) {
          const errorMessage = error instanceof Error ? error.message : 'Token validation error';
          setTokenManager(prev => ({
            ...prev,
            error: errorMessage,
          }));

          if (enableLogging && logLevel === 'error') {
            console.error('Token validation error:', error);
          }
        }
      }
    }, tokenRefreshThreshold);
  }, [tokenManager, tokenRefreshThreshold, tokenValidationTimeout, enableLogging, logLevel]);

  // =======================
  // Peer Connection Management
  // =======================

  const initializePeer = useCallback(async () => {
    if (enableLogging && logLevel === 'debug') {
      console.debug('Initializing peer connection...');
    }

    if (!peerId) {
      setStatus(prev => ({
        ...prev,
        state: 'error',
        error: 'peer_error',
        lastError: 'Peer ID is required'
      }));
      return;
    }

    try {
      // Initialize peer
      const newPeer = new Peer(peerId);

      // Set up event handlers
      newPeer.on('open', (id) => {
        if (isMountedRef.current) {
          setStatus(prev => ({
            ...prev,
            state: 'connected',
            peerId: id,
            error: undefined,
            retryCount: 0,
          }));

          if (enableLogging && logLevel === 'info') {
            console.info('Peer connection established. Peer ID:', id);
          }
        }
      });

      newPeer.on('error', (err) => {
        if (isMountedRef.current) {
          const errorMessage = err.message || 'Unknown peer error';

          setStatus(prev => ({
            ...prev,
            state: 'error',
            error: 'peer_error',
            lastError: errorMessage,
          }));

          if (enableLogging && logLevel === 'error') {
            console.error('Peer connection error:', err);
          }
        }
      });

      newPeer.on('close', () => {
        if (isMountedRef.current) {
          if (enableLogging && logLevel === 'info') {
            console.info('Peer connection closed');
          }

          setStatus(prev => ({
            ...prev,
            state: 'disconnected',
            error: undefined,
          }));
        }
      });

      newPeer.on('disconnected', () => {
        if (isMountedRef.current) {
          if (enableLogging && logLevel === 'warn') {
            console.warn('Peer connection disconnected');
          }

          setStatus(prev => ({
            ...prev,
            state: 'disconnected',
            error: undefined,
          }));
        }
      });

      // Listen for incoming calls
      newPeer.on('call', (call) => {
        if (isMountedRef.current) {
          if (enableLogging && logLevel === 'debug') {
            console.debug('Incoming call received');
          }

          // Store the incoming call
          setPeerConnection(prev => ({
            ...prev,
            call,
          }));

          // In a real implementation, you would handle the incoming call here
          // This would be passed to the main walkie-talkie logic
        }
      });

      peerRef.current = newPeer;
      setPeerConnection(prev => ({ ...prev, peer: newPeer }));
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to initialize peer';

      setStatus(prev => ({
        ...prev,
        state: 'error',
        error: 'peer_error',
        lastError: errorMessage,
      }));

      if (enableLogging && logLevel === 'error') {
        console.error('Failed to initialize peer:', error);
      }
    }
  }, [peerId, enableLogging, logLevel]);

  const connectToRemotePeer = useCallback(async () => {
    if (enableLogging && logLevel === 'debug') {
      console.debug('Connecting to remote peer...');
    }

    if (!peerRef.current || !remotePeerId) {
      if (enableLogging && logLevel === 'warn') {
        console.warn('Cannot connect: peer not initialized or remotePeerId missing');
      }
      return;
    }

    try {
      setStatus(prev => ({ ...prev, state: 'connecting' }));

      // Clear any existing connection timer
      if (connectionTimerRef.current) {
        clearTimeout(connectionTimerRef.current);
        connectionTimerRef.current = null;
      }

      // Set up connection timeout
      connectionTimerRef.current = setTimeout(() => {
        if (isMountedRef.current) {
          setStatus(prev => ({
            ...prev,
            state: 'error',
            error: 'network_error',
            lastError: 'Connection timeout',
          }));

          if (enableLogging && logLevel === 'error') {
            console.error('Connection timeout');
          }

          if (autoReconnect) {
            scheduleRetry();
          }
        }
      }, connectionTimeout);

      // In a real implementation, you would establish the actual connection here
      // For now, we'll simulate a successful connection
      await new Promise((resolve) => {
        setTimeout(() => {
          if (connectionTimerRef.current) {
            clearTimeout(connectionTimerRef.current);
            connectionTimerRef.current = null;
          }
          resolve(null);
        }, 1000); // Simulate connection delay
      });

      setStatus(prev => ({
        ...prev,
        state: 'connected',
        remotePeerId,
      }));

      if (enableLogging && logLevel === 'info') {
        console.info('Connected to remote peer:', remotePeerId);
      }

      // Start keep-alive mechanism
      startKeepAlive();

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Connection failed';

      setStatus(prev => ({
        ...prev,
        state: 'error',
        error: 'network_error',
        lastError: errorMessage,
      }));

      if (enableLogging && logLevel === 'error') {
        console.error('Connection failed:', error);
      }

      if (autoReconnect) {
        scheduleRetry();
      }
    }
  }, [
    remotePeerId,
    autoReconnect,
    connectionTimeout,
    enableLogging,
    logLevel,
  ]);

  const disconnect = useCallback(() => {
    if (enableLogging && logLevel === 'info') {
      console.info('Disconnecting from remote peer...');
    }

    // Clear all timers
    if (retryTimerRef.current) {
      clearTimeout(retryTimerRef.current);
      retryTimerRef.current = null;
    }

    if (connectionTimerRef.current) {
      clearTimeout(connectionTimerRef.current);
      connectionTimerRef.current = null;
    }

    if (tokenRefreshTimerRef.current) {
      clearTimeout(tokenRefreshTimerRef.current);
      tokenRefreshTimerRef.current = null;
    }

    if (keepAliveTimerRef.current) {
      clearTimeout(keepAliveTimerRef.current);
      keepAliveTimerRef.current = null;
    }

    // Destroy peer connection
    if (peerRef.current) {
      peerRef.current.destroy();
      peerRef.current = null;
    }

    // Reset state
    setStatus({
      state: 'disconnected',
      retryCount: 0,
      isOnline: navigator.onLine,
    });

    setTokenManager(prev => ({
      ...prev,
      token: null,
      isTokenValid: false,
      isLoading: false,
      error: null,
    }));

    setPeerConnection({
      peer: null,
      call: null,
      stream: null,
    });

    if (enableLogging && logLevel === 'info') {
      console.info('Disconnected from remote peer');
    }
  }, [enableLogging, logLevel]);

  // =======================
  // Retry Mechanism
  // =======================

  const scheduleRetry = useCallback(() => {
    if (enableLogging && logLevel === 'debug') {
      console.debug('Scheduling retry...');
    }

    if (status.retryCount >= maxRetries) {
      if (enableLogging && logLevel === 'error') {
        console.error('Max retry attempts reached');
      }

      setStatus(prev => ({
        ...prev,
        state: 'error',
        error: 'network_error',
        lastError: 'Max retry attempts reached',
      }));
      return;
    }

    const retryDelayMs = Math.min(
      baseDelay * Math.pow(backoffMultiplier, status.retryCount),
      maxDelay
    );

    if (enableLogging && logLevel === 'info') {
      console.info(
        `Scheduling retry in ${retryDelayMs}ms (attempt ${status.retryCount + 1}/${maxRetries})`
      );
    }

    if (retryTimerRef.current) {
      clearTimeout(retryTimerRef.current);
    }

    retryTimerRef.current = setTimeout(() => {
      if (isMountedRef.current) {
        setStatus(prev => ({
          ...prev,
          state: 'reconnecting',
          retryCount: prev.retryCount + 1,
        }));

        connectToRemotePeer();
      }
    }, retryDelayMs);
  }, [
    status.retryCount,
    maxRetries,
    baseDelay,
    backoffMultiplier,
    maxDelay,
    connectToRemotePeer,
    enableLogging,
    logLevel,
  ]);

  // =======================
  // Keep-alive Mechanism
  // =======================

  const startKeepAlive = useCallback(() => {
    if (enableLogging && logLevel === 'debug') {
      console.debug('Starting keep-alive mechanism...');
    }

    if (keepAliveTimerRef.current) {
      clearTimeout(keepAliveTimerRef.current);
    }

    keepAliveTimerRef.current = setTimeout(() => {
      if (isMountedRef.current && status.state === 'connected') {
        // Send keep-alive signal (implementation would depend on your backend)
        if (enableLogging && logLevel === 'debug') {
          console.debug('Sending keep-alive signal...');
        }

        // Schedule next keep-alive
        startKeepAlive();
      }
    }, keepAliveInterval);
  }, [keepAliveInterval, enableLogging, logLevel, status.state]);

  // =======================
  // Network Status Handling
  // =======================

  const handleOnlineStatusChange = useCallback(() => {
    const isOnline = navigator.onLine;

    if (isMountedRef.current) {
      setStatus(prev => ({ ...prev, isOnline }));
      setTokenManager(prev => ({
        ...prev,
        connectionStatus: isOnline ? 'online' : 'offline',
      }));

      if (enableLogging && logLevel === 'info') {
        console.info(`Network status changed: ${isOnline ? 'online' : 'offline'}`);
      }

      if (isOnline && status.state === 'error' && autoReconnect) {
        if (enableLogging && logLevel === 'info') {
          console.info('Network restored, attempting to reconnect');
        }

        setStatus(prev => ({
          ...prev,
          state: 'reconnecting',
          error: undefined,
          retryCount: 0,
        }));
        connectToRemotePeer();
      }
    }
  }, [
    status.state,
    autoReconnect,
    connectToRemotePeer,
    enableLogging,
    logLevel,
  ]);

  const handleBeforeUnload = useCallback(() => {
    // Clean up before page unload
    disconnect();
  }, [disconnect]);

  // =======================
  // Cleanup
  // =======================

  const cleanup = useCallback(() => {
    if (enableLogging && logLevel === 'debug') {
      console.debug('Cleaning up connection manager...');
    }

    // Clear all timers
    if (retryTimerRef.current) {
      clearTimeout(retryTimerRef.current);
      retryTimerRef.current = null;
    }

    if (connectionTimerRef.current) {
      clearTimeout(connectionTimerRef.current);
      connectionTimerRef.current = null;
    }

    if (tokenRefreshTimerRef.current) {
      clearTimeout(tokenRefreshTimerRef.current);
      tokenRefreshTimerRef.current = null;
    }

    if (keepAliveTimerRef.current) {
      clearTimeout(keepAliveTimerRef.current);
      keepAliveTimerRef.current = null;
    }

    // Remove event listeners
    if (eventListenersRef.current.online) {
      window.removeEventListener('online', eventListenersRef.current.online);
    }

    if (eventListenersRef.current.offline) {
      window.removeEventListener('offline', eventListenersRef.current.offline);
    }

    if (eventListenersRef.current.beforeunload) {
      window.removeEventListener('beforeunload', eventListenersRef.current.beforeunload);
    }

    // Destroy peer connection
    if (peerRef.current) {
      peerRef.current.destroy();
      peerRef.current = null;
    }

    isMountedRef.current = false;
  }, [enableLogging, logLevel]);

  // =======================
  // Main Effect
  // =======================

  useEffect(() => {
    isMountedRef.current = true;

    // Initialize token first (Disabled auto-sync for Safari compatibility)
    // initializeToken();

    // Set up network connectivity listeners
    eventListenersRef.current.online = handleOnlineStatusChange;
    eventListenersRef.current.offline = handleOnlineStatusChange;
    eventListenersRef.current.beforeunload = handleBeforeUnload;

    window.addEventListener('online', eventListenersRef.current.online);
    window.addEventListener('offline', eventListenersRef.current.offline);
    window.addEventListener('beforeunload', eventListenersRef.current.beforeunload);

    // Initialize peer connection if we have valid peer IDs
    if (peerId && remotePeerId) {
      initializePeer();
      connectToRemotePeer();
    }

    // Schedule token validation if we have a valid token
    if (tokenManager.token && tokenManager.isTokenValid) {
      scheduleTokenValidation();
    }

    return cleanup;
  }, [
    peerId,
    remotePeerId,
    initializeToken,
    initializePeer,
    connectToRemotePeer,
    handleOnlineStatusChange,
    handleBeforeUnload,
    scheduleTokenValidation,
    cleanup,
    tokenManager,
  ]);

  // Effect to handle token changes
  useEffect(() => {
    if (tokenManager.token && tokenManager.isTokenValid) {
      scheduleTokenValidation();
    }
  }, [tokenManager, scheduleTokenValidation]);

  // Effect to handle peer ID changes
  useEffect(() => {
    if (peerId && remotePeerId && status.state === 'disconnected') {
      initializePeer();
      connectToRemotePeer();
    }
  }, [peerId, remotePeerId, initializePeer, connectToRemotePeer, status.state]);

  // Effect to handle connection state changes
  useEffect(() => {
    if (status.state === 'connected' && tokenManager.token && tokenManager.isTokenValid) {
      // Connection established successfully
      if (enableLogging && logLevel === 'info') {
        console.info('Connection established with token');
      }
    }
  }, [status.state, tokenManager, enableLogging, logLevel]);

  // =======================
  // Return Connection Manager
  // =======================

  const connectionManager: ConnectionManager = {
    // Connection state
    status,

    // Token management
    token: tokenManager.token,
    isTokenValid: tokenManager.isTokenValid,
    isLoadingToken: tokenManager.isLoading,
    tokenError: tokenManager.error,
    fcmToken: tokenManager.token,

    // Connection methods
    initializeToken,
    refreshConnectionToken,
    connectToRemotePeer,
    disconnect,

    // Peer connection
    peer: peerRef.current,

    // Utility methods
    isConnected: status.state === 'connected',
    isConnecting: status.state === 'connecting' || status.state === 'reconnecting',
    isDisconnected: status.state === 'disconnected',
    hasError: status.state === 'error',
  };

  return connectionManager;
};