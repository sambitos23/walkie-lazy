// src/app/api/notify/route.ts
import { NextResponse } from 'next/server';
import admin from 'firebase-admin';

// Initialize Firebase Admin (Server Side)
function getFirebaseAdmin() {
    if (!admin.apps.length) {
        const projectId = process.env.FIREBASE_PROJECT_ID;
        const clientEmail = process.env.FIREBASE_CLIENT_EMAIL;
        let privateKey = process.env.FIREBASE_PRIVATE_KEY;

        if (!projectId || !clientEmail || !privateKey) {
            console.error('Firebase Admin credentials missing from environment variables');
            return null;
        }

        // Handle both literal newlines and escaped newlines (\n)
        if (privateKey.startsWith('"') && privateKey.endsWith('"')) {
            privateKey = privateKey.substring(1, privateKey.length - 1);
        }

        const formattedKey = privateKey.replace(/\\n/g, '\n');

        try {
            admin.initializeApp({
                credential: admin.credential.cert({
                    projectId,
                    clientEmail,
                    privateKey: formattedKey,
                }),
            });
            console.log('Firebase Admin initialized successfully');
        } catch (error) {
            console.error('Failed to initialize Firebase Admin:', error);
            return null;
        }
    }
    return admin;
}


export async function POST(request: Request) {
    try {
        const body = await request.json();
        const { targetToken, message } = body;

        if (!targetToken) {
            return NextResponse.json({ error: 'targetToken is required' }, { status: 400 });
        }

        const firebaseAdmin = getFirebaseAdmin();
        if (!firebaseAdmin) {
            return NextResponse.json({
                error: 'Server configuration error: Firebase Admin not initialized',
                details: 'Check server logs for missing environment variables or initialization errors.'
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
        await firebaseAdmin.messaging().send(payload);
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