import { NextResponse } from 'next/server';
import { getMessaging, isFirebaseReady } from '@/lib/firebaseInit';

export async function POST(request: Request) {
    try {
        const body = await request.json();
        const { targetToken, message } = body;

        if (!targetToken) {
            return NextResponse.json({ error: 'targetToken is required' }, { status: 400 });
        }

        if (targetToken.length < 50) {
            return NextResponse.json({ error: 'Invalid targetToken format' }, { status: 400 });
        }

        // Initialize Firebase
        if (!isFirebaseReady()) {
            return NextResponse.json({
                error: 'Server configuration error: Firebase Admin not initialized',
                details: 'Check server logs for missing environment variables or initialization errors.'
            }, { status: 500 });
        }

        const messaging = getMessaging();
        if (!messaging) {
            return NextResponse.json({
                error: 'Server configuration error: Firebase Messaging not available',
                details: 'Check server logs for Firebase initialization errors.'
            }, { status: 500 });
        }

        const payload = {
            notification: {
                title: 'Walkie-Lazy',
                body: message || 'Incoming signal...',
            },
            token: targetToken,
        };

        console.log(`Sending notification to token: ${targetToken.substring(0, 10)}...`);
        await messaging.send(payload);
        console.log('Notification sent successfully');
        return NextResponse.json({ success: true });

    } catch (error: any) {
        console.error('Error sending notification:', error);
        return NextResponse.json({
            error: 'Failed to send notification',
            details: error.message
        }, { status: 500 });
    }
}