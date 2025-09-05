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
   - This confirms JWT-only authentication is active for local development

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
- User might not exist in local database
- Check that test users are properly seeded in local MySQL

**"fetch failed" error:**
- Backend not running or crashed
- Check backend terminal for errors
- Restart: `cd backend && npm run dev`

**Still on login page after submit:**
- Ensure backend is running and CORS allows http://localhost:3002
- Verify `frontend/.env.local` has `VITE_API_URL=http://localhost:3001` and `VITE_APP_URL=http://localhost:3002`

## 🗑️ Clean Up Test Users

Test users are stored in your local MySQL database and persist across sessions. 
To remove them, you can delete from the `users` table directly or recreate the database.

## ✨ Summary

- ✅ JWT authentication configured for local development
- ✅ 3 test users with different roles available
- ✅ Backend configured for JWT auth
- ✅ Frontend connected to local API

**Ready to test!** Use the credentials above at http://localhost:3002/login

---

**Need help?** Check the backend console output for errors.
