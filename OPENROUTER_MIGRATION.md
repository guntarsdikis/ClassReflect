# OpenRouter Migration Summary

## ✅ Complete Migration to OpenRouter

ClassReflect has been successfully migrated to use OpenRouter as a unified AI model gateway, simplifying model management and authentication.

---

## 🎯 What Changed

### Backend Changes

**New Files:**
- ✅ `backend/src/services/openRouterProvider.ts` - Unified provider for all OpenRouter models

**Updated Files:**
- ✅ `backend/src/services/analysisProvider.ts` - Added OpenRouter integration
- ✅ `backend/src/services/promptLogger.ts` - Added 'openrouter' provider type
- ✅ `backend/src/services/promptManager.ts` - Added 'openrouter' provider type
- ✅ `backend/src/services/systemSettings.ts` - Added OpenRouter settings support
- ✅ `backend/src/routes/settings.ts` - Added OpenRouter API endpoints
- ✅ `backend/.env` - Added OpenRouter configuration
- ✅ `backend/.env.example` - Added OpenRouter template

### Frontend Changes

**Updated Files:**
- ✅ `frontend/src/features/settings/components/SystemSettings.tsx` - Added OpenRouter UI option

---

## 🚀 How to Use

### 1. Get OpenRouter API Key

Visit https://openrouter.ai/keys and create an API key.

### 2. Update Backend `.env`

```bash
# Set provider to OpenRouter
ANALYSIS_PROVIDER=openrouter

# Add your API key
OPENROUTER_API_KEY=sk-or-v1-your-key-here

# Choose your model
OPENROUTER_MODEL=google/gemini-pro-1.5
```

### 3. Start Services

```bash
# Backend
cd backend && npm run dev

# Frontend (separate terminal)
cd frontend && npm run dev
```

### 4. Configure via UI

1. Navigate to `http://localhost:3002/settings`
2. Select **OpenRouter** from the provider options
3. Choose your model (e.g., `google/gemini-pro-1.5`)
4. Click **Save**

---

## 🎨 Available Models

| Model ID | Provider | Use Case | Cost/1M tokens |
|----------|----------|----------|----------------|
| `google/gemini-pro-1.5` | Google | **Recommended** - Best balance | ~$1.25 |
| `google/gemini-flash-1.5` | Google | Fast & cheap | ~$0.08 |
| `openai/gpt-4o` | OpenAI | Highest quality | ~$5.00 |
| `openai/gpt-4o-mini` | OpenAI | Fast & affordable | ~$0.30 |
| `anthropic/claude-3.5-sonnet` | Anthropic | Excellent reasoning | ~$3.00 |
| `meta-llama/llama-3.1-70b` | Meta | Open source option | ~$0.35 |

**Full list:** https://openrouter.ai/models

---

## ⚙️ Configuration Options

All configurable via backend `.env`:

```bash
# Required
OPENROUTER_API_KEY=sk-or-v1-xxx
OPENROUTER_MODEL=google/gemini-pro-1.5

# Optional tuning
OPENROUTER_TEMPERATURE=0.6          # 0-2, creativity level
OPENROUTER_MAX_TOKENS=16384         # Max response length
OPENROUTER_BATCH_SIZE=3             # Criteria per API call
OPENROUTER_FORCE_SINGLE_PROMPT=false  # All criteria in one call
OPENROUTER_DISABLE_FALLBACK=false   # Disable per-criterion retry
OPENROUTER_OUTPUT_MODE=minimal      # minimal | rich
```

---

## 🔄 Switching Models

### Via Backend `.env` (System-wide)

```bash
# Edit backend/.env
OPENROUTER_MODEL=openai/gpt-4o

# Restart backend
npm run dev
```

### Via Frontend UI (Runtime)

1. Go to **Settings** (super admin only)
2. Select **OpenRouter** provider
3. Enter model ID: `openai/gpt-4o`
4. Click **Save**

Changes take effect immediately on next analysis.

---

## 💰 Cost Tracking

**Monitor usage:**
- Dashboard: https://openrouter.ai/activity
- API usage tracking included
- Billing alerts available

**Expected costs for ClassReflect:**
- ~$0.01-0.05 per lesson analysis (depending on model)
- Typical pilot school: $5-20/month

**OpenRouter markup:**
- ~10-20% added to base model prices
- Worth it for simplification at current scale

---

## 🔒 Data & Privacy

**What to know:**
- Audio transcripts pass through OpenRouter's infrastructure
- OpenRouter Privacy Policy: https://openrouter.ai/privacy
- Suitable for pilot/development stage
- For 100+ schools: May need direct API contracts for compliance

**GDPR considerations:**
- Data processing agreement available from OpenRouter
- Review if serving EU schools at scale

---

## 🆘 Troubleshooting

### "OpenRouter API key not configured"

```bash
# Check backend/.env has:
OPENROUTER_API_KEY=sk-or-v1-your-actual-key
# Not the placeholder!
```

### "Model not found" or 404 errors

```bash
# Use exact model ID from https://openrouter.ai/models
# Format: provider/model-name
OPENROUTER_MODEL=google/gemini-pro-1.5  # ✅ Correct
OPENROUTER_MODEL=gemini-pro-1.5         # ❌ Wrong
```

### Rate limit errors

```bash
# Add credits to OpenRouter account
# Or reduce request frequency:
OPENROUTER_BATCH_SIZE=1  # Process fewer criteria per call
```

### Frontend doesn't show OpenRouter option

```bash
# Check:
1. Backend is running and updated
2. You're logged in as super_admin
3. Browser cache cleared (Cmd+Shift+R)
```

---

## 🔙 Reverting to Direct APIs

OpenRouter is recommended, but you can switch back anytime:

### Option 1: Via UI
1. Go to Settings
2. Select **Gemini**, **OpenAI**, or **LeMUR**
3. Save

### Option 2: Via `.env`
```bash
# Use direct Gemini API
ANALYSIS_PROVIDER=gemini
GEMINI_MODEL=gemini-1.5-pro

# Or use OpenAI directly
ANALYSIS_PROVIDER=openai
OPENAI_MODEL=gpt-4o

# Or use LeMUR (AssemblyAI)
ANALYSIS_PROVIDER=lemur
```

All provider implementations are still available in the codebase.

---

## 📊 Benefits Summary

| Aspect | Before | After |
|--------|--------|-------|
| **Providers** | 4 separate (LeMUR, OpenAI, Gemini, Vertex) | 1 unified (OpenRouter) |
| **Authentication** | 4 different API keys/methods | 1 API key |
| **Model switching** | Code changes + restart | Config change only |
| **GCP issues** | Vertex AI auth problems | ✅ No GCP needed |
| **Cost tracking** | Multiple dashboards | Single dashboard |
| **Model testing** | Complex setup per provider | Change one line |

---

## 📚 Resources

- **OpenRouter Dashboard:** https://openrouter.ai/
- **Model List & Pricing:** https://openrouter.ai/models
- **API Documentation:** https://openrouter.ai/docs
- **Activity Monitor:** https://openrouter.ai/activity
- **ClassReflect Setup Guide:** `backend/OPENROUTER_SETUP.md`

---

## ✨ Next Steps

1. **Get API Key:** Sign up at https://openrouter.ai/keys
2. **Update `.env`:** Add your `OPENROUTER_API_KEY`
3. **Test Analysis:** Upload a recording and run analysis
4. **Monitor Costs:** Check https://openrouter.ai/activity
5. **Experiment:** Try different models to find the best fit

---

**Questions?** Check logs or review `backend/OPENROUTER_SETUP.md` for detailed setup instructions.