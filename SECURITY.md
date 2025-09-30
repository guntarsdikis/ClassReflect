# Security Guidelines for ClassReflect

## 🔐 API Keys and Secrets

### ✅ What's Protected

All sensitive information is properly secured:

- ✅ **Backend `.env`** - Not tracked by git (in `.gitignore`)
- ✅ **Production secrets** - Stored in AWS Secrets Manager
- ✅ **Deployment scripts** - No hardcoded keys (reads from environment)
- ✅ **Git repository** - Scanned for exposed keys (none found)

### 🚫 Never Commit These

**API Keys:**
- AssemblyAI API keys
- OpenAI API keys
- Google/Gemini API keys
- Vertex AI API keys
- OpenRouter API keys
- AWS Access Keys (AKIA...)
- JWT secrets

**Credentials:**
- Database passwords
- AWS credentials files
- Private keys (*.pem, *.key)
- SSH keys

### 📋 .gitignore Coverage

The repository `.gitignore` includes:

```gitignore
# Environment files
.env
.env.*
*.env

# AWS credentials
.aws/
*.pem
*.key
*.credentials
aws-credentials.json

# API Keys and Secrets
*api-key*
*secret-key*
*apikey*
secrets.txt
secrets.json
.secrets
```

### 🔍 How to Check for Exposed Keys

Before committing:

```bash
# Check what will be committed
git status

# Search for API key patterns in staged files
git diff --cached | grep -E "sk-|AKIA|AIzaSy|api.*key.*="

# Search entire repository
git grep -i "AKIA\|sk-proj\|sk-or-v1\|AIzaSy" | grep -v ".gitignore\|.md"
```

### 🛡️ Using Secrets Safely

#### Local Development

Use `backend/.env` for local API keys (already gitignored):

```bash
# backend/.env
OPENAI_API_KEY=sk-proj-your-key-here
GOOGLE_API_KEY=AIzaSy...
OPENROUTER_API_KEY=sk-or-v1-...
```

#### Production Deployment

**Option 1: From Environment Variables**

```bash
# Export keys first
export GOOGLE_API_KEY="your-key"
export OPENROUTER_API_KEY="your-key"

# Then run deployment
UPDATE_SECRETS=true ./scripts/deployment/update-ecs-config.sh
```

**Option 2: Update AWS Secrets Manager Directly**

```bash
# Update a single secret
aws secretsmanager put-secret-value \
  --secret-id classreflect/openrouter/api-key \
  --secret-string '{"apikey":"sk-or-v1-your-key"}' \
  --region eu-west-2

# Force ECS to pick up new secret
aws ecs update-service \
  --cluster classreflect-cluster \
  --service classreflect-api-service \
  --force-new-deployment \
  --region eu-west-2
```

**Option 3: Interactive Update Script**

```bash
./scripts/deployment/update-secrets.sh
# Will prompt for each secret
```

### 📝 Example Files

#### `.env.example` (Safe to Commit)

```bash
# API Keys (DO NOT use real keys here)
OPENAI_API_KEY=sk-proj-your-key-here
GOOGLE_API_KEY=your-google-api-key
OPENROUTER_API_KEY=sk-or-v1-your-key-here

# Database (use real values in .env)
DB_HOST=localhost
DB_USER=root
DB_PASSWORD=your-password
```

#### `.env` (NEVER Commit)

```bash
# Real API keys here - DO NOT COMMIT THIS FILE
OPENAI_API_KEY=sk-proj-abc123...real-key...
GOOGLE_API_KEY=AIzaSy...real-key...
OPENROUTER_API_KEY=sk-or-v1-...real-key...
```

### 🚨 If Keys Are Exposed

If API keys are accidentally committed:

1. **Immediately revoke the exposed keys**
   - OpenAI: https://platform.openai.com/api-keys
   - Google Cloud: https://console.cloud.google.com/apis/credentials
   - OpenRouter: https://openrouter.ai/keys

2. **Generate new keys**

3. **Update production secrets:**
   ```bash
   UPDATE_SECRETS=true ./scripts/deployment/update-ecs-config.sh
   ```

4. **Remove from git history:**
   ```bash
   # Use git-filter-repo (recommended) or BFG Repo-Cleaner
   git filter-repo --path backend/.env --invert-paths

   # Force push (⚠️ coordinate with team first)
   git push origin --force --all
   ```

### 🔒 Production Secrets Storage

All production secrets are in **AWS Secrets Manager**:

| Secret Name | Contains |
|-------------|----------|
| `classreflect/database/credentials` | DB connection info |
| `classreflect/assemblyai/api-key` | AssemblyAI key |
| `classreflect/openai/api-key` | OpenAI key |
| `classreflect/google/api-key` | Google/Gemini key |
| `classreflect/vertex/config` | Vertex AI key + project |
| `classreflect/openrouter/api-key` | OpenRouter key |
| `classreflect/jwt-secret` | JWT signing secret |

**View secrets:**
```bash
aws secretsmanager list-secrets --region eu-west-2 | grep classreflect
```

**Get a secret:**
```bash
aws secretsmanager get-secret-value \
  --secret-id classreflect/openrouter/api-key \
  --region eu-west-2 \
  --query SecretString \
  --output text
```

### 📚 Best Practices

1. ✅ **Use environment variables** - Never hardcode keys in code
2. ✅ **Keep .env local only** - Already in `.gitignore`
3. ✅ **Use AWS Secrets Manager** - For production secrets
4. ✅ **Rotate keys regularly** - Especially after team changes
5. ✅ **Limit key permissions** - Use service-specific API keys
6. ✅ **Monitor usage** - Check API key usage dashboards
7. ✅ **Review before commit** - Run `git diff --cached` first

### 🔗 Related Documentation

- [Updating Environment Variables](docs/deployment/UPDATING_ENV_VARIABLES.md)
- [Deployment Guide](CLAUDE.md#deployment)
- [AWS Secrets Manager Docs](https://docs.aws.amazon.com/secretsmanager/)

---

**Last Updated:** 2025-09-30
**Status:** ✅ All secrets secured, no exposed keys in git repository