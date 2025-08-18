# GitHub Personal Access Token Setup for AWS Amplify

## Create GitHub Personal Access Token

1. Go to GitHub Settings: https://github.com/settings/tokens
2. Click "Generate new token" → "Generate new token (classic)"
3. Give it a name: "AWS Amplify ClassReflect"
4. Select scopes:
   - ✅ repo (all)
   - ✅ admin:repo_hook
5. Click "Generate token"
6. Copy the token (starts with `ghp_`)

## Connect to Amplify via CLI

```bash
# Set the token as environment variable
export GITHUB_TOKEN=ghp_YOUR_TOKEN_HERE

# Update Amplify app with GitHub connection
aws amplify update-app \
  --app-id d19wjd0is4gto9 \
  --repository https://github.com/guntarsdikis/ClassReflect \
  --access-token $GITHUB_TOKEN \
  --region eu-west-2

# Start a build
aws amplify start-job \
  --app-id d19wjd0is4gto9 \
  --branch-name main \
  --job-type RELEASE \
  --region eu-west-2
```

## Verify Deployment

After connection, every push to `main` branch will trigger automatic deployment.

Check status at: https://eu-west-2.console.aws.amazon.com/amplify/apps/d19wjd0is4gto9