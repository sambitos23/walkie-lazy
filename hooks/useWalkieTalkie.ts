import { useEffect, useRef, useState } from 'react';
import Peer, { MediaConnection } from 'peerjs';
import { requestForToken } from '@/lib/firebase';

export const useWalkieTalkie = (peerId: string, remotePeerId: string, remoteFcmToken: string) => {
    const [peer, setPeer] = useState<Peer | null>(null);
    const [fcmToken, setFcmToken] = useState<string | null>(null);

    const [isIncomingCall, setIsIncomingCall] = useState(false);
    const audioRef = useRef<HTMLAudioElement | null>(null);
    const streamRef = useRef<MediaStream | null>(null);
    const callRef = useRef<MediaConnection | null>(null);
    const incomingCallRef = useRef<MediaConnection | null>(null);

    // Show browser notification + vibrate when incoming signal arrives
    const showIncomingNotification = (message?: string) => {
        // Vibrate the device (mobile)
        if (navigator.vibrate) {
            navigator.vibrate([200, 100, 200, 100, 200]);
        }

        // Show browser notification if permission is granted
        if (typeof Notification !== 'undefined' && Notification.permission === 'granted') {
            try {
                new Notification('📡 Incoming Transmission!', {
                    body: message || 'Someone wants to talk!',
                    icon: '/web-app-manifest-192x192.png',
                    tag: 'walkie-incoming',
                    requireInteraction: true,
                });
            } catch (e) {
                // SW notifications may not work in all contexts
                console.log('Browser notification fallback:', e);
            }
        }
    };

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

        // Initialize Peer
        if (!peerId) return;
        const newPeer = new Peer(peerId);

        newPeer.on('open', (id) => console.log('Communication link established. Peer ID:', id));

        // Listen for incoming voice streams — silently answer and play audio
        newPeer.on('call', (call) => {
            console.log("Incoming voice call detected.");
            setIsIncomingCall(true);

            // Answer to receive the audio stream
            call.answer();
            incomingCallRef.current = call;

            call.on('stream', (remoteStream) => {
                console.log("Remote audio stream connected.");
                // Play the incoming audio — the sender controls when they transmit
                if (audioRef.current) {
                    audioRef.current.srcObject = remoteStream;
                    audioRef.current.play().catch(e => {
                        console.error("Audio playback blocked:", e);
                    });
                }
            });

            call.on('close', () => {
                console.log("Remote signal ended.");
                incomingCallRef.current = null;
                setIsIncomingCall(false);
                if (audioRef.current) {
                    audioRef.current.srcObject = null;
                }
            });
        });

        setPeer(newPeer);
        return () => {
            if (unsubscribe) unsubscribe();
            newPeer.destroy();
            setPeer(null);
        }
    }, [peerId]);

    const startTalking = async () => {
        // Capture mic and send stream via WebRTC (no notification — use ping for that)
        try {
            console.log("Activating microphone...");
            const stream = await navigator.mediaDevices.getUserMedia({ audio: true, video: false });
            streamRef.current = stream;
            if (peer && remotePeerId) {
                console.log("Transmitting to", remotePeerId);
                const call = peer.call(remotePeerId, stream);
                callRef.current = call;
            } else {
                console.warn("Target ID not set. Cannot transmit.");
            }
        } catch (err: any) {
            if (err.name === 'NotAllowedError') {
                alert("🔴 MIC ACCESS DENIED: Please enable microphone access in your browser settings.");
            }
            console.error("Mic access error", err);
        }
    };

    const stopTalking = () => {
        // Stop outgoing mic stream (this is the PTT release)
        if (streamRef.current) {
            streamRef.current.getTracks().forEach(track => {
                track.stop();
                track.enabled = false;
            });
            streamRef.current = null;
        }
        // Close the outgoing call connection
        if (callRef.current) {
            callRef.current.close();
            callRef.current = null;
        }
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
                    message: `${peerId || 'Someone'} wanted to talk with u`
                }),
            });
            showIncomingNotification(`${peerId || 'Someone'} wanted to talk with u`);
        } catch (error) {
            console.error("Ping failed", error);
        }
    };

    const clearSignal = () => setIsIncomingCall(false);

    return { startTalking, stopTalking, sendPing, clearSignal, audioRef, fcmToken, setFcmToken, isIncomingCall };
};