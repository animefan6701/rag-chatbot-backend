import { Router } from 'express';
import { db } from '../db.js';

const router = Router();

// Create a new chat session
router.post('/', async (req, res) => {
  try {
    const { user_email, title = 'New Chat', description = null, metadata = {} } = req.body;

    console.log("=== CREATE CHAT SESSION REQUEST ===");
    console.log("User email:", user_email);
    console.log("Title:", title);
    console.log("Description:", description);

    // Validate required fields
    if (!user_email) {
      return res.status(400).json({ ok: false, error: "user_email is required" });
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(user_email)) {
      return res.status(400).json({ ok: false, error: "Invalid email format" });
    }

    // Validate title length
    if (title && title.length > 500) {
      return res.status(400).json({ ok: false, error: "Title must be 500 characters or less" });
    }

    const d = db();
    const session = await d.createChatSession(user_email, title, description, metadata);

    console.log("Chat session created successfully:", session.id);
    res.json({ 
      ok: true, 
      session: session,
      message: "Chat session created successfully" 
    });
  } catch (err) {
    console.error("Error creating chat session:", err);
    res.status(500).json({ ok: false, error: err.message });
  }
});

// Get all chat sessions for a user
router.get('/', async (req, res) => {
  try {
    const { user_email, limit = 50, offset = 0, include_archived = false } = req.query;

    console.log("=== GET CHAT SESSIONS REQUEST ===");
    console.log("User email:", user_email);
    console.log("Limit:", limit);
    console.log("Offset:", offset);
    console.log("Include archived:", include_archived);

    // Validate required fields
    if (!user_email) {
      return res.status(400).json({ ok: false, error: "user_email query parameter is required" });
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(user_email)) {
      return res.status(400).json({ ok: false, error: "Invalid email format" });
    }

    // Validate limit and offset
    const limitNum = parseInt(limit, 10);
    const offsetNum = parseInt(offset, 10);

    if (isNaN(limitNum) || limitNum < 1 || limitNum > 100) {
      return res.status(400).json({ ok: false, error: "Limit must be between 1 and 100" });
    }

    if (isNaN(offsetNum) || offsetNum < 0) {
      return res.status(400).json({ ok: false, error: "Offset must be 0 or greater" });
    }

    const includeArchived = include_archived === 'true';

    const d = db();
    const sessions = await d.getChatSessions(user_email, limitNum, offsetNum, includeArchived);

    console.log(`Retrieved ${sessions.length} chat sessions`);

    res.json({
      ok: true,
      sessions: sessions,
      count: sessions.length,
      limit: limitNum,
      offset: offsetNum,
      include_archived: includeArchived
    });
  } catch (err) {
    console.error("Error fetching chat sessions:", err);
    res.status(500).json({ ok: false, error: err.message });
  }
});

// Get a specific chat session
router.get('/:sessionId', async (req, res) => {
  try {
    const { sessionId } = req.params;
    const { user_email } = req.query;

    console.log("=== GET CHAT SESSION REQUEST ===");
    console.log("Session ID:", sessionId);
    console.log("User email:", user_email);

    // Validate required fields
    if (!user_email) {
      return res.status(400).json({ ok: false, error: "user_email query parameter is required" });
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(user_email)) {
      return res.status(400).json({ ok: false, error: "Invalid email format" });
    }

    const d = db();
    const session = await d.getChatSession(sessionId, user_email);

    if (!session) {
      return res.status(404).json({ ok: false, error: "Chat session not found" });
    }

    console.log("Chat session retrieved successfully");

    res.json({
      ok: true,
      session: session
    });
  } catch (err) {
    console.error("Error fetching chat session:", err);
    res.status(500).json({ ok: false, error: err.message });
  }
});

// Update a chat session
router.put('/:sessionId', async (req, res) => {
  try {
    const { sessionId } = req.params;
    const { user_email, title, description, is_archived, metadata } = req.body;

    console.log("=== UPDATE CHAT SESSION REQUEST ===");
    console.log("Session ID:", sessionId);
    console.log("User email:", user_email);

    // Validate required fields
    if (!user_email) {
      return res.status(400).json({ ok: false, error: "user_email is required" });
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(user_email)) {
      return res.status(400).json({ ok: false, error: "Invalid email format" });
    }

    // Build updates object
    const updates = {};
    if (title !== undefined) {
      if (title.length > 500) {
        return res.status(400).json({ ok: false, error: "Title must be 500 characters or less" });
      }
      updates.title = title;
    }
    if (description !== undefined) updates.description = description;
    if (is_archived !== undefined) updates.is_archived = is_archived;
    if (metadata !== undefined) updates.metadata = metadata;

    if (Object.keys(updates).length === 0) {
      return res.status(400).json({ ok: false, error: "No valid fields to update" });
    }

    const d = db();
    const session = await d.updateChatSession(sessionId, user_email, updates);

    if (!session) {
      return res.status(404).json({ ok: false, error: "Chat session not found" });
    }

    console.log("Chat session updated successfully");

    res.json({
      ok: true,
      session: session,
      message: "Chat session updated successfully"
    });
  } catch (err) {
    console.error("Error updating chat session:", err);
    res.status(500).json({ ok: false, error: err.message });
  }
});

// Delete a chat session
router.delete('/:sessionId', async (req, res) => {
  try {
    const { sessionId } = req.params;
    const { user_email } = req.query;

    console.log("=== DELETE CHAT SESSION REQUEST ===");
    console.log("Session ID:", sessionId);
    console.log("User email:", user_email);

    // Validate required fields
    if (!user_email) {
      return res.status(400).json({ ok: false, error: "user_email query parameter is required" });
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(user_email)) {
      return res.status(400).json({ ok: false, error: "Invalid email format" });
    }

    const d = db();
    
    // Check if session exists first
    const existingSession = await d.getChatSession(sessionId, user_email);
    if (!existingSession) {
      return res.status(404).json({ ok: false, error: "Chat session not found" });
    }

    await d.deleteChatSession(sessionId, user_email);

    console.log("Chat session deleted successfully");

    res.json({
      ok: true,
      message: "Chat session deleted successfully"
    });
  } catch (err) {
    console.error("Error deleting chat session:", err);
    res.status(500).json({ ok: false, error: err.message });
  }
});

// Update session title only
router.patch('/:sessionId/title', async (req, res) => {
  try {
    const { sessionId } = req.params;
    const { user_email, title } = req.body;

    console.log("=== UPDATE SESSION TITLE REQUEST ===");
    console.log("Session ID:", sessionId);
    console.log("User email:", user_email);
    console.log("New title:", title);

    // Validate required fields
    if (!user_email) {
      return res.status(400).json({ ok: false, error: "user_email is required" });
    }

    if (!title) {
      return res.status(400).json({ ok: false, error: "title is required" });
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(user_email)) {
      return res.status(400).json({ ok: false, error: "Invalid email format" });
    }

    // Validate title length
    if (title.length > 500) {
      return res.status(400).json({ ok: false, error: "Title must be 500 characters or less" });
    }

    const d = db();
    const session = await d.updateChatSession(sessionId, user_email, { title });

    if (!session) {
      return res.status(404).json({ ok: false, error: "Chat session not found" });
    }

    console.log("Session title updated successfully");

    res.json({
      ok: true,
      session: session,
      message: "Session title updated successfully"
    });
  } catch (err) {
    console.error("Error updating session title:", err);
    res.status(500).json({ ok: false, error: err.message });
  }
});

export default router;
