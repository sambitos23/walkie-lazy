import { firebaseAdmin, getFirestore, initializeFirebase } from '../lib/firebaseInit';

afterAll(async () => {
    // Clean up any test data created during tests
    const firestore = getFirestore();
    if (firestore) {
        try {
            // Remove any test tokens created during testing
            const testTokens = await firestore.collection('tokens')
                .where('token', '>', 'test-token')
                .get();

            testTokens.forEach(async (doc) => {
                try {
                    await doc.ref.delete();
                } catch (error) {
                    console.log('Error deleting test token:', error);
                }
            });

            // Remove any test rate limits
            const testRateLimits = await firestore.collection('rateLimits')
                .where('count', '>', 0)
                .get();

            testRateLimits.forEach(async (doc) => {
                try {
                    await doc.ref.delete();
                } catch (error) {
                    console.log('Error deleting test rate limit:', error);
                }
            });

            // Remove any test blacklisted tokens
            const testBlacklist = await firestore.collection('blacklistedTokens')
                .where('token', '>', 'test-token')
                .get();

            testBlacklist.forEach(async (doc) => {
                try {
                    await doc.ref.delete();
                } catch (error) {
                    console.log('Error deleting test blacklisted token:', error);
                }
            });

            // Remove any test token exchanges
            const testExchanges = await firestore.collection('tokenExchanges')
                .where('message', '==', 'Test exchange')
                .get();

            testExchanges.forEach(async (doc) => {
                try {
                    await doc.ref.delete();
                } catch (error) {
                    console.log('Error deleting test exchange:', error);
                }
            });

        } catch (error) {
            console.log('Error cleaning up test data:', error);
        }
    }
});
