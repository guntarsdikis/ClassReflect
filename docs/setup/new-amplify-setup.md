# New ClassReflect Amplify Setup

## ✅ Fresh App Created
- **App ID**: `du4k9xr4pdicg`
- **App Name**: `classreflect`
- **Default URL**: https://main.du4k9xr4pdicg.amplifyapp.com
- **Console URL**: https://eu-west-2.console.aws.amazon.com/amplify/home?region=eu-west-2#/du4k9xr4pdicg

## 🔗 Connect to GitHub Repository

### Step 1: Go to Amplify Console
```
https://eu-west-2.console.aws.amazon.com/amplify/home?region=eu-west-2#/du4k9xr4pdicg
```

### Step 2: Connect Repository
1. Click **"Host your web app"** or **"Get started"**
2. Choose **"GitHub"** as your Git provider
3. Click **"Continue"** to authorize AWS Amplify GitHub App
4. Select repository: **`guntarsdikis/classreflect`**
5. Select branch: **`main`**
6. **App name**: Keep as `classreflect`

### Step 3: Build Settings (Pre-configured)
The build settings are already configured correctly:

```yaml
version: 1
frontend:
  phases:
    preBuild:
      commands:
        - cd frontend
        - npm ci
    build:
      commands:
        - npm run build
  artifacts:
    baseDirectory: frontend/dist
    files:
      - '**/*'
  cache:
    paths:
      - frontend/node_modules/**/*
  customHeaders:
    - pattern: '**/*'
      headers:
        - key: 'Cache-Control'
          value: 'public, max-age=0, must-revalidate'
    - pattern: 'static/**/*'
      headers:
        - key: 'Cache-Control'
          value: 'public, max-age=31536000, immutable'
```

**Just click "Next" and "Save and deploy"** - everything is pre-configured!

## ✅ Pre-configured Features

### Environment Variables
- ✅ `VITE_API_URL`: https://api.classreflect.gdwd.co.uk
- ✅ `VITE_APP_URL`: https://classreflect.gdwd.co.uk  
- ✅ `VITE_AWS_REGION`: eu-west-2

### Routing Rules
- ✅ SPA fallback: `/<*>` → `/index.html` (404-200)

### Build Configuration  
- ✅ Uses `frontend/` directory (renamed Vite app)
- ✅ Outputs to `frontend/dist`
- ✅ Proper cache headers for assets
- ✅ Node modules caching

## What Happens After Connection

1. **Immediate Build**: Amplify starts building from GitHub `main` branch
2. **Build Process**: Runs `cd frontend && npm ci && npm run build`
3. **Deploy**: Available at https://main.du4k9xr4pdicg.amplifyapp.com
4. **Auto-Deploy**: Every push to `main` triggers automatic builds

## Verification Commands

After connecting, verify with:

```bash
# Check app status
aws amplify get-app --app-id du4k9xr4pdicg --region eu-west-2

# List branches  
aws amplify list-branches --app-id du4k9xr4pdicg --region eu-west-2

# Monitor build progress
aws amplify list-jobs --app-id du4k9xr4pdicg --branch-name main --region eu-west-2
```

## Next Steps

1. **Connect GitHub**: Complete the setup in AWS Console
2. **Verify Build**: Check that first build succeeds
3. **Custom Domain**: Set up https://classreflect.gdwd.co.uk
4. **Test Auto-Deploy**: Push a change to test automation

**Ready to connect! Go to the console and follow the steps above.** 🚀