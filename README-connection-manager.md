# Connection Manager Hook

A robust connection management system for the Walkie-Talkie application with state machine, real-time monitoring, and comprehensive error handling.

## Features

### 1. Connection State Machine
- **States**: `disconnected`, `connecting`, `connected`, `reconnecting`, `error`
- **Transitions**: Well-defined state transitions with proper validation
- **Status tracking**: Real-time connection status updates

### 2. Real-time Connection Monitoring
- **Network status**: Automatic detection of online/offline status
- **Connection health**: Continuous monitoring of connection quality
- **Event-driven**: Reactive updates for UI components

### 3. Automatic Token Management
- **Token exchange**: Seamless token acquisition and refresh
- **Validation**: Automatic token validation and expiration handling
- **Security**: Optional token encryption and secure storage

### 4. Connection Validation & Error Handling
- **Error types**: Comprehensive error categorization (`token_error`, `peer_error`, `network_error`, etc.)
- **Graceful degradation**: Fallback mechanisms for failed connections
- **Error recovery**: Automatic recovery from common failure scenarios

### 5. Retry Logic with Exponential Backoff
- **Configurable**: Customizable retry parameters (delay, max retries, backoff)
- **Smart backoff**: Exponential backoff with jitter to prevent thundering herd
- **Max retry limit**: Configurable maximum retry attempts

### 6. Timeout Handling & Cleanup
- **Connection timeout**: Configurable connection timeout with proper cleanup
- **Resource management**: Automatic cleanup of timers and event listeners
- **Memory leaks prevention**: Proper cleanup on component unmount

### 7. Integration with useWalkieTalkie
- **Seamless integration**: Works alongside existing walkie-talkie functionality
- **Shared state**: Coordinated connection management
- **Event propagation**: Proper event handling between components

### 8. Real-time Status Updates
- **UI integration**: Real-time updates for UI components
- **Status indicators**: Connection status indicators for users
- **Event system**: Event-driven architecture for responsive UI

## Usage

```typescript
import { useConnectionManager } from '@/hooks/useConnectionManager';

// Basic usage
const connection = useConnectionManager('my-peer-id', 'remote-peer-id');

// With custom configuration
const connection = useConnectionManager('my-peer-id', 'remote-peer-id', {
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
    tokenRefreshThreshold: 300000,
  },
  debug: {
    enableLogging: process.env.NODE_ENV !== 'production',
    logLevel: 'info',
    maxLogHistory: 100,
  },
  autoReconnect: true,
});

// Usage in components
if (connection.isConnected) {
  // Show connected UI
} else if (connection.isConnecting) {
  // Show connecting UI
} else if (connection.hasError) {
  // Show error UI
} else {
  // Show disconnected UI
}
```

## Configuration

### Retry Configuration
```typescript
{
  retry: {
    baseDelay: 1000,           // Initial retry delay in ms
    maxDelay: 30000,           // Maximum retry delay in ms
    backoffMultiplier: 2,      // Exponential backoff multiplier
    maxRetries: 5,             // Maximum number of retry attempts
  }
}
```

### Timeout Configuration
```typescript
{
  timeout: {
    connectionTimeout: 30000,   // Connection timeout in ms
    tokenValidationTimeout: 10000, // Token validation timeout in ms
    keepAliveInterval: 30000,   // Keep-alive interval in ms
  }
}
```

### Security Configuration
```typescript
{
  security: {
    tokenEncryptionEnabled: true,  // Enable token encryption
    tokenValidationEndpoint: '/api/tokens/verify', // Token validation endpoint
    tokenRefreshThreshold: 300000, // Token refresh threshold in ms
  }
}
```

### Debug Configuration
```typescript
{
  debug: {
    enableLogging: true,       // Enable debug logging
    logLevel: 'info',          // Log level (error, warn, info, debug)
    maxLogHistory: 100,        // Maximum log history size
  }
}
```

## State Management

The connection manager maintains comprehensive state information:

### Connection Status
- `state`: Current connection state
- `peerId`: Local peer ID
- `remotePeerId`: Remote peer ID
- `error`: Current error type (if any)
- `retryCount`: Number of retry attempts
- `lastError`: Last error message
- `isOnline`: Current network status

