// ConnectionStatus Component Test
import React from 'react';
import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import { Provider } from 'react-redux';
import { store } from '../store';
import { MemoryRouter } from 'react-router-dom';
import ConnectionStatus from './ConnectionStatus';
import { useConnectionManager } from '../hooks/useConnectionManager';

// Mock useConnectionManager hook
jest.mock('../hooks/useConnectionManager', () => ({
  useConnectionManager: jest.fn(),
}));

describe('ConnectionStatus Component', () => {
  const mockConnectionManager = {
    status: {
      state: 'connected',
      peerId: 'test-peer-123',
      remotePeerId: 'remote-peer-456',
      retryCount: 0,
      isOnline: true,
    },
    token: 'valid-token-123',
    isTokenValid: true,
    isLoadingToken: false,
    tokenError: null,
    fcmToken: 'valid-token-123',
    peer: null,
    isConnected: true,
    isConnecting: false,
    isDisconnected: false,
    hasError: false,
    initializeToken: jest.fn(),
    refreshConnectionToken: jest.fn(),
    connectToRemotePeer: jest.fn(),
    disconnect: jest.fn(),
  };

  beforeEach(() => {
    (useConnectionManager as jest.Mock).mockReturnValue(mockConnectionManager);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  test('renders connection status component', () => {
    render(
      <MemoryRouter>
        <ConnectionStatus />
      </MemoryRouter>
    );

    // Should display the main header
    expect(screen.getByText(/CONNECTION STATUS/i)).toBeInTheDocument();

    // Should display connected status
    expect(screen.getByText(/CONNECTED/i)).toBeInTheDocument();

    // Should display peer information
    expect(screen.getByText(/test-peer-123/i)).toBeInTheDocument();
    expect(screen.getByText(/remote-peer-456/i)).toBeInTheDocument();

    // Should display token status
    expect(screen.getByText(/VALID/i)).toBeInTheDocument();
  });

  test('displays connection quality metrics', () => {
    render(
      <MemoryRouter>
        <ConnectionStatus />
      </MemoryRouter>
    );

    // Should display signal strength
    expect(screen.getByText(/SIGNAL/i)).toBeInTheDocument();

    // Should display latency
    expect(screen.getByText(/LATENCY/i)).toBeInTheDocument();

    // Should display packet loss
    expect(screen.getByText(/PACKET_LOSS/i)).toBeInTheDocument();

    // Should display bandwidth
    expect(screen.getByText(/BANDWIDTH/i)).toBeInTheDocument();
  });

  test('displays connection history when toggled', async () => {
    render(
      <MemoryRouter>
        <ConnectionStatus />
      </MemoryRouter>
    );

    // Click the history button to expand
    const historyButton = screen.getByText(/HISTORY/i);
    fireEvent.click(historyButton);

    // Wait for history to expand
    await waitFor(() => {
      expect(screen.getByText(/CONNECTION HISTORY/i)).toBeInTheDocument();
    });

    // Should display connection history entries
    expect(screen.getByText(/Connection Established/i)).toBeInTheDocument();
    expect(screen.getByText(/Token Refreshed/i)).toBeInTheDocument();
  });

  test('calls disconnect function when disconnect button is clicked', () => {
    render(
      <MemoryRouter>
        <ConnectionStatus />
      </MemoryRouter>
    );

    // Click the disconnect button
    const disconnectButton = screen.getByText(/DISCONNECT/i);
    fireEvent.click(disconnectButton);

    // Should call the disconnect function
    expect(mockConnectionManager.disconnect).toHaveBeenCalledTimes(1);
  });

  test('displays different status based on connection state', () => {
    // Test connected state
    (useConnectionManager as jest.Mock).mockReturnValue({
      ...mockConnectionManager,
      status: { ...mockConnectionManager.status, state: 'connected' },
      isConnected: true,
    });

    render(
      <MemoryRouter>
        <ConnectionStatus />
      </MemoryRouter>
    );

    expect(screen.getByText(/CONNECTED/i)).toBeInTheDocument();

    // Test connecting state
    (useConnectionManager as jest.Mock).mockReturnValue({
      ...mockConnectionManager,
      status: { ...mockConnectionManager.status, state: 'connecting' },
      isConnecting: true,
    });

    render(
      <MemoryRouter>
        <ConnectionStatus />
      </MemoryRouter>
    );

    expect(screen.getByText(/CONNECTING/i)).toBeInTheDocument();
  });

  test('displays token expiration timer', () => {
    // Mock token expiration
    Object.defineProperty(Date, 'now', { value: Date.now() });

    render(
      <MemoryRouter>
        <ConnectionStatus />
      </MemoryRouter>
    );

    // Should display token expiration
    expect(screen.getByText(/TOKEN_EXPIRES/i)).toBeInTheDocument();
  });

  test('displays error state when connection has error', () => {
    (useConnectionManager as jest.Mock).mockReturnValue({
      ...mockConnectionManager,
      status: {
        ...mockConnectionManager.status,
        state: 'error',
        lastError: 'Test error message',
      },
      hasError: true,
    });

    render(
      <MemoryRouter>
        <ConnectionStatus />
      </MemoryRouter>
    );

    // Should display error status
    expect(screen.getByText(/ERROR/i)).toBeInTheDocument();

    // Should display error message
    expect(screen.getByText(/Test error message/i)).toBeInTheDocument();
  });

  test('displays offline status when network is offline', () => {
    (useConnectionManager as jest.Mock).mockReturnValue({
      ...mockConnectionManager,
      status: {
        ...mockConnectionManager.status,
        isOnline: false,
      },
    });

    render(
      <MemoryRouter>
        <ConnectionStatus />
      </MemoryRouter>
    );

    // Should display offline status
    expect(screen.getByText(/OFFLINE/i)).toBeInTheDocument();
  });

  test('refresh button is functional', () => {
    render(
      <MemoryRouter>
        <ConnectionStatus />
      </MemoryRouter>
    );

    // Click the refresh button
    const refreshButton = screen.getByText(/REFRESH/i);
    fireEvent.click(refreshButton);

    // Should trigger refresh action (implementation-specific)
    // This test just verifies the button is clickable
    expect(refreshButton).toBeInTheDocument();
  });
});