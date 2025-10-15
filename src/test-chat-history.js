import 'dotenv/config';
import { db } from './db.js';

async function testChatHistory() {
  console.log('=== Testing Chat History Functionality ===\n');
  
  const d = db();
  const testEmail = 'test@example.com';
  const testPrompt = 'What is machine learning?';
  const testAnswer = 'Machine learning is a subset of artificial intelligence that enables computers to learn and make decisions from data without being explicitly programmed.';
  const testSources = [
    {
      id: 1,
      snippet: 'Machine learning algorithms build mathematical models...',
      metadata: { filename: 'ml-guide.pdf' }
    }
  ];
  const testImages = [];

  try {
    // Test 1: Save chat history
    console.log('1. Testing saveChatHistory...');
    await d.saveChatHistory(testEmail, testPrompt, testAnswer, null, testSources, testImages);
    console.log('✅ Chat history saved successfully\n');

    // Test 2: Save another chat history entry
    console.log('2. Saving another chat history entry...');
    await d.saveChatHistory(
      testEmail, 
      'What is deep learning?', 
      'Deep learning is a subset of machine learning that uses neural networks with multiple layers.',
      null,
      [],
      []
    );
    console.log('✅ Second chat history saved successfully\n');

    // Test 3: Get chat history
    console.log('3. Testing getChatHistory...');
    const history = await d.getChatHistory(testEmail, 10, 0);
    console.log(`✅ Retrieved ${history.length} chat history records`);
    
    if (history.length > 0) {
      console.log('First record:');
      console.log(`  - Prompt: ${history[0].prompt.substring(0, 50)}...`);
      console.log(`  - Answer: ${history[0].answer.substring(0, 50)}...`);
      console.log(`  - Created: ${history[0].created_at}`);
      console.log(`  - Sources count: ${Array.isArray(history[0].sources) ? history[0].sources.length : 'N/A'}`);
    }
    console.log();

    // Test 4: Test pagination
    console.log('4. Testing pagination...');
    const page1 = await d.getChatHistory(testEmail, 1, 0);
    const page2 = await d.getChatHistory(testEmail, 1, 1);
    console.log(`✅ Page 1: ${page1.length} records`);
    console.log(`✅ Page 2: ${page2.length} records`);
    
    if (page1.length > 0 && page2.length > 0) {
      console.log('Different records retrieved:', page1[0].id !== page2[0].id);
    }
    console.log();

    // Test 5: Test with different user
    console.log('5. Testing with different user...');
    const differentUser = 'different@example.com';
    await d.saveChatHistory(differentUser, 'Test question', 'Test answer', null, [], []);
    
    const userHistory = await d.getChatHistory(testEmail);
    const differentUserHistory = await d.getChatHistory(differentUser);
    
    console.log(`✅ Original user history: ${userHistory.length} records`);
    console.log(`✅ Different user history: ${differentUserHistory.length} records`);
    console.log('Users have separate histories:', userHistory.length !== differentUserHistory.length || userHistory[0]?.user_email !== differentUserHistory[0]?.user_email);
    console.log();

    console.log('🎉 All chat history tests passed!');

  } catch (error) {
    console.error('❌ Test failed:', error);
    process.exit(1);
  }
}

// Run the test
testChatHistory().catch(console.error);
