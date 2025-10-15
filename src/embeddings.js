import OpenAI from 'openai';
const client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });


const MODEL = process.env.MODEL || 'gpt-4o-mini';
const EMBEDDING_MODEL = process.env.EMBEDDING_MODEL || 'text-embedding-3-small';

// WordPress admin link mappings
const WORDPRESS_ADMIN_LINKS = {
    'post': '/wp-admin/post.php',
    'posts': '/wp-admin/edit.php',
    'page': '/wp-admin/post-new.php?post_type=page',
    'pages': '/wp-admin/edit.php?post_type=page',
    'plugin': '/wp-admin/plugins.php',
    'plugins': '/wp-admin/plugins.php',
    'theme': '/wp-admin/themes.php',
    'themes': '/wp-admin/themes.php',
    'widget': '/wp-admin/widgets.php',
    'widgets': '/wp-admin/widgets.php',
    'menu': '/wp-admin/nav-menus.php',
    'menus': '/wp-admin/nav-menus.php',
    'user': '/wp-admin/users.php',
    'users': '/wp-admin/users.php',
    'media': '/wp-admin/upload.php',
    'comment': '/wp-admin/edit-comments.php',
    'comments': '/wp-admin/edit-comments.php',
    'setting': '/wp-admin/options-general.php',
    'settings': '/wp-admin/options-general.php',
    'dashboard': '/wp-admin/',
    'admin': '/wp-admin/',
    'customizer': '/wp-admin/customize.php',
    'appearance': '/wp-admin/themes.php',
    'editor': '/wp-admin/theme-editor.php',
    'category': '/wp-admin/edit-tags.php?taxonomy=category',
    'categories': '/wp-admin/edit-tags.php?taxonomy=category',
    'tag': '/wp-admin/edit-tags.php?taxonomy=post_tag',
    'tags': '/wp-admin/edit-tags.php?taxonomy=post_tag'
};

/**
 * Detects WordPress-related keywords in text and generates the most relevant admin link
 * @param {string} text - The text to analyze
 * @param {string} domain - The domain name (default from env or ${domain})
 * @returns {string} - Formatted link string with HTML hyperlink
 */
function generateWordPressLinks(text, domain = null) {
    // Use environment variable for domain, fallback to placeholder
    const siteDomain = domain || process.env.WORDPRESS_DOMAIN || '${domain}';
    const lowerText = text.toLowerCase();

    // Priority mapping - more specific keywords first with detailed descriptions
    const priorityKeywords = [
        // Specific actions first
        { keywords: ['create post', 'new post', 'add post', 'write post'], linkText: 'Create New Post', path: '/wp-admin/post-new.php' },
        { keywords: ['create page', 'new page', 'add page'], linkText: 'Create New Page', path: '/wp-admin/post-new.php?post_type=page' },
        { keywords: ['edit post', 'modify post', 'update post'], linkText: 'Edit Posts', path: '/wp-admin/edit.php' },
        { keywords: ['edit page', 'modify page', 'update page'], linkText: 'Edit Pages', path: '/wp-admin/edit.php?post_type=page' },
        { keywords: ['install plugin', 'add plugin'], linkText: 'Install Plugins', path: '/wp-admin/plugin-install.php' },
        { keywords: ['manage plugin', 'activate plugin', 'deactivate plugin'], linkText: 'Manage Plugins', path: '/wp-admin/plugins.php' },
        { keywords: ['install theme', 'add theme'], linkText: 'Install Themes', path: '/wp-admin/theme-install.php' },
        { keywords: ['manage theme', 'activate theme', 'switch theme'], linkText: 'Manage Themes', path: '/wp-admin/themes.php' },
        { keywords: ['upload media', 'add media', 'upload image', 'upload file'], linkText: 'Upload Media', path: '/wp-admin/media-new.php' },
        { keywords: ['media library', 'view media', 'browse media'], linkText: 'Media Library', path: '/wp-admin/upload.php' },
        { keywords: ['create menu', 'add menu', 'navigation menu'], linkText: 'Manage Menus', path: '/wp-admin/nav-menus.php' },
        { keywords: ['manage user', 'add user', 'create user'], linkText: 'Manage Users', path: '/wp-admin/users.php' },
        { keywords: ['moderate comment', 'approve comment', 'comment moderation'], linkText: 'Moderate Comments', path: '/wp-admin/edit-comments.php' },
        { keywords: ['customize', 'customizer', 'live preview'], linkText: 'Customize Site', path: '/wp-admin/customize.php' },
        { keywords: ['widget', 'sidebar'], linkText: 'Manage Widgets', path: '/wp-admin/widgets.php' },
        { keywords: ['setting', 'configuration', 'options'], linkText: 'Site Settings', path: '/wp-admin/options-general.php' },
        { keywords: ['dashboard', 'admin panel', 'backend'], linkText: 'WordPress Dashboard', path: '/wp-admin/' },
        { keywords: ['create category', 'add category'], linkText: 'Manage Categories', path: '/wp-admin/edit-tags.php?taxonomy=category' },
        { keywords: ['create tag', 'add tag'], linkText: 'Manage Tags', path: '/wp-admin/edit-tags.php?taxonomy=post_tag' },
        { keywords: ['appearance', 'theme options'], linkText: 'Appearance Settings', path: '/wp-admin/themes.php' },
        { keywords: ['editor', 'code editor', 'file editor'], linkText: 'Theme Editor', path: '/wp-admin/theme-editor.php' },
        // General keywords last (fallback)
        { keywords: ['plugin'], linkText: 'Manage Plugins', path: '/wp-admin/plugins.php' },
        { keywords: ['theme'], linkText: 'Manage Themes', path: '/wp-admin/themes.php' },
        { keywords: ['post'], linkText: 'All Posts', path: '/wp-admin/edit.php' },
        { keywords: ['page'], linkText: 'All Pages', path: '/wp-admin/edit.php?post_type=page' },
        { keywords: ['media'], linkText: 'Media Library', path: '/wp-admin/upload.php' },
        { keywords: ['category'], linkText: 'Manage Categories', path: '/wp-admin/edit-tags.php?taxonomy=category' },
        { keywords: ['tag'], linkText: 'Manage Tags', path: '/wp-admin/edit-tags.php?taxonomy=post_tag' },
        { keywords: ['user'], linkText: 'Manage Users', path: '/wp-admin/users.php' },
        { keywords: ['comment'], linkText: 'Moderate Comments', path: '/wp-admin/edit-comments.php' }
    ];

    // Find the most relevant link based on priority
    for (const item of priorityKeywords) {
        for (const keyword of item.keywords) {
            if (lowerText.includes(keyword)) {
                const linkText = item.linkText;
                const fullUrl = `${siteDomain}${item.path}`;
                const htmlLink = `<a href="${fullUrl}" target="_blank" rel="noopener noreferrer">${linkText}</a>`;

                return `\n\n**WordPress Admin Link:**\n- ${htmlLink}`;
            }
        }
    }

    return '';
}


