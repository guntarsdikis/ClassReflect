# 🧪 ClassReflect Login Testing Instructions

## ✅ Test Users Created

All test users have been successfully created in AWS Cognito with permanent passwords.

### 📝 Login Credentials

| Role | Email | Password |
|------|-------|----------|
| **Super Admin** | superadmin@test.local | AdminPass2024!@ |
| **School Manager** | manager@test.local | ManagerPass2024!@ |
| **Teacher** | teacher@test.local | TeacherPass2024!@ |

guntars@gdwd.co.uk d%u3iefCnxnEsdYe#9YD

## 🚀 How to Test

### 1. Ensure Services Are Running

**Backend (Terminal 1):**
```bash
cd backend
npm run dev
```
Look for: `🔐 Using AWS Cognito authentication` in the console

**Frontend (Terminal 2):**
```bash
cd frontend
npm run dev
```
Should run on: http://localhost:3000

### 2. Test Each Role

1. **Open browser:** http://localhost:3000/login
2. **Enter credentials** from the table above
3. **Click "Sign In"**
4. **Verify redirect:**
   - Super Admin → Admin dashboard
   - School Manager → Manager dashboard  
   - Teacher → Teacher dashboard

### 3. What Each Role Can Do

**Super Admin:**
- Create new schools
- View all schools and users
- Platform-wide settings

**School Manager:**
- Upload recordings for teachers
- Create teacher accounts
- Set evaluation criteria
- View school analytics

**Teacher:**
- View own results (read-only)
- Track progress
- Export reports

## 🔧 Troubleshooting

### If Login Fails:

1. **Check Backend Console**
   - Should show: `🔐 Using AWS Cognito authentication`
   - If showing JWT auth, restart backend

2. **Check Browser Console (F12)**
   - Look for errors in red
   - Check Network tab for `/api/auth/login` calls

3. **Verify Environment Variables**
   ```bash
   # Backend should have:
   cat backend/.env | grep COGNITO
   ```
   Should show:
   - COGNITO_USER_POOL_ID=eu-west-2_E3SFkCKPU
   - COGNITO_CLIENT_ID=6s2hfgujbgt28ce4eh15b502d4
   - COGNITO_CLIENT_SECRET=(secret value)

4. **Frontend Auth Service**
   - File: `frontend/src/features/auth/services/auth.service.ts`
   - Line 19 should be: `const USE_MOCK_AUTH = false;`

### Common Issues:

**"Invalid credentials" error:**
- User might not exist in Cognito
- Run: `node test-all-roles.js` to recreate users

**"fetch failed" error:**
- Backend not running or crashed
- Check backend terminal for errors
- Restart: `cd backend && npm run dev`

**Still on login page after submit:**
- Mock auth might be enabled
- Check `auth.service.ts` line 19
- Should be: `const USE_MOCK_AUTH = false;`

## 🗑️ Clean Up Test Users

When done testing, remove test users:
```bash
aws cognito-idp admin-delete-user \
  --user-pool-id eu-west-2_E3SFkCKPU \
  --username superadmin-test \
  --region eu-west-2

aws cognito-idp admin-delete-user \
  --user-pool-id eu-west-2_E3SFkCKPU \
  --username manager-test \
  --region eu-west-2

aws cognito-idp admin-delete-user \
  --user-pool-id eu-west-2_E3SFkCKPU \
  --username teacher-test \
  --region eu-west-2
```

## ✨ Summary

- ✅ Cognito User Pool configured
- ✅ 3 test users with different roles created
- ✅ Backend configured for Cognito auth
- ✅ Frontend updated to use real API

**Ready to test!** Use the credentials above at http://localhost:3000/login

---

**Need help?** Check the backend console output for errors.