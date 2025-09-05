# AWS Cognito Configuration - ClassReflect (Production)

> **⚠️ PRODUCTION ONLY**: This document describes Cognito configuration for **production environments**. 
> 
> **For local development**, ClassReflect uses JWT-only authentication. No Cognito setup required.
> 
> Use `npm run dev` in both backend and frontend directories for local development.

## ✅ Successfully Created!

### Cognito User Pool Details
- **User Pool ID**: `eu-west-2_E3SFkCKPU`
- **User Pool Name**: classreflect-users
- **Region**: eu-west-2
- **ARN**: `arn:aws:cognito-idp:eu-west-2:573524060586:userpool/eu-west-2_E3SFkCKPU`

### App Client Details
- **Client ID**: `6s2hfgujbgt28ce4eh15b502d4`
- **Client Secret**: `[REDACTED - stored in AWS Secrets Manager]`
- **Client Name**: classreflect-app-client

### Configuration Features
- ✅ Custom attributes: school_id, role, subjects, grades
- ✅ Password policy: 12+ chars, mixed case, numbers, symbols
- ✅ Email verification with link
- ✅ Admin-only user creation (no self-registration)
- ✅ Advanced security mode: ENFORCED
- ✅ Deletion protection: ACTIVE
- ✅ Token validity: 1hr access, 1hr ID, 30 days refresh

## Environment Variables Set

### Backend (.env)
```bash
COGNITO_USER_POOL_ID=eu-west-2_E3SFkCKPU
COGNITO_CLIENT_ID=6s2hfgujbgt28ce4eh15b502d4
COGNITO_CLIENT_SECRET=1ulqetjqcbp0dsuvrlsrkvp2gomovrithj5dntt8emegnfl1fs1p
```

### Frontend (.env.local)
```bash
VITE_COGNITO_USER_POOL_ID=eu-west-2_E3SFkCKPU
VITE_COGNITO_CLIENT_ID=6s2hfgujbgt28ce4eh15b502d4
VITE_USE_COGNITO=true
```

## Next Steps

### 1. Restart Services
```bash
# Backend - should auto-restart with nodemon
# Check logs for: "🔐 Using AWS Cognito authentication"

# Frontend - restart manually
npm run dev
```

### 2. Create Initial Super Admin User
```bash
aws cognito-idp admin-create-user \
  --user-pool-id eu-west-2_E3SFkCKPU \
  --username admin@classreflect.gdwd.co.uk \
  --user-attributes \
    Name=email,Value=admin@classreflect.gdwd.co.uk \
    Name=given_name,Value=Super \
    Name=family_name,Value=Admin \
    Name="custom:school_id",Value=platform \
    Name="custom:role",Value=super_admin \
  --temporary-password "TempPass123!" \
  --message-action SUPPRESS \
  --region eu-west-2
```

### 3. Test Authentication Flow

1. **Login with temporary password**:
   - Email: admin@classreflect.gdwd.co.uk
   - Password: TempPass123!
   
2. **Set permanent password** when prompted

3. **Verify role-based access**:
   - Super Admin → Full platform access
   - School Manager → School-specific access
   - Teacher → View-only access

### 4. Database Sync

The backend will automatically sync Cognito users with the local database on login.

## AWS Console Access

View and manage your user pool:
https://eu-west-2.console.aws.amazon.com/cognito/v2/idp/user-pools/eu-west-2_E3SFkCKPU/users

## Security Notes

⚠️ **IMPORTANT**: 
- Store the client secret securely
- Never commit credentials to git
- Use AWS Secrets Manager for production
- Enable MFA for admin accounts
- Regularly rotate client secrets

## Troubleshooting

If authentication fails:
1. Check backend logs for Cognito initialization
2. Verify environment variables are loaded
3. Ensure CORS is configured correctly
4. Check network connectivity to AWS

---

**Status**: ✅ Cognito User Pool and Client successfully created and configured!
**Created**: November 18, 2024
**AWS Account**: 573524060586