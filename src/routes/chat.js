import { Router } from "express";
import multer from "multer";
import { v4 as uuidv4 } from "uuid";
import { db } from "../db.js";
import { embedBatch, chatWithContext } from "../embeddings.js";
import { sb, uploadBuffer } from "../storage.js";
import fs from 'fs/promises';

import OpenAI from 'openai';
import fsSync from 'fs';

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });


const router = Router();

// Configure multer for image uploads
const upload = multer({ dest: 'uploads/' });

// Regular chat endpoint (text-only)
router.post("/", async (req, res) => {
  try {
    console.log("=== CHAT REQUEST DEBUG ===");
    console.log("Content-Type:", req.headers['content-type']);
    console.log("Request body:", req.body);
    console.log("Request files:", req.files);
    console.log("Raw body type:", typeof req.body);
    console.log("Body keys:", req.body ? Object.keys(req.body) : 'no body');

    // Check if this is a multipart/form-data request (should go to /chat/image)
    const contentType = req.headers['content-type'] || '';
    if (contentType.includes('multipart/form-data')) {
      console.log("❌ Multipart data sent to /chat instead of /chat/image");
      return res.status(400).json({
        ok: false,
        error: "For image uploads, please use POST /chat/image endpoint instead of /chat",
        hint: "This endpoint only accepts JSON data. For images, use the /chat/image endpoint with multipart/form-data."
      });
    }

    let { prompt, k = 6, doc_id = null, user_email = null, session_id = null, wordpress_domain = null } = req.body || {};

    // Convert empty strings to null for proper database handling
    if (session_id === '') session_id = null;
    if (doc_id === '') doc_id = null;
    if (user_email === '') user_email = null;


    console.log("=== PARSED CHAT REQUEST ===");
    console.log("Prompt:", prompt);
    console.log("Document ID:", doc_id);
    console.log("K value:", k);
    console.log("User email:", user_email);
    console.log("Session ID:", session_id);
    console.log("Session ID type:", typeof session_id);
    console.log("Session ID empty check:", (!session_id || session_id === ''));

    if (!prompt) {
      console.log("❌ Missing prompt in request");
      return res.status(400).json({
        ok: false,
        error: "prompt required for text chat",
        hint: "Send JSON data with 'prompt' field, or use /chat/image for image uploads",
        debug: {
          receivedBody: req.body,
          contentType: req.headers['content-type']
        }
      });
    }

    // Auto-create session if no session_id provided and user_email is available
    // Check for null, undefined, or empty string
    let session_title = null; // Track session title for response
    if ((!session_id || session_id === '') && user_email) {
      console.log("=== AUTO-CREATING SESSION ===");
      console.log("No session_id provided, creating new session with prompt as title");

      try {
        // Generate session title from prompt (truncate if too long)
        let sessionTitle = prompt.trim();
        if (sessionTitle.length > 50) {
          sessionTitle = sessionTitle.substring(0, 47) + '...';
        }

        // Don't use generic messages as titles
        const genericMessages = ['hi', 'hello', 'hey', 'test', 'help'];
        if (genericMessages.includes(sessionTitle.toLowerCase())) {
          sessionTitle = 'New Chat';
        }

        console.log("Creating session with title:", sessionTitle);

        const d = db();
        const newSession = await d.createChatSession(user_email, sessionTitle, null, {});
        session_id = newSession.id;
        session_title = sessionTitle; // Store for response

        console.log("✅ Session created successfully:", session_id, "with title:", session_title);
      } catch (sessionError) {
        console.error("❌ Failed to create session:", sessionError);
        // Continue without session_id - don't fail the chat request
        console.log("Continuing chat request without session_id");
      }
    }

    const [embedding] = await embedBatch([prompt]);
    console.log("Embedding generated, length:", embedding.length);

    const d = db();
    const hits = await d.searchSimilar(embedding, k, doc_id);
    console.log("Search results found:", hits.length);
    console.log("First hit metadata:", hits[0]?.metadata);

    // Check if we have relevant database results
    const hasRelevantResults = hits && hits.length > 0;

    // Filter out low similarity results - only use results with similarity > 0.5
    const relevantHits = hits.filter(hit => hit.similarity > 0.5); // Higher threshold for better quality
    const hasHighQualityResults = relevantHits.length > 0;

    console.log(`Search results: ${hits.length} total, ${relevantHits.length} with similarity > 0.5`);
    if (hits.length > 0) {
      console.log("Similarity scores:", hits.map(h => h.similarity?.toFixed(3)));
    }

         if (hasRelevantResults && hasHighQualityResults) {
       console.log("✅ Found relevant database results with similarity > 0.5, using RAG approach");

      // Get relevant images for the document
      let images = [];

      // Extract document ID from search results if not provided
      let targetDocId = doc_id;
      if (!targetDocId && relevantHits.length > 0) {
        // Try to extract doc_id from the first hit's file_url
        const firstHit = relevantHits[0];
        if (firstHit.metadata?.file_url) {
          const urlMatch = firstHit.metadata.file_url.match(/originals\/([^\/]+)\//);
          if (urlMatch) {
            targetDocId = urlMatch[1];
            console.log(`\n=== EXTRACTED DOCUMENT ID ===`);
            console.log(`From file_url: ${firstHit.metadata.file_url}`);
            console.log(`Extracted doc_id: ${targetDocId}`);
          }
        }
      }

      if (targetDocId) {
        console.log(`\n=== FETCHING IMAGES ===`);
        console.log(`Document ID: ${targetDocId}`);

        const { data: assets, error: assetsError } = await sb
          .from("document_assets")
          .select("id, kind, image_index, page_index, url, content_type")
          .eq("doc_id", targetDocId)
          .in("kind", ["docx_image", "pdf_image"])
          .order("page_index", { ascending: true })
          .order("image_index", { ascending: true });

        if (assetsError) {
          console.error("❌ Error fetching assets:", assetsError);
          console.error("Error details:", assetsError.message);
        } else {
          console.log(`✅ Found ${assets?.length || 0} images for document ${targetDocId}`);
          if (assets && assets.length > 0) {
            console.log("Image details:");
            assets.forEach((img, index) => {
              console.log(`  ${index + 1}. ID: ${img.id}, Kind: ${img.kind}, URL: ${img.url}`);
            });
          }
          images = assets || [];
        }
      } else {
        console.log("⚠️ No document ID available, skipping image fetch");
        console.log("Search results metadata:", hits.map(h => h.metadata));
      }

      // Use RAG approach with context
      const answer = await chatWithContext(prompt, relevantHits, [], wordpress_domain);
      console.log(`\n=== SENDING RAG RESPONSE ===`);
      console.log(`Answer length: ${answer.answer?.length || 0} characters`);
      console.log(`Sources count: ${relevantHits.length}`);
      console.log(`Images count: ${images.length}`);

             const response = {
         ok: true,
         ...answer,
         sources: relevantHits.map((h, i) => ({
           id: h.id,
           snippet: h.content.slice(0, 160) + (h.content.length > 160 ? "…" : ""),
           metadata: h.metadata,
           tag: `[${i + 1}]`,
           document_url: h.metadata?.file_url || null, // Include document URL for download
         })),
         images: images,
       };

             console.log("Response structure:", {
         ok: response.ok,
         answerLength: response.answer?.length || 0,
         sourcesCount: response.sources?.length || 0,
         imagesCount: response.images?.length || 0
       });

       // Log document URLs for debugging
       if (response.sources && response.sources.length > 0) {
         console.log("Document URLs included:");
         response.sources.forEach((source, index) => {
           if (source.document_url) {
             console.log(`  Source ${index + 1}: ${source.document_url}`);
           }
         });
       }

      // Add session_id and session_title to response so frontend knows which session was used/created
      response.session_id = session_id;
      if (session_title) {
        response.session_title = session_title;
      }
      res.json(response);

      // Save chat history if user_email is provided
      if (user_email) {
        try {
          console.log("=== SAVING CHAT HISTORY ===");
          console.log("User email:", user_email);
          console.log("Session ID for history:", session_id);
          console.log("Session ID type:", typeof session_id);
          await d.saveChatHistory(user_email, prompt, response.answer, doc_id, response.sources, response.images, session_id);
          console.log("✅ Chat history saved successfully with session_id:", session_id);
        } catch (historyErr) {
          console.error("❌ Failed to save chat history:", historyErr);
          // Don't fail the request if history saving fails
        }
      }

         } else {
       if (hasRelevantResults && !hasHighQualityResults) {
         console.log("⚠️ Found database results but similarity < 0.5, using direct OpenAI");
       } else {
         console.log("⚠️ No relevant database results found, using direct OpenAI");
       }

      // Use direct OpenAI without context (now with flexible system prompt)
      console.log("📝 Using flexible system prompt for non-WordPress or low-similarity questions");
      const answer = await chatWithContext(prompt, [], [], wordpress_domain);
      console.log(`\n=== SENDING DIRECT OPENAI RESPONSE ===`);
      console.log(`Answer length: ${answer.answer?.length || 0} characters`);

      const response = {
        ok: true,
        ...answer,
        sources: [], // No sources when no database results
        images: [], // No images when no database results
      };

      console.log("Response structure:", {
        ok: response.ok,
        answerLength: response.answer?.length || 0,
        sourcesCount: 0,
        imagesCount: 0
      });

      // Add session_id and session_title to response so frontend knows which session was used/created
      response.session_id = session_id;
      if (session_title) {
        response.session_title = session_title;
      }
      res.json(response);

      // Save chat history if user_email is provided
      if (user_email) {
        try {
          await d.saveChatHistory(user_email, prompt, response.answer, doc_id, response.sources, response.images, session_id);
          console.log("Chat history saved for user:", user_email);
        } catch (historyErr) {
          console.error("Failed to save chat history:", historyErr);
          // Don't fail the request if history saving fails
        }
      }
    }
  } catch (err) {
    console.error(err);

    res.status(500).json({ ok: false, error: err.message });
  }
});

// Image chat endpoint (supports image + text, image-only, or text-only with images)
router.post("/image", upload.array('images', 5), async (req, res) => {
  try {
    console.log("=== IMAGE CHAT REQUEST DEBUG ===");
    console.log("Timestamp:", new Date().toISOString());
    console.log("Content-Type:", req.headers['content-type']);
    console.log("Request body:", req.body);
    console.log("Request files:", req.files ? req.files.length : 0);
    console.log("Body keys:", req.body ? Object.keys(req.body) : 'no body');

    // Log each uploaded file details
    if (req.files && req.files.length > 0) {
      console.log("=== UPLOADED FILES DETAILS ===");
      req.files.forEach((file, index) => {
        console.log(`File ${index + 1}:`);
        console.log(`  Original name: ${file.originalname}`);
        console.log(`  MIME type: ${file.mimetype}`);
        console.log(`  Size: ${file.size} bytes`);
        console.log(`  Field name: ${file.fieldname}`);
      });
    } else {
      console.log("❌ No files uploaded or files array is empty");
    }

    let { prompt = "", k = 6, doc_id = null, user_email = null, session_id = null, prompt_type = "image_text", wordpress_domain = null } = req.body || {};
    const uploadedFiles = req.files || [];

    // Convert empty strings and string "null" to null for proper database handling

    if (session_id === '' || session_id === 'null' || session_id === 'undefined') session_id = null;
    if (doc_id === '' || doc_id === 'null' || doc_id === 'undefined') doc_id = null;
    if (user_email === '' || user_email === 'null' || user_email === 'undefined') user_email = null;

    console.log("=== PARSED IMAGE CHAT REQUEST ===");
    console.log("Prompt:", prompt);
    console.log("Prompt type:", prompt_type);
    console.log("Document ID:", doc_id);
    console.log("K value:", k);
    console.log("User email:", user_email);
    console.log("Session ID:", session_id);
    console.log("Uploaded files:", uploadedFiles.length);

    // Determine the actual prompt to save in history
    let promptForHistory = prompt;
    if (!prompt || prompt.trim() === '') {
      if (uploadedFiles.length > 0) {
        promptForHistory = `[Image upload: ${uploadedFiles.length} image${uploadedFiles.length > 1 ? 's' : ''}]`;
      } else {
        promptForHistory = "[Empty prompt]";
      }
    }
    console.log("Prompt for history:", promptForHistory);

    // Auto-create session if no session_id provided and user_email is available
    // Check for null, undefined, or empty string
    let session_title = null; // Track session title for response
    if ((!session_id || session_id === '') && user_email) {
      console.log("=== AUTO-CREATING SESSION FOR IMAGE CHAT ===");
      console.log("No session_id provided, creating new session");

      try {
        // Generate session title from prompt or use descriptive title for image-only uploads
        let sessionTitle;
        if (prompt && prompt.trim()) {
          sessionTitle = prompt.trim();
          if (sessionTitle.length > 50) {
            sessionTitle = sessionTitle.substring(0, 47) + '...';
          }

          // Don't use generic messages as titles
          const genericMessages = ['hi', 'hello', 'hey', 'test', 'help'];
          if (genericMessages.includes(sessionTitle.toLowerCase())) {
            sessionTitle = uploadedFiles.length > 0 ? 'Image Chat' : 'New Chat';
          }
        } else {
          // No text prompt, create descriptive title based on images
          if (uploadedFiles.length > 0) {
            sessionTitle = `Image Chat (${uploadedFiles.length} image${uploadedFiles.length > 1 ? 's' : ''})`;
          } else {
            sessionTitle = 'New Chat';
          }
        }

        console.log("Creating session with title:", sessionTitle);

        const d = db();
        const newSession = await d.createChatSession(user_email, sessionTitle, null, {});
        session_id = newSession.id;
        session_title = sessionTitle; // Store for response

        console.log("✅ Session created successfully for image chat:", session_id, "with title:", session_title);
      } catch (sessionError) {
        console.error("❌ Failed to create session for image chat:", sessionError);
        // Continue without session_id - don't fail the chat request
        console.log("Continuing image chat request without session_id");
      }
    }

    if (uploadedFiles.length > 0) {
      console.log("File details:");
      uploadedFiles.forEach((file, i) => {
        console.log(`  File ${i}: ${file.originalname}, ${file.mimetype}, ${file.size} bytes`);
      });
    }

    // Validate prompt type
    const validPromptTypes = ["text", "image", "image_text"];
    if (!validPromptTypes.includes(prompt_type)) {
      return res.status(400).json({
        ok: false,
        error: "prompt_type must be one of: text, image, image_text"
      });
    }

    // Validate based on prompt type
    if (prompt_type === "text" && !prompt.trim()) {
      return res.status(400).json({ ok: false, error: "prompt required for text type" });
    }

    if ((prompt_type === "image" || prompt_type === "image_text") && uploadedFiles.length === 0) {
      return res.status(400).json({ ok: false, error: "images required for image or image_text type" });
    }

    if (prompt_type === "image_text" && !prompt.trim()) {
      return res.status(400).json({ ok: false, error: "prompt required for image_text type" });
    }

    // Process uploaded images
    const imageUrls = [];
    const chatId = uuidv4();

    for (const [index, file] of uploadedFiles.entries()) {
      try {
        // Read file buffer
        const fileBuffer = await fs.readFile(file.path);

        // Validate image type
        const allowedTypes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];
        if (!allowedTypes.includes(file.mimetype)) {
          await fs.unlink(file.path).catch(() => {});
          return res.status(400).json({
            ok: false,
            error: `Unsupported image type: ${file.mimetype}. Allowed: ${allowedTypes.join(', ')}`
          });
        }

        // Upload to storage
        const imagePath = `chat-images/${chatId}/image_${index}_${Date.now()}`;
        console.log(`Uploading image ${index + 1} to bucket 'assets' with path: ${imagePath}`);
        console.log(`File details: ${file.originalname}, ${file.mimetype}, ${file.size} bytes`);

        const imageUrl = await uploadBuffer('assets', imagePath, fileBuffer, file.mimetype);
        imageUrls.push(imageUrl);

        console.log(`✅ Successfully uploaded image ${index + 1}: ${imageUrl}`);
        console.log(`Full bucket path: assets/${imagePath}`);

        // Clean up temp file
        await fs.unlink(file.path).catch(() => {});
      } catch (uploadError) {
        console.error(`Error uploading image ${index}:`, uploadError);
        // Clean up temp file
        await fs.unlink(file.path).catch(() => {});
        return res.status(500).json({
          ok: false,
          error: `Failed to upload image ${index + 1}: ${uploadError.message}`
        });
      }
    }

    // For text-only prompts, use regular embedding search
    let hits = [];
    if (prompt.trim()) {
      const [embedding] = await embedBatch([prompt]);
      console.log("Embedding generated, length:", embedding.length);

      const d = db();
      hits = await d.searchSimilar(embedding, k, doc_id);
      console.log("Search results found:", hits.length);
    }

    // Filter relevant results
    const relevantHits = hits.filter(hit => hit.similarity > 0.5);
    const hasHighQualityResults = relevantHits.length > 0;

    let response;

    if (hasHighQualityResults) {
      // Use RAG approach with context and images
      console.log(`Using RAG approach with ${relevantHits.length} relevant results and ${imageUrls.length} images`);

      // Get images from database for this document
      const images = [];
      if (doc_id) {
        const { data: dbImages } = await sb.from('document_assets').select('*').eq('doc_id', doc_id);
        if (dbImages) {
          images.push(...dbImages);
        }
      }

      const answer = await chatWithContext(prompt, relevantHits, imageUrls, wordpress_domain);
      console.log(`\n=== SENDING RAG RESPONSE WITH IMAGES ===`);
      console.log(`Answer length: ${answer.answer?.length || 0} characters`);
      console.log(`Sources count: ${relevantHits.length}`);
      console.log(`Database images count: ${images.length}`);
      console.log(`User uploaded images count: ${imageUrls.length}`);

      response = {
        ok: true,
        ...answer,
        sources: relevantHits.map((h, i) => ({
          id: h.id,
          snippet: h.content.slice(0, 160) + (h.content.length > 160 ? "…" : ""),
          metadata: h.metadata,
          tag: `[${i + 1}]`,
          document_url: h.metadata?.file_url || null,
        })),
        images: images,
        user_images: imageUrls,
        prompt_type
      };
    } else {
      // Use direct OpenAI with images (no context, now with flexible system prompt)
      console.log(`Using direct OpenAI with ${imageUrls.length} images (no relevant database results)`);
      console.log("📝 Using flexible system prompt for image questions");

      const answer = await chatWithContext(prompt, [], imageUrls, wordpress_domain);
      console.log(`\n=== SENDING DIRECT OPENAI RESPONSE WITH IMAGES ===`);
      console.log(`Answer length: ${answer.answer?.length || 0} characters`);
      console.log(`User uploaded images count: ${imageUrls.length}`);

      response = {
        ok: true,
        ...answer,
        sources: [],
        images: [],
        user_images: imageUrls,
        prompt_type
      };
    }

    // Add session_id and session_title to response so frontend knows which session was used/created
    response.session_id = session_id;
    if (session_title) {
      response.session_title = session_title;
    }
    res.json(response);

    // Save chat history if user_email is provided
    console.log("=== CHECKING IF SHOULD SAVE HISTORY ===");
    console.log("User email provided:", !!user_email);
    console.log("User email value:", user_email);
    if (user_email) {
      try {
        console.log("=== SAVING IMAGE CHAT HISTORY ===");
        console.log("Timestamp:", new Date().toISOString());
        console.log("User email:", user_email);
        console.log("Session ID for history:", session_id);
        console.log("Session ID type:", typeof session_id);
        console.log("Prompt to save:", promptForHistory);
        console.log("Uploaded image URLs:", imageUrls);
        console.log("Response images:", response.images);
        console.log("About to call d.saveChatHistory()...");

        // Combine response images and user uploaded images
        const responseImages = response.images || [];
        const userUploadedImages = imageUrls.map((url, i) => ({
          id: `user_image_${i}`,
          url,
          kind: 'user_upload',
          image_index: i
        }));

        const imagesToSave = [...responseImages, ...userUploadedImages];

        console.log("=== IMAGE COMBINATION DEBUG ===");
        console.log("Response images count:", responseImages.length);
        console.log("Response images:", responseImages);
        console.log("User uploaded images count:", userUploadedImages.length);
        console.log("User uploaded images:", userUploadedImages);
        console.log("Combined images count:", imagesToSave.length);
        console.log("Combined images JSON:", JSON.stringify(imagesToSave, null, 2));

        const d = db();
        console.log("Database instance created, calling saveChatHistory...");
        await d.saveChatHistory(
          user_email,
          promptForHistory,
          response.answer,
          doc_id,
          response.sources,
          imagesToSave,
          session_id
        );
        console.log("✅ Image chat history saved successfully with session_id:", session_id);
        console.log("✅ Database save completed at:", new Date().toISOString());
      } catch (historyErr) {
        console.error("❌ Failed to save chat history:", historyErr);
        console.error("❌ History save error details:", historyErr.message);
        console.error("❌ History save error stack:", historyErr.stack);
      }
    } else {
      console.log("❌ NOT SAVING HISTORY - No user_email provided");
      console.log("❌ user_email value:", user_email);
      console.log("❌ user_email type:", typeof user_email);
    }
  } catch (err) {
    console.error("Image chat error:", err);

    // Clean up any uploaded files on error
    if (req.files) {
      for (const file of req.files) {
        await fs.unlink(file.path).catch(() => {});
      }
    }

    res.status(500).json({ ok: false, error: err.message });
  }
});

