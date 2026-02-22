# ConnectionStatus Component Documentation

## Overview

The `ConnectionStatus` component provides comprehensive real-time monitoring of connection status, token validity, and connection quality metrics for the Walkie-Talkie application. It integrates seamlessly with the existing tactical design aesthetic and provides users with complete visibility into their connection status.

## Features

### 1. Real-time Connection Status Indicators
- **Connection State**: Displays current connection state (Connected, Connecting, Disconnected, Error)
- **Visual Indicators**: Color-coded status lights with tactical design
- **Peer Information**: Shows both local and remote peer IDs

### 2. Token Management Display
- **Token Validity**: Shows whether the token is valid, invalid, or loading
- **Expiration Timer**: Displays time remaining until token expiration
- **Error States**: Shows token validation errors

### 3. Connection Quality Metrics
- **Signal Strength**: Visual progress bar with percentage display
- **Latency**: Real-time latency measurement in milliseconds
- **Packet Loss**: Packet loss percentage monitoring
- **Bandwidth**: Current bandwidth usage

### 4. Connection History
- **Activity Log**: Maintains a log of connection events
- **Timestamps**: Shows when each event occurred
- **Expandable View**: Collapsible history panel for better UX

### 5. Network Status Monitoring
- **Online/Offline Detection**: Real-time network status monitoring
- **Error Handling**: Displays last error messages
- **Retry Mechanism**: Shows retry attempts and status

## Component API

### Props

| Name | Type | Required | Default | Description |
|------|------|----------|---------|-------------|
| `className` | `string` | No | `''` | Additional CSS classes to apply to the component |

### Return Value

The component returns a comprehensive connection monitoring interface with the following sections:

#### Header Section
- Connection status indicator
- Expandable history toggle

#### Connection Status Card
- Current connection state with visual indicator
- Peer ID information
- Token validation status
- Token expiration timer
- Network status indicator
- Last error display (if applicable)

#### Connection Quality Metrics
- Signal strength with progress bar
- Latency measurement
- Packet loss percentage
- Bandwidth usage

#### Connection History (Expandable)
- Chronological list of connection events
- Event type and timestamp
- Visual status indicators

#### Action Buttons
- Disconnect button (disabled when already disconnected)
- Refresh button for connection management

## Integration

The component integrates with the existing `useConnectionManager` hook, which provides:

- Real-time connection state updates
- Token management functionality
- Network status monitoring
- Error handling and retry mechanisms

## Design Integration

The component follows the established tactical design aesthetic:

- **Color Scheme**: Uses the orange (#ff8c00) accent color consistent with the walkie-talkie theme
- **Typography**: Tactical-style fonts with uppercase labels
- **Layout**: Clean, organized layout with proper spacing and borders
- **Visual Elements**: Includes tactical-style knobs, switches, and status indicators

## Usage Examples

### Basic Usage
```tsx
import ConnectionStatus from './components/ConnectionStatus';

function MyComponent() {
  return (
    <div>
      <ConnectionStatus />
    </div>
  );
}
```

### With Custom Styling
```tsx
import ConnectionStatus from './components/ConnectionStatus';

function MyComponent() {
  return (
    <div>
      <ConnectionStatus className="w-full max-w-md" />
    </div>
  );
}
```

## Technical Implementation

### State Management
- Uses React hooks for state management
- Integrates with `useConnectionManager` for real-time data
- Simulated connection quality metrics for demonstration
- Token expiration tracking

### Real-time Updates
- Connection quality metrics update every 2 seconds
- Network status monitoring
- Token validation and expiration tracking

### Error Handling
- Comprehensive error state display
- Last error message visibility
- Network status indicators

### Performance
- Efficient re-rendering with proper dependency arrays
- Cleanup of intervals and event listeners
- Optimized for real-time updates

## Testing

The component includes comprehensive test coverage:

- Basic rendering tests
- Connection state verification
- Token status validation
- History toggle functionality
- Action button testing
- Error state handling

## Dependencies

- `react`: Core React library
- `lucide-react`: Icon library for visual elements
- `date-fns`: Date formatting and manipulation
- `useConnectionManager`: Custom hook for connection management

## Accessibility

The component includes:
- Proper semantic HTML structure
- ARIA labels for interactive elements
- Keyboard navigation support
- Screen reader friendly text

## Future Enhancements

Potential improvements could include:
- Real-time metric data from actual connection monitoring
- More detailed connection diagnostics
- Customizable metric thresholds
- Export functionality for connection history
- Advanced alerting and notifications

## Troubleshooting

### Common Issues

1. **Component not updating**: Ensure `useConnectionManager` hook is properly implemented and returning current state
2. **Styling issues**: Verify that the tactical CSS classes are properly imported and available
3. **Token expiration not showing**: Check that token expiration date is properly set and calculated
4. **History not expanding**: Verify that the toggle functionality is working correctly

### Debug Mode

The component includes debug logging when the application is not in production mode. Check the browser console for detailed connection information and state changes.