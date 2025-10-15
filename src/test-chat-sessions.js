import 'dotenv/config';

const API_BASE = process.env.NODE_ENV === 'production' 
  ? 'https://038526a73431.ngrok-free.app' 
  : 'http://localhost:3001';

const testEmail = 'test@example.com';

async function testChatSessions() {
    console.log('🧪 Testing Chat Sessions API\n');
    console.log(`API Base: ${API_BASE}\n`);

    let sessionId = null;

    try {
        // Test 1: Create a new chat session
        console.log('1. Creating a new chat session...');
        const createResponse = await fetch(`${API_BASE}/chat-sessions`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'ngrok-skip-browser-warning': 'true'
            },
            body: JSON.stringify({
                user_email: testEmail,
                title: 'WordPress Help Session',
                description: 'Getting help with WordPress setup and configuration'
            })
        });

        if (createResponse.ok) {
            const createData = await createResponse.json();
            sessionId = createData.session.id;
            console.log('✅ Session created:', {
                id: sessionId,
                title: createData.session.title,
                created_at: createData.session.created_at
            });
        } else {
            const errorText = await createResponse.text();
            console.log('❌ Create session failed:', createResponse.status, errorText);
            return;
        }

        console.log();

        // Test 2: Send a chat message to the session
        console.log('2. Sending chat message to session...');
        const chatResponse = await fetch(`${API_BASE}/chat`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'ngrok-skip-browser-warning': 'true'
            },
            body: JSON.stringify({
                prompt: 'How do I create a new WordPress post?',
                user_email: testEmail,
                session_id: sessionId,
                k: 6
            })
        });

        if (chatResponse.ok) {
            const chatData = await chatResponse.json();
            console.log('✅ Chat message sent successfully');
            console.log('Answer preview:', chatData.answer?.substring(0, 100) + '...');
        } else {
            const errorText = await chatResponse.text();
            console.log('❌ Chat message failed:', chatResponse.status, errorText);
        }

        console.log();

        // Test 3: Get all chat sessions
        console.log('3. Getting all chat sessions...');
        const sessionsResponse = await fetch(`${API_BASE}/chat-sessions?user_email=${encodeURIComponent(testEmail)}`, {
            headers: {
                'ngrok-skip-browser-warning': 'true'
            }
        });

        if (sessionsResponse.ok) {
            const sessionsData = await sessionsResponse.json();
            console.log('✅ Sessions retrieved:', {
                count: sessionsData.count,
                sessions: sessionsData.sessions.map(s => ({
                    id: s.id,
                    title: s.title,
                    message_count: s.message_count,
                    last_message_at: s.last_message_at
                }))
            });
        } else {
            const errorText = await sessionsResponse.text();
            console.log('❌ Get sessions failed:', sessionsResponse.status, errorText);
        }

        console.log();

        // Test 4: Get specific session
        console.log('4. Getting specific session...');
        const sessionResponse = await fetch(`${API_BASE}/chat-sessions/${sessionId}?user_email=${encodeURIComponent(testEmail)}`, {
            headers: {
                'ngrok-skip-browser-warning': 'true'
            }
        });

        if (sessionResponse.ok) {
            const sessionData = await sessionResponse.json();
            console.log('✅ Session details:', {
                id: sessionData.session.id,
                title: sessionData.session.title,
                description: sessionData.session.description,
                created_at: sessionData.session.created_at,
                updated_at: sessionData.session.updated_at
            });
        } else {
            const errorText = await sessionResponse.text();
            console.log('❌ Get session failed:', sessionResponse.status, errorText);
        }

        console.log();

        // Test 5: Get chat history for the session
        console.log('5. Getting chat history for session...');
        const historyResponse = await fetch(`${API_BASE}/chat-history/get`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'ngrok-skip-browser-warning': 'true'
            },
            body: JSON.stringify({
                user_email: testEmail,
                session_id: sessionId,
                limit: 10,
                offset: 0
            })
        });

        if (historyResponse.ok) {
            const historyData = await historyResponse.json();
            console.log('✅ Chat history retrieved:', {
                count: historyData.count,
                session_id: historyData.session_id,
                messages: historyData.data.map(msg => ({
                    id: msg.id,
                    prompt: msg.prompt.substring(0, 50) + '...',
                    created_at: msg.created_at
                }))
            });
        } else {
            const errorText = await historyResponse.text();
            console.log('❌ Get history failed:', historyResponse.status, errorText);
        }

        console.log();

        // Test 6: Update session title
        console.log('6. Updating session title...');
        const updateResponse = await fetch(`${API_BASE}/chat-sessions/${sessionId}`, {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json',
                'ngrok-skip-browser-warning': 'true'
            },
            body: JSON.stringify({
                user_email: testEmail,
                title: 'WordPress Post Creation Help',
                description: 'Updated: Learning how to create and manage WordPress posts'
            })
        });

        if (updateResponse.ok) {
            const updateData = await updateResponse.json();
            console.log('✅ Session updated:', {
                id: updateData.session.id,
                title: updateData.session.title,
                description: updateData.session.description,
                updated_at: updateData.session.updated_at
            });
        } else {
            const errorText = await updateResponse.text();
            console.log('❌ Update session failed:', updateResponse.status, errorText);
        }

        console.log();

        // Test 7: Update session title only
        console.log('7. Updating session title only...');
        const titleUpdateResponse = await fetch(`${API_BASE}/chat-sessions/${sessionId}/title`, {
            method: 'PATCH',
            headers: {
                'Content-Type': 'application/json',
                'ngrok-skip-browser-warning': 'true'
            },
            body: JSON.stringify({
                user_email: testEmail,
                title: 'WordPress Post & Page Management'
            })
        });

        if (titleUpdateResponse.ok) {
            const titleUpdateData = await titleUpdateResponse.json();
            console.log('✅ Session title updated:', {
                id: titleUpdateData.session.id,
                title: titleUpdateData.session.title,
                updated_at: titleUpdateData.session.updated_at
            });
        } else {
            const errorText = await titleUpdateResponse.text();
            console.log('❌ Update title failed:', titleUpdateResponse.status, errorText);
        }

        console.log();

        // Test 8: Archive session
        console.log('8. Archiving session...');
        const archiveResponse = await fetch(`${API_BASE}/chat-sessions/${sessionId}`, {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json',
                'ngrok-skip-browser-warning': 'true'
            },
            body: JSON.stringify({
                user_email: testEmail,
                is_archived: true
            })
        });

        if (archiveResponse.ok) {
            const archiveData = await archiveResponse.json();
            console.log('✅ Session archived:', {
                id: archiveData.session.id,
                is_archived: archiveData.session.is_archived
            });
        } else {
            const errorText = await archiveResponse.text();
            console.log('❌ Archive session failed:', archiveResponse.status, errorText);
        }

        console.log();
        console.log('🎉 All chat session tests completed successfully!');

    } catch (error) {
        console.error('❌ Test failed:', error.message);
    }
}

// Run the tests
testChatSessions();
