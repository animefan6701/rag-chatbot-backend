import 'dotenv/config';

const API_BASE = process.env.NODE_ENV === 'production' 
  ? 'https://038526a73431.ngrok-free.app' 
  : 'http://localhost:3001';

const testEmail = 'test@example.com';

async function testTitleUpdate() {
    console.log('🧪 Testing Session Title Update API\n');
    console.log(`API Base: ${API_BASE}\n`);

    let sessionId = null;

    try {
        // Step 1: Create a session first
        console.log('1. Creating a test session...');
        const createResponse = await fetch(`${API_BASE}/chat-sessions`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'ngrok-skip-browser-warning': 'true'
            },
            body: JSON.stringify({
                user_email: testEmail,
                title: 'Original Title',
                description: 'Test session for title update'
            })
        });

        if (createResponse.ok) {
            const createData = await createResponse.json();
            sessionId = createData.session.id;
            console.log('✅ Session created:', {
                id: sessionId,
                title: createData.session.title
            });
        } else {
            const errorText = await createResponse.text();
            console.log('❌ Create session failed:', createResponse.status, errorText);
            return;
        }

        console.log();

        // Step 2: Test title update endpoint
        console.log('2. Testing PATCH /chat-sessions/:id/title...');
        const titleUpdateResponse = await fetch(`${API_BASE}/chat-sessions/${sessionId}/title`, {
            method: 'PATCH',
            headers: {
                'Content-Type': 'application/json',
                'ngrok-skip-browser-warning': 'true'
            },
            body: JSON.stringify({
                user_email: testEmail,
                title: 'Updated Title via PATCH'
            })
        });

        if (titleUpdateResponse.ok) {
            const titleData = await titleUpdateResponse.json();
            console.log('✅ Title updated successfully:', {
                id: titleData.session.id,
                old_title: 'Original Title',
                new_title: titleData.session.title,
                updated_at: titleData.session.updated_at
            });
        } else {
            const errorText = await titleUpdateResponse.text();
            console.log('❌ Title update failed:', titleUpdateResponse.status, errorText);
        }

        console.log();

        // Step 3: Verify the update by getting the session
        console.log('3. Verifying the title update...');
        const getResponse = await fetch(`${API_BASE}/chat-sessions/${sessionId}?user_email=${encodeURIComponent(testEmail)}`, {
            headers: {
                'ngrok-skip-browser-warning': 'true'
            }
        });

        if (getResponse.ok) {
            const sessionData = await getResponse.json();
            console.log('✅ Verification successful:', {
                current_title: sessionData.session.title,
                description: sessionData.session.description,
                updated_at: sessionData.session.updated_at
            });
        } else {
            const errorText = await getResponse.text();
            console.log('❌ Verification failed:', getResponse.status, errorText);
        }

        console.log();

        // Step 4: Test error cases
        console.log('4. Testing error cases...');
        
        // Test missing title
        const missingTitleResponse = await fetch(`${API_BASE}/chat-sessions/${sessionId}/title`, {
            method: 'PATCH',
            headers: {
                'Content-Type': 'application/json',
                'ngrok-skip-browser-warning': 'true'
            },
            body: JSON.stringify({
                user_email: testEmail
                // Missing title
            })
        });

        if (!missingTitleResponse.ok) {
            const errorData = await missingTitleResponse.json();
            console.log('✅ Missing title error handled correctly:', errorData.error);
        }

        // Test invalid session ID
        const invalidSessionResponse = await fetch(`${API_BASE}/chat-sessions/invalid-uuid/title`, {
            method: 'PATCH',
            headers: {
                'Content-Type': 'application/json',
                'ngrok-skip-browser-warning': 'true'
            },
            body: JSON.stringify({
                user_email: testEmail,
                title: 'Test Title'
            })
        });

        if (!invalidSessionResponse.ok) {
            const errorData = await invalidSessionResponse.json();
            console.log('✅ Invalid session error handled correctly:', errorData.error);
        }

        console.log();

        // Step 5: Clean up - delete the test session
        console.log('5. Cleaning up test session...');
        const deleteResponse = await fetch(`${API_BASE}/chat-sessions/${sessionId}?user_email=${encodeURIComponent(testEmail)}`, {
            method: 'DELETE',
            headers: {
                'ngrok-skip-browser-warning': 'true'
            }
        });

        if (deleteResponse.ok) {
            console.log('✅ Test session cleaned up successfully');
        } else {
            console.log('⚠️ Failed to clean up test session');
        }

        console.log();
        console.log('🎉 Title update API test completed successfully!');

    } catch (error) {
        console.error('❌ Test failed:', error.message);
    }
}

// Run the test
testTitleUpdate();
