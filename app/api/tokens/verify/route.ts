import { NextResponse } from 'next/server';
import { getFirestore, isFirebaseReady } from '@/lib/firebaseInit';
import { validateToken } from '@/lib/tokenValidator';

export async function POST(request: Request) {
    try {
        const body = await request.json();
        const { token } = body;

        // Validate required fields
        if (!token) {
            return NextResponse.json({ error: 'token is required' }, { status: 400 });
        }

        // Validate token format
        if (token.length < 50) {
            return NextResponse.json({ error: 'Invalid token format' }, { status: 400 });
        }

        // Initialize Firebase
        if (!isFirebaseReady()) {
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

        // Validate token
        const isValid = await validateToken(token);

        if (!isValid) {
            return NextResponse.json({
                valid: false,
                message: 'Token is invalid or expired',
                timestamp: new Date().toISOString()
            }, { status: 200 });
        }

        // Get token details
        const tokenRef = firestore.collection('tokens').doc(token);
        const tokenDoc = await tokenRef.get();

        if (!tokenDoc.exists) {
            return NextResponse.json({
                valid: false,
                message: 'Token not found',
                timestamp: new Date().toISOString()
            }, { status: 200 });
        }

        const tokenData = tokenDoc.data();
        const userId = tokenData?.userId;
        const metadata = tokenData?.metadata || {};
        const createdAt = tokenData?.createdAt?.toDate().toISOString();
        const updatedAt = tokenData?.updatedAt?.toDate().toISOString();

        // Check if token is invalidated
        if (tokenData?.invalidated) {
            return NextResponse.json({
                valid: false,
                message: 'Token has been invalidated',
                invalidatedAt: tokenData?.invalidatedAt?.toDate().toISOString(),
                timestamp: new Date().toISOString()
            }, { status: 200 });
        }

        // Check token expiration (24 hours for demo)
        const tokenAge = Date.now() - new Date(createdAt).getTime();
        const expirationTime = 24 * 60 * 60 * 1000; // 24 hours

        if (tokenAge > expirationTime) {
            return NextResponse.json({
                valid: false,
                message: 'Token has expired',
                timestamp: new Date().toISOString()
            }, { status: 200 });
        }

        return NextResponse.json({
            valid: true,
            userId: userId,
            metadata: metadata,
            createdAt: createdAt,
            updatedAt: updatedAt,
            expiresIn: Math.max(0, expirationTime - tokenAge),
            timestamp: new Date().toISOString()
        }, { status: 200 });

    } catch (error: any) {
        console.error('Error validating token:', error);
        return NextResponse.json({
            error: 'Failed to validate token',
            details: error.message
        }, { status: 500 });
    }
}

export async function GET(request: Request) {
    try {
        const searchParams = new URL(request.url).searchParams;
        const token = searchParams.get('token');

        if (!token) {
            return NextResponse.json({ error: 'token query parameter is required' }, { status: 400 });
        }

        // We can manually call POST or just reimplement the logic. 
        // Using a internal function would be better but let's keep it simple.
        const body = { token };
        const mockRequest = {
            json: async () => body
        } as unknown as Request;

        return POST(mockRequest);

    } catch (error: any) {
        console.error('Error handling GET token validation:', error);
        return NextResponse.json({
            error: 'Failed to validate token',
            details: error.message
        }, { status: 500 });
    }
}