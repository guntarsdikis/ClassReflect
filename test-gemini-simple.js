// Simple test to verify Gemini integration compiles and loads
require('dotenv').config({ path: './backend/.env' });

async function testGeminiIntegration() {
  try {
    console.log('=== Gemini Integration Test ===');

    // Test environment variables
    console.log('1. Environment Check:');
    console.log('   ✓ GOOGLE_API_KEY exists:', !!process.env.GOOGLE_API_KEY);
    console.log('   ✓ GEMINI_MODEL:', process.env.GEMINI_MODEL || 'gemini-pro (default)');
    console.log('   ✓ ANALYSIS_PROVIDER:', process.env.ANALYSIS_PROVIDER);

    // Test module imports
    console.log('\n2. Module Loading:');

    try {
      const { getDefaultAnalysisProvider } = require('./backend/src/services/analysisProvider');
      console.log('   ✓ Analysis Provider loaded');
      console.log('   ✓ Default provider:', getDefaultAnalysisProvider());
    } catch (error) {
      console.log('   ❌ Analysis Provider error:', error.message);
    }

    try {
      const { geminiProvider } = require('./backend/src/services/geminiProvider');
      console.log('   ✓ Gemini Provider loaded');
      console.log('   ✓ Has analyze method:', typeof geminiProvider.analyze === 'function');
    } catch (error) {
      console.log('   ❌ Gemini Provider error:', error.message);
    }

    console.log('\n3. Database Check:');
    try {
      const { promptManager } = require('./backend/src/services/promptManager');
      console.log('   ✓ Prompt Manager loaded');

      // Test database connection and prompt retrieval
      const geminiPrompt = await promptManager.getActivePrompt('gemini', 'analysis_prompt');
      console.log('   ✓ Gemini prompt exists:', !!geminiPrompt);
      if (geminiPrompt) {
        console.log('   ✓ Prompt ID:', geminiPrompt.id);
        console.log('   ✓ Prompt length:', geminiPrompt.prompt_template.length, 'chars');
      }
    } catch (error) {
      console.log('   ❌ Database/PromptManager error:', error.message);
    }

    console.log('\n✅ Integration test completed!');

  } catch (error) {
    console.error('❌ Test failed:', error);
  }
}

testGeminiIntegration();