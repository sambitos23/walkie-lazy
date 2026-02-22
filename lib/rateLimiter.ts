import { NextRequest } from 'next/server';

// Rate limiting configuration
const RATE_LIMITS = {
        windowMs: 15 * 60 * 1000, // 15 minutes
        max: 10, // limit each IP to 10 requests per windowMs
        message: 'Too many token registration requests from this IP'
    },
    token_exchange: {
        windowMs: 15 * 60 * 1000, // 15 minutes
        max: 20, // limit each IP to 20 requests per windowMs
        message: 'Too many token exchange requests from this IP'
    },
    token_revocation: {
        windowMs: 15 * 60 * 1000, // 15 minutes
        max: 5, // limit each IP to 5 requests per windowMs
        message: 'Too many token revocation requests from this IP'
    },
    token_validation: {
        windowMs: 15 * 60 * 1000, // 15 minutes
        max: 30, // limit each IP to 30 requests per windowMs
        message: 'Too many token validation requests from this IP'
    }
};

// In-memory rate limiting store
interface RateLimitStore {
    [key: string]: {
        count: number;
        windowStart: number;
    };
}

const rateLimitStore: RateLimitStore = {};

// Rate limiting function
export async function rateLimit(request: NextRequest, endpointType: keyof typeof RATE_LIMITS) {
    const ip = request.ip || 'unknown';
    const endpointConfig = RATE_LIMITS[endpointType];

    if (!endpointConfig) {
        return { allowed: true };
    }

    const now = Date.now();
    const key = `${ip}_${endpointType}`;

    // Clean up old entries
    for (const storeKey in rateLimitStore) {
        const entry = rateLimitStore[storeKey];
        if (now - entry.windowStart > RATE_LIMITS[storeKey.split('_')[1]].windowMs) {
            delete rateLimitStore[storeKey];
        }
    }

    // Get or initialize rate limit entry
    let entry = rateLimitStore[key];
    if (!entry) {
        entry = {
            count: 0,
            windowStart: now
        };
        rateLimitStore[key] = entry;
    }

    // Check if we're in the same window
    if (now - entry.windowStart > endpointConfig.windowMs) {
        // New window, reset counter
        entry.count = 1;
        entry.windowStart = now;
        return { allowed: true };
    }

    // Increment count
    entry.count++;

    // Check if we've exceeded the limit
    if (entry.count > endpointConfig.max) {
        const timeSinceWindowStart = now - entry.windowStart;
        const timeUntilReset = endpointConfig.windowMs - timeSinceWindowStart;
        const retryAfter = Math.ceil(timeUntilReset / 1000); // Convert to seconds

        return {
            allowed: false,
            retryAfter: retryAfter,
            limit: endpointConfig.max,
            remaining: Math.max(0, endpointConfig.max - entry.count + 1),
            reset: Math.ceil(entry.windowStart + endpointConfig.windowMs - now)
        };
    }

    return {
        allowed: true,
        remaining: Math.max(0, endpointConfig.max - entry.count),
        reset: Math.ceil(entry.windowStart + endpointConfig.windowMs - now)
    };
}

// Get rate limit info for debugging
export function getRateLimitInfo(ip: string, endpointType: keyof typeof RATE_LIMITS) {
    const key = `${ip}_${endpointType}`;
    const entry = rateLimitStore[key];

    if (!entry) {
        return {
            limit: RATE_LIMITS[endpointType].max,
            remaining: RATE_LIMITS[endpointType].max,
            reset: 0
        };
    }

    const now = Date.now();
    const timeSinceWindowStart = now - entry.windowStart;
    const timeUntilReset = RATE_LIMITS[endpointType].windowMs - timeSinceWindowStart;

    return {
        limit: RATE_LIMITS[endpointType].max,
        remaining: Math.max(0, RATE_LIMITS[endpointType].max - entry.count),
        reset: Math.ceil(timeUntilReset / 1000) // Convert to seconds
    };
}

// Middleware for rate limiting
export function rateLimitMiddleware(endpointType: keyof typeof RATE_LIMITS) {
    return async (request: NextRequest, next: () => Promise<Response>) => {
        const rateLimitResult = await rateLimit(request, endpointType);

        if (!rateLimitResult.allowed) {
            return new Response(
                JSON.stringify({
                    error: RATE_LIMITS[endpointType].message,
                    retryAfter: rateLimitResult.retryAfter,
                    limit: rateLimitResult.limit,
                    remaining: rateLimitResult.remaining,
                    reset: rateLimitResult.reset
                }),
                {
                    status: 429,
                    headers: {
                        'Content-Type': 'application/json',
                        'Retry-After': rateLimitResult.retryAfter.toString()
                    }
                }
            );
        }

        const response = await next();

        // Add rate limit headers to response
        response.headers.set('X-RateLimit-Limit', RATE_LIMITS[endpointType].max.toString());
        response.headers.set('X-RateLimit-Remaining', rateLimitResult.remaining.toString());
        response.headers.set('X-RateLimit-Reset', rateLimitResult.reset.toString());

        return response;
    };
}

export async function distributedRateLimit(request: NextRequest, endpointType: keyof typeof RATE_LIMITS) {
    try {
        // Fallback to in-memory rate limiting
        return await rateLimit(request, endpointType);
    }

        const ip = request.ip || 'unknown';
        const endpointConfig = RATE_LIMITS[endpointType];
        const key = `${ip}_${endpointType}`;
        const now = Date.now();

}