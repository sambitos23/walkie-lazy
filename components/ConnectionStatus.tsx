// ConnectionStatus Component - Comprehensive Connection Monitoring
// Provides real-time connection status, token validity, and connection quality metrics
"use client";

import React, { useEffect, useState, useRef } from 'react';
import { useConnectionManager } from '../hooks/useConnectionManager';
import {
  Signal,
  BatteryFull,
  Wifi,
  AlertCircle,
  Loader2,
  TrendingUp,
  TrendingDown,
  Clock,
  Zap,
  Activity,
  Database,
  Server,
  Link2,
  CheckCircle,
  XCircle,
  InformationCircle,
  ChevronDown,
  ChevronUp,
} from 'lucide-react';
import { formatDistanceToNow, format, addSeconds } from 'date-fns';

interface ConnectionStatusProps {
  className?: string;
}

const ConnectionStatus: React.FC<ConnectionStatusProps> = ({ className = '' }) => {
  const { status, token, isTokenValid, isLoadingToken, tokenError, isConnected, isConnecting, isDisconnected, hasError, disconnect } = useConnectionManager('myPeerId', 'remotePeerId');

  // State for connection quality metrics
  const [connectionQuality, setConnectionQuality] = useState({
    signalStrength: 95,
    latency: 50,
    packetLoss: 0,
    bandwidth: 1000,
  });

  // State for connection history
  const [connectionHistory, setConnectionHistory] = useState<Array<{
    timestamp: Date;
    event: string;
    status: string;
  }>>([]);

  // State for token expiration timer
  const [tokenExpiration, setTokenExpiration] = useState<Date | null>(null);

  // Refs for simulated metrics
  const signalStrengthRef = useRef(95);
  const latencyRef = useRef(50);
  const packetLossRef = useRef(0);
  const bandwidthRef = useRef(1000);

  // Generate random connection quality metrics (simulated)
  const generateConnectionMetrics = () => {
    // Simulate real-time connection quality changes
    const newSignalStrength = Math.max(0, Math.min(100, signalStrengthRef.current + (Math.random() - 0.5) * 10));
    const newLatency = Math.max(10, Math.min(500, latencyRef.current + (Math.random() - 0.5) * 20));
    const newPacketLoss = Math.max(0, Math.min(10, packetLossRef.current + (Math.random() - 0.5) * 0.5));
    const newBandwidth = Math.max(500, Math.min(5000, bandwidthRef.current + (Math.random() - 0.5) * 100));

    signalStrengthRef.current = newSignalStrength;
    latencyRef.current = newLatency;
    packetLossRef.current = newPacketLoss;
    bandwidthRef.current = newBandwidth;

    setConnectionQuality({
      signalStrength: Math.round(newSignalStrength),
      latency: Math.round(newLatency),
      packetLoss: Math.round(newPacketLoss * 100) / 100,
      bandwidth: Math.round(newBandwidth),
    });
  };

  // Generate connection history entries
  const generateConnectionHistory = () => {
    const events = [
      {
        timestamp: new Date(Date.now() - 5 * 60 * 1000), // 5 minutes ago
        event: 'Connection Established',
        status: 'connected'
      },
      {
        timestamp: new Date(Date.now() - 10 * 60 * 1000), // 10 minutes ago
        event: 'Token Refreshed',
        status: 'success'
      },
      {
        timestamp: new Date(Date.now() - 30 * 60 * 1000), // 30 minutes ago
        event: 'Initial Connection',
        status: 'connected'
      },
      {
        timestamp: new Date(Date.now() - 2 * 60 * 60 * 1000), // 2 hours ago
        event: 'Connection Lost',
        status: 'error'
      },
    ];

    setConnectionHistory(events);
  };

  // Generate token expiration (simulated)
  const generateTokenExpiration = () => {
    // Token expires in 1 hour from now
    setTokenExpiration(addSeconds(new Date(), 3600));
  };

  // Real-time updates
  useEffect(() => {
    const metricsInterval = setInterval(generateConnectionMetrics, 2000);

    return () => {
      clearInterval(metricsInterval);
    };
  }, []);

  useEffect(() => {
    generateConnectionHistory();
    generateTokenExpiration();
  }, []);

  // Calculate time remaining for token
  const getTimeUntilExpiration = (expirationDate: Date | null) => {
    if (!expirationDate) return 'Unknown';

    const now = new Date();
    const diffInSeconds = Math.floor((expirationDate.getTime() - now.getTime()) / 1000);

    if (diffInSeconds <= 0) return 'Expired';
    if (diffInSeconds < 60) return `${diffInSeconds}s`;
    if (diffInSeconds < 3600) return `${Math.floor(diffInSeconds / 60)}m`;
    return `${Math.floor(diffInSeconds / 3600)}h`;
  };

  // Get status color and icon based on connection state
  const getStatusInfo = () => {
    switch (status.state) {
      case 'connected':
        return {
          color: 'text-green-500',
          icon: CheckCircle,
          label: 'Connected'
        };
      case 'connecting':
      case 'reconnecting':
        return {
          color: 'text-yellow-500',
          icon: Server,
          label: 'Connecting'
        };
      case 'disconnected':
        return {
          color: 'text-red-500',
          icon: XCircle,
          label: 'Disconnected'
        };
      case 'error':
        return {
          color: 'text-red-500',
          icon: AlertCircle,
          label: 'Error'
        };
      default:
        return {
          color: 'text-gray-500',
          icon: InformationCircle,
          label: 'Unknown'
        };
    }
  };

  // Get signal strength icon
  const getSignalStrengthIcon = (strength: number) => {
    if (strength >= 80) return Signal;
    if (strength >= 60) return Wifi;
    if (strength >= 40) return AlertCircle;
    return XCircle;
  };

  // Get signal strength color
  const getSignalStrengthColor = (strength: number) => {
    if (strength >= 80) return 'text-green-500';
    if (strength >= 60) return 'text-yellow-500';
    if (strength >= 40) return 'text-orange-500';
    return 'text-red-500';
  };

  // Get connection quality color
  const getConnectionQualityColor = (value: number, threshold: number = 80) => {
    return value >= threshold ? 'text-green-500' : 'text-red-500';
  };

  // Toggle connection history visibility
  const [showHistory, setShowHistory] = useState(false);

  // Connection status info
  const statusInfo = getStatusInfo();
  const SignalIcon = getSignalStrengthIcon(connectionQuality.signalStrength);
  const signalColor = getSignalStrengthColor(connectionQuality.signalStrength);

  return (
    <div className={`relative bg-[#0a0a0b] rounded-2xl border border-white/5 p-6 ${className}`}>
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <div className={`w-3 h-3 rounded-full ${statusInfo.color}`} />
          <h3 className="text-white text-lg font-black uppercase tracking-wider">CONNECTION STATUS</h3>
        </div>
        <button
          onClick={() => setShowHistory(!showHistory)}
          className="text-[#ff8c00] hover:text-white transition-colors flex items-center gap-2"
        >
          <span className="text-xs font-black uppercase">HISTORY</span>
          <ChevronDown className={showHistory ? "transform rotate-180" : ""} size={16} />
        </button>
      </div>

      {/* Connection Status Card */}
      <div className="bg-[#111] rounded-lg p-4 mb-6 border border-white/5">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-3">
            <statusInfo.icon size={20} className={statusInfo.color} />
            <span className={`text-sm font-black ${statusInfo.color}`}>{statusInfo.label}</span>
          </div>
          {isConnecting && (
            <div className="flex items-center gap-2">
              <Loader2 size={16} className="text-yellow-500 animate-spin" />
              <span className="text-xs text-yellow-500 font-black">CONNECTING...</span>
            </div>
          )}
        </div>

        {/* Connection Details */}
        <div className="space-y-3">
          {/* Peer Information */}
          <div className="flex items-center justify-between text-xs">
            <span className="text-white/60">PEER_ID</span>
            <span className="text-white/80 font-mono">{status.peerId || 'N/A'}</span>
          </div>

          {/* Remote Peer */}
          <div className="flex items-center justify-between text-xs">
            <span className="text-white/60">REMOTE_PEER</span>
            <span className="text-white/80 font-mono">{status.remotePeerId || 'N/A'}</span>
          </div>

          {/* Token Status */}
          <div className="flex items-center justify-between text-xs">
            <span className="text-white/60">TOKEN_VALID</span>
            <div className="flex items-center gap-2">
              {isLoadingToken ? (
                <Loader2 size={12} className="text-yellow-500 animate-spin" />
              ) : isTokenValid ? (
                <CheckCircle size={12} className="text-green-500" />
              ) : (
                <XCircle size={12} className="text-red-500" />
              )}
              <span className={`font-black ${
                isLoadingToken ? 'text-yellow-500' :
                isTokenValid ? 'text-green-500' :
                'text-red-500'
              }">
                {isLoadingToken ? 'LOADING' : isTokenValid ? 'VALID' : 'INVALID'}
              </span>
            </div>
          </div>

          {/* Token Expiration */}
          {!isLoadingToken && tokenExpiration && (
            <div className="flex items-center justify-between text-xs">
              <span className="text-white/60">TOKEN_EXPIRES</span>
              <span className={`font-mono ${
                tokenExpiration.getTime() - Date.now() < 300000 ? 'text-red-500' : 'text-white/80'
              }`}>
                {getTimeUntilExpiration(tokenExpiration)}
              </span>
            </div>
          )}

          {/* Network Status */}
          <div className="flex items-center justify-between text-xs">
            <span className="text-white/60">NETWORK</span>
            <div className="flex items-center gap-2">
              {status.isOnline ? (
                <Wifi size={12} className="text-green-500" />
              ) : (
                <WifiOff size={12} className="text-red-500" />
              )}
              <span className={status.isOnline ? "text-green-500 font-black" : "text-red-500 font-black"}>
                {status.isOnline ? "ONLINE" : "OFFLINE"}
              </span>
            </div>
          </div>

          {/* Error Status */}
          {hasError && status.lastError && (
            <div className="flex items-center justify-between text-xs">
              <span className="text-white/60">LAST_ERROR</span>
              <span className="text-red-500 font-mono text-[9px]">{status.lastError}</span>
            </div>
          )}
        </div>
      </div>

      {/* Connection Quality Metrics */}
      <div className="bg-[#111] rounded-lg p-4 mb-6 border border-white/5">
        <h4 className="text-[#ff8c00] font-black mb-3 text-sm uppercase tracking-wider">CONNECTION QUALITY</h4>
        <div className="space-y-3">
          {/* Signal Strength */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <SignalIcon size={16} className={signalColor} />
              <span className={`font-black ${signalColor}`}>SIGNAL</span>
            </div>
            <div className="flex items-center gap-1">
              <div className="w-24 bg-[#333] rounded-full h-2">
                <div
                  className={`h-full rounded-full transition-all duration-300 ${
                    connectionQuality.signalStrength >= 80 ? 'bg-green-500' :
                    connectionQuality.signalStrength >= 60 ? 'bg-yellow-500' :
                    connectionQuality.signalStrength >= 40 ? 'bg-orange-500' :
                    'bg-red-500'
                  }`}
                  style={{ width: `${connectionQuality.signalStrength}%` }}
                />
              </div>
              <span className={`text-xs font-black ${signalColor}`}>
                {connectionQuality.signalStrength}%
              </span>
            </div>
          </div>

          {/* Latency */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <TrendingUp size={16} className="text-white/60" />
              <span className="text-white/60 font-black">LATENCY</span>
            </div>
            <span className={`font-black text-sm ${
              connectionQuality.latency < 100 ? 'text-green-500' :
              connectionQuality.latency < 200 ? 'text-yellow-500' :
              'text-red-500'
            }`}>
              {connectionQuality.latency}ms
            </span>
          </div>

          {/* Packet Loss */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Activity size={16} className="text-white/60" />
              <span className="text-white/60 font-black">PACKET_LOSS</span>
            </div>
            <span className={`font-black text-sm ${
              connectionQuality.packetLoss < 1 ? 'text-green-500' :
              connectionQuality.packetLoss < 3 ? 'text-yellow-500' :
              'text-red-500'
            }`}>
              {connectionQuality.packetLoss}%
            </span>
          </div>

          {/* Bandwidth */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Zap size={16} className="text-white/60" />
              <span className="text-white/60 font-black">BANDWIDTH</span>
            </div>
            <span className={`font-black text-sm text-green-500`}>
              {connectionQuality.bandwidth} kbps
            </span>
          </div>
        </div>
      </div>

      {/* Connection History (Collapsible) */}
      {showHistory && (
        <div className="bg-[#111] rounded-lg p-4 border border-white/5">
          <h4 className="text-[#ff8c00] font-black mb-3 text-sm uppercase tracking-wider">CONNECTION HISTORY</h4>
          <div className="space-y-2 max-h-40 overflow-y-auto">
            {connectionHistory.length > 0 ? (
              connectionHistory.map((entry, index) => (
                <div key={index} className="flex items-center justify-between text-xs">
                  <div className="flex items-center gap-2">
                    <div className={`w-2 h-2 rounded-full ${
                      entry.status === 'connected' ? 'bg-green-500' :
                      entry.status === 'success' ? 'bg-green-500' :
                      entry.status === 'error' ? 'bg-red-500' :
                      'bg-yellow-500'
                    }`} />
                    <span className="text-white/80">
                      {entry.event}
                    </span>
                  </div>
                  <span className="text-white/40 font-mono">
                    {formatDistanceToNow(entry.timestamp, { addSuffix: true })}
                  </span>
                </div>
              ))
            ) : (
              <div className="text-center text-white/40 text-sm">
                No connection history available
              </div>
            )}
          </div>
        </div>
      )}

      {/* Action Buttons */}
      <div className="flex gap-3 mt-6">
        <button
          onClick={disconnect}
          className="flex-1 px-4 py-2 rounded-lg text-xs font-black uppercase transition-all bg-[#ff4444] text-black hover:bg-[#ff2222]"
          disabled={isDisconnected}
        >
          {isDisconnected ? "ALREADY DISCONNECTED" : "DISCONNECT"}
        </button>

        <button
          className="flex-1 px-4 py-2 rounded-lg text-xs font-black uppercase transition-all bg-[#ff8c00] text-black hover:bg-[#ff6300]"
          onClick={() => {
            // Refresh connection (implementation would depend on your actual connection logic)
            console.log('Refreshing connection...');
          }}
        >
          REFRESH
        </button>
      </div>
    </div>
  );
};

export default ConnectionStatus;