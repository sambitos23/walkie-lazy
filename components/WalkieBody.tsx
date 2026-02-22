// src/components/WalkieBody.tsx
"use client";
import React, { useState, useEffect } from 'react';
import { useWalkieTalkie } from '@/hooks/useWalkieTalkie';
import { requestForToken, saveTokenToStorage, getTokenFromStorage, validateToken, updateToken } from '@/lib/firebase';
import { Signal, BatteryFull, Radio, Zap, Volume2, QrCode as QrCodeIcon, Link2, Check, X, RefreshCw, Wifi, AlertCircle, Loader2, TrendingUp, TrendingDown } from 'lucide-react';
import { QRCodeSVG as QrCode } from 'qrcode.react';
import RedButton from './RedButton';

export default function WalkieBody() {
    const [myId, setMyId] = useState('');
    const [targetId, setTargetId] = useState('');
    const [targetFcmToken, setTargetFcmToken] = useState('');
    const [mounted, setMounted] = useState(false);
    const [qrPattern, setQrPattern] = useState<boolean[]>([]);
    const [isTalking, setIsTalking] = useState(false);
    const [isTokenExchangeActive, setIsTokenExchangeActive] = useState(false);
    const [remoteToken, setRemoteToken] = useState<string | null>(null);
    const [connectionStatus, setConnectionStatus] = useState<'disconnected' | 'connecting' | 'connected' | 'error'>('disconnected');
    const [exchangeStatus, setExchangeStatus] = useState<'idle' | 'scanning' | 'exchanging' | 'success' | 'failed'>('idle');
    const [tokenValidation, setTokenValidation] = useState<'valid' | 'invalid' | 'unknown'>('unknown');
    const [autoExchangeEnabled, setAutoExchangeEnabled] = useState(true);
    const [showAdvancedSettings, setShowAdvancedSettings] = useState(false);
    const [tokenError, setTokenError] = useState<string | null>(null);

    const { startTalking, stopTalking, sendPing, clearSignal, audioRef, fcmToken, setFcmToken, isIncomingCall } = useWalkieTalkie(myId, targetId, targetFcmToken);

    React.useEffect(() => {
        setMounted(true);
        setQrPattern([...Array(9)].map(() => Math.random() > 0.5));

        // Initialize token from storage
        const storedToken = getTokenFromStorage();
        if (storedToken) {
            setFcmToken(storedToken);
            validateToken(storedToken).then(isValid => {
                setTokenValidation(isValid ? 'valid' : 'invalid');
            });
        }
    }, []);

    const handleSync = async () => {
        try {
            setTokenError(null);
            setExchangeStatus('exchanging');
            const token = await requestForToken();
            if (token) {
                setFcmToken(token);
                setTokenValidation('valid');
                saveTokenToStorage(token);
                setExchangeStatus('success');
                setTimeout(() => setExchangeStatus('idle'), 3000);
            } else {
                // Detect iOS to show a more helpful error
                const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
                const isStandalone = window.matchMedia('(display-mode: standalone)').matches || (window.navigator as any).standalone === true;
                if (isIOS && !isStandalone) {
                    setTokenError('iOS: ADD TO HOME SCREEN FIRST (Share → Add to Home Screen)');
                } else if (isIOS) {
                    setTokenError('iOS: REQUIRES iOS 16.4+ & NOTIFICATION PERMISSION');
                } else {
                    setTokenError('TOKEN GENERATION FAILED (Private/Incognito mode?)');
                }
                setExchangeStatus('failed');
                setTimeout(() => setExchangeStatus('idle'), 3000);
            }
        } catch (e) {
            console.error("Sync failed", e);
            setTokenError('INITIALIZATION_FAILED');
            setExchangeStatus('failed');
            setTimeout(() => setExchangeStatus('idle'), 3000);
        }
    };

    // Read remote token from URL query parameters (for QR code scanning)
    React.useEffect(() => {
        if (typeof window === 'undefined') return;
        const params = new URLSearchParams(window.location.search);
        const scannedToken = params.get('token');
        if (scannedToken && scannedToken.length > 20) {
            setRemoteToken(scannedToken);
            setTargetFcmToken(scannedToken);
            setConnectionStatus('connecting');
            setExchangeStatus('scanning');
            // Clean up URL without reloading
            window.history.replaceState({}, '', window.location.pathname);
            setTimeout(() => {
                setConnectionStatus('connected');
                setExchangeStatus('success');
                setTimeout(() => setExchangeStatus('idle'), 3000);
            }, 1500);
        }
    }, []);

    if (!mounted) return null;

    const handleTokenExchange = async () => {
        if (!remoteToken) {
            setExchangeStatus('failed');
            return;
        }

        try {
            setExchangeStatus('exchanging');
            const isValid = await validateToken(remoteToken);

            if (isValid) {
                await updateToken(remoteToken);
                setFcmToken(remoteToken);
                setTokenValidation('valid');
                setExchangeStatus('success');

                // Auto-connect if enabled
                if (autoExchangeEnabled && targetId) {
                    setConnectionStatus('connecting');
                    setTimeout(() => setConnectionStatus('connected'), 1500);
                }
            } else {
                setExchangeStatus('failed');
            }
        } catch (error) {
            console.error('Token exchange failed:', error);
            setExchangeStatus('failed');
        } finally {
            setTimeout(() => setExchangeStatus('idle'), 3000);
        }
    };

    const handleScanToken = (scannedToken: string) => {
        setRemoteToken(scannedToken);
        setExchangeStatus('scanning');

        // Auto-exchange if enabled
        if (autoExchangeEnabled) {
            handleTokenExchange();
        }
    };

    const handleDisconnect = () => {
        setRemoteToken(null);
        setConnectionStatus('disconnected');
        setExchangeStatus('idle');
        setTargetId('');
        setTargetFcmToken('');
    };

    const handleCopyToken = () => {
        if (fcmToken) {
            navigator.clipboard.writeText(fcmToken);
            setExchangeStatus('success');
            setTimeout(() => setExchangeStatus('idle'), 3000);
        }
    };

    const handleTalkStart = () => {
        clearSignal();
        setIsTalking(true);
        startTalking();
    };

    const handleTalkEnd = () => {
        setIsTalking(false);
        stopTalking();
    };

    return (
        <div className="flex flex-col items-center justify-center min-h-screen py-10 px-4 select-none">
            <audio ref={audioRef} autoPlay playsInline className="pointer-events-none invisible absolute" />

            {/* TOKEN EXCHANGE OVERLAY — Mobile-first bottom sheet */}
            {isTokenExchangeActive && (
                <div className="fixed inset-0 z-50 flex flex-col">
                    {/* Backdrop — tap to close */}
                    <div
                        className="absolute inset-0 bg-black/80 backdrop-blur-sm"
                        onClick={() => setIsTokenExchangeActive(false)}
                    />

                    {/* Sheet container */}
                    <div className="relative mt-auto w-full max-w-lg mx-auto max-h-[90dvh] flex flex-col bg-[#111] rounded-t-3xl border-t border-x border-white/10 shadow-2xl animate-[slideUp_0.3s_ease-out]"
                        style={{ paddingBottom: 'env(safe-area-inset-bottom, 16px)' }}
                    >
                        {/* Drag handle + sticky header */}
                        <div className="sticky top-0 z-10 bg-[#111] rounded-t-3xl px-5 pt-3 pb-4 border-b border-white/5">
                            <div className="w-10 h-1 bg-white/20 rounded-full mx-auto mb-4" />
                            <div className="flex justify-between items-center">
                                <h3 className="text-white text-lg font-black uppercase tracking-wider">TOKEN EXCHANGE</h3>
                                <button
                                    onClick={() => setIsTokenExchangeActive(false)}
                                    className="w-9 h-9 flex items-center justify-center rounded-full bg-white/10 active:bg-white/20 transition-colors"
                                >
                                    <X size={18} className="text-white" />
                                </button>
                            </div>
                        </div>

                        {/* Scrollable content */}
                        <div className="flex-1 overflow-y-auto overscroll-contain px-5 py-4 space-y-4">
                            {/* MY TOKEN */}
                            <div className="bg-[#0a0a0b] p-4 rounded-xl border border-white/5">
                                <h4 className="text-[#ff8c00] font-black text-xs mb-2">MY TOKEN</h4>
                                <p className={`text-[10px] font-mono break-all p-3 rounded-lg mb-3 ${tokenError ? 'bg-red-500/10 text-red-400 border border-red-500/20' : 'bg-[#1a1a1a] text-white/80'}`}>
                                    {fcmToken || tokenError || (exchangeStatus === 'exchanging' ? 'SYNCING...' : 'TAP REFRESH TO GENERATE')}
                                </p>
                                <div className="flex gap-2">
                                    <button
                                        onClick={handleSync}
                                        className={`flex-1 px-3 py-3 rounded-xl text-xs font-black uppercase transition-all ${exchangeStatus === 'exchanging'
                                            ? 'bg-[#444] text-white/40 cursor-not-allowed'
                                            : 'bg-[#ff8c00] text-black active:bg-[#ff6300]'
                                            }`}
                                        disabled={exchangeStatus === 'exchanging'}
                                    >
                                        {exchangeStatus === 'exchanging' ? 'GENERATING...' : 'REFRESH TOKEN'}
                                    </button>
                                    <button
                                        onClick={handleCopyToken}
                                        className={`px-4 py-3 rounded-xl text-xs font-black uppercase transition-all ${exchangeStatus === 'success'
                                            ? 'bg-green-500 text-black'
                                            : 'bg-white/10 text-white active:bg-white/20'
                                            }`}
                                    >
                                        {exchangeStatus === 'success' ? '✓' : 'COPY'}
                                    </button>
                                </div>
                            </div>

                            {/* REMOTE TOKEN */}
                            <div className="bg-[#0a0a0b] p-4 rounded-xl border border-white/5">
                                <h4 className="text-[#ff8c00] font-black text-xs mb-2">REMOTE TOKEN</h4>
                                <div className="relative mb-3">
                                    <input
                                        value={remoteToken || ''}
                                        onChange={(e) => setRemoteToken(e.target.value)}
                                        placeholder="PASTE REMOTE TOKEN HERE"
                                        className="w-full bg-[#1a1a1a] border border-white/10 p-3 rounded-xl text-[10px] text-white focus:border-[#ff8c00] outline-none transition-all font-mono"
                                    />
                                    {exchangeStatus === 'scanning' && (
                                        <div className="absolute top-0 right-0 h-full flex items-center px-3 text-[#ff8c00]">
                                            <Loader2 size={18} className="animate-spin" />
                                        </div>
                                    )}
                                </div>
                                <button
                                    onClick={handleTokenExchange}
                                    className={`w-full px-3 py-3 rounded-xl text-xs font-black uppercase transition-all ${exchangeStatus === 'exchanging'
                                        ? 'bg-[#444] text-white/40 cursor-not-allowed'
                                        : 'bg-[#ff8c00] text-black active:bg-[#ff6300]'
                                        }`}
                                    disabled={exchangeStatus === 'exchanging'}
                                >
                                    {exchangeStatus === 'exchanging' ? 'EXCHANGING...' : 'EXCHANGE TOKEN'}
                                </button>
                            </div>

                            {/* QR CODE */}
                            <div className="bg-[#0a0a0b] p-4 rounded-xl border border-white/5">
                                <h4 className="text-[#ff8c00] font-black text-xs mb-2">QR CODE</h4>
                                <div className="text-center">
                                    {fcmToken ? (
                                        <>
                                            <QrCode
                                                value={`${typeof window !== 'undefined' ? window.location.origin : 'https://walkie-lazy.vercel.app'}/?token=${encodeURIComponent(fcmToken)}`}
                                                size={180}
                                                bgColor="#0a0a0b"
                                                fgColor="#ff8c00"
                                                level="L"
                                                className="mx-auto mb-2"
                                            />
                                            <p className="text-[9px] text-green-500 font-mono">
                                                ✅ SCAN ON ANOTHER DEVICE TO CONNECT
                                            </p>
                                        </>
                                    ) : (
                                        <div className="w-[180px] h-[180px] mx-auto mb-2 bg-[#1a1a1a] rounded-xl flex items-center justify-center border border-white/5">
                                            <p className="text-white/20 text-[10px] font-black uppercase">GENERATE TOKEN FIRST</p>
                                        </div>
                                    )}
                                </div>
                            </div>

                            {/* CONNECTION STATUS — compact */}
                            <div className="bg-[#0a0a0b] p-4 rounded-xl border border-white/5">
                                <h4 className="text-[#ff8c00] font-black text-xs mb-2">STATUS</h4>
                                <div className="flex items-center justify-between gap-4">
                                    <div className="flex items-center gap-2">
                                        <div className={`w-2.5 h-2.5 rounded-full ${connectionStatus === 'connected' ? 'bg-green-500' :
                                            connectionStatus === 'connecting' ? 'bg-[#ff8c00] animate-pulse' :
                                                'bg-red-500'
                                            }`} />
                                        <span className="text-[10px] text-white/60 font-mono">{connectionStatus.toUpperCase()}</span>
                                    </div>
                                    <div className="flex items-center gap-2">
                                        <span className="text-[10px] text-white/40">TOKEN:</span>
                                        <span className={`text-[10px] font-black ${tokenValidation === 'valid' ? 'text-green-500' : tokenValidation === 'invalid' ? 'text-red-500' : 'text-white/40'}`}>
                                            {tokenValidation.toUpperCase()}
                                        </span>
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Sticky bottom actions */}
                        <div className="sticky bottom-0 bg-[#111] border-t border-white/5 px-5 pt-3 pb-4 flex gap-3">
                            <button
                                onClick={handleDisconnect}
                                className="flex-1 px-3 py-3.5 rounded-xl text-xs font-black uppercase bg-red-500/10 text-red-400 border border-red-500/20 active:bg-red-500/20 transition-all"
                            >
                                DISCONNECT
                            </button>
                            <button
                                onClick={() => setIsTokenExchangeActive(false)}
                                className="flex-1 px-3 py-3.5 rounded-xl text-xs font-black uppercase bg-white/10 text-white active:bg-white/20 transition-all"
                            >
                                CLOSE
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* TOP CONFIGURATION PANEL */}
            <div className="mb-12 w-full max-w-sm space-y-4 bg-black/40 p-6 rounded-2xl border border-white/5 backdrop-blur-xl shadow-2xl">
                <div className="flex gap-3">
                    <div className="flex-1">
                        <label className="tactical-label block mb-1 text-white/50">LOCAL_FREQ</label>
                        <input
                            placeholder="SET ID"
                            value={myId}
                            onChange={(e) => setMyId(e.target.value)}
                            className="w-full bg-black/60 border border-[#333] p-3 rounded-lg text-xs text-white focus:border-[#ff8c00] outline-none transition-all uppercase font-mono tracking-wider"
                        />
                    </div>
                    <div className="flex-1">
                        <label className="tactical-label block mb-1 text-white/50">TARGET_FREQ</label>
                        <input
                            placeholder="REMOTE ID"
                            value={targetId}
                            onChange={(e) => setTargetId(e.target.value)}
                            className="w-full bg-black/60 border border-[#333] p-3 rounded-lg text-xs text-white focus:border-[#ff8c00] outline-none transition-all uppercase font-mono tracking-wider"
                        />
                    </div>
                </div>
                <div>
                    <label className="tactical-label block mb-1 text-white/50">ENCRYPTION_KEY (FCM)</label>
                    <input
                        placeholder="PASTE REMOTE TOKEN"
                        value={targetFcmToken}
                        onChange={(e) => setTargetFcmToken(e.target.value)}
                        className="w-full bg-black/60 border border-[#333] p-3 rounded-lg text-[10px] text-white focus:border-[#ff8c00] outline-none transition-all font-mono"
                    />
                </div>
                <div className="flex items-center justify-between">
                    <label className="tactical-label text-white/50">ADVANCED SETTINGS</label>
                    <button
                        onClick={() => setShowAdvancedSettings(!showAdvancedSettings)}
                        className="text-[#ff8c00] hover:text-white transition-colors"
                    >
                        <div className={`w-3 h-3 rounded-full ${showAdvancedSettings ? 'bg-green-500' : 'bg-[#666]'}`} />
                    </button>
                </div>
                {showAdvancedSettings && (
                    <div className="bg-[#0a0a0b] p-4 rounded-lg border border-white/5">
                        <h4 className="text-[#ff8c00] font-black mb-2">ADVANCED SETTINGS</h4>
                        <div className="space-y-3">
                            <div className="flex items-center justify-between">
                                <span className="text-[10px] text-white/80">AUTO-EXCHANGE</span>
                                <button
                                    onClick={() => setAutoExchangeEnabled(!autoExchangeEnabled)}
                                    className={`px-3 py-1 rounded text-xs font-black uppercase transition-all ${autoExchangeEnabled
                                        ? 'bg-green-500 text-black hover:bg-green-400'
                                        : 'bg-[#666] text-white/60 hover:bg-[#444]'
                                        }`}
                                >
                                    {autoExchangeEnabled ? 'ENABLED' : 'DISABLED'}
                                </button>
                            </div>
                            <div className="flex items-center justify-between">
                                <span className="text-[10px] text-white/80">TOKEN VALID</span>
                                <span className={`text-[10px] ${tokenValidation === 'valid' ? 'text-green-500' : tokenValidation === 'invalid' ? 'text-[#ff4444]' : 'text-white/60'}`}>
                                    {tokenValidation.toUpperCase()}
                                </span>
                            </div>
                            <button
                                onClick={() => setIsTokenExchangeActive(true)}
                                className="w-full px-3 py-2 rounded-lg text-xs font-black uppercase bg-[#ff8c00] text-black hover:bg-[#ff6300]"
                            >
                                OPEN TOKEN EXCHANGE
                            </button>
                        </div>
                    </div>
                )}
                {fcmToken && (
                    <div className="bg-[#ff8c00]/5 border border-[#ff8c00]/20 p-3 rounded-lg">
                        <span className="tactical-label block mb-1 text-green-500!">MY_BROADCAST_TOKEN:</span>
                        <p className="text-[9px] text-green-500/80 break-all font-mono leading-relaxed select-text cursor-copy" onClick={() => { navigator.clipboard.writeText(fcmToken); alert("Token Copied!"); }}>{fcmToken}</p>
                    </div>
                )}
            </div>

            {/* THE DEVICE CONTAINER */}
            <div className="relative group perspective-1000">

                {/* COILED CABLE */}
                <div className="absolute top-24 -left-12 flex flex-col items-center">
                    <div className="w-4 h-6 bg-[#111] rounded-t-sm border border-[#222]" />
                    <div className="w-2 h-40 bg-[#111] rounded-b-full shadow-2xl blur-[1px] opacity-80" />
                </div>

                {/* ANTENNA */}
                <div className="absolute -top-24 left-16 w-4 h-28">
                    <div className="w-full h-full bg-linear-to-b from-[#050506] via-[#1a1a1c] to-[#333] rounded-t-full border-r border-white/5 shadow-2xl relative">
                        <div className="absolute top-4 left-1/2 -translate-x-1/2 w-1 h-20 bg-white/5 rounded-full" />
                    </div>
                </div>
                <div className="absolute -top-6 left-12 w-12 h-6 bg-[#0a0a0b] rounded-t-md border border-[#222]" />

                {/* TOP CONTROLS */}
                <div className="absolute -top-10 right-12 flex items-end gap-6">
                    <div className="flex flex-col items-center gap-1">
                        <span className="tactical-label text-[6px]!">PWR/VOL</span>
                        <div className="tactical-knob flex items-center justify-center scale-110">
                            <div className="w-1 h-3 bg-[#ff8c00] rounded-full absolute -top-1" />
                        </div>
                    </div>
                    <div className="flex flex-col items-center gap-1 mb-1">
                        <span className="tactical-label text-[6px]! text-[#ff8c00]! animate-pulse">MODE (SYNC)</span>
                        <div
                            className="tactical-toggle cursor-pointer hover:brightness-125 transition-all active:scale-95"
                            onClick={handleSync}
                        >
                            <div className="toggle-lever" />
                        </div>
                    </div>
                </div>

                {/* MAIN CHASSIS */}
                <div className="tactical-chassis p-8 w-[340px] h-full rounded-[4rem] flex flex-col items-center border-t-[#333] border-l-[#333] border-b-black border-r-black shadow-2xl">

                    {/* HARDWARE SCREWS */}
                    <div className="absolute top-8 left-8 screw" />
                    <div className="absolute top-8 right-8 screw" />
                    <div className="absolute bottom-12 left-8 screw" />
                    <div className="absolute bottom-12 right-8 screw" />

                    {/* BRANDING */}
                    <div className="w-full flex justify-between items-start mb-8">
                        <div className="flex flex-col gap-0.5">
                            <div className="flex items-center gap-2">
                                <Zap size={10} className="text-[#ff8c00] fill-[#ff8c00]" />
                                <span className="text-[10px] font-black tracking-[0.3em] text-[#444] leading-none uppercase">WAKY-TOKY</span>
                            </div>
                            <span className="tactical-label text-[9px]! leading-none! text-white/20">TACTICAL_COMMS_v4.2</span>
                        </div>
                        <div className="flex gap-3">
                            <div className="flex flex-col gap-1.5 items-center">
                                <div className={`status-led ${isTalking ? 'led-orange led-blink' : ''}`} />
                                <span className="tactical-label text-[5px]!">TX</span>
                            </div>
                            <div className="flex flex-col gap-1.5 items-center">
                                <div className={`status-led ${isIncomingCall ? 'led-green led-blink' : 'led-green opacity-30'}`} />
                                <span className="tactical-label text-[5px]!">RX</span>
                            </div>
                            {/* TOKEN CONNECTION INDICATOR */}
                            <div className="flex flex-col gap-1.5 items-center">
                                {connectionStatus === 'disconnected' && (
                                    <div className="status-led led-red" />
                                )}
                                {connectionStatus === 'connecting' && (
                                    <div className="status-led led-orange led-blink" />
                                )}
                                {connectionStatus === 'connected' && (
                                    <div className="status-led led-green" />
                                )}
                                <span className="tactical-label text-[5px]!">LINK</span>
                            </div>
                        </div>
                    </div>

                    {/* SCREEN */}
                    <div className="w-full relative px-2 mb-10 cursor-pointer active:brightness-150 transition-all" onClick={clearSignal}>
                        <div className="absolute -inset-1 bg-black rounded-2xl shadow-2xl border border-white/5 pointer-events-none" />
                        <div className="tactical-screen w-full h-[180px] rounded-xl p-5 flex flex-col justify-between relative z-10 overflow-hidden">
                            <div className="flex justify-between items-start">
                                <div className="flex flex-col gap-1">
                                    <div className="flex items-center gap-1.5">
                                        <Signal size={14} className="text-[#ffaa00]" />
                                        <span className="text-[10px] font-black text-[#ffaa00] tracking-tighter">SIG_STRENGTH: {isTalking ? '100%' : '98%'}</span>
                                    </div>
                                    <Volume2 size={12} className="text-[#ffaa00]/60" />
                                </div>
                                <BatteryFull size={18} className="text-[#ffaa00] opacity-80" />
                            </div>

                            <div className="flex flex-col items-center justify-center py-2">
                                {isIncomingCall ? (
                                    <div className="animate-pulse flex flex-col items-center">
                                        <span className="text-[12px] text-[#ff4444] font-black mb-1 bg-[#ff4444]/10 px-2 py-0.5 rounded border border-[#ff4444]/20 tracking-tighter uppercase">! SIGNAL DETECTED !</span>
                                        <h2 className="screen-text text-3xl font-black uppercase tracking-tighter">CALLING...</h2>
                                    </div>
                                ) : (
                                    <div className="flex flex-col items-center">
                                        <span className="text-[11px] opacity-40 font-mono mb-1 tracking-widest uppercase">CHAN: {targetId || "SCANNING..."}</span>
                                        <h2 className="screen-text text-5xl font-black italic tracking-tighter uppercase">
                                            {isTalking ? "ACTIVE" : "READY"}
                                        </h2>
                                    </div>
                                )}
                            </div>

                            <div className="flex justify-between items-end">
                                <div className="flex flex-col">
                                    <span className="text-[9px] font-mono text-[#ffaa00] font-bold">144.390 MHz</span>
                                    <span className="text-[7px] font-mono text-[#ffaa00]/40">NARROW_BAND_FM</span>
                                </div>
                                <div className="flex gap-1.5 h-6 items-end">
                                    {[2, 4, 3, 5, 4, 6].map((h, i) => (
                                        <div key={i} className={`w-1.5 bg-[#ffaa00] transition-all duration-300 ${isTalking ? 'opacity-100' : 'opacity-20'}`} style={{ height: isTalking ? `${h * 4}px` : '4px' }} />
                                    ))}
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* ID PLATES */}
                    <div className="w-full flex-1 flex flex-col px-4 gap-4">
                        <div className="grid grid-cols-2 gap-3">
                            <div className="h-28 bg-[#0a0a0b] rounded-xl border border-white/5 border-t-[#333] flex flex-col items-center justify-center p-3 shadow-inner">
                                <span className="tactical-label mb-2 opacity-40">STATION_ID</span>
                                <div className="w-full h-14 bg-[#ff8c00] rounded-md flex items-center justify-center">
                                    <span className="text-black font-black text-lg uppercase tracking-tighter">{myId || "00"}</span>
                                </div>
                            </div>
                            <div className="h-28 bg-[#0a0a0b] rounded-xl p-3 border border-white/5 border-t-[#333] flex items-center justify-center overflow-hidden">
                                <div className="grid grid-cols-3 gap-1.5 opacity-40">
                                    {qrPattern.map((active, i) => (
                                        <div key={i} className={`w-3 h-3 bg-[#ff8c00] ${active ? 'opacity-100' : 'opacity-0'}`} />
                                    ))}
                                </div>
                            </div>
                        </div>

                        {/* PING BUTTONS */}
                        <div className="flex justify-between px-2">
                            <button
                                onClick={sendPing}
                                className="w-10 h-10 rounded-sm bg-[#111] border border-[#222] shadow-xl flex items-center justify-center active:bg-[#ff8c00] active:text-black transition-all group"
                                title="Send Signal"
                            >
                                <Radio size={18} className="text-white/20 group-active:text-black" />
                            </button>
                            <button
                                onClick={() => setIsTokenExchangeActive(true)}
                                className="w-10 h-10 rounded-sm bg-[#111] border border-[#222] shadow-xl flex items-center justify-center active:bg-[#ff8c00] active:text-black transition-all group"
                                title="Token Exchange"
                            >
                                <Link2 size={18} className="text-white/20 group-active:text-black" />
                            </button>
                            <button
                                onClick={handleDisconnect}
                                className="w-10 h-10 rounded-sm bg-[#111] border border-[#222] shadow-xl flex items-center justify-center active:bg-[#ff4444] active:text-black transition-all group"
                                title="Disconnect"
                            >
                                <X size={18} className="text-white/20 group-active:text-black" />
                            </button>
                        </div>
                    </div>

                    {/* ENHANCED COMM BUTTON */}
                    <div className="mt-8 flex flex-col items-center">
                        <RedButton
                            isTalking={isTalking}
                            isConnected={connectionStatus === 'connected'}
                            isConnecting={connectionStatus === 'connecting'}
                            isTokenValid={tokenValidation === 'valid'}
                            onTalkStart={handleTalkStart}
                            onTalkEnd={handleTalkEnd}
                            onSync={handleSync}
                            onDisconnect={handleDisconnect}
                            isIncomingCall={isIncomingCall}
                            fcmToken={fcmToken}
                            targetId={targetId}
                            targetFcmToken={targetFcmToken}
                        />
                    </div>
                </div>

                {/* SIDE BOLSTERS */}
                <div className="absolute top-1/2 -left-4 -translate-y-1/2 flex flex-col gap-3">
                    {[...Array(6)].map((_, i) => (
                        <div key={i} className="w-5 h-12 bg-[#1a1a1c] border border-[#2a2a2c] shadow-2xl" />
                    ))}
                </div>
            </div>
        </div>
    );
}