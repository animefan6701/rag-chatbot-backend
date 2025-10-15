import fetch from 'node-fetch';

const API_BASE = 'https://038526a73431.ngrok-free.app';
const LOCAL_API = 'http://localhost:3001';

async function testCORS() {
    console.log('🧪 Testing CORS Configuration\n');

    // Test 1: Health check on ngrok URL
    console.log('1. Testing ngrok health endpoint...');
    try {
        const response = await fetch(`${API_BASE}/health`, {
            headers: {
                'ngrok-skip-browser-warning': 'true'
            }
        });
        
        if (response.ok) {
            const data = await response.json();
            console.log('✅ Ngrok health check passed:', data);
        } else {
            console.log('❌ Ngrok health check failed:', response.status, response.statusText);
        }
    } catch (error) {
        console.log('❌ Ngrok health check error:', error.message);
    }

    console.log();

    // Test 2: Health check on local URL
    console.log('2. Testing local health endpoint...');
    try {
        const response = await fetch(`${LOCAL_API}/health`);
        
        if (response.ok) {
            const data = await response.json();
            console.log('✅ Local health check passed:', data);
        } else {
            console.log('❌ Local health check failed:', response.status, response.statusText);
        }
    } catch (error) {
        console.log('❌ Local health check error:', error.message);
    }

    console.log();

    // Test 3: Chat history endpoint with CORS headers
    console.log('3. Testing chat history endpoint with CORS...');
    try {
        const response = await fetch(`${API_BASE}/chat-history/get`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'ngrok-skip-browser-warning': 'true',
                'Origin': 'http://localhost'
            },
            body: JSON.stringify({
                user_email: 'test@example.com',
                limit: 10,
                offset: 0
            })
        });
        
        console.log('Response status:', response.status);
        console.log('Response headers:');
        for (const [key, value] of response.headers.entries()) {
            if (key.toLowerCase().includes('cors') || key.toLowerCase().includes('access-control')) {
                console.log(`  ${key}: ${value}`);
            }
        }
        
        if (response.ok) {
            const data = await response.json();
            console.log('✅ Chat history request successful:', data);
        } else {
            const errorText = await response.text();
            console.log('❌ Chat history request failed:', errorText);
        }
    } catch (error) {
        console.log('❌ Chat history request error:', error.message);
    }

    console.log();

    // Test 4: OPTIONS preflight request
    console.log('4. Testing OPTIONS preflight request...');
    try {
        const response = await fetch(`${API_BASE}/chat-history/get`, {
            method: 'OPTIONS',
            headers: {
                'Origin': 'http://localhost',
                'Access-Control-Request-Method': 'POST',
                'Access-Control-Request-Headers': 'Content-Type,ngrok-skip-browser-warning'
            }
        });
        
        console.log('OPTIONS response status:', response.status);
        console.log('CORS headers in OPTIONS response:');
        for (const [key, value] of response.headers.entries()) {
            if (key.toLowerCase().includes('access-control')) {
                console.log(`  ${key}: ${value}`);
            }
        }
        
        if (response.ok || response.status === 204) {
            console.log('✅ OPTIONS preflight successful');
        } else {
            console.log('❌ OPTIONS preflight failed');
        }
    } catch (error) {
        console.log('❌ OPTIONS preflight error:', error.message);
    }
}

// Run the test
testCORS().catch(console.error);
