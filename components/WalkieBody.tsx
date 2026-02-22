// src/components/WalkieBody.tsx
"use client";
import React, { useState } from 'react';
import { useWalkieTalkie } from '@/hooks/useWalkieTalkie';
import { requestForToken } from '@/lib/firebase';
import { Signal, BatteryFull, Radio, Zap, Volume2 } from 'lucide-react';

export default function WalkieBody() {
    const [myId, setMyId] = useState('');
    const [targetId, setTargetId] = useState('');
    const [targetFcmToken, setTargetFcmToken] = useState('');
    const [mounted, setMounted] = useState(false);
    const [qrPattern, setQrPattern] = useState<boolean[]>([]);
    const [isTalking, setIsTalking] = useState(false);

    const { startTalking, stopTalking, sendPing, clearSignal, audioRef, fcmToken, isIncomingCall } = useWalkieTalkie(myId, targetId, targetFcmToken);

    React.useEffect(() => {
        setMounted(true);
        setQrPattern([...Array(9)].map(() => Math.random() > 0.5));
    }, []);

    const handleSync = async () => {
        try {
            const token = await requestForToken();
            if (token) {
                window.location.reload();
            }
        } catch (e) {
            console.error("Sync failed", e);
        }
    };

    if (!mounted) return null;

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
                        <span className="tactical-label text-[6px]!">MODE</span>
                        <div
                            className="tactical-toggle cursor-pointer hover:brightness-125 transition-all active:scale-95"
                            onClick={handleSync}
                        >
                            <div className="toggle-lever" />
                        </div>
                    </div>
                </div>

                {/* MAIN CHASSIS */}
                <div className="tactical-chassis p-8 w-[340px] h-[620px] rounded-[4rem] flex flex-col items-center border-t-[#333] border-l-[#333] border-b-black border-r-black shadow-2xl">

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
                            <button className="w-10 h-10 rounded-sm bg-[#111] border border-[#222] shadow-xl" />
                            <button className="w-10 h-10 rounded-sm bg-[#111] border border-[#222] shadow-xl" />
                        </div>
                    </div>

                    {/* COMM BUTTON */}
                    <div className="mt-8 flex flex-col items-center">
                        <div className="ptt-outer bg-linear-to-b from-[#111] to-black p-3 rounded-full shadow-2xl border border-white/5">
                            <button
                                onMouseDown={handleTalkStart}
                                onMouseUp={handleTalkEnd}
                                onTouchStart={handleTalkStart}
                                onTouchEnd={handleTalkEnd}
                                className="ptt-inner flex items-center justify-center active:scale-95 transition-all outline-none"
                            >
                                <span className="text-white/20 font-black text-[10px] tracking-[0.2em] uppercase">PUSH_COMM</span>
                            </button>
                        </div>
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