export async function embedBatch(texts = []) {
    if (!texts.length) return [];
    const res = await client.embeddings.create({ model: EMBEDDING_MODEL, input: texts });
    return res.data.map(d => d.embedding);
}


export async function chatWithContext(prompt, contextChunks = [], images = []) {
    if (contextChunks.length === 0) {
        // No context provided - use direct OpenAI response
        const messages = [
            {
                role: 'system',
                content: `You are a helpful assistant with expertise in WordPress. While you specialize in WordPress-related topics, you can also provide helpful responses to other questions.

        For WordPress-related questions: Provide detailed, informative answers. The system will automatically add relevant WordPress admin links to your response.

        For non-WordPress questions: Provide a helpful response, but also mention that you specialize in WordPress and suggest how the topic might relate to WordPress if applicable.

        Always be helpful, informative, and professional in your responses.`
            }
        ];

        // Handle different prompt types
        if (images && images.length > 0) {
            // Image prompt or image + text prompt
            const userMessage = {
                role: 'user',
                content: []
            };

            // Add text if provided
            if (prompt && prompt.trim()) {
                userMessage.content.push({
                    type: 'text',
                    text: prompt
                });
            }

            // Add images
            for (const imageUrl of images) {
                userMessage.content.push({
                    type: 'image_url',
                    image_url: {
                        url: imageUrl,
                        detail: 'high'
                    }
                });
            }

            messages.push(userMessage);
        } else {
            // Text-only prompt
            messages.push({
                role: 'user',
                content: prompt
            });
        }

        const { choices } = await client.chat.completions.create({
            model: images && images.length > 0 ? 'gpt-4o' : MODEL, // Use vision model for images
            messages,
            temperature: 0.2,
            max_tokens: images && images.length > 0 ? 1000 : undefined
        });

        const answer = choices[0].message.content;
        const wordpressLinks = generateWordPressLinks(answer);

        return {
            answer: answer + wordpressLinks,
            citations: ''
        };
    }

    // Context provided - use RAG approach
    const context = contextChunks.map((c, i) => `[[${i + 1}]] ${c.content}`).join('\n\n');
    const citations = contextChunks.map((c, i) => `[[${i + 1}]] score=${c.similarity?.toFixed(3) ?? ''}`).join('\n');

    const systemContent = `You are a helpful assistant. Use the provided context to answer the user's question. If the answer isn't in the context, say you don't know. Cite like [1], [2].

When providing WordPress-related answers, you should be helpful and informative. The system will automatically add relevant WordPress admin links to your response based on the content you provide.

CONTEXT:
${context}`;

    const messages = [
        { role: 'system', content: systemContent }
    ];

    // Handle different prompt types with context
    if (images && images.length > 0) {
        // Image prompt or image + text prompt with context
        const userMessage = {
            role: 'user',
            content: []
        };

        // Add text if provided
        if (prompt && prompt.trim()) {
            userMessage.content.push({
                type: 'text',
                text: prompt
            });
        }

        // Add images
        for (const imageUrl of images) {
            userMessage.content.push({
                type: 'image_url',
                image_url: {
                    url: imageUrl,
                    detail: 'high'
                }
            });
        }

        messages.push(userMessage);
    } else {
        // Text-only prompt with context
        messages.push({
            role: 'user',
            content: prompt
        });
    }

    const { choices } = await client.chat.completions.create({
        model: images && images.length > 0 ? 'gpt-4o' : MODEL, // Use vision model for images
        messages,
        temperature: 0.2,
        max_tokens: images && images.length > 0 ? 1000 : undefined
    });

    const answer = choices[0].message.content;
    const wordpressLinks = generateWordPressLinks(answer);

    return {
        answer: answer + wordpressLinks,
        citations
    };
}