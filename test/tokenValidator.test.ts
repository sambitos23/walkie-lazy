import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { firebaseAdmin, getFirestore, initializeFirebase } from '../lib/firebaseInit';

describe('Token Validator', () => {
    let testToken = 'test-token-123456789';

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

    it('should validate token format correctly', () => {
        const validator = require('../lib/tokenValidator');

        // Valid token format
        expect(validator.isValidTokenFormat('valid-token-123456789')).toBe(true);
        expect(validator.isValidTokenFormat('a'.repeat(50))).toBe(true);
        expect(validator.isValidTokenFormat('a'.repeat(500))).toBe(true);

        // Invalid token formats
        expect(validator.isValidTokenFormat('')).toBe(false);
        expect(validator.isValidTokenFormat('short')).toBe(false);
        expect(validator.isValidTokenFormat('a'.repeat(49))).toBe(false);
        expect(validator.isValidTokenFormat('a'.repeat(501))).toBe(false);
        expect(validator.isValidTokenFormat(null)).toBe(false);
        expect(validator.isValidTokenFormat(undefined)).toBe(false);
        expect(validator.isValidTokenFormat(12345)).toBe(false);
    });

    it('should handle token validation with non-existent token', async () => {
        const validator = require('../lib/tokenValidator');

        const validationResult = await validator.validateTokenWithInfo(testToken);
        expect(validationResult.valid).toBe(false);
        expect(validationResult.reasons).toContain('Token not found in Firebase');
        expect(validationResult.details).toBeDefined();
    });

    it('should blacklist and validate blacklisted tokens', async () => {
        const validator = require('../lib/tokenValidator');

        // Blacklist the test token
        const blacklistResult = await validator.blacklistToken(testToken);
        expect(blacklistResult).toBe(true);

        // Validate should now fail
        const validationResult = await validator.validateTokenWithInfo(testToken);
        expect(validationResult.valid).toBe(false);
        expect(validationResult.reasons).toContain('Token is blacklisted');

        // Remove from blacklist
        const removeFromBlacklist = await validator.removeTokenFromBlacklist(testToken);
        expect(removeFromBlacklist).toBe(true);

        // Validate should now fail due to not existing in Firebase
        const validationAfterRemoval = await validator.validateTokenWithInfo(testToken);
        expect(validationAfterRemoval.valid).toBe(false);
        expect(validationAfterRemoval.reasons).toContain('Token not found in Firebase');
    });

    it('should provide detailed validation information', async () => {
        const validator = require('../lib/tokenValidator');

        // Create a token in Firebase for testing
        const firestore = getFirestore();
        if (firestore) {
            await firestore.collection('tokens').doc(testToken).set({
                token: testToken,
                userId: 'test-user',
                metadata: { test: true },
                createdAt: new Date(),
                updatedAt: new Date(),
                invalidated: false,
            });
        }

        // Validate the token
        const validationResult = await validator.validateTokenWithInfo(testToken);
        expect(validationResult.valid).toBe(true);
        expect(validationResult.reasons.length).toBe(0);
        expect(validationResult.details).toBeDefined();
        expect(validationResult.details.isInFirebase).toBe(true);
        expect(validationResult.details.isInvalidated).toBe(false);
        expect(validationResult.details.isExpired).toBe(false);

        // Clean up
        if (firestore) {
            await firestore.collection('tokens').doc(testToken).delete();
        }
    });
});
