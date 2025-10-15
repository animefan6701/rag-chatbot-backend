import 'dotenv/config';

const API_BASE = 'http://localhost:3001';

async function testEndpoints() {
  console.log('=== Testing API Endpoints ===\n');

  try {
    // Test 1: Health check
    console.log('1. Testing health endpoint...');
    const healthRes = await fetch(`${API_BASE}/health`);
    const healthData = await healthRes.json();
    console.log('✅ Health check:', healthData);
    console.log();

    // Test 2: Test chat history endpoint (should fail if table doesn't exist)
    console.log('2. Testing chat history endpoint...');
    const testEmail = 'test@example.com';
    
    try {
      const historyRes = await fetch(`${API_BASE}/chat-history/get`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          user_email: testEmail,
          limit: 5,
          offset: 0
        })
      });
      
      if (historyRes.ok) {
        const historyData = await historyRes.json();
        console.log('✅ Chat history endpoint works:', historyData);
      } else {
        const errorText = await historyRes.text();
        console.log('❌ Chat history endpoint error:', historyRes.status, errorText);
      }
    } catch (error) {
      console.log('❌ Chat history endpoint failed:', error.message);
    }
    console.log();

    // Test 3: Test save chat history
    console.log('3. Testing save chat history...');
    try {
      const saveRes = await fetch(`${API_BASE}/chat-history`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          user_email: testEmail,
          prompt: 'Test prompt',
          answer: 'Test answer',
          doc_id: null,
          sources: [],
          images: []
        })
      });

      if (saveRes.ok) {
        const saveData = await saveRes.json();
        console.log('✅ Save chat history works:', saveData);
      } else {
        const errorText = await saveRes.text();
        console.log('❌ Save chat history error:', saveRes.status, errorText);
      }
    } catch (error) {
      console.log('❌ Save chat history failed:', error.message);
    }

  } catch (error) {
    console.error('❌ Test failed:', error);
  }
}

testEndpoints();