// Test endpoint to verify database connection
router.get("/test-db", async (req, res) => {
  try {
    console.log("=== TESTING DATABASE CONNECTION ===");
    const d = db();
    console.log("Database instance created successfully");

    // Try to save a test chat history
    await d.saveChatHistory(
      "test@example.com",
      "Test prompt for database connection",
      "Test answer",
      null,
      [],
      [{ id: "test_image", url: "https://example.com/test.jpg", kind: "test" }],
      "test-session-id"
    );

    console.log("✅ Test chat history saved successfully");
    res.json({ ok: true, message: "Database connection test successful" });
  } catch (err) {
    console.error("❌ Database test failed:", err);
    res.status(500).json({ ok: false, error: err.message });
  }
});


// Audio transcription endpoint (MediaRecorder fallback)
router.post("/transcribe", upload.single('audio'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ ok: false, error: 'No audio file uploaded' });
    }

    console.log('Transcription request received');
    console.log('File info:', {
      originalname: req.file.originalname,
      mimetype: req.file.mimetype,
      size: req.file.size,
      path: req.file.path
    });

    const filePath = req.file.path;
    const model = process.env.TRANSCRIBE_MODEL || 'whisper-1';

    // Get file extension from original filename or MIME type
    let fileExt = '.webm';
    if (req.file.originalname) {
      const match = req.file.originalname.match(/\.[^.]+$/);
      if (match) {
        fileExt = match[0];
      }
    } else if (req.file.mimetype) {
      // Map MIME types to extensions
      const mimeToExt = {
        'audio/webm': '.webm',
        'audio/ogg': '.ogg',
        'audio/wav': '.wav',
        'audio/mpeg': '.mp3',
        'audio/mp4': '.mp4',
        'audio/flac': '.flac'
      };
      fileExt = mimeToExt[req.file.mimetype] || '.webm';
    }

    // Rename file with proper extension for OpenAI Whisper API
    const renamedPath = filePath + fileExt;
    try {
      await fs.rename(filePath, renamedPath);
    } catch (e) {
      console.warn('Could not rename file, using original path:', e.message);
    }

    let result;
    try {
      console.log('Sending to Whisper API with file:', renamedPath);
      result = await openai.audio.transcriptions.create({
        model,
        file: fsSync.createReadStream(renamedPath),
      });
      console.log('Transcription result:', result);
    } finally {
      // Clean up temp file
      try { await fs.unlink(renamedPath); } catch (e) { /* ignore */ }
      try { await fs.unlink(filePath); } catch (e) { /* ignore */ }
    }

    const text = (result && (result.text || result?.data?.text)) || '';
    return res.json({ ok: true, text });
  } catch (err) {
    console.error('Transcription error:', err);
    return res.status(500).json({ ok: false, error: err.message || 'Transcription failed' });
  }
});

export default router;
