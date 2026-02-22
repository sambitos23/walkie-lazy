import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { NextResponse } from 'next/server';
import { app } from 'next/test';
import { firebaseAdmin, getFirestore, initializeFirebase } from '../lib/firebaseInit';

describe('Token API Endpoints', () => {
    let testToken = 'test-token-123456789';
    let testUserId = 'test-user-001';
    let testMetadata = { role: 'admin', source: 'test' };

    beforeAll(async () => {
        // Initialize Firebase
        await initializeFirebase();

        // Clear existing test tokens
        const firestore = getFirestore();
        if (firestore) {
            try {
                await firestore.collection('tokens').doc(testToken).delete();
            } catch (error) {
                console.log('No existing test token to delete');
            }
        }
    });

    afterAll(async () => {
        // Clean up test token
        const firestore = getFirestore();
        if (firestore) {
            try {
                await firestore.collection('tokens').doc(testToken).delete();
            } catch (error) {
                console.log('Error cleaning up test token');
            }
        }
    });

    it('should register a new token', async () => {
        const response = await fetch('http://localhost:3000/api/tokens', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                token: testToken,
                userId: testUserId,
                metadata: testMetadata,
            }),
        });

        expect(response.status).toBe(200);
        const data = await response.json();
        expect(data.success).toBe(true);
        expect(data.tokenId).toBe(testToken);
    });

    it('should validate a registered token', async () => {
        const response = await fetch('http://localhost:3000/api/tokens/verify', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                token: testToken,
            }),
        });

        expect(response.status).toBe(200);
        const data = await response.json();
        expect(data.valid).toBe(true);
        expect(data.userId).toBe(testUserId);
        expect(data.metadata).toEqual(testMetadata);
    });

    it('should exchange tokens between users', async () => {
        const targetToken = 'target-token-987654321';
        const targetUserId = 'test-user-002';
        const message = 'Test exchange';

        // Register target token
        await fetch('http://localhost:3000/api/tokens', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                token: targetToken,
                userId: targetUserId,
            }),
        });

        const response = await fetch('http://localhost:3000/api/tokens', {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                sourceToken: testToken,
                targetToken: targetToken,
                message: message,
            }),
        });

        expect(response.status).toBe(200);
        const data = await response.json();
        expect(data.success).toBe(true);
        expect(data.message).toBe('Token exchange successful');

        // Clean up target token
        await fetch('http://localhost:3000/api/tokens', {
            method: 'DELETE',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                token: targetToken,
            }),
        });
    });

    it('should invalidate a token', async () => {
        const response = await fetch('http://localhost:3000/api/tokens', {
            method: 'DELETE',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                token: testToken,
            }),
        });

        expect(response.status).toBe(200);
        const data = await response.json();
        expect(data.success).toBe(true);
        expect(data.message).toBe('Token invalidated successfully');
    });

    it('should return invalid for invalidated token', async () => {
        const response = await fetch('http://localhost:3000/api/tokens/verify', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                token: testToken,
            }),
        });

        expect(response.status).toBe(200);
        const data = await response.json();
        expect(data.valid).toBe(false);
        expect(data.message).toBe('Token not found');
    });
});
