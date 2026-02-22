import { useEffect, useRef, useState, useCallback } from 'react';
import Peer, { MediaConnection } from 'peerjs';

export const useWalkieTalkie = (peerId: string, remotePeerId: string, remoteFcmToken: string) => {
    const [peer, setPeer] = useState<Peer | null>(null);
    const [peerConnected, setPeerConnected] = useState(false);
    const [fcmToken, setFcmToken] = useState<string | null>(null);
    const [isIncomingCall, setIsIncomingCall] = useState(false);

    const audioRef = useRef<HTMLAudioElement | null>(null);
    // Outgoing: mic stream + call
    const streamRef = useRef<MediaStream | null>(null);
    const callRef = useRef<MediaConnection | null>(null);
    // Incoming
    const incomingCallRef = useRef<MediaConnection | null>(null);
    // Track if we're currently transmitting
    const isTalkingRef = useRef(false);

    // Show browser notification + vibrate (only from FCM/sendPing)
    const showIncomingNotification = (message?: string) => {
        if (navigator.vibrate) {
            navigator.vibrate([200, 100, 200, 100, 200]);
        }
        if (typeof Notification !== 'undefined' && Notification.permission === 'granted') {
            try {
                new Notification('📡 Incoming Transmission!', {
                    body: message || 'Someone wants to talk!',
                    icon: '/web-app-manifest-192x192.png',
                    tag: 'walkie-incoming',
                    requireInteraction: true,
                });
            } catch (e) {
                console.log('Browser notification fallback:', e);
            }
        }
    };

    // Clean up any existing outgoing call + mic
    const cleanupOutgoing = useCallback(() => {
        if (streamRef.current) {
            streamRef.current.getTracks().forEach(track => {
                track.enabled = false;
                track.stop();
            });
            streamRef.current = null;
        }
        if (callRef.current) {
            try { callRef.current.close(); } catch (e) { /* ignore */ }
            callRef.current = null;
        }
        isTalkingRef.current = false;
    }, []);

    // Clean up any existing incoming call
    const cleanupIncoming = useCallback(() => {
        if (incomingCallRef.current) {
            try { incomingCallRef.current.close(); } catch (e) { /* ignore */ }
            incomingCallRef.current = null;
        }
        if (audioRef.current) {
            audioRef.current.pause();
            audioRef.current.srcObject = null;
        }
        setIsIncomingCall(false);
    }, []);

    useEffect(() => {
        // Listen for foreground FCM messages
        let unsubscribe: (() => void) | undefined;
        const setupMessaging = async () => {
            const msg = await import('@/lib/firebase').then(m => m.messaging());
            if (!msg) return;
            const { onMessage } = await import('firebase/messaging');
            unsubscribe = onMessage(msg, (payload) => {
                console.log("Transmission signal received:", payload);
                setIsIncomingCall(true);
                showIncomingNotification(payload?.notification?.body || payload?.data?.message);
            });
        };
        setupMessaging();

        // Initialize PeerJS
        if (!peerId) return;
        const newPeer = new Peer(peerId);

        newPeer.on('open', (id) => {
            console.log('PeerJS connected. ID:', id);
            setPeerConnected(true);
        });

        newPeer.on('disconnected', () => {
            console.log('PeerJS disconnected. Reconnecting...');
            setPeerConnected(false);
            try { newPeer.reconnect(); } catch (e) { /* ignore */ }
        });

        newPeer.on('error', (err) => {
            console.error('PeerJS error:', err);
        });

        // Handle incoming calls
        newPeer.on('call', (call) => {
            console.log("Incoming call from:", call.peer);

            // Clean up any previous incoming call first
            cleanupIncoming();

            setIsIncomingCall(true);
            call.answer(); // Answer without sending our mic back
            incomingCallRef.current = call;

            call.on('stream', (remoteStream) => {
                console.log("Playing incoming audio. Tracks:", remoteStream.getAudioTracks().length);
                if (audioRef.current) {
                    audioRef.current.srcObject = remoteStream;
                    audioRef.current.play().catch(e => {
                        console.error("Audio playback blocked:", e);
                    });
                }
            });

            call.on('close', () => {
                console.log("Incoming call closed.");
                if (incomingCallRef.current === call) {
                    incomingCallRef.current = null;
                    setIsIncomingCall(false);
                    if (audioRef.current) {
                        audioRef.current.pause();
                        audioRef.current.srcObject = null;
                    }
                }
            });
        });

        setPeer(newPeer);
        return () => {
            if (unsubscribe) unsubscribe();
            cleanupOutgoing();
            cleanupIncoming();
            newPeer.destroy();
            setPeer(null);
            setPeerConnected(false);
        }
    }, [peerId, cleanupOutgoing, cleanupIncoming]);

    const startTalking = async () => {
        if (!peer || !remotePeerId) {
            console.warn("Cannot transmit: set LOCAL_FREQ and TARGET_FREQ first.");
            return;
        }
        if (isTalkingRef.current) {
            console.warn("Already transmitting.");
            return;
        }

        // Clean up any previous outgoing call
        cleanupOutgoing();

        try {
            console.log("Mic ON — transmitting to", remotePeerId);
            const stream = await navigator.mediaDevices.getUserMedia({ audio: true, video: false });
            streamRef.current = stream;
            isTalkingRef.current = true;

            const call = peer.call(remotePeerId, stream);
            callRef.current = call;

            // When the remote side closes, clean up our side too
            call.on('close', () => {
                console.log("Outgoing call closed by remote.");
                cleanupOutgoing();
            });
        } catch (err: any) {
            if (err.name === 'NotAllowedError') {
                alert("🔴 MIC ACCESS DENIED: Please enable microphone access in your browser settings.");
            }
            console.error("Mic access error:", err);
            isTalkingRef.current = false;
        }
    };

    const stopTalking = () => {
        if (!isTalkingRef.current && !streamRef.current && !callRef.current) {
            return; // Nothing to stop
        }
        console.log("Mic OFF — stopping transmission.");
        cleanupOutgoing();
    };

    const sendPing = async () => {
        if (!remoteFcmToken || remoteFcmToken.length < 50) {
            console.error("Cannot ping: valid FCM token required.");
            return;
        }
        try {
            await fetch('/api/notify', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    targetToken: remoteFcmToken,
                    message: `📡 ${peerId || 'Someone'} wanted to talk with u`
                }),
            });
        } catch (error) {
            console.error("Ping failed", error);
        }
    };

    const clearSignal = () => setIsIncomingCall(false);

    return { startTalking, stopTalking, sendPing, clearSignal, audioRef, fcmToken, setFcmToken, isIncomingCall, peerConnected };
};