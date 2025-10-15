import 'dotenv/config';
import { chatWithContext } from './embeddings.js';

/**
 * Test script to demonstrate WordPress admin link generation
 */
async function testWordPressLinks() {
    console.log('🧪 Testing WordPress Admin Link Generation\n');
    
    const testPrompts = [
        "How do I create a new post in WordPress?",
        "How can I install a new plugin?",
        "Where do I manage my WordPress themes?",
        "How do I add a new page to my website?",
        "How can I manage user accounts?",
        "Where do I find the media library?",
        "How do I customize my WordPress menus?",
        "How can I moderate comments on my site?",
        "Where are the WordPress settings located?",
        "How do I access the WordPress dashboard?",
        "Tell me about JavaScript programming", // Non-WordPress test
    ];

    for (let i = 0; i < testPrompts.length; i++) {
        const prompt = testPrompts[i];
        console.log(`\n--- Test ${i + 1}: ${prompt} ---`);
        
        try {
            const result = await chatWithContext(prompt, []);
            console.log('Response:');
            console.log(result.answer);

            // Show if HTML links were generated
            if (result.answer.includes('<a href=')) {
                console.log('\n🔗 HTML Links detected in response!');
                const linkMatches = result.answer.match(/<a href="[^"]*"[^>]*>[^<]*<\/a>/g);
                if (linkMatches) {
                    console.log('Generated HTML links:');
                    linkMatches.forEach((link, index) => {
                        console.log(`  ${index + 1}. ${link}`);
                    });
                }
            }

            console.log('\n' + '='.repeat(80));
        } catch (error) {
            console.error('Error:', error.message);
        }
    }
}

// Run the test if this file is executed directly
if (import.meta.url === `file://${process.argv[1]}`) {
    testWordPressLinks().catch(console.error);
}

export { testWordPressLinks };
