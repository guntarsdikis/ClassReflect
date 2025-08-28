const puppeteer = require('puppeteer');

const testUsers = [
  {
    name: 'Super Admin',
    email: 'superadmin@test.local',
    password: 'AdminPass2024!@',
    expectedDashboard: 'admin'
  },
  {
    name: 'School Manager',
    email: 'manager@test.local',
    password: 'ManagerPass2024!@',
    expectedDashboard: 'dashboard'
  },
  {
    name: 'Teacher',
    email: 'teacher@test.local',
    password: 'TeacherPass2024!@',
    expectedDashboard: 'dashboard'
  }
];

async function testLogin(page, user) {
  console.log(`\n🧪 Testing ${user.name} login...`);
  
  try {
    // Navigate to login page
    await page.goto('http://localhost:3000/login', { 
      waitUntil: 'networkidle2',
      timeout: 10000 
    });
    
    console.log('  ✓ Login page loaded');
    
    // Wait for login form
    await page.waitForSelector('input[type="email"]', { timeout: 5000 });
    
    // Clear any existing values and type credentials
    await page.evaluate(() => {
      document.querySelector('input[type="email"]').value = '';
      document.querySelector('input[type="password"]').value = '';
    });
    
    await page.type('input[type="email"]', user.email);
    await page.type('input[type="password"]', user.password);
    console.log('  ✓ Credentials entered');
    
    // Submit form
    await page.click('button[type="submit"]');
    console.log('  ✓ Form submitted');
    
    // Wait for navigation or error
    await page.waitForTimeout(2000);
    
    // Check if we're still on login page (error) or redirected
    const currentUrl = page.url();
    
    if (currentUrl.includes('/login')) {
      // Check for error message
      const errorText = await page.evaluate(() => {
        const errorEl = document.querySelector('.mantine-Notification-description') || 
                       document.querySelector('[role="alert"]') ||
                       document.querySelector('.error-message');
        return errorEl ? errorEl.textContent : null;
      });
      
      if (errorText) {
        console.log(`  ❌ Login failed: ${errorText}`);
        return false;
      } else {
        console.log('  ⚠️  Still on login page, checking for other issues...');
        
        // Take a screenshot for debugging
        await page.screenshot({ path: `login-error-${user.name.replace(' ', '-')}.png` });
        console.log(`  📸 Screenshot saved: login-error-${user.name.replace(' ', '-')}.png`);
        return false;
      }
    } else if (currentUrl.includes(user.expectedDashboard)) {
      console.log(`  ✅ Successfully logged in! Redirected to: ${currentUrl}`);
      
      // Get user info from page if available
      const userInfo = await page.evaluate(() => {
        const nameEl = document.querySelector('[data-testid="user-name"]') ||
                      document.querySelector('.user-name') ||
                      document.querySelector('h1');
        return nameEl ? nameEl.textContent : null;
      });
      
      if (userInfo) {
        console.log(`  👤 User displayed as: ${userInfo}`);
      }
      
      // Logout for next test
      try {
        await page.evaluate(() => {
          localStorage.clear();
          sessionStorage.clear();
        });
        console.log('  ✓ Cleared session for next test');
      } catch (e) {
        // Ignore logout errors
      }
      
      return true;
    } else {
      console.log(`  ⚠️  Redirected to unexpected page: ${currentUrl}`);
      await page.screenshot({ path: `unexpected-redirect-${user.name.replace(' ', '-')}.png` });
      return false;
    }
    
  } catch (error) {
    console.log(`  ❌ Error: ${error.message}`);
    await page.screenshot({ path: `error-${user.name.replace(' ', '-')}.png` });
    return false;
  }
}

async function runTests() {
  console.log('🚀 Starting ClassReflect Login Tests');
  console.log('=====================================');
  
  const browser = await puppeteer.launch({
    headless: false, // Set to true for CI/CD
    slowMo: 100, // Slow down for visibility
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });
  
  const page = await browser.newPage();
  await page.setViewport({ width: 1280, height: 800 });
  
  // Enable console logging
  page.on('console', msg => {
    if (msg.type() === 'error') {
      console.log('  🔴 Browser console error:', msg.text());
    }
  });
  
  let results = [];
  
  for (const user of testUsers) {
    const success = await testLogin(page, user);
    results.push({ user: user.name, success });
    
    // Wait between tests
    await page.waitForTimeout(1000);
  }
  
  // Print summary
  console.log('\n=====================================');
  console.log('📊 Test Results Summary:');
  console.log('=====================================');
  
  results.forEach(result => {
    const icon = result.success ? '✅' : '❌';
    console.log(`${icon} ${result.user}: ${result.success ? 'PASSED' : 'FAILED'}`);
  });
  
  const passedCount = results.filter(r => r.success).length;
  const totalCount = results.length;
  
  console.log('\n-------------------------------------');
  console.log(`Total: ${passedCount}/${totalCount} tests passed`);
  
  if (passedCount === totalCount) {
    console.log('🎉 All tests passed!');
  } else {
    console.log('⚠️  Some tests failed. Check the screenshots for details.');
  }
  
  await browser.close();
}

// Run the tests
runTests().catch(console.error);