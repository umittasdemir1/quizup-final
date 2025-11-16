# QuizUp Cloud Functions

Firebase Cloud Functions for QuizUp+ SaaS platform.

## Functions

### `deleteUserByAdmin`

Deletes a user from both Firebase Auth and Firestore.

**Type:** HTTPS Callable Function

**Auth Required:** Yes (Admin or Super Admin)

**Parameters:**
```json
{
  "userId": "user-uid-to-delete"
}
```

**Response:**
```json
{
  "success": true,
  "message": "Kullanıcı başarıyla silindi"
}
```

**Security:**
- Only authenticated admins/super admins can call
- Cannot delete own account
- Automatically handles both Auth and Firestore deletion

## Deployment

### First Time Setup

1. Install Firebase CLI:
```bash
npm install -g firebase-tools
```

2. Login to Firebase:
```bash
firebase login
```

3. Initialize project (if not already done):
```bash
firebase use --add
# Select your project ID
```

4. Install dependencies:
```bash
cd functions
npm install
cd ..
```

### Deploy Functions

Deploy all functions:
```bash
firebase deploy --only functions
```

Deploy specific function:
```bash
firebase deploy --only functions:deleteUserByAdmin
```

### Test Locally

Run emulator:
```bash
cd functions
npm run serve
```

## Environment

- Node.js: 18
- Firebase Functions: v5.0.0
- Firebase Admin: v12.0.0

## Security Notes

- All functions require authentication
- Role-based access control (RBAC) enforced
- Prevents self-deletion
- Detailed logging for audit trail
