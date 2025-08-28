# GitHub Integration Setup for ClassReflect

## Current Status
- ✅ Amplify App Created: `d14hcrbx0hhror` 
- ✅ Vite Frontend Deployed: https://main.d14hcrbx0hhror.amplifyapp.com
- ✅ Custom Domain Configured: https://classreflect.gdwd.co.uk (setting up...)
- ✅ Auto-build Enabled
- ✅ Webhook Created for manual triggers

## Option 1: Full GitHub Integration (Recommended)

### Manual Setup via AWS Console
1. Go to: https://eu-west-2.console.aws.amazon.com/amplify/home?region=eu-west-2#/d14hcrbx0hhror/settings/general
2. Click **"Connect to Git provider"**
3. Select **GitHub** and authorize the Amplify GitHub App
4. Select repository: **guntarsdikis/classreflect**
5. Select branch: **main**
6. Confirm build settings (should use existing `amplify.yml`)

### Benefits
- Automatic deployment on every git push
- Pull request previews (if enabled)
- Full integration with GitHub status checks

## Option 2: Webhook Integration (Alternative)

### Webhook URL
```
https://webhooks.amplify.eu-west-2.amazonaws.com/prod/webhooks?id=a60ae43e-82c1-430a-b83c-6580f7acdb11&token=CHNjEu3y3XPjvy0HoCXDAvlVyuFugzZIEp6LV9TU
```

### Manual Trigger
```bash
curl -X POST "https://webhooks.amplify.eu-west-2.amazonaws.com/prod/webhooks?id=a60ae43e-82c1-430a-b83c-6580f7acdb11&token=CHNjEu3y3XPjvy0HoCXDAvlVyuFugzZIEp6LV9TU"
```

### GitHub Actions Integration
Add this to `.github/workflows/deploy.yml`:
```yaml
name: Deploy to Amplify
on:
  push:
    branches: [main]
jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
      - name: Trigger Amplify Build
        run: |
          curl -X POST "${{ secrets.AMPLIFY_WEBHOOK_URL }}"
```

Then add the webhook URL as a GitHub secret named `AMPLIFY_WEBHOOK_URL`.

## Current App Configuration

### Environment Variables
- `VITE_API_URL`: https://api.classreflect.gdwd.co.uk
- `VITE_APP_URL`: https://classreflect.gdwd.co.uk
- `VITE_AWS_REGION`: eu-west-2

### Build Specification
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

### Custom Routing
- SPA fallback configured: `/<*>` → `/index.html` (404-200)

## Testing the Setup

1. **Manual Build Trigger**: Use the webhook URL above
2. **Test Deployment**: Visit https://main.d14hcrbx0hhror.amplifyapp.com
3. **Domain Verification**: Once DNS propagates, visit https://classreflect.gdwd.co.uk

## Next Steps

1. **Complete GitHub Integration**: Follow Option 1 for full automation
2. **Domain Setup**: Wait for DNS propagation to complete
3. **Test Functionality**: Verify the deployed Vite frontend works correctly
4. **Add Authentication**: Implement mock authentication system
5. **Connect Backend**: Ensure API integration works with the deployed frontend

## Commands Reference

```bash
# Check app status
aws amplify get-app --app-id d14hcrbx0hhror --region eu-west-2

# Check domain status  
aws amplify get-domain-association --app-id d14hcrbx0hhror --domain-name classreflect.gdwd.co.uk --region eu-west-2

# List build jobs
aws amplify list-jobs --app-id d14hcrbx0hhror --branch-name main --region eu-west-2

# Trigger manual build
curl -X POST "https://webhooks.amplify.eu-west-2.amazonaws.com/prod/webhooks?id=a60ae43e-82c1-430a-b83c-6580f7acdb11&token=CHNjEu3y3XPjvy0HoCXDAvlVyuFugzZIEp6LV9TU"
```