### Token Management
- `token`: Current authentication token
- `isTokenValid`: Token validity status
- `isLoadingToken`: Token loading status
- `tokenError`: Token error message (if any)

### Connection Methods
- `initializeToken()`: Initialize authentication token
- `refreshConnectionToken()`: Refresh authentication token
- `connectToRemotePeer()`: Establish connection to remote peer
- `disconnect()`: Disconnect from remote peer

## Error Handling

The connection manager provides comprehensive error handling:

### Error Types
- `token_error`: Authentication token errors
- `peer_error`: Peer connection errors
- `network_error`: Network connectivity errors
- `authentication_error`: Authentication errors
- `unknown_error`: Unknown errors

### Error Recovery
- Automatic retry with exponential backoff
- Network status-based reconnection
- Token refresh and validation
- Graceful degradation

## Integration

The connection manager integrates seamlessly with the existing walkie-talkie system:

### With useWalkieTalkie Hook
```typescript
// In your component
const { startTalking, stopTalking } = useWalkieTalkie(
  peerId,
  remotePeerId,
  fcmToken
);

// Connection status can be used to enable/disable controls
const canStartTalking = connection.isConnected && connection.isTokenValid;
```

### Real-time Updates
- **UI Components**: Real-time connection status updates
- **Event System**: Event-driven architecture for responsive UI
- **Status Indicators**: Visual connection status indicators

## Testing

The connection manager includes a comprehensive test suite:

### Test Coverage
- Initial state verification
- Token management tests
- Peer connection tests
- Retry mechanism tests
- Network status handling tests
- Cleanup tests
- Error handling tests

### Running Tests
```bash
npm test -- connectionManager.test.ts
```

## Performance

The connection manager is optimized for performance:

### Memory Management
- Proper cleanup of timers and event listeners
- Automatic resource management
- Prevention of memory leaks

### Network Efficiency
- Smart retry mechanism with exponential backoff
- Efficient keep-alive mechanism
- Minimal network overhead

### CPU Usage
- Efficient state management
- Optimized event handling
- Minimal computational overhead

## Security

The connection manager includes security features:

### Token Security
- Optional token encryption
- Secure token storage
- Automatic token validation
- Token refresh mechanism

### Connection Security
- Secure peer connections
- Authentication validation
- Error handling for security events

## Debugging

The connection manager includes comprehensive debugging features:

### Debug Logging
- Configurable log levels
- Debug information for development
- Performance monitoring

### Error Reporting
- Detailed error messages
- Error categorization
- Error recovery information

## Best Practices

### Usage Recommendations
1. **Initialize early**: Initialize the connection manager as early as possible
2. **Handle errors**: Always handle error states in your UI
3. **Monitor status**: Use the connection status for UI control enable/disable
4. **Cleanup properly**: Always call disconnect() when done
5. **Configure appropriately**: Adjust configuration for your specific use case

### Common Patterns
```typescript
// In your component
const connection = useConnectionManager(peerId, remotePeerId);

// Enable/disable controls based on connection status
const isReady = connection.isConnected && connection.isTokenValid;

// Handle errors gracefully
if (connection.hasError) {
  // Show error message and retry button
}

// Cleanup on unmount
useEffect(() => {
  return () => {
    connection.disconnect();
  };
}, []);
```

## Troubleshooting

### Common Issues
1. **Connection fails**: Check network status and retry configuration
2. **Token errors**: Verify token validation endpoint and permissions
3. **Peer errors**: Check peer ID format and network connectivity
4. **Timeout issues**: Adjust timeout configuration for your network conditions

### Debug Mode
Enable debug mode for detailed logging:
```typescript
const connection = useConnectionManager(peerId, remotePeerId, {
  debug: {
    enableLogging: true,
    logLevel: 'debug',
  }
});
```

## Future Enhancements

### Planned Features
- WebSocket support for real-time communication
- WebRTC data channel support
- Multi-peer connection support
- Advanced monitoring and analytics
- Enhanced security features