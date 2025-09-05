# 🧪 ClassReflect Login Testing Instructions

## ✅ Test Users Created

Note: Local development uses JWT authentication (no Cognito). The credentials below are for local testing.

### 📝 Login Credentials

| Role | Email | Password |
|------|-------|----------|
| **Super Admin** | superadmin@test.local | AdminPass2024!@ |
| **School Manager** | manager@test.local | ManagerPass2024!@ |
| **Teacher** | teacher@test.local | TeacherPass2024!@ |

## 🚀 How to Test

### 1. Ensure Services Are Running

**Backend (Terminal 1):**
```bash
cd backend
npm run dev
```
Look for: `🔐 Using JWT authentication` in the console

**Frontend (Terminal 2):**
```bash
cd frontend
npm run dev
```
Should run on: http://localhost:3002

### 2. Test Each Role

1. **Open browser:** http://localhost:3002/login
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
   - Should show: `🔐 Using JWT authentication`
   - If showing Cognito, you're likely reading production docs; for local dev, JWT is expected

2. **Check Browser Console (F12)**
   - Look for errors in red
   - Check Network tab for `/api/auth/login` calls

3. **Verify Environment Variables**
   ```bash
   # Backend should have:
   cat backend/.env | grep -E "PORT|FRONTEND_URL|JWT_SECRET"
   ```
   Should include:
   - PORT=3001
   - FRONTEND_URL=http://localhost:3002
   - JWT_SECRET=<your local dev secret>

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
- Ensure backend is running and CORS allows http://localhost:3002
- Verify `frontend/.env.local` has `VITE_API_URL=http://localhost:3001` and `VITE_APP_URL=http://localhost:3002`

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

**Ready to test!** Use the credentials above at http://localhost:3002/login

---

**Need help?** Check the backend console output for errors.
