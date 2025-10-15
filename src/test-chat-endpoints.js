import fetch from 'node-fetch';
import FormData from 'form-data';
import fs from 'fs';
import path from 'path';

const API_BASE = 'https://038526a73431.ngrok-free.app';

async function testChatEndpoints() {
    console.log('🧪 Testing Chat Endpoints\n');

    // Test 1: Regular text chat
    console.log('1. Testing regular text chat endpoint...');
    try {
        const response = await fetch(`${API_BASE}/chat`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'ngrok-skip-browser-warning': 'true'
            },
            body: JSON.stringify({
                prompt: 'Hello, this is a test message',
                k: 6
            })
        });

        console.log('Status:', response.status);
        if (response.ok) {
            const data = await response.json();
            console.log('✅ Text chat successful:', data.answer?.substring(0, 100) + '...');
        } else {
            const errorText = await response.text();
            console.log('❌ Text chat failed:', errorText);
        }
    } catch (error) {
        console.log('❌ Text chat error:', error.message);
    }

    console.log();

    // Test 2: Image chat endpoint without images (should fail)
    console.log('2. Testing image chat endpoint without images...');
    try {
        const formData = new FormData();
        formData.append('prompt', 'Test prompt');
        formData.append('prompt_type', 'image');
        formData.append('k', '6');

        const response = await fetch(`${API_BASE}/chat/image`, {
            method: 'POST',
            headers: {
                'ngrok-skip-browser-warning': 'true'
            },
            body: formData
        });

        console.log('Status:', response.status);
        if (!response.ok) {
            const errorText = await response.text();
            if (errorText.includes('images required')) {
                console.log('✅ Validation working correctly:', errorText);
            } else {
                console.log('❌ Unexpected error:', errorText);
            }
        } else {
            console.log('❌ Should have failed but didn\'t');
        }
    } catch (error) {
        console.log('❌ Image chat validation error:', error.message);
    }

    console.log();

    // Test 3: Create a test image and try image chat
    console.log('3. Testing image chat with actual image...');
    try {
        // Create a simple test image (1x1 pixel PNG)
        const testImageBuffer = Buffer.from([
            0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A,
            0x00, 0x00, 0x00, 0x0D, 0x49, 0x48, 0x44, 0x52,
            0x00, 0x00, 0x00, 0x01, 0x00, 0x00, 0x00, 0x01,
            0x08, 0x02, 0x00, 0x00, 0x00, 0x90, 0x77, 0x53, 0xDE,
            0x00, 0x00, 0x00, 0x0C, 0x49, 0x44, 0x41, 0x54,
            0x08, 0x99, 0x01, 0x01, 0x00, 0x00, 0x00, 0xFF, 0xFF,
            0x00, 0x00, 0x00, 0x02, 0x00, 0x01, 0xE2, 0x21, 0xBC, 0x33,
            0x00, 0x00, 0x00, 0x00, 0x49, 0x45, 0x4E, 0x44, 0xAE, 0x42, 0x60, 0x82
        ]);

        const testImagePath = path.join(process.cwd(), 'test-image.png');
        fs.writeFileSync(testImagePath, testImageBuffer);

        const formData = new FormData();
        formData.append('prompt', 'What do you see in this image?');
        formData.append('prompt_type', 'image_text');
        formData.append('k', '6');
        formData.append('images', fs.createReadStream(testImagePath), {
            filename: 'test-image.png',
            contentType: 'image/png'
        });

        const response = await fetch(`${API_BASE}/chat/image`, {
            method: 'POST',
            headers: {
                'ngrok-skip-browser-warning': 'true'
            },
            body: formData
        });

        console.log('Status:', response.status);
        if (response.ok) {
            const data = await response.json();
            console.log('✅ Image chat successful!');
            console.log('Answer:', data.answer?.substring(0, 100) + '...');
            console.log('User images count:', data.user_images?.length || 0);
            console.log('Prompt type:', data.prompt_type);
        } else {
            const errorText = await response.text();
            console.log('❌ Image chat failed:', errorText);
        }

        // Cleanup
        if (fs.existsSync(testImagePath)) {
            fs.unlinkSync(testImagePath);
        }

    } catch (error) {
        console.log('❌ Image chat error:', error.message);
    }

    console.log();

    // Test 4: Test what happens when wrong content-type is sent to /chat
    console.log('4. Testing what happens when form data is sent to /chat...');
    try {
        const formData = new FormData();
        formData.append('prompt', 'This should fail');
        formData.append('k', '6');

        const response = await fetch(`${API_BASE}/chat`, {
            method: 'POST',
            headers: {
                'ngrok-skip-browser-warning': 'true'
            },
            body: formData
        });

        console.log('Status:', response.status);
        const responseText = await response.text();
        console.log('Response:', responseText);
        
        if (response.status === 400) {
            console.log('✅ Correctly rejected form data on /chat endpoint');
        }

    } catch (error) {
        console.log('❌ Form data to /chat error:', error.message);
    }

    console.log('\n🎉 Chat endpoint testing completed!');
}

// Run tests
testChatEndpoints().catch(console.error);
