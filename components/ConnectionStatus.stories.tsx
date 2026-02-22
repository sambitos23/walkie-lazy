// ConnectionStatus Component Stories
import React from 'react';
import { Meta, StoryObj } from '@storybook/react';
import ConnectionStatus from './ConnectionStatus';
import { useConnectionManager } from '../hooks/useConnectionManager';

// Mock useConnectionManager hook for Storybook
jest.mock('../hooks/useConnectionManager', () => ({
  useConnectionManager: jest.fn(),
}));

const meta: Meta<typeof ConnectionStatus> = {
  title: 'ConnectionStatus',
  component: ConnectionStatus,
  argTypes: {
    className: {
      control: 'text',
    },
  },
  parameters: {
    controls: {
      expanded: true,
    },
  },
};

export default meta;

type Story = StoryObj<typeof ConnectionStatus>;

// Mock data for different connection states
const mockConnectionStates = {
  connected: {
    status: {
      state: 'connected',
      peerId: 'peer-123',
      remotePeerId: 'remote-456',
      retryCount: 0,
      isOnline: true,
    },
    token: 'valid-token-123',
    isTokenValid: true,
    isLoadingToken: false,
    tokenError: null,
    fcmToken: 'valid-token-123',
    isConnected: true,
    isConnecting: false,
    isDisconnected: false,
    hasError: false,
  },

  connecting: {
    status: {
      state: 'connecting',
      peerId: 'peer-123',
      remotePeerId: 'remote-456',
      retryCount: 1,
      isOnline: true,
    },
    token: 'valid-token-123',
    isTokenValid: true,
    isLoadingToken: false,
    tokenError: null,
    fcmToken: 'valid-token-123',
    isConnected: false,
    isConnecting: true,
    isDisconnected: false,
    hasError: false,
  },

  disconnected: {
    status: {
      state: 'disconnected',
      peerId: 'peer-123',
      remotePeerId: 'remote-456',
      retryCount: 0,
      isOnline: true,
    },
    token: 'valid-token-123',
    isTokenValid: true,
    isLoadingToken: false,
    tokenError: null,
    fcmToken: 'valid-token-123',
    isConnected: false,
    isConnecting: false,
    isDisconnected: true,
    hasError: false,
  },

  error: {
    status: {
      state: 'error',
      peerId: 'peer-123',
      remotePeerId: 'remote-456',
      retryCount: 3,
      isOnline: true,
      lastError: 'Connection timeout',
    },
    token: 'valid-token-123',
    isTokenValid: true,
    isLoadingToken: false,
    tokenError: null,
    fcmToken: 'valid-token-123',
    isConnected: false,
    isConnecting: false,
    isDisconnected: false,
    hasError: true,
  },

  offline: {
    status: {
      state: 'connected',
      peerId: 'peer-123',
      remotePeerId: 'remote-456',
      retryCount: 0,
      isOnline: false,
    },
    token: 'valid-token-123',
    isTokenValid: true,
    isLoadingToken: false,
    tokenError: null,
    fcmToken: 'valid-token-123',
    isConnected: true,
    isConnecting: false,
    isDisconnected: false,
    hasError: false,
  },

  tokenInvalid: {
    status: {
      state: 'connected',
      peerId: 'peer-123',
      remotePeerId: 'remote-456',
      retryCount: 0,
      isOnline: true,
    },
    token: 'invalid-token-123',
    isTokenValid: false,
    isLoadingToken: false,
    tokenError: 'Token validation failed',
    fcmToken: 'invalid-token-123',
    isConnected: true,
    isConnecting: false,
    isDisconnected: false,
    hasError: false,
  },

  tokenLoading: {
    status: {
      state: 'connected',
      peerId: 'peer-123',
      remotePeerId: 'remote-456',
      retryCount: 0,
      isOnline: true,
    },
    token: null,
    isTokenValid: false,
    isLoadingToken: true,
    tokenError: null,
    fcmToken: null,
    isConnected: true,
    isConnecting: false,
    isDisconnected: false,
    hasError: false,
  },
};

export const Connected: Story = {
  args: {},
  render: () => {
    (useConnectionManager as jest.Mock).mockReturnValue(mockConnectionStates.connected);
    return <ConnectionStatus />;
  },
};

export const Connecting: Story = {
  args: {},
  render: () => {
    (useConnectionManager as jest.Mock).mockReturnValue(mockConnectionStates.connecting);
    return <ConnectionStatus />;
  },
};

export const Disconnected: Story = {
  args: {},
  render: () => {
    (useConnectionManager as jest.Mock).mockReturnValue(mockConnectionStates.disconnected);
    return <ConnectionStatus />;
  },
};

export const ErrorState: Story = {
  args: {},
  render: () => {
    (useConnectionManager as jest.Mock).mockReturnValue(mockConnectionStates.error);
    return <ConnectionStatus />;
  },
};

export const Offline: Story = {
  args: {},
  render: () => {
    (useConnectionManager as jest.Mock).mockReturnValue(mockConnectionStates.offline);
    return <ConnectionStatus />;
  },
};

export const TokenInvalid: Story = {
  args: {},
  render: () => {
    (useConnectionManager as jest.Mock).mockReturnValue(mockConnectionStates.tokenInvalid);
    return <ConnectionStatus />;
  },
};

export const TokenLoading: Story = {
  args: {},
  render: () => {
    (useConnectionManager as jest.Mock).mockReturnValue(mockConnectionStates.tokenLoading);
    return <ConnectionStatus />;
  },
};

export const WithCustomClass: Story = {
  args: {
    className: 'w-full max-w-md mx-auto',
  },
  render: () => {
    (useConnectionManager as jest.Mock).mockReturnValue(mockConnectionStates.connected);
    return <ConnectionStatus className={args.className} />;
  },
};

export const AllStates: Story = {
  args: {},
  render: () => {
    const states = [
      { label: 'Connected', state: mockConnectionStates.connected },
      { label: 'Connecting', state: mockConnectionStates.connecting },
      { label: 'Disconnected', state: mockConnectionStates.disconnected },
      { label: 'Error', state: mockConnectionStates.error },
      { label: 'Offline', state: mockConnectionStates.offline },
      { label: 'Token Invalid', state: mockConnectionStates.tokenInvalid },
      { label: 'Token Loading', state: mockConnectionStates.tokenLoading },
    ];

    return (
      <div className="space-y-6">
        {states.map((state, index) => (
          <div key={index}>
            <h4 className="text-white text-sm font-black uppercase tracking-wider mb-3">
              {state.label}
            </h4>
            <div className="space-y-4">
              {(useConnectionManager as jest.Mock).mockReturnValue(state.state);
              <ConnectionStatus />
            </div>
          </div>
        ))}
      </div>
    );
  },
};