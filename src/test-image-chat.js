import fs from 'fs';
import path from 'path';
import FormData from 'form-data';
import fetch from 'node-fetch';

const API_BASE = process.env.API_URL || 'http://localhost:3001';

async function testImageChat() {
    console.log('🧪 Testing Image Chat API Endpoints\n');

    try {
        // Test 1: Health check
        console.log('1. Testing health endpoint...');
        const healthRes = await fetch(`${API_BASE}/health`);
        if (healthRes.ok) {
            console.log('✅ Health check passed\n');
        } else {
            throw new Error('Health check failed');
        }

        // Test 2: Text-only chat (existing functionality)
        console.log('2. Testing text-only chat...');
        const textRes = await fetch(`${API_BASE}/chat`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'ngrok-skip-browser-warning': 'true'
            },
            body: JSON.stringify({
                prompt: 'Hello, can you help me?',
                k: 6
            })
        });

        if (textRes.ok) {
            const textData = await textRes.json();
            console.log('✅ Text chat response:', textData.answer.substring(0, 100) + '...\n');
        } else {
            console.log('❌ Text chat failed:', await textRes.text());
        }

        // Test 3: Image chat validation (no images provided)
        console.log('3. Testing image chat validation...');
        const formData1 = new FormData();
        formData1.append('prompt', 'Test prompt');
        formData1.append('prompt_type', 'image');
        formData1.append('k', '6');

        const validationRes = await fetch(`${API_BASE}/chat/image`, {
            method: 'POST',
            headers: {
                'ngrok-skip-browser-warning': 'true'
            },
            body: formData1
        });

        if (!validationRes.ok) {
            const errorText = await validationRes.text();
            if (errorText.includes('images required')) {
                console.log('✅ Validation working: Images required for image type\n');
            } else {
                console.log('❌ Unexpected validation error:', errorText);
            }
        } else {
            console.log('❌ Validation should have failed but didn\'t\n');
        }

        // Test 4: Invalid prompt type
        console.log('4. Testing invalid prompt type...');
        const formData2 = new FormData();
        formData2.append('prompt', 'Test prompt');
        formData2.append('prompt_type', 'invalid_type');
        formData2.append('k', '6');

        const invalidTypeRes = await fetch(`${API_BASE}/chat/image`, {
            method: 'POST',
            headers: {
                'ngrok-skip-browser-warning': 'true'
            },
            body: formData2
        });

        if (!invalidTypeRes.ok) {
            const errorText = await invalidTypeRes.text();
            if (errorText.includes('prompt_type must be one of')) {
                console.log('✅ Prompt type validation working\n');
            } else {
                console.log('❌ Unexpected prompt type error:', errorText);
            }
        } else {
            console.log('❌ Invalid prompt type should have failed but didn\'t\n');
        }

        // Test 5: Create a simple test image (1x1 pixel PNG)
        console.log('5. Creating test image...');
        const testImageBuffer = Buffer.from([
            0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A, // PNG signature
            0x00, 0x00, 0x00, 0x0D, 0x49, 0x48, 0x44, 0x52, // IHDR chunk
            0x00, 0x00, 0x00, 0x01, 0x00, 0x00, 0x00, 0x01, // 1x1 pixel
            0x08, 0x02, 0x00, 0x00, 0x00, 0x90, 0x77, 0x53, 0xDE,
            0x00, 0x00, 0x00, 0x0C, 0x49, 0x44, 0x41, 0x54, // IDAT chunk
            0x08, 0x99, 0x01, 0x01, 0x00, 0x00, 0x00, 0xFF, 0xFF,
            0x00, 0x00, 0x00, 0x02, 0x00, 0x01, 0xE2, 0x21, 0xBC, 0x33,
            0x00, 0x00, 0x00, 0x00, 0x49, 0x45, 0x4E, 0x44, 0xAE, 0x42, 0x60, 0x82 // IEND
        ]);

        const testImagePath = path.join(process.cwd(), 'test-image.png');
        fs.writeFileSync(testImagePath, testImageBuffer);
        console.log('✅ Test image created\n');

        // Test 6: Image-only chat
        console.log('6. Testing image-only chat...');
        const formData3 = new FormData();
        formData3.append('prompt_type', 'image');
        formData3.append('images', fs.createReadStream(testImagePath), {
            filename: 'test-image.png',
            contentType: 'image/png'
        });
        formData3.append('k', '6');

        const imageOnlyRes = await fetch(`${API_BASE}/chat/image`, {
            method: 'POST',
            headers: {
                'ngrok-skip-browser-warning': 'true'
            },
            body: formData3
        });

        if (imageOnlyRes.ok) {
            const imageData = await imageOnlyRes.json();
            console.log('✅ Image-only chat response:', imageData.answer.substring(0, 100) + '...');
            console.log('   User images count:', imageData.user_images?.length || 0);
            console.log('   Prompt type:', imageData.prompt_type, '\n');
        } else {
            console.log('❌ Image-only chat failed:', await imageOnlyRes.text());
        }

        // Test 7: Image + text chat
        console.log('7. Testing image + text chat...');
        const formData4 = new FormData();
        formData4.append('prompt', 'What do you see in this image?');
        formData4.append('prompt_type', 'image_text');
        formData4.append('images', fs.createReadStream(testImagePath), {
            filename: 'test-image.png',
            contentType: 'image/png'
        });
        formData4.append('k', '6');

        const imageTextRes = await fetch(`${API_BASE}/chat/image`, {
            method: 'POST',
            headers: {
                'ngrok-skip-browser-warning': 'true'
            },
            body: formData4
        });

        if (imageTextRes.ok) {
            const imageTextData = await imageTextRes.json();
            console.log('✅ Image + text chat response:', imageTextData.answer.substring(0, 100) + '...');
            console.log('   User images count:', imageTextData.user_images?.length || 0);
            console.log('   Prompt type:', imageTextData.prompt_type, '\n');
        } else {
            console.log('❌ Image + text chat failed:', await imageTextRes.text());
        }

        // Cleanup
        console.log('8. Cleaning up...');
        if (fs.existsSync(testImagePath)) {
            fs.unlinkSync(testImagePath);
            console.log('✅ Test image cleaned up\n');
        }

        console.log('🎉 Image chat API testing completed!');

    } catch (error) {
        console.error('❌ Test failed:', error.message);
        
        // Cleanup on error
        const testImagePath = path.join(process.cwd(), 'test-image.png');
        if (fs.existsSync(testImagePath)) {
            fs.unlinkSync(testImagePath);
        }
    }
}

// Run tests if this file is executed directly
if (import.meta.url === `file://${process.argv[1]}`) {
    testImageChat();
}

export { testImageChat };
