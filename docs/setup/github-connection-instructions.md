# GitHub Connection Instructions for ClassReflect

## New Amplify App Created
- **App ID**: `d34b7ce4h4zx2d`
- **App Name**: `classreflect-github` 
- **Default URL**: https://main.d34b7ce4h4zx2d.amplifyapp.com

## Step 1: Connect to GitHub (Required)

### Manual Setup via AWS Console
1. **Go to the Amplify Console**: 
   ```
   https://eu-west-2.console.aws.amazon.com/amplify/home?region=eu-west-2#/d34b7ce4h4zx2d
   ```

2. **Connect Repository**:
   - Click **"Connect branch"** 
   - Select **"GitHub"** as the repository service
   - Click **"Continue"** to authorize the Amplify GitHub App
   - Select repository: **`guntarsdikis/classreflect`**
   - Select branch: **`main`**

3. **Configure Build Settings**:
   - The build configuration is already set up for `frontend-new` directory
   - **Build spec is pre-configured** - just confirm and continue
   - Click **"Save and deploy"**

## Step 2: Verify Configuration

### Expected Build Process
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

### Environment Variables (Pre-configured)
- `VITE_API_URL`: https://api.classreflect.gdwd.co.uk
- `VITE_APP_URL`: https://classreflect.gdwd.co.uk  
- `VITE_AWS_REGION`: eu-west-2

### Custom Routes (Pre-configured)
- SPA fallback: `/<*>` → `/index.html` (404-200)

## What Happens After GitHub Connection

1. **Automatic Deploy**: Amplify will immediately start building from the `main` branch
2. **Build Location**: Uses `frontend-new/` directory with Vite configuration
3. **Auto-Deploy**: Future pushes to `main` branch will automatically trigger builds
4. **Branch Protection**: Only `main` branch will be connected for deployments

## Troubleshooting

### If Build Fails
- Check that `frontend-new/package.json` exists
- Verify `npm run build` works locally in `frontend-new/`
- Check build logs in the Amplify console

### If Wrong Directory is Used
- The build spec is pre-configured for `frontend-new`
- If it defaults to root, update build spec in the console

## Next Steps After Connection

1. **Verify Deployment**: Check that the site loads with Vite frontend
2. **Set Up Custom Domain**: Configure https://classreflect.gdwd.co.uk
3. **Test Auto-Deploy**: Make a small change and push to test automation

## Commands to Run After Setup

```bash
# Check app status
aws amplify get-app --app-id d34b7ce4h4zx2d --region eu-west-2

# List branches (should show main branch after GitHub connection)
aws amplify list-branches --app-id d34b7ce4h4zx2d --region eu-west-2

# Check recent builds
aws amplify list-jobs --app-id d34b7ce4h4zx2d --branch-name main --region eu-west-2
```

**Please complete the GitHub connection in the AWS Console, then let me know when it's done so I can set up the custom domain!**