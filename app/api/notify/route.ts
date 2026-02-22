// src/app/api/notify/route.ts
import { NextResponse } from 'next/server';
import admin from 'firebase-admin';

// Initialize Firebase Admin (Server Side)
if (!admin.apps.length) {
    admin.initializeApp({
        credential: admin.credential.cert({
            projectId: process.env.FIREBASE_PROJECT_ID,
            clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
            privateKey: process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n'),
        }),
    });
}

export async function POST(request: Request) {
    const { targetToken, message } = await request.json();

    const payload = {
        notification: {
            title: 'Walkie-Lazy',
            body: message,
        },
        token: targetToken, // You get this token when the user clicks "Allow Notifications"
    };

    await admin.messaging().send(payload);
    return NextResponse.json({ success: true });
}