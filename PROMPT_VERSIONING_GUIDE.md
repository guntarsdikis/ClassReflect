# Prompt Versioning Guide

## Overview

ClassReflect uses a **prompt versioning system** to manage and iterate on AI prompts for each provider (LeMUR, OpenAI, Gemini, Vertex, OpenRouter).

---

## 🎯 Key Concepts

### **Prompts**
- Each provider has its own set of prompts
- Prompts have versions (v1, v2, v3, etc.)
- Only one version is "active" at a time
- Active version is used for new analyses

### **Versioning**
- Create new versions to test improvements
- Compare versions side-by-side
- Revert to previous versions if needed
- Full history tracking with change descriptions

---

## 🖥️ Using the Prompt Management UI

### **Access**
Navigate to: `http://localhost:3002/prompts` (requires super_admin role)

### **1. Select Provider**

At the top-right, use the dropdown to select:
- **LeMUR (Claude)** - AssemblyAI's LeMUR service
- **OpenAI (GPT)** - Direct OpenAI API
- **Google Gemini** - Direct Gemini API
- **Vertex AI (Gemini)** - GCP-hosted Gemini
- **OpenRouter** - Unified gateway for all models

### **2. View Current Version**

The **Current Version** tab shows:
- Active prompt and its version number
- Prompt template content
- Description and metadata
- When it was created and by whom

### **3. Create a New Version**

**Steps:**
1. Click **"Create New Version"** button
2. Edit the prompt template in the editor
3. Add a description (what this version does)
4. Add a change description (what you changed from previous version)
5. Click **Save**

**Result:**
- New version created (auto-increments: v1 → v2 → v3)
- New version becomes the **active** version
- Previous version saved in history

### **4. View All Versions**

Click **"All Versions"** tab to see:
- Complete version history
- Which version is currently active
- Creation dates and authors
- Version-specific descriptions

**Actions available:**
- **View**: See full prompt content
- **Edit**: Create a new version based on this one
- **Set Active**: Make this version the active one
- **Copy**: Copy prompt to clipboard

### **5. Compare Versions**

**Not yet implemented** - Will allow side-by-side comparison of different versions.

### **6. Template Assignments**

**Not yet implemented** - Will allow assigning specific prompt versions to specific templates.

---

## 📊 Understanding the Stats

At the top of the page, you'll see:
- **Total Prompts**: Number of prompt configurations
- **Active Prompts**: Number of currently active prompts
- **Total Versions**: Sum of all versions across all prompts
- **Total Tests**: Number of test runs (future feature)

---

## 🔧 How Versioning Works (Technical)

### **Database Structure**

```sql
prompts table:
- id: Unique identifier
- provider: 'lemur' | 'openai' | 'gemini' | 'vertex' | 'openrouter'
- name: 'analysis_prompt' (default)
- prompt_template: The actual prompt text
- version: Auto-incrementing version number
- is_active: Only one version per provider can be active
- description: What this prompt does
- created_by: User who created it
- created_at: Timestamp

prompt_history table:
- Tracks all changes with change_description
- Links back to original prompt_id
```

### **Version Lifecycle**

```
Create Prompt v1 (active: true)
    ↓
Create v2 → v1 becomes inactive, v2 active
    ↓
Create v3 → v2 becomes inactive, v3 active
    ↓
Revert to v2 → v3 inactive, v2 active again
```

---

## 🚀 Common Workflows

### **Workflow 1: Testing a New Prompt Approach**

1. Select your provider (e.g., OpenRouter)
2. Click "Create New Version"
3. Modify the prompt template
4. Save with description: "Testing more specific criteria guidance"
5. Run analyses → Check results
6. If better: Keep it active
7. If worse: Revert to previous version

### **Workflow 2: Provider-Specific Optimization**

Different providers may need different prompt styles:

**OpenAI/GPT-4:**
- Can handle complex, nuanced instructions
- Works well with examples

**Gemini:**
- Prefers structured, clear formatting
- Better with explicit JSON schemas

**OpenRouter:**
- Depends on the selected model
- Start with Gemini prompt and iterate

### **Workflow 3: A/B Testing**

