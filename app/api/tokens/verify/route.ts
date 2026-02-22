import { firebaseAdmin, getFirestore, getMessaging, isFirebaseReady } from '../../lib/firebaseInit';

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
        const { token } = body;

        // Validate required fields
        if (!token) {
            return NextResponse.json({ error: 'token is required' }, { status: 400 });
        }

        // Validate token format
        if (token.length < 50) {
            return NextResponse.json({ error: 'Invalid token format' }, { status: 400 });
        }

        const firebaseAdmin = getFirebaseAdmin();
        // Initialize Firebase
        if (!isFirebaseReady()) {
            const firebaseAdmin = getFirebaseAdmin();
            if (!firebaseAdmin) {
                return NextResponse.json({
                    error: 'Server configuration error: Firebase Admin not initialized',
                    details: 'Check server logs for missing environment variables or initialization errors.'
                }, { status: 500 });
            }
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

        // For GET requests, we'll still use the same validation logic
        const response = await POST(request);
        return response;

    } catch (error: any) {
        console.error('Error handling GET token validation:', error);
        return NextResponse.json({
            error: 'Failed to validate token',
            details: error.message
        }, { status: 500 });
    }
}