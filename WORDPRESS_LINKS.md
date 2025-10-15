# WordPress Admin Links Feature

This chatbot automatically includes the most relevant WordPress admin link in responses when discussing WordPress-related topics.

## How It Works

When the chatbot detects WordPress-related keywords in its response, it automatically appends the single most relevant admin link to help users navigate directly to the appropriate WordPress admin page.

## Supported Keywords and Descriptive Links

| User Intent | Keywords Detected | Link Text | Admin Path |
|-------------|------------------|-----------|------------|
| Create content | create post, new post, write post | **Create New Post** | `/wp-admin/post-new.php` |
| Create pages | create page, new page, add page | **Create New Page** | `/wp-admin/post-new.php?post_type=page` |
| Edit content | edit post, modify post, update post | **Edit Posts** | `/wp-admin/edit.php` |
| Edit pages | edit page, modify page, update page | **Edit Pages** | `/wp-admin/edit.php?post_type=page` |
| Install plugins | install plugin, add plugin | **Install Plugins** | `/wp-admin/plugin-install.php` |
| Manage plugins | manage plugin, activate plugin | **Manage Plugins** | `/wp-admin/plugins.php` |
| Install themes | install theme, add theme | **Install Themes** | `/wp-admin/theme-install.php` |
| Manage themes | manage theme, activate theme | **Manage Themes** | `/wp-admin/themes.php` |
| Upload files | upload media, add media, upload image | **Upload Media** | `/wp-admin/media-new.php` |
| Browse media | media library, view media | **Media Library** | `/wp-admin/upload.php` |
| Site customization | customize, customizer, live preview | **Customize Site** | `/wp-admin/customize.php` |
| User management | manage user, add user, create user | **Manage Users** | `/wp-admin/users.php` |
| Comment moderation | moderate comment, approve comment | **Moderate Comments** | `/wp-admin/edit-comments.php` |
| Navigation | create menu, navigation menu | **Manage Menus** | `/wp-admin/nav-menus.php` |
| Widgets | widget, sidebar | **Manage Widgets** | `/wp-admin/widgets.php` |
| Site settings | setting, configuration, options | **Site Settings** | `/wp-admin/options-general.php` |
| Admin access | dashboard, admin panel, backend | **WordPress Dashboard** | `/wp-admin/` |
| Categories | create category, add category | **Manage Categories** | `/wp-admin/edit-tags.php?taxonomy=category` |
| Tags | create tag, add tag | **Manage Tags** | `/wp-admin/edit-tags.php?taxonomy=post_tag` |

## Configuration

### Setting Your WordPress Domain

1. **Environment Variable**: Set `WORDPRESS_DOMAIN` in your `.env` file:
   ```env
   WORDPRESS_DOMAIN=https://yoursite.com
   ```

2. **Default Placeholder**: If not set, links will use `${domain}` as a placeholder that users can replace with their actual domain.

### Example Response

**User Question**: "How do I create a new post in WordPress?"

**Chatbot Response**:
```
To create a new post in WordPress, you can follow these steps:

1. Log into your WordPress admin dashboard
2. Navigate to Posts > Add New
3. Enter your post title and content
4. Configure your post settings (categories, tags, etc.)
5. Click "Publish" when ready

**WordPress Admin Link:**
- <a href="http://localhost/wp-chatbot/wp-admin/post-new.php?post_type=page" target="_blank" rel="noopener noreferrer">Create New Page</a>
```

### HTML Link Features

The generated link includes:
- **Single most relevant link** based on user's specific question
- **Clickable HTML link** with `<a href>` tag
- **Open in new tab** with `target="_blank"`
- **Security attributes** with `rel="noopener noreferrer"`
- **Smart priority matching** - more specific actions take precedence

### Priority Examples

- "How do I create a new post?" → **Create New Post** (`/wp-admin/post-new.php`)
- "How do I create a new page?" → **Create New Page** (`/wp-admin/post-new.php?post_type=page`)
- "How do I edit posts?" → **Edit Posts** (`/wp-admin/edit.php`)
- "How do I install a plugin?" → **Install Plugins** (`/wp-admin/plugin-install.php`)
- "How do I manage plugins?" → **Manage Plugins** (`/wp-admin/plugins.php`)
- "How do I upload media?" → **Upload Media** (`/wp-admin/media-new.php`)
- "How do I customize my site?" → **Customize Site** (`/wp-admin/customize.php`)
- "How do I moderate comments?" → **Moderate Comments** (`/wp-admin/edit-comments.php`)
- "How do I manage users?" → **Manage Users** (`/wp-admin/users.php`)

## Testing

Run the test script to see the WordPress link generation in action:

```bash
npm run test-wordpress-links
```

This will test various WordPress-related prompts and show how the links are automatically generated.

## Implementation Details

The feature is implemented in `src/embeddings.js`:

1. **Keyword Detection**: The `generateWordPressLinks()` function scans the chatbot's response for WordPress-related keywords.

2. **Link Generation**: When keywords are found, appropriate admin links are generated using the configured domain.

3. **Response Enhancement**: Links are automatically appended to the chatbot's response in a formatted section.

4. **Duplicate Removal**: The system ensures no duplicate links are shown even if multiple related keywords are detected.

## Customization

You can modify the `WORDPRESS_ADMIN_LINKS` object in `src/embeddings.js` to:
- Add new keywords and their corresponding admin paths
- Modify existing link mappings
- Add custom admin pages specific to your WordPress setup

## Benefits

- **Improved User Experience**: Users get direct links to relevant admin pages
- **Reduced Support Time**: Less back-and-forth explaining where to find WordPress features
- **Consistent Navigation**: Standardized links across all WordPress-related responses
- **Automatic Detection**: No manual intervention required - links are added automatically based on response content