1. Create version A with approach 1
2. Run 10 analyses, note quality
3. Create version B with approach 2
4. Run 10 analyses, compare results
5. Keep the better performing version

---

## 💡 Best Practices

### **Prompt Engineering Tips**

1. **Be Specific**: Clear, concrete instructions work best
2. **Use Examples**: Show the format you want
3. **Set Constraints**: Specify output length, format, style
4. **Test Iteratively**: Small changes, measure impact
5. **Document Changes**: Use descriptive change descriptions

### **Version Management**

1. **Don't delete versions**: Keep history for reference
2. **Use meaningful descriptions**: Future-you will thank you
3. **Test before activating**: Run a few test analyses
4. **Document major changes**: Note in change_description what and why

### **Provider Selection**

Choose provider based on:
- **Cost**: OpenRouter > Direct APIs
- **Quality**: GPT-4o > Claude > Gemini
- **Speed**: Gemini Flash > Others
- **Compliance**: Vertex AI (GCP enterprise) > Others

---

## 🔍 Troubleshooting

### **"No active prompt found"**

**Cause**: No prompt version is marked as active for that provider

**Fix**:
```bash
# Via UI: Select a version and click "Set Active"

# Via Database:
mysql -h localhost -u root -proot classreflect -e "
  UPDATE prompts
  SET is_active = TRUE
  WHERE provider = 'openrouter'
    AND name = 'analysis_prompt'
  ORDER BY version DESC
  LIMIT 1;
"
```

### **"Error fetching prompts"**

**Cause**: API endpoint issue or authentication problem

**Check**:
1. Backend is running (`npm run dev` in backend/)
2. You're logged in as super_admin
3. Database connection is working

### **"Version creation failed"**

**Cause**: Database constraint violation or validation error

**Common issues**:
- Empty prompt template
- Invalid provider name
- Database connection lost

**Fix**: Check backend logs for specific error

---

## 📝 Example: Creating Your First OpenRouter Prompt

### **Step-by-Step**

1. **Access Prompt Management**
   ```
   Navigate to: /prompts
   ```

2. **Select OpenRouter**
   ```
   Dropdown → "OpenRouter"
   ```

3. **View Current Prompt**
   ```
   Should show: "OpenRouter version - Dynamic evaluation template..."
   Version: 1 (copied from Gemini)
   ```

4. **Create New Version**
   ```
   Click: "Create New Version"
   ```

5. **Edit Prompt**
   ```
   Modify template to optimize for your selected model
   Example changes:
   - Adjust tone for Claude vs GPT-4
   - Simplify for Gemini Flash
   - Add model-specific instructions
   ```

6. **Save**
   ```
   Description: "Optimized for Claude Sonnet 4"
   Change Description: "Adjusted tone and added explicit JSON schema"
   Click: "Save"
   ```

7. **Test**
   ```
   Run analysis on a test recording
   Check output quality
   ```

8. **Iterate or Revert**
   ```
   Better? → Keep it
   Worse? → Revert to v1
   ```

---

## 🎓 Advanced: Template-Specific Prompts

**Coming Soon**: Assign different prompt versions to different templates.

**Use Case**:
- "Teach Like a Champion" template → Specific prompt focusing on TLAC techniques
- "General Feedback" template → Broader, more flexible prompt

**Benefits**:
- Template-optimized prompts
- A/B test template-specific approaches
- Fine-tune for different evaluation frameworks

---

## 📚 Resources

- **Prompt Engineering Guide**: https://www.promptingguide.ai/
- **OpenAI Best Practices**: https://platform.openai.com/docs/guides/prompt-engineering
- **Anthropic Prompt Library**: https://docs.anthropic.com/claude/prompt-library

---

## ✅ Quick Reference

| Action | How To |
|--------|--------|
| **Switch Provider** | Dropdown → Select provider |
| **View Active** | Current Version tab |
| **Create Version** | Create New Version button |
| **View History** | All Versions tab |
| **Revert** | All Versions → Select version → Set Active |
| **Export** | Export button (top-right) |
| **Refresh** | Refresh button (top-right) |

---

**Need help?** Check backend logs or database for detailed error information.