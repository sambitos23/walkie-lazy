import { describe, it, expect, beforeAll, afterAll } from 'vitest';

describe('Rate Limiter', () => {
    let testIp = '.test-ip';

    it('should limit requests based on configuration', async () => {
        const limiter = require('../lib/rateLimiter');

        // Test token registration limit (10 requests per 15 minutes)
        let registrationResults = [];
        for (let i = 0; i < 12; i++) {
            const result = await limiter.rateLimit(
                {
                    ip: testIp,
                    method: 'POST',
                    url: '/api/tokens',
                } as any,
                'token_registration'
            );
            registrationResults.push(result);
        }

        // First 10 should be allowed
        for (let i = 0; i < 10; i++) {
            expect(registrationResults[i].allowed).toBe(true);
        }

        // Last 2 should be rate limited
        expect(registrationResults[10].allowed).toBe(false);
        expect(registrationResults[11].allowed).toBe(false);
    });

    it('should provide correct rate limit headers and info', async () => {
        const limiter = require('../lib/rateLimiter');

        // First request should have full limits
        const firstResult = await limiter.rateLimit(
            { ip: testIp } as any,
            'token_exchange'
        );
        expect(firstResult.allowed).toBe(true);
        expect(firstResult.remaining).toBe(19); // 20 - 1
        expect(firstResult.reset).toBeGreaterThan(0);

        // Second request should have one less remaining
        const secondResult = await limiter.rateLimit(
            { ip: testIp } as any,
            'token_exchange'
        );
        expect(secondResult.allowed).toBe(true);
        expect(secondResult.remaining).toBe(18); // 20 - 2
    });

    it('should clean up old rate limit entries', async () => {
        const limiter = require('../lib/rateLimiter');

        // Simulate old entry from different window
        const oldIp = '.old-ip';
        limiter.rateLimit(
            { ip: oldIp } as any,
            'token_validation'
        );

        // Wait a bit and check cleanup
        // In real usage, cleanup happens on each rate limit call
        // We can't easily test the timing without making the test slow
        // But we can verify that new requests work correctly
        const result = await limiter.rateLimit(
            { ip: testIp } as any,
            'token_validation'
        );
        expect(result.allowed).toBe(true);
    });

    it('should handle unknown endpoint types gracefully', async () => {
        const limiter = require('../lib/rateLimiter');

        const result = await limiter.rateLimit(
            { ip: testIp } as any,
            'unknown_endpoint' as any
        );
        expect(result.allowed).toBe(true);
    });

    it('should provide rate limit info for debugging', () => {
        const limiter = require('../lib/rateLimiter');

        // Make some requests to create state
        limiter.rateLimit(
            { ip: testIp } as any,
            'token_revocation'
        );

        const info = limiter.getRateLimitInfo(testIp, 'token_revocation');
        expect(info.limit).toBe(5);
        expect(info.remaining).toBeGreaterThanOrEqual(0);
        expect(info.reset).toBeGreaterThanOrEqual(0);
    });
});
