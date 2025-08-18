# Final GitHub Connection - ClassReflect

## ✅ App Created Successfully
- **App ID**: `d34b7ce4h4zx2d`
- **Branch**: `main` (auto-build enabled)
- **Stage**: PRODUCTION
- **Default URL**: https://main.d34b7ce4h4zx2d.amplifyapp.com

## 🔗 Connect to GitHub Repository

### Step 1: Go to Amplify Console
```
https://eu-west-2.console.aws.amazon.com/amplify/home?region=eu-west-2#/d34b7ce4h4zx2d/YnJhbmNoZXM
```

### Step 2: Connect Repository
1. You'll see the `main` branch listed but it says "Not connected"
2. Click **"Connect branch"** 
3. Choose **"Connect app to Git repository"**
4. Select **"GitHub"** as repository service
5. Click **"Authorize AWS Amplify"** to install the GitHub App
6. Select repository: **`guntarsdikis/classreflect`**
7. Select branch: **`main`** (should already be selected)

### Step 3: Configure Build Settings
The build settings are already pre-configured:
```yaml
version: 1
frontend:
  phases:
    preBuild:
      commands:
        - cd frontend-new
        - npm ci
    build:
      commands:
        - npm run build
  artifacts:
    baseDirectory: frontend-new/dist
    files:
      - '**/*'
  cache:
    paths:
      - frontend-new/node_modules/**/*
```

**Just click "Save and deploy"** - don't change anything!

## ✅ Pre-configured Settings

### Environment Variables
- ✅ `VITE_API_URL`: https://api.classreflect.gdwd.co.uk
- ✅ `VITE_APP_URL`: https://classreflect.gdwd.co.uk
- ✅ `VITE_AWS_REGION`: eu-west-2

### Routing Rules
- ✅ SPA routing configured: `/<*>` → `/index.html` (404-200)

### Auto-Build
- ✅ Enabled for main branch
- ✅ Production stage configured

## What Happens Next

1. **Immediate Build**: Amplify will start building from your GitHub repository
2. **Build Process**: Will run from `frontend-new/` directory
3. **Deploy**: Will be available at https://main.d34b7ce4h4zx2d.amplifyapp.com
4. **Auto-Deploy**: Every push to `main` branch will trigger a new build

## Verify Connection

After connecting, run these commands to verify:

```bash
# Check app is connected to repository
aws amplify get-app --app-id d34b7ce4h4zx2d --region eu-west-2

# Check branch details  
aws amplify list-branches --app-id d34b7ce4h4zx2d --region eu-west-2

# Monitor build progress
aws amplify list-jobs --app-id d34b7ce4h4zx2d --branch-name main --region eu-west-2
```

## Next: Custom Domain Setup

Once GitHub is connected and the first build succeeds, I can set up the custom domain:
- Transfer `classreflect.gdwd.co.uk` to this new app
- Configure SSL certificate
- Set up DNS routing

**Please complete the GitHub connection now, then let me know when it's done!**