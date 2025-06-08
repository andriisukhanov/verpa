# OAuth Setup Guide

This guide explains how to set up OAuth authentication for the User Service.

## Supported Providers

- Google
- Apple
- Facebook

## Configuration

### Google OAuth

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Create a new project or select existing
3. Enable Google+ API
4. Create OAuth 2.0 credentials:
   - Application type: Web application
   - Authorized redirect URIs: `http://localhost:3001/auth/google/callback`
5. Copy Client ID and Client Secret to `.env`:
   ```
   GOOGLE_CLIENT_ID=your-client-id
   GOOGLE_CLIENT_SECRET=your-client-secret
   ```

### Apple OAuth

1. Go to [Apple Developer Portal](https://developer.apple.com/)
2. Create an App ID with Sign in with Apple capability
3. Create a Service ID
4. Generate a private key:
   - Download the `.p8` file
   - Save it to `keys/apple-private-key.p8`
5. Update `.env`:
   ```
   APPLE_CLIENT_ID=your-service-id
   APPLE_TEAM_ID=your-team-id
   APPLE_KEY_ID=your-key-id
   APPLE_PRIVATE_KEY_PATH=./keys/apple-private-key.p8
   ```

### Facebook OAuth

1. Go to [Facebook Developers](https://developers.facebook.com/)
2. Create a new app
3. Add Facebook Login product
4. Configure OAuth redirect URI: `http://localhost:3001/auth/facebook/callback`
5. Copy App ID and App Secret to `.env`:
   ```
   FACEBOOK_APP_ID=your-app-id
   FACEBOOK_APP_SECRET=your-app-secret
   ```

## Usage

### Login with OAuth

```bash
# Google
GET /auth/google

# Apple
GET /auth/apple

# Facebook
GET /auth/facebook
```

### Link OAuth Provider

```bash
POST /auth/link/:provider
Authorization: Bearer <jwt-token>
```

### Unlink OAuth Provider

```bash
DELETE /auth/link/:provider
Authorization: Bearer <jwt-token>
```

### Get Linked Providers

```bash
GET /auth/providers
Authorization: Bearer <jwt-token>
```

## Frontend Integration

After successful OAuth authentication, the user is redirected to:

```
${FRONTEND_URL}/auth/callback?token=<access-token>&refresh=<refresh-token>
```

Handle this in your frontend:

```javascript
// Extract tokens from URL
const params = new URLSearchParams(window.location.search);
const accessToken = params.get('token');
const refreshToken = params.get('refresh');

// Store tokens
localStorage.setItem('accessToken', accessToken);
localStorage.setItem('refreshToken', refreshToken);

// Redirect to dashboard
window.location.href = '/dashboard';
```

## Security Considerations

1. **State Parameter**: In production, implement state parameter to prevent CSRF attacks
2. **HTTPS**: Always use HTTPS in production
3. **Token Storage**: Store tokens securely (HttpOnly cookies recommended)
4. **Scope**: Request only necessary permissions
5. **Key Security**: Never commit OAuth keys to repository

## Error Handling

OAuth errors redirect to:

```
${FRONTEND_URL}/auth/error?error=<error-code>&message=<error-message>
```

Common error codes:
- `access_denied`: User denied permission
- `invalid_request`: Invalid OAuth request
- `server_error`: Internal server error

## Testing

For testing OAuth flows:

1. Use OAuth playground tools
2. Mock OAuth providers in tests
3. Test error scenarios
4. Verify token generation
5. Test linking/unlinking flows

## Production Checklist

- [ ] Register production redirect URIs
- [ ] Secure key storage (use environment variables or secret management)
- [ ] Implement rate limiting
- [ ] Add monitoring for OAuth errors
- [ ] Configure proper CORS settings
- [ ] Implement state parameter
- [ ] Use HTTPS everywhere
- [ ] Regular security audits