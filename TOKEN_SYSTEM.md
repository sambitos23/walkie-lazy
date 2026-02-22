# Token Exchange System

This document describes the token exchange API endpoints and system architecture for the Walkie-Lazy application.

## Overview

The token system provides secure bidirectional token exchange between users, with built-in rate limiting, validation, and Firebase integration for persistent storage and Firebase Cloud Messaging (FCM) notifications.

## API Endpoints

### 1. Token Registration - `POST /api/tokens`

Registers a new token or updates an existing one for a user.

**Request Body:**
```json
{
  "token": "string",           // Required: The token to register
  "userId": "string",         // Required: User ID associated with the token
  "metadata": {              // Optional: Additional metadata
    "role": "string",
    "source": "string"
  }
}
```

**Response:**
```json
{
  "success": true,
  "message": "Token registered successfully",
  "tokenId": "string"
}
```

**Rate Limits:**
- 10 requests per 15 minutes per IP

### 2. Token Exchange - `PUT /api/tokens`

Exchanges tokens between users and sends notifications.

**Request Body:**
```json
{
  "sourceToken": "string",   // Required: Token of the sender
  "targetToken": "string",   // Required: Token of the recipient
  "message": "string"        // Optional: Custom message
}
```

**Response:**
```json
{
  "success": true,
  "message": "Token exchange successful"
}
```

**Rate Limits:**
- 20 requests per 15 minutes per IP

### 3. Token Revocation - `DELETE /api/tokens`

Invalidates a token and removes it from the system.

**Request Body:**
```json
{
  "token": "string"          // Required: Token to invalidate
}
```

**Response:**
```json
{
  "success": true,
  "message": "Token invalidated successfully"
}
```

**Rate Limits:**
- 5 requests per 15 minutes per IP

### 4. Token Validation - `POST /api/tokens/verify`

Validates a token and returns its status and metadata.

**Request Body:**
```json
{
  "token": "string"          // Required: Token to validate
}
```

**Response:**
```json
{
  "valid": true,
  "userId": "string",
  "metadata": { },
  "createdAt": "string",
  "updatedAt": "string",
  "expiresIn": number,
  "timestamp": "string"
}
```

**Rate Limits:**
- 30 requests per 15 minutes per IP

## Token Validation Logic

Tokens are validated based on the following criteria:

1. **Format Validation**: Token must be a string with 50-500 characters
2. **Blacklist Check**: Token must not be in the blacklist collection
3. **Firebase Existence**: Token must exist in the tokens collection
4. **Invalidation Check**: Token must not be marked as invalidated
5. **Expiration Check**: Token must not be older than 24 hours
6. **Firebase Messaging**: Token must be valid in Firebase Messaging

## Rate Limiting

Rate limiting is implemented at both the endpoint and IP level:

- **Token Registration**: 10 requests per 15 minutes per IP
- **Token Exchange**: 20 requests per 15 minutes per IP
- **Token Revocation**: 5 requests per 15 minutes per IP
- **Token Validation**: 30 requests per 15 minutes per IP

Rate limit headers are returned with each response:
- `X-RateLimit-Limit`: Maximum requests allowed
- `X-RateLimit-Remaining`: Remaining requests in current window
- `X-RateLimit-Reset`: Time until rate limit resets (seconds)

## Firebase Integration

### Collections

1. **tokens**: Stores registered tokens with metadata
2. **blacklistedTokens**: Stores blacklisted tokens
3. **tokenExchanges**: Logs token exchange events
4. **rateLimits**: (Optional) Distributed rate limiting store

### Data Structure

**Tokens Collection:**
```json
{
  "token": "string",
  "userId": "string",
  "metadata": { },
  "createdAt": timestamp,
  "updatedAt": timestamp,
  "invalidated": boolean,
  "invalidatedAt": timestamp
}
```

## Security Features

1. **Input Validation**: All endpoints validate input formats and required fields
2. **Rate Limiting**: Prevents abuse and DoS attacks
3. **Token Blacklisting**: Allows immediate revocation of compromised tokens
4. **Expiration**: Tokens automatically expire after 24 hours
5. **Firebase Integration**: Uses Firebase's secure authentication and messaging

## Error Handling

All endpoints return consistent error responses with appropriate HTTP status codes:

- `400 Bad Request`: Invalid input or missing required fields
- `404 Not Found`: Token not found or invalid
- `429 Too Many Requests`: Rate limit exceeded
- `500 Internal Server Error`: Server configuration or processing errors

## Testing

The token system includes comprehensive test coverage:

```bash
# Run all tests
npm test

# Run tests in watch mode
npm run test:watch

# Run tests with coverage report
npm run test:coverage
```

Test files are located in the `test/` directory and cover:
- API endpoint functionality
- Token validation logic
- Rate limiting behavior
- Firebase integration

## Environment Variables

The following environment variables are required:

- `FIREBASE_PROJECT_ID`: Firebase project ID
- `FIREBASE_CLIENT_EMAIL`: Firebase client email
- `FIREBASE_PRIVATE_KEY`: Firebase private key
- `NEXT_PUBLIC_FIREBASE_API_KEY`: Firebase API key (public)
- `NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN`: Firebase auth domain
- `NEXT_PUBLIC_FIREBASE_PROJECT_ID`: Firebase project ID (public)
- `NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET`: Firebase storage bucket
- `NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID`: Firebase messaging sender ID
- `NEXT_PUBLIC_FIREBASE_APP_ID`: Firebase app ID
- `NEXT_PUBLIC_FIREBASE_VAPID_KEY`: Firebase VAPID key for messaging

## Usage Examples

### Register a Token
```bash
curl -X POST http://localhost:3000/api/tokens \
  -H "Content-Type: application/json" \
  -d '{
    "token": "user-token-123",
    "userId": "user-001",
    "metadata": {"role": "admin"}
  }'
```

### Exchange Tokens
```bash
curl -X PUT http://localhost:3000/api/tokens \
  -H "Content-Type: application/json" \
  -d '{
    "sourceToken": "sender-token",
    "targetToken": "recipient-token",
    "message": "Hello from sender!"
  }'
```

### Validate a Token
```bash
curl -X POST http://localhost:3000/api/tokens/verify \
  -H "Content-Type: application/json" \
  -d '{
    "token": "user-token-123"
  }'
```

### Revoke a Token
```bash
curl -X DELETE http://localhost:3000/api/tokens \
  -H "Content-Type: application/json" \
  -d '{
    "token": "user-token-123"
  }'
```

## Architecture

```
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   Client App  │───▶│   API Routes   │───▶│   Firebase     │
│               │    │               │    │   Backend     │
└─────────────────┘    └─────────────────┘    └─────────────────┘
       │                      │                      │
       ▼                      ▼                      ▼
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   Token      │    │   Rate         │    │   Token       │
│   Validator  │    │   Limiter      │    │   Exchange    │
│   Library    │    │   Library      │    │   System      │
└─────────────────┘    └─────────────────┘    └─────────────────┘
```

## Dependencies

- `firebase-admin`: Firebase Admin SDK for server-side operations
- `next/server`: Next.js server components for API routes
- `vitest`: Testing framework for unit tests
- `@testing-library/react`: React testing utilities