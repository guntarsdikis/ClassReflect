# OpenRouter Setup Guide

## ✅ Migration Complete!

ClassReflect has been successfully migrated to OpenRouter for simplified AI model management.

## 🚀 Quick Start

### 1. Get Your OpenRouter API Key

Visit: https://openrouter.ai/keys

- Sign up/login
- Create a new API key
- Copy your key (starts with `sk-or-v1-...`)

### 2. Update Your `.env` File

```bash
# Set OpenRouter as your provider
ANALYSIS_PROVIDER=openrouter

# Add your API key
OPENROUTER_API_KEY=sk-or-v1-your-key-here

# Choose your model (recommended options below)
OPENROUTER_MODEL=google/gemini-pro-1.5
```

### 3. Start the Backend

```bash
npm run dev
```

That's it! Your backend will now use OpenRouter for all AI analysis.

## 🎯 Recommended Models

| Model | Use Case | Cost per 1M tokens |
|-------|----------|-------------------|
| `google/gemini-pro-1.5` | **Recommended** - Best balance of quality/cost | ~$1.25 |
| `google/gemini-flash-1.5` | Faster, cheaper, good quality | ~$0.08 |
| `openai/gpt-4o` | Highest quality analysis | ~$5.00 |
| `openai/gpt-4o-mini` | Fast and cheap | ~$0.30 |
| `anthropic/claude-3.5-sonnet` | Excellent reasoning | ~$3.00 |

## ⚙️ Configuration Options

All settings in your `.env`:

```bash
# Core settings
OPENROUTER_API_KEY=sk-or-v1-xxx
OPENROUTER_MODEL=google/gemini-pro-1.5

# Fine-tuning (optional)
OPENROUTER_TEMPERATURE=0.6          # Creativity (0-2, default: 0.6)
OPENROUTER_MAX_TOKENS=16384         # Max response length
OPENROUTER_BATCH_SIZE=3             # Criteria per batch (1-20)
OPENROUTER_FORCE_SINGLE_PROMPT=false  # Process all criteria at once
OPENROUTER_DISABLE_FALLBACK=false   # Disable per-criterion retry on failure
OPENROUTER_OUTPUT_MODE=minimal      # minimal | rich (verbosity)
```

## 🧪 Testing

Test your setup:

```bash
# Run the backend
npm run dev

# Upload a test recording via the frontend
# Select a template and click "Analyze"
# Check logs for: "🤖 [OpenRouter] Calling..."
```

## 💰 Cost Tracking

Monitor your usage at: https://openrouter.ai/activity

Expected costs for ClassReflect:
- ~$0.01-0.05 per lesson analysis (depending on model)
- Typical usage: $5-20/month for pilot school

## 🔄 Switching Models

To test different models, just update your `.env`:

```bash
# Try Gemini Flash (faster, cheaper)
OPENROUTER_MODEL=google/gemini-flash-1.5

# Try GPT-4o (highest quality)
OPENROUTER_MODEL=openai/gpt-4o

# Try Claude (excellent reasoning)
OPENROUTER_MODEL=anthropic/claude-3.5-sonnet
```

No code changes needed - restart backend and test!

## 📊 What Changed?

### Files Added:
- `backend/src/services/openRouterProvider.ts` - New unified provider

### Files Modified:
- `backend/src/services/analysisProvider.ts` - Added OpenRouter integration
- `backend/src/services/promptLogger.ts` - Added 'openrouter' type
- `backend/src/services/promptManager.ts` - Added 'openrouter' type
- `backend/.env` - Added OpenRouter configuration
- `backend/.env.example` - Added OpenRouter template

### Old Files (Still Available):
- `geminiProvider.ts` - Direct Gemini API (if needed)
- `vertexProvider.ts` - Vertex AI (if needed)
- `openaiProvider.ts` - Direct OpenAI (if needed)

You can switch back anytime by changing `ANALYSIS_PROVIDER` in `.env`.

## 🎉 Benefits

✅ **Simplified**: One API for all models
✅ **Flexible**: Switch models instantly
✅ **Cost-effective**: ~10-20% markup, negligible at current scale
✅ **No auth issues**: Single API key, no GCP/AWS complexity
✅ **Easy testing**: A/B test models with config changes only

## 🔒 Data Privacy

- Data passes through OpenRouter's infrastructure
- Review privacy policy: https://openrouter.ai/privacy
- For 100+ schools or strict compliance, consider direct APIs

## 🆘 Troubleshooting

**"OpenRouter API key not configured"**
```bash
# Make sure your .env has:
OPENROUTER_API_KEY=sk-or-v1-your-actual-key
```

**"Model not found"**
```bash
# Check available models at: https://openrouter.ai/models
# Use exact model ID format: provider/model-name
```

**"Rate limit exceeded"**
```bash
# Add credits to your OpenRouter account
# Or reduce OPENROUTER_BATCH_SIZE to slow down requests
```

## 🔗 Resources

- OpenRouter Dashboard: https://openrouter.ai/
- Model List: https://openrouter.ai/models
- API Docs: https://openrouter.ai/docs
- Pricing: https://openrouter.ai/docs#models

---

**Need help?** Check backend logs for detailed error messages.