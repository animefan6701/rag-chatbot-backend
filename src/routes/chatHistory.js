import { Router } from "express";
import { db } from "../db.js";

const router = Router();

// Save chat history
router.post("/", async (req, res) => {
  try {
    let { user_email, prompt, answer, doc_id = null, sources = [], images = [], session_id = null } = req.body;

    // Convert empty strings to null for proper database handling
    if (session_id === '') session_id = null;
    if (doc_id === '') doc_id = null;
    if (user_email === '') user_email = null;

    console.log("=== SAVE CHAT HISTORY REQUEST ===");
    console.log("User email:", user_email);
    console.log("Session ID:", session_id);
    console.log("Prompt length:", prompt?.length || 0);
    console.log("Answer length:", answer?.length || 0);
    console.log("Document ID:", doc_id);
    console.log("Sources count:", sources?.length || 0);
    console.log("Images count:", images?.length || 0);

    // Validate required fields
    if (!user_email) {
      return res.status(400).json({ ok: false, error: "user_email is required" });
    }
    if (!prompt) {
      return res.status(400).json({ ok: false, error: "prompt is required" });
    }
    if (!answer) {
      return res.status(400).json({ ok: false, error: "answer is required" });
    }

    // Validate email format (basic validation)
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(user_email)) {
      return res.status(400).json({ ok: false, error: "Invalid email format" });
    }

    const d = db();
    await d.saveChatHistory(user_email, prompt, answer, doc_id, sources, images, session_id);

    console.log("Chat history saved successfully");
    res.json({ ok: true, message: "Chat history saved successfully" });
  } catch (err) {
    console.error("Error saving chat history:", err);
    res.status(500).json({ ok: false, error: err.message });
  }
});

// Get chat history for a user
router.post("/get", async (req, res) => {
  try {
    let { user_email, limit = 50, offset = 0, session_id = null } = req.body;

    // Convert empty strings to null for proper database handling
    if (session_id === '') session_id = null;
    if (user_email === '') user_email = null;

    console.log("=== GET CHAT HISTORY REQUEST ===");
    console.log("User email:", user_email);
    console.log("Session ID:", session_id);
    console.log("Limit:", limit);
    console.log("Offset:", offset);

    // Validate required fields
    if (!user_email) {
      return res.status(400).json({ ok: false, error: "user_email is required" });
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

    const d = db();
    const history = await d.getChatHistory(user_email, limitNum, offsetNum, session_id);

    console.log(`Retrieved ${history.length} chat history records`);

    // Debug: Log the first few records to see image data structure
    if (history.length > 0) {
      console.log("=== SAMPLE HISTORY RECORDS ===");
      history.slice(0, 3).forEach((record, index) => {
        console.log(`Record ${index + 1}:`);
        console.log(`  Prompt: ${record.prompt?.substring(0, 50)}...`);
        console.log(`  Images type: ${typeof record.images}`);
        console.log(`  Images value: ${record.images}`);
        if (record.images) {
          try {
            const parsedImages = typeof record.images === 'string' ? JSON.parse(record.images) : record.images;
            console.log(`  Parsed images count: ${Array.isArray(parsedImages) ? parsedImages.length : 'not array'}`);
            if (Array.isArray(parsedImages) && parsedImages.length > 0) {
              console.log(`  First image: ${JSON.stringify(parsedImages[0], null, 2)}`);
            }
          } catch (e) {
            console.log(`  Failed to parse images: ${e.message}`);
          }
        }
      });
    }

    res.json({
      ok: true,
      data: history,
      count: history.length,
      limit: limitNum,
      offset: offsetNum,
      session_id: session_id
    });
  } catch (err) {
    console.error("Error fetching chat history:", err);
    res.status(500).json({ ok: false, error: err.message });
  }
});



export default router;
