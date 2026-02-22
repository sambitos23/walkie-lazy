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

    useEffect(() => {
        // Request token on mount
        requestForToken().then(setFcmToken);

        // Listen for foreground messages (Continuous)
        let unsubscribe: (() => void) | undefined;
        const setupMessaging = async () => {
            const msg = await import('@/lib/firebase').then(m => m.messaging());
            if (!msg) return;
            const { onMessage } = await import('firebase/messaging');
            unsubscribe = onMessage(msg, (payload) => {
                console.log("Transmission signal received:", payload);
                setIsIncomingCall(true);
            });
        };
        setupMessaging();

        // Initialize Peer
        if (!peerId) return;
        const newPeer = new Peer(peerId);

        newPeer.on('open', (id) => console.log('Communication link established. Peer ID:', id));

        // Listen for incoming voice streams
        newPeer.on('call', (call) => {
            console.log("Receiving incoming voice call...");
            call.answer();
            call.on('stream', (remoteStream) => {
                console.log("Voice stream attached to hardware.");
                if (audioRef.current) {
                    audioRef.current.srcObject = remoteStream;
                    audioRef.current.play().catch(e => {
                        console.error("Hardware failure: Audio playback blocked. Please click anywhere on the device.", e);
                    });
                }
            });
            call.on('close', () => {
                console.log("Remote signal lost.");
                if (audioRef.current) audioRef.current.srcObject = null;
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
        // 1. Send the Push Notification via an API route
        // ONLY if we have a valid-looking FCM token
        if (remoteFcmToken && remoteFcmToken.length > 50) {
            try {
                await fetch('/api/notify', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                    },
                    body: JSON.stringify({
                        targetToken: remoteFcmToken,
                        message: "Incoming voice from " + peerId
                    }),
                });
            } catch (error) {
                console.error("Push notification failed", error);
            }
        } else {
            console.warn("Skipping push notification: Remote FCM token is missing or invalid.");
        }

        // 2. Trigger the actual WebRTC Audio
        try {
            console.log("Activating microphone...");
            const stream = await navigator.mediaDevices.getUserMedia({ audio: true, video: false });
            streamRef.current = stream;
            if (peer && remotePeerId) {
                console.log("Initiating encrypted voice link to", remotePeerId);
                const call = peer.call(remotePeerId, stream);
                callRef.current = call;
            } else {
                console.warn("Target ID not found.");
            }
        } catch (err: any) {
            if (err.name === 'NotAllowedError') {
                alert("🔴 MIC ACCESS DENIED: Please enable microphone access in your browser settings to use the Walkie-Talkie.");
            }
            console.error("Mic access error", err);
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
                    message: `[PING] ${peerId} wants to talk!`
                }),
            });
        } catch (error) {
            console.error("Ping failed", error);
        }
    };

    const clearSignal = () => setIsIncomingCall(false);

    const stopTalking = () => {
        if (streamRef.current) {
            streamRef.current.getTracks().forEach(track => {
                track.stop();
                track.enabled = false;
            });
            streamRef.current = null;
        }
        if (callRef.current) {
            callRef.current.close();
            callRef.current = null;
        }
        if (audioRef.current) {
            audioRef.current.srcObject = null;
        }
    };

    return { startTalking, stopTalking, sendPing, clearSignal, audioRef, fcmToken, setFcmToken, isIncomingCall };
};