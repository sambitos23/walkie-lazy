// Connection Manager Tests
// Comprehensive test suite for the connection manager hook

import { renderHook, act } from '@testing-library/react-hooks';
import { useConnectionManager } from '../hooks/useConnectionManager';
import Peer from 'peerjs';
import {
  ConnectionState,
  ConnectionError,
  ConnectionStatus,
  ConnectionConfig,
  ConnectionManager,
} from '../types/connection';

describe('useConnectionManager', () => {
  // Mock the PeerJS library
  let mockPeer: jest.Mocked<Peer>;
  let mockCall: jest.Mocked<any>;

  beforeEach(() => {
    // Mock PeerJS
    mockPeer = {
      new: jest.fn(),
      on: jest.fn(),
      call: jest.fn(),
      destroy: jest.fn(),
    } as any;

    mockCall = {
      answer: jest.fn(),
      on: jest.fn(),
      close: jest.fn(),
    } as any;

    // Mock PeerJS constructor
    jest.spyOn(Peer, 'new').mockImplementation(() => mockPeer);

    // Mock PeerJS methods
    mockPeer.on.mockImplementation((event, callback) => {
      if (event === 'open') {
        callback('mock-peer-id');
      }
      if (event === 'call') {
        callback(mockCall);
      }
      return mockPeer;
    });

    mockPeer.call.mockImplementation(() => mockCall);

    // Mock firebase functions
    jest.mock('../lib/firebase', () => ({
      requestForToken: jest.fn().mockResolvedValue('mock-token'),
      refreshToken: jest.fn().mockResolvedValue('refreshed-token'),
      invalidateToken: jest.fn(),
      validateToken: jest.fn().mockResolvedValue(true),
    }));
  });

  afterEach(() => {
    jest.clearAllMocks();
    jest.restoreAllMocks();
  });

  describe('Initial state', () => {
    it('should initialize with disconnected state', async () => {
      const { result } = renderHook(() => useConnectionManager('peer1', 'peer2'));

      expect(result.current.status.state).toBe('disconnected');
      expect(result.current.status.retryCount).toBe(0);
      expect(result.current.status.isOnline).toBe(navigator.onLine);
      expect(result.current.token).toBeNull();
      expect(result.current.isLoadingToken).toBe(true);
      expect(result.current.isConnected).toBe(false);
      expect(result.current.isConnecting).toBe(false);
      expect(result.current.isDisconnected).toBe(true);
      expect(result.current.hasError).toBe(false);
    });
  });

  describe('Token management', () => {
    it('should initialize token successfully', async () => {
      const { result, waitForNextUpdate } = renderHook(() => useConnectionManager('peer1', 'peer2'));

      await waitForNextUpdate();

      expect(result.current.token).toBe('mock-token');
      expect(result.current.isTokenValid).toBe(true);
      expect(result.current.isLoadingToken).toBe(false);
      expect(result.current.tokenError).toBeNull();
    });

    it('should refresh token successfully', async () => {
      const { result, waitForNextUpdate } = renderHook(() => useConnectionManager('peer1', 'peer2'));

      await waitForNextUpdate();

      await act(async () => {
        await result.current.refreshConnectionToken();
      });

      expect(result.current.token).toBe('refreshed-token');
      expect(result.current.isTokenValid).toBe(true);
    });

    it('should handle token validation failure', async () => {
      // Mock validateToken to return false
      jest.mocked(validateToken).mockResolvedValue(false);

      const { result, waitForNextUpdate } = renderHook(() => useConnectionManager('peer1', 'peer2'));

      await waitForNextUpdate();

      // Token should be invalidated
      expect(result.current.token).toBeNull();
      expect(result.current.isTokenValid).toBe(false);
      expect(result.current.tokenError).not.toBeNull();
    });
  });

  describe('Peer connection', () => {
    it('should initialize peer connection successfully', async () => {
      const { result, waitForNextUpdate } = renderHook(() => useConnectionManager('peer1', 'peer2'));

      await waitForNextUpdate();

      expect(mockPeer.on).toHaveBeenCalledWith('open', expect.any(Function));
      expect(mockPeer.on).toHaveBeenCalledWith('error', expect.any(Function));
      expect(mockPeer.on).toHaveBeenCalledWith('close', expect.any(Function));
      expect(mockPeer.on).toHaveBeenCalledWith('call', expect.any(Function));
    });

    it('should connect to remote peer successfully', async () => {
      const { result, waitForNextUpdate } = renderHook(() => useConnectionManager('peer1', 'peer2'));

      await waitForNextUpdate();

      await act(async () => {
        await result.current.connectToRemotePeer();
      });

      expect(result.current.status.state).toBe('connected');
      expect(result.current.status.remotePeerId).toBe('peer2');
      expect(result.current.isConnected).toBe(true);
    });

    it('should handle connection timeout', async () => {
      // Mock connection to timeout
      jest.useFakeTimers();

      const { result } = renderHook(() => useConnectionManager('peer1', 'peer2'));

      await act(async () => {
        await result.current.connectToRemotePeer();
      });

      // Fast-forward to timeout
      act(() => {
        jest.advanceTimersByTime(30000); // 30 seconds
      });

      expect(result.current.status.state).toBe('error');
      expect(result.current.status.error).toBe('network_error');
      expect(result.current.hasError).toBe(true);
    });
  });

  describe('Retry mechanism', () => {
    it('should retry connection on failure', async () => {
      // Mock connection to fail initially
      mockPeer.on.mockImplementationOnce((event, callback) => {
        if (event === 'error') {
          callback(new Error('Connection failed'));
        }
        return mockPeer;
      });

      const { result } = renderHook(() => useConnectionManager('peer1', 'peer2'));

      await act(async () => {
        await result.current.connectToRemotePeer();
      });

      expect(result.current.status.state).toBe('error');
      expect(result.current.status.retryCount).toBe(1);
      expect(result.current.status.error).toBe('network_error');
    });

    it('should stop retrying after max retries', async () => {
      // Mock connection to always fail
      mockPeer.on.mockImplementation((event, callback) => {
        if (event === 'error') {
          callback(new Error('Connection failed'));
        }
        return mockPeer;
      });

      const { result } = renderHook(() => useConnectionManager('peer1', 'peer2', {
        maxRetries: 2,
      }));

      // Trigger multiple connection attempts
      for (let i = 0; i < 3; i++) {
        await act(async () => {
          await result.current.connectToRemotePeer();
        });
      }

      expect(result.current.status.state).toBe('error');
      expect(result.current.status.retryCount).toBe(2);
      expect(result.current.status.error).toBe('network_error');
    });
  });

  describe('Network status handling', () => {
    it('should handle online status changes', async () => {
      const { result } = renderHook(() => useConnectionManager('peer1', 'peer2'));

      // Simulate going offline
      await act(async () => {
        window.dispatchEvent(new Event('offline'));
      });

      expect(result.current.status.isOnline).toBe(false);

      // Simulate coming back online
      await act(async () => {
        window.dispatchEvent(new Event('online'));
      });

      expect(result.current.status.isOnline).toBe(true);
    });

    it('should reconnect when network is restored', async () => {
      // Mock connection to fail
      mockPeer.on.mockImplementation((event, callback) => {
        if (event === 'error') {
          callback(new Error('Connection failed'));
        }
        return mockPeer;
      });

      const { result } = renderHook(() => useConnectionManager('peer1', 'peer2'));

      // Trigger connection failure
      await act(async () => {
        await result.current.connectToRemotePeer();
      });

      expect(result.current.status.state).toBe('error');

      // Simulate network restoration
      await act(async () => {
        window.dispatchEvent(new Event('online'));
      });

      // Should attempt to reconnect
      expect(result.current.status.state).toBe('reconnecting');
    });
  });

  describe('Cleanup', () => {
    it('should clean up timers and event listeners on unmount', async () => {
      const { result, unmount } = renderHook(() => useConnectionManager('peer1', 'peer2'));

      await act(async () => {
        await result.current.connectToRemotePeer();
      });

      // Unmount the hook
      unmount();

      // Verify cleanup
      expect(mockPeer.destroy).toHaveBeenCalled();
      expect(mockPeer.on).toHaveBeenCalledWith('close', expect.any(Function));
    });

    it('should disconnect properly', async () => {
      const { result } = renderHook(() => useConnectionManager('peer1', 'peer2'));

      await act(async () => {
        await result.current.connectToRemotePeer();
      });

      await act(async () => {
        result.current.disconnect();
      });

      expect(result.current.status.state).toBe('disconnected');
      expect(result.current.peer).toBeNull();
      expect(result.current.isConnected).toBe(false);
    });
  });

  describe('Utility methods', () => {
    it('should provide correct utility method values', async () => {
      const { result } = renderHook(() => useConnectionManager('peer1', 'peer2'));

      expect(result.current.isConnected).toBe(false);
      expect(result.current.isConnecting).toBe(false);
      expect(result.current.isDisconnected).toBe(true);
      expect(result.current.hasError).toBe(false);
    });
  });

  describe('Error handling', () => {
    it('should handle peer initialization error', async () => {
      // Mock Peer constructor to throw an error
      jest.spyOn(Peer, 'new').mockImplementation(() => {
        throw new Error('Peer initialization failed');
      });

      const { result } = renderHook(() => useConnectionManager('peer1', 'peer2'));

      expect(result.current.status.state).toBe('error');
      expect(result.current.status.error).toBe('peer_error');
      expect(result.current.hasError).toBe(true);
    });

    it('should handle token request failure', async () => {
      // Mock requestForToken to fail
      jest.mocked(requestForToken).mockRejectedValue(new Error('Token request failed'));

      const { result } = renderHook(() => useConnectionManager('peer1', 'peer2'));

      await act(async () => {
        // Wait for token initialization to complete
        await new Promise(resolve => setTimeout(resolve, 100));
      });

      expect(result.current.token).toBeNull();
      expect(result.current.isTokenValid).toBe(false);
      expect(result.current.tokenError).not.toBeNull();
    });
  });
});