# Adding Gemini Support to ClassReflect

## ✅ Completed Tasks

### 1. Database Schema Updates
- ✅ Added `gemini` to provider ENUM in `prompts` and `prompt_history` tables
- ✅ Added `gemini_prompt_id` column to `templates` table
- ✅ Updated stored procedures to support Gemini provider validation
- ✅ Applied changes to both local and production databases

### 2. Backend Updates
- ✅ Updated TypeScript types to include `'lemur' | 'openai' | 'gemini'`
- ✅ Updated all API routes in `prompts.ts` to accept Gemini
- ✅ Updated `analysisProvider.ts` type definitions
- ✅ Updated `systemSettings.ts` to include Gemini option
- ✅ Updated `promptManager.ts` interfaces and methods
- ✅ Updated settings route validation
- ✅ Created placeholder `geminiProvider.ts` service

### 3. Frontend Updates
- ✅ Updated `SystemSettings.tsx` provider selection
- ✅ Updated `PromptManager.tsx` provider types and dropdown

## 🔄 Remaining Tasks

### 4. Complete Frontend Template Assignment
The template assignment section in `PromptManager.tsx` needs Gemini support:

```tsx
// Update the assignment interface to include:
interface TemplateAssignment {
  lemur_prompt_id: number | null;
  openai_prompt_id: number | null;
  gemini_prompt_id: number | null;  // ADD THIS
  lemur_version: number | null;
  openai_version: number | null;
  gemini_version: number | null;    // ADD THIS
  gemini_active: boolean | null;    // ADD THIS
}

// Update the updateTemplateAssignment function to:
const updateTemplateAssignment = async (
  templateId: number,
  lemurPromptId: number | null,
  openaiPromptId: number | null,
  geminiPromptId: number | null    // ADD THIS
) => {
  await apiClient.post(`/prompts/template/${templateId}/assign`, {
    lemur_prompt_id: lemurPromptId,
    openai_prompt_id: openaiPromptId,
    gemini_prompt_id: geminiPromptId  // ADD THIS
  });
};

// Add Gemini column to template assignments table
```

### 5. Implement Gemini API Integration
The `geminiProvider.ts` currently returns an error. To implement:

1. **Get Google Gemini API Key**: Set up `GOOGLE_API_KEY` or `GEMINI_API_KEY` in environment
2. **Install Google Gemini SDK**: `npm install @google/generative-ai`
3. **Implement the service**:

```typescript
import { GoogleGenerativeAI } from '@google/generative-ai';

const genAI = new GoogleGenerativeAI(process.env.GOOGLE_API_KEY!);

export const geminiProvider: GeminiProvider = {
  async analyze(transcript, criteria, metadata) {
    try {
      // Get active Gemini prompt from database
      const promptManager = require('./promptManager').default;
      const activePrompt = await promptManager.getActivePrompt('gemini', 'analysis_prompt');

      if (!activePrompt) {
        throw new Error('No active Gemini prompt found');
      }

      // Process prompt template
      const processedPrompt = processPromptTemplate(
        activePrompt.prompt_template,
        transcript,
        criteria,
        metadata
      );

      // Call Gemini API
      const model = genAI.getGenerativeModel({ model: "gemini-pro" });
      const result = await model.generateContent(processedPrompt);
      const response = await result.response;
      const analysisText = response.text();

      // Parse JSON response (same format as OpenAI/Lemur)
      const analysis = JSON.parse(analysisText);

      return {
        success: true,
        analysis
      };
    } catch (error) {
      return {
        success: false,
        error: `Gemini analysis failed: ${error.message}`
      };
    }
  }
};
```

### 6. Update Analysis Provider Switch
In `analysisProvider.ts`, add Gemini to the provider switch:

```typescript
import { geminiProvider } from './geminiProvider';

export async function analyzeWithProvider(
  provider: AnalysisProviderName,
  // ... other params
) {
  switch (provider) {
    case 'lemur':
      return lemurService.analyze(/* params */);
    case 'openai':
      return openaiProvider.analyze(/* params */);
    case 'gemini':
      return geminiProvider.analyze(/* params */);  // ADD THIS
    default:
      throw new Error(`Unknown provider: ${provider}`);
  }
}
```

### 7. Add Environment Variable
Add to your `.env` files:
```bash
# Backend .env
GOOGLE_API_KEY=your_gemini_api_key_here
# or
GEMINI_API_KEY=your_gemini_api_key_here
```

### 8. Create Initial Gemini Prompts
Once the system is working, create initial Gemini prompts via the API or directly in database:

```sql
INSERT INTO prompts (provider, name, description, prompt_template, version, is_active, created_by)
VALUES (
  'gemini',
  'analysis_prompt',
  'Gemini version of analysis prompt',
  'Your Gemini-optimized prompt template here...',
  1,
  TRUE,
  'system'
);
```

## 🧪 Testing Steps

1. **Database**: Verify all tables have Gemini columns
2. **Backend**: Test API endpoints accept Gemini provider
3. **Frontend**: Check that Gemini appears in dropdowns
4. **Integration**: Test full workflow with Gemini API
5. **Templates**: Verify template assignments work with Gemini

## 📝 Usage

Once implemented, users can:
1. Select "Gemini" in System Settings
2. Create/edit Gemini-specific prompts
3. Assign Gemini prompts to evaluation templates
4. Run analyses using Google Gemini instead of Claude/OpenAI

The system now supports all three major AI providers with independent prompt management and template assignments.