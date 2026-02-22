import { NextResponse } from 'next/server';
import admin from 'firebase-admin';
import { firebaseAdmin, getFirestore, getMessaging, isFirebaseReady } from '@/lib/firebaseInit';
import { validateToken } from '@/lib/tokenValidator';
import { rateLimit } from '@/lib/rateLimiter';

// Token registration endpoint
export async function POST(request: Request) {
    try {
        // Apply rate limiting
        const rateLimitResult = await rateLimit(request as any, 'token_registration');
        if (!rateLimitResult.allowed) {
            return NextResponse.json({
                error: 'Rate limit exceeded',
                retryAfter: rateLimitResult.retryAfter
            }, { status: 429 });
        }

        const body = await request.json();
        const { token, userId, metadata } = body;

        // Validate required fields
        if (!token) {
            return NextResponse.json({ error: 'token is required' }, { status: 400 });
        }

        if (!userId) {
            return NextResponse.json({ error: 'userId is required' }, { status: 400 });
        }

        // Validate token format
        if (token.length < 50) {
            return NextResponse.json({ error: 'Invalid token format' }, { status: 400 });
        }

        // Initialize Firebase
        if (!isFirebaseReady) {
            return NextResponse.json({
                error: 'Server configuration error: Firebase Admin not initialized',
                details: 'Check server logs for missing environment variables or initialization errors.'
            }, { status: 500 });
        }

        const firestore = getFirestore();
        if (!firestore) {
            return NextResponse.json({
                error: 'Server configuration error: Firestore not available',
                details: 'Check server logs for Firebase initialization errors.'
            }, { status: 500 });
        }

        // Store token in Firebase
        const tokenRef = firestore.collection('tokens').doc(token);
        const existingToken = await tokenRef.get();

        if (existingToken.exists) {
            // Update existing token with new metadata
            await tokenRef.update({
                userId,
                metadata: {
                    ...existingToken.data()?.metadata,
                    ...metadata,
                    lastUpdated: admin.firestore.FieldValue.serverTimestamp(),
                },
                updatedAt: admin.firestore.FieldValue.serverTimestamp(),
            });
        } else {
            // Create new token entry
            await tokenRef.set({
                token,
                userId,
                metadata: metadata || {},
                createdAt: admin.firestore.FieldValue.serverTimestamp(),
                updatedAt: admin.firestore.FieldValue.serverTimestamp(),
            });
        }

        console.log(`Token registered for user: ${userId}`);
        return NextResponse.json({
            success: true,
            message: 'Token registered successfully',
            tokenId: token
        });

    } catch (error: any) {
        console.error('Error registering token:', error);
        return NextResponse.json({
            error: 'Failed to register token',
            details: error.message
        }, { status: 500 });
    }
}

// Token exchange endpoint
export async function PUT(request: Request) {
    try {
        // Apply rate limiting
        const rateLimitResult = await rateLimit(request as any, 'token_exchange');
        if (!rateLimitResult.allowed) {
            return NextResponse.json({
                error: 'Rate limit exceeded',
                retryAfter: rateLimitResult.retryAfter
            }, { status: 429 });
        }

        const body = await request.json();
        const { sourceToken, targetToken, message } = body;

        // Validate required fields
        if (!sourceToken || !targetToken) {
            return NextResponse.json({ error: 'sourceToken and targetToken are required' }, { status: 400 });
        }

        if (sourceToken === targetToken) {
            return NextResponse.json({ error: 'Cannot exchange token with itself' }, { status: 400 });
        }

        // Initialize Firebase
        if (!isFirebaseReady) {
            return NextResponse.json({
                error: 'Server configuration error: Firebase Admin not initialized',
                details: 'Check server logs for missing environment variables or initialization errors.'
            }, { status: 500 });
        }

        const firestore = getFirestore();
        if (!firestore || !firebaseAdmin) {
            return NextResponse.json({
                error: 'Server configuration error: Firestore not available',
                details: 'Check server logs for Firebase initialization errors.'
            }, { status: 500 });
        }

        // Validate both tokens
        const [sourceValid, targetValid] = await Promise.all([
            validateToken(sourceToken),
            validateToken(targetToken)
        ]);

        if (!sourceValid) {
            return NextResponse.json({ error: 'Source token is invalid or expired' }, { status: 400 });
        }

        if (!targetValid) {
            return NextResponse.json({ error: 'Target token is invalid or expired' }, { status: 400 });
        }

        // Get token details
        const [sourceTokenDoc, targetTokenDoc] = await Promise.all([
            firestore.collection('tokens').doc(sourceToken).get(),
            firestore.collection('tokens').doc(targetToken).get()
        ]);

        if (!sourceTokenDoc.exists || !targetTokenDoc.exists) {
            return NextResponse.json({ error: 'One or both tokens not found' }, { status: 404 });
        }

        const sourceUserId = sourceTokenDoc.data()?.userId;
        const targetUserId = targetTokenDoc.data()?.userId;

        // Log the token exchange
        await firestore.collection('tokenExchanges').add({
            sourceToken,
            targetToken,
            sourceUserId,
            targetUserId,
            message: message || 'Token exchange',
            timestamp: admin.firestore.FieldValue.serverTimestamp(),
        });

        // Send notification to target user
        const messaging = getMessaging();
        if (messaging) {
            const payload = {
                notification: {
                    title: 'Token Exchange',
                    body: message || 'You have received a token exchange',
                },
                token: targetToken,
            };

            console.log(`Sending exchange notification to token: ${targetToken.substring(0, 10)}...`);
            await messaging.send(payload);
            console.log('Exchange notification sent successfully');
        }

        return NextResponse.json({
            success: true,
            message: 'Token exchange successful'
        });

    } catch (error: any) {
        console.error('Error exchanging tokens:', error);
        return NextResponse.json({
            error: 'Failed to exchange tokens',
            details: error.message
        }, { status: 500 });
    }
}

// Token revocation endpoint
export async function DELETE(request: Request) {
    try {
        // Apply rate limiting
        const rateLimitResult = await rateLimit(request as any, 'token_revocation');
        if (!rateLimitResult.allowed) {
            return NextResponse.json({
                error: 'Rate limit exceeded',
                retryAfter: rateLimitResult.retryAfter
            }, { status: 429 });
        }

        const body = await request.json();
        const { token } = body;

        if (!token) {
            return NextResponse.json({ error: 'token is required' }, { status: 400 });
        }

        // Initialize Firebase
        if (!isFirebaseReady) {
            return NextResponse.json({
                error: 'Server configuration error: Firebase Admin not initialized',
                details: 'Check server logs for missing environment variables or initialization errors.'
            }, { status: 500 });
        }

        const firestore = getFirestore();
        if (!firestore) {
            return NextResponse.json({
                error: 'Server configuration error: Firestore not available',
                details: 'Check server logs for Firebase initialization errors.'
            }, { status: 500 });
        }

        // Invalidate token in Firebase
        const tokenRef = firestore.collection('tokens').doc(token);
        const tokenDoc = await tokenRef.get();

        if (!tokenDoc.exists) {
            return NextResponse.json({ error: 'Token not found' }, { status: 404 });
        }

        await tokenRef.update({
            invalidated: true,
            invalidatedAt: admin.firestore.FieldValue.serverTimestamp(),
        });

        console.log(`Token invalidated: ${token}`);
        return NextResponse.json({
            success: true,
            message: 'Token invalidated successfully'
        });

    } catch (error: any) {
        console.error('Error invalidating token:', error);
        return NextResponse.json({
            error: 'Failed to invalidate token',
            details: error.message
        }, { status: 500 });
    }
}