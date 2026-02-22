import React, { useRef, useEffect } from 'react';
import { Mic, MicOff, Wifi, WifiOff, AlertTriangle, RefreshCw, PowerOff } from 'lucide-react';

interface RedButtonProps {
    isTalking: boolean;
    isConnected: boolean;
    isConnecting: boolean;
    isTokenValid: boolean;
    onTalkStart: () => void;
    onTalkEnd: () => void;
    onSync: () => void;
    onDisconnect: () => void;
    isIncomingCall?: boolean;
    fcmToken?: string | null;
    targetId?: string;
    targetFcmToken?: string;
}

const RedButton: React.FC<RedButtonProps> = ({
    isTalking,
    isConnected,
    isConnecting,
    isTokenValid,
    onTalkStart,
    onTalkEnd,
    onSync,
    onDisconnect,
    isIncomingCall = false,
    fcmToken,
    targetId,
    targetFcmToken,
}) => {
    const handleMouseDown = () => {
        if (isConnected && isTokenValid) {
            onTalkStart();
        }
    };

    const handleMouseUp = () => {
        if (isTalking) {
            onTalkEnd();
        }
    };

    // Also handle touch events for mobile
    const handleTouchStart = (e: React.TouchEvent) => {
        e.preventDefault();
        handleMouseDown();
    };

    const handleTouchEnd = (e: React.TouchEvent) => {
        e.preventDefault();
        handleMouseUp();
    };

    return (
        <div className="flex flex-col items-center gap-6">
            <div className="flex flex-col items-center gap-2">
                <div className="ptt-outer relative">
                    {/* Ring glow for active states */}
                    {isTalking && (
                        <div className="absolute inset-0 rounded-full animate-ping bg-red-500/20" />
                    )}
                    {isIncomingCall && (
                        <div className="absolute inset-0 rounded-full animate-pulse bg-green-500/30" />
                    )}

                    <button
                        onMouseDown={handleMouseDown}
                        onMouseUp={handleMouseUp}
                        onMouseLeave={handleMouseUp}
                        onTouchStart={handleTouchStart}
                        onTouchEnd={handleTouchEnd}
                        className={`ptt-inner flex items-center justify-center transition-all duration-75 relative z-10 
                            ${!isConnected || !isTokenValid ? 'opacity-50 cursor-not-allowed grayscale' : 'cursor-pointer active:scale-95'}
                            ${isTalking ? 'brightness-125 scale-95 shadow-inner' : ''}
                            ${isIncomingCall ? 'ring-4 ring-green-500/50 animate-bounce' : ''}
                        `}
                        disabled={!isConnected || !isTokenValid}
                    >
                        {isTalking ? (
                            <Mic size={32} className="text-white animate-pulse" />
                        ) : isIncomingCall ? (
                            <Wifi size={32} className="text-white" />
                        ) : (
                            <MicOff size={32} className="text-white/40" />
                        )}

                        {/* Status Label on Button */}
                        <div className="absolute -bottom-10 left-1/2 -translate-x-1/2 whitespace-nowrap">
                            <span className={`tactical-label text-[10px] ${isTalking ? 'text-red-500' : isIncomingCall ? 'text-green-500' : 'text-white/40'}`}>
                                {isTalking ? 'TRANSMITTING' : isIncomingCall ? 'INCOMING' : 'PUSH TO TALK'}
                            </span>
                        </div>
                    </button>
                </div>
            </div>

            {/* Sub-controls / Status Indicators */}
            <div className="grid grid-cols-2 gap-4 w-full max-w-[200px] mt-4">
                <div className="flex flex-col items-center gap-1">
                    <span className="tactical-label text-[6px]">CONN_STAT</span>
                    <div className={`p-2 rounded bg-[#111] border border-white/5 w-full flex items-center justify-center transition-colors
                        ${isConnected ? 'text-green-500 border-green-500/20' : isConnecting ? 'text-orange-500 border-orange-500/20' : 'text-red-500 border-red-500/20'}
                    `}>
                        {isConnected ? <Wifi size={14} /> : isConnecting ? <RefreshCw size={14} className="animate-spin" /> : <WifiOff size={14} />}
                    </div>
                </div>

                <div className="flex flex-col items-center gap-1">
                    <span className="tactical-label text-[6px]">TOKEN_VALID</span>
                    <div className={`p-2 rounded bg-[#111] border border-white/5 w-full flex items-center justify-center transition-colors
                        ${isTokenValid ? 'text-green-500 border-green-500/20' : 'text-red-500 border-red-500/20'}
                    `}>
                        {isTokenValid ? <Wifi size={14} /> : <AlertTriangle size={14} />}
                    </div>
                </div>
            </div>

            {/* Action Buttons */}
            <div className="flex gap-4">
                <button
                    onClick={onSync}
                    className="flex flex-col items-center gap-1 group"
                >
                    <div className="w-10 h-10 rounded bg-[#111] border border-[#222] flex items-center justify-center group-active:translate-y-0.5 transition-all text-orange-500 hover:border-orange-500/50">
                        <RefreshCw size={16} className={isConnecting ? "animate-spin" : ""} />
                    </div>
                    <span className="tactical-label text-[5px]">SYNC</span>
                </button>

                <button
                    onClick={onDisconnect}
                    className="flex flex-col items-center gap-1 group"
                >
                    <div className="w-10 h-10 rounded bg-[#111] border border-[#222] flex items-center justify-center group-active:translate-y-0.5 transition-all text-red-500 hover:border-red-500/50">
                        <PowerOff size={16} />
                    </div>
                    <span className="tactical-label text-[5px]">KILL</span>
                </button>
            </div>
        </div>
    );
};

export default RedButton;
