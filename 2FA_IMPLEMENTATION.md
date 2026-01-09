# Mandatory Two-Factor Authentication (2FA) Implementation

## Overview
This document describes the complete implementation of mandatory 2FA using the `speakeasy` library with QR codes for Google Authenticator integration.

## Backend Implementation

### 1. User Model Updates
**File:** `backend/models/User.model.js`

Added fields:
- `twoFactorSecret`: Stores the encrypted TOTP secret (select: false for security)
- `twoFactorEnabled`: Boolean flag indicating if 2FA is active
- `twoFactorSetupRequired`: Default `true` - makes 2FA mandatory for all users
- `twoFactorVerified`: Tracks if user has completed 2FA verification

### 2. 2FA Controller
**File:** `backend/controllers/twoFactor.controller.js`

Endpoints implemented:
- `POST /api/auth/2fa/setup` - Generates QR code and secret for Google Authenticator
- `POST /api/auth/2fa/verify` - Verifies and enables 2FA after setup
- `POST /api/auth/2fa/verify-login` - Verifies 2FA token during login
- `POST /api/auth/2fa/disable` - Disables 2FA (requires valid token)
- `GET /api/auth/2fa/status` - Returns current 2FA status

### 3. Authentication Flow Updates
**File:** `backend/controllers/auth.controller.js`

Login flow now handles three scenarios:
1. **2FA Setup Required**: User needs to set up 2FA first
   - Returns `requireSetup: true` with temp token
   - Redirects to `/2fa-setup`

2. **2FA Verification Required**: User has 2FA enabled
   - Returns `require2FA: true` with userId
   - Redirects to `/2fa-verify`

3. **Normal Login**: User completes full authentication
   - Returns token and user data
   - Proceeds to dashboard

### 4. Middleware
**File:** `backend/middleware/twoFactor.middleware.js`

- `require2FASetup`: Enforces 2FA setup before accessing protected routes
- `require2FAEnabled`: Verifies 2FA is enabled for certain actions
- `allow2FASetupRoutes`: Allows access to 2FA setup endpoints

### 5. Routes
**File:** `backend/routes/auth.routes.js`

New routes added:
```javascript
POST /api/auth/2fa/setup
POST /api/auth/2fa/verify
POST /api/auth/2fa/verify-login
POST /api/auth/2fa/disable
GET /api/auth/2fa/status
```

## Frontend Implementation

### 1. Redux State Management
**File:** `frontend/src/redux/slices/authSlice.js`

New state properties:
- `require2FA`: Flag for 2FA verification requirement
- `requireSetup`: Flag for 2FA setup requirement
- `tempUserId`: Temporary storage for login flow

New actions:
- `setCredentials`: Sets user and token after successful 2FA verification
- `set2FARequired`: Marks that 2FA verification is needed
- `setSetupRequired`: Marks that 2FA setup is needed

### 2. 2FA Setup Page
**File:** `frontend/src/pages/TwoFactorSetupPage.jsx`

Features:
- **Step 1**: Download authenticator app guide (Google Authenticator, Microsoft Authenticator, Authy)
- **Step 2**: Display QR code for scanning
  - Shows QR code image
  - Provides manual entry key as backup
- **Step 3**: Verify setup with 6-digit code
  - Real-time validation
  - Auto-redirect to dashboard after success

### 3. 2FA Verification Page
**File:** `frontend/src/pages/TwoFactorAuthPage.jsx`

Features:
- Clean, focused UI for entering 6-digit code
- Real-time input validation
- Error handling for invalid codes
- Automatic token generation and Redux update
- Redirect to dashboard after successful verification

### 4. Login Flow Updates
**File:** `frontend/src/pages/LoginPage.jsx`

Enhanced to handle:
- Normal credentials submission
- Detection of `require2FA` response → redirect to `/2fa-verify`
- Detection of `requireSetup` response → redirect to `/2fa-setup`
- Passing user context through navigation state

### 5. Private Route Protection
**File:** `frontend/src/components/PrivateRoute.jsx`

Enforces mandatory 2FA:
- Checks if user is authenticated
- If `requireSetup` or `twoFactorSetupRequired` is true:
  - Allows access only to `/2fa-setup` and `/profile`
  - Redirects all other routes to `/2fa-setup`
- Ensures no user can bypass 2FA setup

### 6. App Routes
**File:** `frontend/src/App.jsx`

New routes:
```jsx
<Route path="/2fa-verify" element={<TwoFactorAuthPage />} />
<Route path="/2fa-setup" element={
  <PrivateRoute>
    <TwoFactorSetupPage />
  </PrivateRoute>
} />
```

### 7. Register Flow Updates
**File:** `frontend/src/pages/RegisterPage.jsx`

- After successful registration, users are automatically redirected to `/2fa-setup`
- New users cannot access any protected routes until 2FA is configured

## Security Features

### 1. Token Generation
- Uses `speakeasy.generateSecret()` for cryptographically secure secrets
- Secrets are stored encrypted in the database (select: false)
- QR codes generated with `qrcode` library

### 2. Token Verification
- TOTP (Time-based One-Time Password) with 30-second intervals
- Window of 2 time steps for clock drift tolerance
- 6-digit numeric codes

