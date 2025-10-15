import { createClient as createSupabase } from "@supabase/supabase-js";
import pkg from "pg";
const { Pool } = pkg;

const provider = process.env.DB_PROVIDER || "postgres";
const EMB_DIM = parseInt(process.env.EMBEDDING_DIM || "1536", 10);

export async function initPostgres() {
  const pool = new Pool({ connectionString: process.env.DATABASE_URL });
  return { pool };
}

function toVectorLiteral(arr) {
  // pgvector text format: '[1,2,3]'
  return `[${arr.join(",")}]`;
}

export function db() {
  if (provider === "supabase") {
    const supabase = createSupabase(
      process.env.SUPABASE_URL,
      process.env.SUPABASE_SERVICE_ROLE_KEY,
      {
        auth: { persistSession: false },
      }
    );
    return {
      async insertChunks(rows) {
        // rows: [{ doc_id, chunk_index, content, metadata, embedding:Array<number> }]
        const { error } = await supabase.from("documents").insert(rows);
        if (error) throw error;
      },
      async searchSimilar(embedding, k = 5, filterDocId = null) {
        const { data, error } = await supabase.rpc("match_documents", {
          query_embedding: embedding, // vector array accepted by the SQL function
          match_count: k,
          filter_doc: filterDocId,
        });
        if (error) {
          console.error("Supabase RPC error:", error);
          throw error;
        }
        return data.map((r) => ({
          id: r.id,
          content: r.content,
          metadata: r.metadata,
          similarity: r.similarity,
        }));
      },
      async saveChatHistory(userEmail, prompt, answer, docId = null, sources = [], images = [], sessionId = null) {
        // Log what we're about to save
        console.log("=== DB SAVE CHAT HISTORY (Supabase) ===");
        console.log("User email:", userEmail);
        console.log("Session ID:", sessionId);
        console.log("Session ID type:", typeof sessionId);
        console.log("Session images", images);

        // Warn if session_id is null or empty - this should not happen with auto-creation
        if (!sessionId || sessionId === '') {
          console.warn("⚠️ WARNING: Saving chat history with null/empty session_id. This should not happen with auto-session creation!");
          console.warn("User email:", userEmail);
          console.warn("Prompt:", prompt.substring(0, 50) + "...");
        }

        const { error } = await supabase.from("chat_history").insert({
          user_email: userEmail,
          prompt,
          answer,
          doc_id: docId,
          sources,
          images,
          session_id: sessionId
        });
        if (error) throw error;

        console.log("✅ Chat history saved to Supabase with session_id:", sessionId);
      },
      async getChatHistory(userEmail, limit = 50, offset = 0, sessionId = null) {
        let query = supabase
          .from("chat_history")
          .select("*")
          .eq("user_email", userEmail);

        if (sessionId) {
          query = query.eq("session_id", sessionId);
        }

        const { data, error } = await query
          .order("created_at", { ascending: false })
          .range(offset, offset + limit - 1);
        if (error) throw error;
        return data;
      },
      // Chat Sessions methods
      async createChatSession(userEmail, title = 'New Chat', description = null, metadata = {}) {
        const { data, error } = await supabase.from("chat_sessions").insert({
          user_email: userEmail,
          title,
          description,
          metadata
        }).select().single();
        if (error) throw error;
        return data;
      },
      async getChatSessions(userEmail, limit = 50, offset = 0, includeArchived = false) {
        let query = supabase
          .from("chat_session_summaries")
          .select("*")
          .eq("user_email", userEmail);

        if (!includeArchived) {
          query = query.eq("is_archived", false);
        }

        const { data, error } = await query
          .order("updated_at", { ascending: false })
          .range(offset, offset + limit - 1);
        if (error) throw error;
        return data;
      },
      async getChatSession(sessionId, userEmail) {
        const { data, error } = await supabase
          .from("chat_sessions")
          .select("*")
          .eq("id", sessionId)
          .eq("user_email", userEmail)
          .single();
        if (error) throw error;
        return data;
      },
      async updateChatSession(sessionId, userEmail, updates) {
        const { data, error } = await supabase
          .from("chat_sessions")
          .update(updates)
          .eq("id", sessionId)
          .eq("user_email", userEmail)
          .select()
          .single();
        if (error) throw error;
        return data;
      },
      async deleteChatSession(sessionId, userEmail) {
        const { error } = await supabase
          .from("chat_sessions")
          .delete()
          .eq("id", sessionId)
          .eq("user_email", userEmail);
        if (error) throw error;
      },
    };
  }

  // Postgres provider
  let _pool;
  return {
    async insertChunks(rows) {
      if (!_pool) _pool = (await initPostgres()).pool;
      const client = await _pool.connect();
      try {
        const text = `INSERT INTO documents (doc_id, chunk_index, content, metadata, embedding)
VALUES ($1, $2, $3, $4, $5::vector(${EMB_DIM}))`;
        for (const r of rows) {
          const params = [
            r.doc_id,
            r.chunk_index,
            r.content,
            r.metadata || {},
            toVectorLiteral(r.embedding),
          ];
          await client.query(text, params);
        }
      } finally {
        client.release();
      }
    },
    async searchSimilar(embedding, k = 5, filterDocId = null) {
      if (!_pool) _pool = (await initPostgres()).pool;
      const q = `SELECT id, content, metadata, 1 - (embedding <=> $1::vector(${EMB_DIM})) AS similarity
FROM documents
WHERE ($2::uuid IS NULL OR doc_id = $2)
ORDER BY embedding <=> $1::vector(${EMB_DIM})
LIMIT $3`;
      const params = [toVectorLiteral(embedding), filterDocId, k];
      const { rows } = await _pool.query(q, params);
      return rows;
    },
    async saveChatHistory(userEmail, prompt, answer, docId = null, sources = [], images = [], sessionId = null) {
      if (!_pool) _pool = (await initPostgres()).pool;

      // Log what we're about to save
      console.log("=== DB SAVE CHAT HISTORY (Postgres) ===");
      console.log("User email:", userEmail);
      console.log("Prompt:", prompt);
      console.log("Answer length:", answer?.length || 0);
      console.log("Doc ID:", docId);
      console.log("Sources count:", sources?.length || 0);
      console.log("Images count:", images?.length || 0);
      console.log("Images data:", JSON.stringify(images, null, 2));
      console.log("Session ID:", sessionId);
      console.log("Session ID type:", typeof sessionId);

      // Convert string "null" to actual null for database
      if (sessionId === 'null' || sessionId === 'undefined' || sessionId === '') {
        console.log("Converting string sessionId to null:", sessionId);
        sessionId = null;
      }

      // Warn if session_id is null or empty - this should not happen with auto-creation
      if (!sessionId) {
        console.warn("⚠️ WARNING: Saving chat history with null session_id. This should not happen with auto-session creation!");
        console.warn("User email:", userEmail);
        console.warn("Prompt:", prompt.substring(0, 50) + "...");
      }

      const text = `INSERT INTO chat_history (user_email, prompt, answer, doc_id, sources, images, session_id)
        VALUES ($1, $2, $3, $4, $5, $6, $7)`;
      const params = [userEmail, prompt, answer, docId, JSON.stringify(sources), JSON.stringify(images), sessionId];
      await _pool.query(text, params);

      console.log("✅ Chat history saved to Postgres with session_id:", sessionId);
    },
    async getChatHistory(userEmail, limit = 50, offset = 0, sessionId = null) {
      if (!_pool) _pool = (await initPostgres()).pool;
      let text = `SELECT * FROM chat_history WHERE user_email = $1`;
      let params = [userEmail];

      if (sessionId) {
        text += ` AND session_id = $${params.length + 1}`;
        params.push(sessionId);
      }

      text += ` ORDER BY created_at DESC LIMIT $${params.length + 1} OFFSET $${params.length + 2}`;
      params.push(limit, offset);

      const { rows } = await _pool.query(text, params);
      return rows;
    },
    // Chat Sessions methods for Postgres
    async createChatSession(userEmail, title = 'New Chat', description = null, metadata = {}) {
      if (!_pool) _pool = (await initPostgres()).pool;
      const text = `INSERT INTO chat_sessions (user_email, title, description, metadata)
        VALUES ($1, $2, $3, $4) RETURNING *`;
      const params = [userEmail, title, description, JSON.stringify(metadata)];
      const { rows } = await _pool.query(text, params);
      return rows[0];
    },
    async getChatSessions(userEmail, limit = 50, offset = 0, includeArchived = false) {
      if (!_pool) _pool = (await initPostgres()).pool;
      let text = `SELECT * FROM chat_session_summaries WHERE user_email = $1`;
      let params = [userEmail];

      if (!includeArchived) {
        text += ` AND is_archived = false`;
      }

      text += ` ORDER BY updated_at DESC LIMIT $${params.length + 1} OFFSET $${params.length + 2}`;
      params.push(limit, offset);

      const { rows } = await _pool.query(text, params);
      return rows;
    },
    async getChatSession(sessionId, userEmail) {
      if (!_pool) _pool = (await initPostgres()).pool;
      const text = `SELECT * FROM chat_sessions WHERE id = $1 AND user_email = $2`;
      const params = [sessionId, userEmail];
      const { rows } = await _pool.query(text, params);
      return rows[0];
    },
    async updateChatSession(sessionId, userEmail, updates) {
      if (!_pool) _pool = (await initPostgres()).pool;
      const setClause = Object.keys(updates).map((key, index) => `${key} = $${index + 3}`).join(', ');
      const text = `UPDATE chat_sessions SET ${setClause} WHERE id = $1 AND user_email = $2 RETURNING *`;
      const params = [sessionId, userEmail, ...Object.values(updates)];
      const { rows } = await _pool.query(text, params);
      return rows[0];
    },
    async deleteChatSession(sessionId, userEmail) {
      if (!_pool) _pool = (await initPostgres()).pool;
      const text = `DELETE FROM chat_sessions WHERE id = $1 AND user_email = $2`;
      const params = [sessionId, userEmail];
      await _pool.query(text, params);
    },
  };
}
