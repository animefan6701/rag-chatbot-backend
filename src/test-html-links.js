import 'dotenv/config';
import { chatWithContext } from './embeddings.js';

/**
 * Test to demonstrate single most relevant HTML link generation
 */
async function testHtmlLinks() {
    console.log('🔗 Testing Single Most Relevant WordPress Admin Link Generation\n');

    const testPrompts = [
        "How do I create a new page in WordPress?",
        "How do I create a new post?",
        "How can I install a plugin?",
        "Where do I manage my themes?",
        "How do I upload media files?",
        "How can I customize my site?",
        "Where do I manage users?",
        "How do I moderate comments?",
        "How do I edit an existing post?",
        "How do I add a new category?",
        "How do I upload an image?",
        "How do I activate a theme?"
    ];

    for (let i = 0; i < testPrompts.length; i++) {
        const prompt = testPrompts[i];
        console.log(`\n--- Test ${i + 1}: ${prompt} ---`);

        try {
            const result = await chatWithContext(prompt, []);

            // Extract and display just the link section
            const linkMatch = result.answer.match(/\*\*WordPress Admin Link:\*\*[\s\S]*$/);
            if (linkMatch) {
                console.log('Generated Link:');
                console.log(linkMatch[0]);

                // Show the HTML structure
                const htmlLink = result.answer.match(/<a href="[^"]*"[^>]*>[^<]*<\/a>/);
                if (htmlLink) {
                    console.log(`HTML: ${htmlLink[0]}`);
                }
            } else {
                console.log('No WordPress link generated');
            }

        } catch (error) {
            console.error('Error:', error.message);
        }
    }
}

// Run the test
testHtmlLinks().catch(console.error);
