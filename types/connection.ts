import type { Peer, MediaConnection } from 'peerjs';

export type ConnectionState = 'disconnected' | 'connecting' | 'connected' | 'reconnecting' | 'error';

export type ConnectionError = 'token_error' | 'peer_error' | 'network_error' | 'authentication_error' | 'unknown_error';

export interface ConnectionStatus {
  state: ConnectionState;
  peerId?: string;
  remotePeerId?: string;
  fcmToken?: string;
  error?: ConnectionError;
  retryCount: number;
  lastError?: string;
  isOnline: boolean;
}

export interface ConnectionConfig {
  autoReconnect: boolean;
  maxRetries: number;
  retryDelay: number;
  maxRetryDelay: number;
  connectionTimeout: number;
  tokenRefreshThreshold: number;
}

export interface PeerConnection {
  peer: Peer | null;
  call: MediaConnection | null;
  stream: MediaStream | null;
}

export interface TokenManager {
  token: string | null;
  isTokenValid: boolean;
  isLoading: boolean;
  error: string | null;
  connectionStatus: 'online' | 'offline';
}

export interface ConnectionManager {
  status: ConnectionStatus;
  token: string | null;
  isTokenValid: boolean;
  isLoadingToken: boolean;
  tokenError: string | null;
  fcmToken: string | null;
  peer: Peer | null;
  isConnected: boolean;
  isConnecting: boolean;
  isDisconnected: boolean;
  hasError: boolean;

  initializeToken: () => Promise<void>;
  refreshConnectionToken: () => Promise<void>;
  connectToRemotePeer: () => Promise<void>;
  disconnect: () => void;
}

export interface ConnectionEvent {
  type: 'connection_state_change' | 'token_update' | 'error' | 'reconnect_attempt';
  payload: {
    state?: ConnectionState;
    error?: ConnectionError;
    token?: string;
    retryCount?: number;
  };
}

export interface NetworkStatus {
  isOnline: boolean;
  lastOnlineTime?: number;
  lastOfflineTime?: number;
}

export interface RetryConfig {
  baseDelay: number;
  maxDelay: number;
  backoffMultiplier: number;
  maxRetries: number;
}

export interface TimeoutConfig {
  connectionTimeout: number;
  tokenValidationTimeout: number;
  keepAliveInterval: number;
}

export interface SecurityConfig {
  tokenEncryptionEnabled: boolean;
  tokenValidationEndpoint: string;
  tokenRefreshThreshold: number;
}

export interface DebugConfig {
  enableLogging: boolean;
  logLevel: 'error' | 'warn' | 'info' | 'debug';
  maxLogHistory: number;
}

export interface ConnectionManagerConfig {
  retry: RetryConfig;
  timeout: TimeoutConfig;
  security: SecurityConfig;
  debug: DebugConfig;
  autoReconnect: boolean;
}