import { Router } from 'express';
import { chatWithContext } from '../embeddings.js';

const router = Router();

/**
 * Test endpoint for WordPress link generation
 * POST /wordpress/test
 * Body: { prompt: "Your WordPress question" }
 */
router.post('/test', async (req, res) => {
  try {
    console.log("=== WORDPRESS LINK TEST REQUEST ===");
    console.log("Request body:", req.body);

    const { prompt } = req.body;

    if (!prompt) {
      return res.status(400).json({
        ok: false,
        error: "prompt is required",
        example: {
          prompt: "How do I create a new post in WordPress?"
        }
      });
    }

    console.log("Testing WordPress link generation for prompt:", prompt);

    // Use chatWithContext without any context to test direct OpenAI + WordPress links
    const result = await chatWithContext(prompt, []);

    console.log("Generated response with WordPress links");

    res.json({
      ok: true,
      prompt: prompt,
      answer: result.answer,
      answer_html: result.answer, // Same as answer since it already contains HTML
      citations: result.citations,
      timestamp: new Date().toISOString(),
      note: "The 'answer' field contains HTML links that open in new tabs"
    });

  } catch (error) {
    console.error("WordPress test error:", error);
    res.status(500).json({ 
      ok: false, 
      error: error.message 
    });
  }
});

/**
 * Get WordPress admin link mappings
 * GET /wordpress/links
 */
router.get('/links', (req, res) => {
  const domain = process.env.WORDPRESS_DOMAIN || '${domain}';
  const { format = 'json' } = req.query; // Support format=html query parameter

  const linkPaths = {
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

  // Generate full URLs
  const links = {};
  const htmlLinks = {};

  for (const [keyword, path] of Object.entries(linkPaths)) {
    const fullUrl = `${domain}${path}`;
    links[keyword] = fullUrl;
    htmlLinks[keyword] = `<a href="${fullUrl}" target="_blank" rel="noopener noreferrer">${keyword.charAt(0).toUpperCase() + keyword.slice(1)}</a>`;
  }

  if (format === 'html') {
    res.json({
      ok: true,
      domain: domain,
      links: htmlLinks,
      raw_links: links,
      total_links: Object.keys(links).length,
      format: 'html'
    });
  } else {
    res.json({
      ok: true,
      domain: domain,
      links: links,
      html_links: htmlLinks,
      total_links: Object.keys(links).length,
      format: 'json'
    });
  }
});

export default router;