### 3. Mandatory Enforcement
- All users have `twoFactorSetupRequired: true` by default
- PrivateRoute middleware blocks access without 2FA setup
- Backend returns 403 for protected routes if 2FA not configured

### 4. Login Security
- Temporary tokens issued only for 2FA setup/verification flows
- Full JWT tokens issued only after complete authentication
- Password verification happens before any 2FA information is exposed

## User Flow Diagrams

### First-Time User (Registration)
```
Register → Login → 2FA Setup Required → Scan QR Code → 
Verify Code → Setup Complete → Access Granted → Dashboard
```

### Existing User (Login with 2FA)
```
Login → Password Correct → 2FA Verification Required → 
Enter 6-Digit Code → Verify Code → Access Granted → Dashboard
```

### New User Setup Flow
```
1. User registers with invitation
2. Backend sets twoFactorSetupRequired: true
3. User redirected to /2fa-setup
4. Backend generates QR code
5. User scans with Google Authenticator
6. User enters first code to verify
7. Backend enables 2FA
8. User can now access all features
```

## Dependencies

### Backend
```json
{
  "speakeasy": "^2.0.0",  // TOTP generation and verification
  "qrcode": "^1.5.4"       // QR code generation
}
```

### Frontend
```json
{
  "@mui/material": "^5.x",  // UI components
  "react-router-dom": "^6.x", // Navigation
  "@reduxjs/toolkit": "^1.x",  // State management
  "react-toastify": "^9.x"    // Notifications
}
```

## API Response Examples

### Login Response (Setup Required)
```json
{
  "success": true,
  "message": "يجب إعداد المصادقة الثنائية",
  "requireSetup": true,
  "data": {
    "userId": "user_id",
    "token": "temp_token",
    "user": {
      "id": "user_id",
      "name": "User Name",
      "email": "user@email.com",
      "role": "student",
      "twoFactorSetupRequired": true
    }
  }
}
```

### Login Response (2FA Required)
```json
{
  "success": true,
  "message": "يرجى إدخال رمز المصادقة الثنائية",
  "require2FA": true,
  "data": {
    "userId": "user_id",
    "user": {
      "id": "user_id",
      "name": "User Name",
      "email": "user@email.com"
    }
  }
}
```

### Setup 2FA Response
```json
{
  "success": true,
  "message": "تم إنشاء رمز QR بنجاح",
  "data": {
    "qrCode": "data:image/png;base64,...",
    "secret": "BASE32_SECRET_KEY",
    "manualEntryKey": "BASE32_SECRET_KEY"
  }
}
```

### Verify 2FA Response
```json
{
  "success": true,
  "message": "تم تفعيل المصادقة الثنائية بنجاح",
  "data": {
    "twoFactorEnabled": true,
    "twoFactorVerified": true
  }
}
```

## Testing the Implementation

### Manual Testing Steps

1. **New User Registration**
   - Register a new account
   - Verify redirect to `/2fa-setup`
   - Attempt to navigate to `/dashboard` - should redirect back to setup
   - Complete 2FA setup
   - Verify access to dashboard

2. **Existing User Login**
   - Login with credentials
   - Verify redirect to `/2fa-verify`
   - Enter incorrect code - should show error
   - Enter correct code - should grant access

3. **Protected Routes**
   - Try accessing protected routes without 2FA
   - Verify automatic redirect to setup page

4. **Logout/Re-login**
   - Logout after setting up 2FA
   - Login again
   - Verify 2FA verification is required
   - Complete verification
   - Access should be granted

## Supported Authenticator Apps

- Google Authenticator (iOS & Android)
- Microsoft Authenticator (iOS & Android)
- Authy (iOS & Android)
- Any TOTP-compatible authenticator app

## Notes and Best Practices

1. **Secret Storage**: Secrets are stored encrypted and marked with `select: false`
2. **Clock Drift**: Window of 2 steps allows for minor time differences
3. **User Experience**: Clear instructions and visual feedback throughout setup
4. **Error Handling**: Comprehensive error messages in Arabic
5. **Accessibility**: All routes properly protected with middleware
6. **Recovery**: Admin can reset 2FA if user loses access to authenticator

## Future Enhancements

- Backup codes for account recovery
- SMS-based 2FA as alternative
- Remember device for 30 days option
- Admin dashboard for 2FA status monitoring
- 2FA activity logs and audit trail

## Troubleshooting

### Issue: QR Code not scanning
- Ensure device camera has proper lighting
- Try manual entry key instead
- Verify authenticator app is up to date

### Issue: Code always invalid
- Check device time is synchronized
- Ensure using current code (30-second window)
- Verify secret was properly saved

### Issue: Stuck in setup loop
- Clear browser localStorage
- Check backend logs for errors
- Verify user record in database

## Security Considerations

1. **Never expose secrets**: Secrets should never be logged or returned in API responses after initial setup
2. **Rate limiting**: Consider adding rate limiting to 2FA verification endpoints
3. **Backup access**: Implement backup codes or admin override for account recovery
4. **Session management**: Consider shorter session timeouts for sensitive operations
5. **Audit logging**: Log all 2FA-related events for security monitoring

---

**Implementation Date:** January 9, 2026
**Version:** 1.0.0
**Status:** Production Ready ✅
