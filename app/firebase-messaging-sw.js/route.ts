import { NextResponse } from 'next/server';
import { getServiceWorkerScript } from '@/lib/firebase-messaging-sw';

export async function GET() {
    const script = getServiceWorkerScript({
        apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
        projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
        messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
        appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID
    });

    return new NextResponse(script, {
        headers: {
            'Content-Type': 'application/javascript; charset=utf-8',
            'Cache-Control': 'no-cache, no-store, must-revalidate',
            'Service-Worker-Allowed': '/'
        },
    });
}
