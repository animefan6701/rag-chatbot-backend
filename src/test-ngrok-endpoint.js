import 'dotenv/config';

const NGROK_URL = 'https://68355f42ea97.ngrok-free.app';

async function testNgrokEndpoint() {
  console.log('=== Testing Ngrok Endpoint ===\n');

  try {
    // Test 1: Health check with ngrok header
    console.log('1. Testing health endpoint with ngrok header...');
    const healthRes = await fetch(`${NGROK_URL}/health`, {
      headers: {
        'ngrok-skip-browser-warning': 'true'
      }
    });
    
    if (healthRes.ok) {
      const healthData = await healthRes.json();
      console.log('✅ Health check works:', healthData);
    } else {
      console.log('❌ Health check failed:', healthRes.status, await healthRes.text());
    }
    console.log();

    // Test 2: Test chat history endpoint
    console.log('2. Testing chat history endpoint...');
    const testEmail = 'hex054731@gmail.com';
    
    try {
      const historyRes = await fetch(`${NGROK_URL}/chat-history/get`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'ngrok-skip-browser-warning': 'true'
        },
        body: JSON.stringify({
          user_email: testEmail,
          limit: 20,
          offset: 0
        })
      });
      
      if (historyRes.ok) {
        const historyData = await historyRes.json();
        console.log('✅ Chat history endpoint works:');
        console.log('  - Status:', historyData.ok);
        console.log('  - Count:', historyData.count);
        console.log('  - Data length:', historyData.data?.length || 0);
        if (historyData.data && historyData.data.length > 0) {
          console.log('  - First record:', {
            id: historyData.data[0].id,
            prompt: historyData.data[0].prompt.substring(0, 50) + '...',
            created_at: historyData.data[0].created_at
          });
        }
      } else {
        const errorText = await historyRes.text();
        console.log('❌ Chat history endpoint error:', historyRes.status);
        console.log('Error details:', errorText.substring(0, 200) + '...');
      }
    } catch (error) {
      console.log('❌ Chat history endpoint failed:', error.message);
    }

  } catch (error) {
    console.error('❌ Test failed:', error);
  }
}

testNgrokEndpoint();
