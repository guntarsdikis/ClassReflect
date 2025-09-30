require('dotenv').config({ path: './backend/.env' });

console.log('=== Gemini Configuration Test ===');
console.log('GOOGLE_API_KEY exists:', !!process.env.GOOGLE_API_KEY);
console.log('GOOGLE_API_KEY length:', process.env.GOOGLE_API_KEY ? process.env.GOOGLE_API_KEY.length : 0);
console.log('GEMINI_MODEL:', process.env.GEMINI_MODEL || 'gemini-pro (default)');
console.log('ANALYSIS_PROVIDER:', process.env.ANALYSIS_PROVIDER);

// Test if the geminiProvider module can be loaded
try {
  const { geminiProvider } = require('./backend/src/services/geminiProvider');
  console.log('✅ Gemini provider module loaded successfully');
  console.log('Gemini provider type:', typeof geminiProvider);
  console.log('Has analyze method:', typeof geminiProvider.analyze === 'function');
} catch (error) {
  console.log('❌ Error loading Gemini provider:', error.message);
}

// Test analysis provider
try {
  const { getDefaultAnalysisProvider } = require('./backend/src/services/analysisProvider');
  console.log('Default provider:', getDefaultAnalysisProvider());
} catch (error) {
  console.log('❌ Error loading analysis provider:', error.message);
}