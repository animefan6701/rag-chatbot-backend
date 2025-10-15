import 'dotenv/config';
import express from 'express';
import cors from 'cors';

// Import routes with error handling
let uploadRouter, chatRouter, docRouter, documentsRouter, chatHistoryRouter, chatSessionsRouter, wordpressRouter;

try {
  uploadRouter = (await import('./routes/upload.js')).default;
  console.log('✅ Upload router loaded');
} catch (err) {
  console.error('❌ Error loading upload router:', err.message);
}

try {
  chatRouter = (await import('./routes/chat.js')).default;
  console.log('✅ Chat router loaded');
} catch (err) {
  console.error('❌ Error loading chat router:', err.message);
}

try {
  docRouter = (await import('./routes/doc.js')).default;
  console.log('✅ Doc router loaded');
} catch (err) {
  console.error('❌ Error loading doc router:', err.message);
}

try {
  documentsRouter = (await import('./routes/documents.js')).default;
  console.log('✅ Documents router loaded');
} catch (err) {
  console.error('❌ Error loading documents router:', err.message);
}

try {
  chatHistoryRouter = (await import('./routes/chatHistory.js')).default;
  console.log('✅ Chat history router loaded');
} catch (err) {
  console.error('❌ Error loading chat history router:', err.message);
}

try {
  chatSessionsRouter = (await import('./routes/chatSessions.js')).default;
  console.log('✅ Chat sessions router loaded');
} catch (err) {
  console.error('❌ Error loading chat sessions router:', err.message);
}

try {
  wordpressRouter = (await import('./routes/wordpress.js')).default;
  console.log('✅ WordPress router loaded');
} catch (err) {
  console.error('❌ Error loading WordPress router:', err.message);
}


console.log('ALLOWED_ORIGIN:', process.env.ALLOWED_ORIGIN)

const app = express();

// Configure CORS to handle multiple origins
const corsOptions = {
  origin: function (origin, callback) {
    // Allow requests with no origin (like mobile apps or curl requests)
    if (!origin) return callback(null, true);

    // List of allowed origins
    const allowedOrigins = [
      'http://localhost',
      'http://localhost:3000',
      'http://localhost:5173',
      'http://localhost:8080',
      process.env.ALLOWED_ORIGIN
    ].filter(Boolean); // Remove any undefined values

    // Check if the origin is in the allowed list or if we're in development
    if (allowedOrigins.includes(origin) || process.env.NODE_ENV === 'development') {
      callback(null, true);
    } else {
      console.log('CORS blocked origin:', origin);
      callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'ngrok-skip-browser-warning']
};

app.use(cors(corsOptions));
app.use(express.json({ limit: '2mb' }));


// Health check endpoint
app.get('/health', (req, res) => {
  console.log('Health check requested');
  res.json({
    ok: true,
    message: 'Server is running!',
    timestamp: new Date().toISOString(),
    env: {
      NODE_ENV: process.env.NODE_ENV,
      DB_PROVIDER: process.env.DB_PROVIDER,
      PORT: process.env.PORT || 3001
    }
  });
});

// Mount routes with error handling
if (uploadRouter) {
  app.use('/upload', uploadRouter);
  console.log('✅ Upload routes mounted');
} else {
  console.log('⚠️ Upload routes not available');
}

if (chatRouter) {
  app.use('/chat', chatRouter);
  console.log('✅ Chat routes mounted');
} else {
  console.log('⚠️ Chat routes not available');
}

if (docRouter) {
  app.use('/doc', docRouter);
  console.log('✅ Doc routes mounted');
} else {
  console.log('⚠️ Doc routes not available');
}

if (documentsRouter) {
  app.use('/documents', documentsRouter);
  console.log('✅ Documents routes mounted');
} else {
  console.log('⚠️ Documents routes not available');
}

if (chatHistoryRouter) {
  app.use('/chat-history', chatHistoryRouter);
  console.log('✅ Chat history routes mounted');
} else {
  console.log('⚠️ Chat history routes not available');
  // Provide a fallback endpoint
  app.post('/chat-history/get', (req, res) => {
    console.log('Fallback chat history endpoint called');
    res.json({
      ok: true,
      data: [],
      count: 0,
      limit: req.body.limit || 50,
      offset: req.body.offset || 0,
      message: 'Chat history router not loaded - using fallback'
    });
  });
}

if (chatSessionsRouter) {
  app.use('/chat-sessions', chatSessionsRouter);
  console.log('✅ Chat sessions routes mounted');
} else {
  console.log('⚠️ Chat sessions routes not available');
}

if (wordpressRouter) {
  app.use('/wordpress', wordpressRouter);
  console.log('✅ WordPress routes mounted');
} else {
  console.log('⚠️ WordPress routes not available');
}


// Error handling middleware
app.use((err, req, res, next) => {
  console.error('❌ Server error:', err);
  res.status(500).json({ ok: false, error: err.message });
});

// 404 handler
app.use((req, res) => {
  console.log('404 - Route not found:', req.method, req.path);
  res.status(404).json({ ok: false, error: 'Route not found' });
});

const port = process.env.PORT || 3001;

app.listen(port, () => {
  console.log(`\n🚀 RAG Chatbot API Server Started!`);
  console.log(`✅ Server listening on port ${port}`);
  console.log(`🌐 Local URL: http://localhost:${port}`);
  console.log(`🔗 Ngrok URL: https://038526a73431.ngrok-free.app`);
  console.log(`📋 Available endpoints:`);
  console.log(`  GET  /health`);
  if (uploadRouter) console.log(`  POST /upload`);
  if (chatRouter) console.log(`  POST /chat`);
  if (chatHistoryRouter) console.log(`  POST /chat-history/get`);
  if (chatSessionsRouter) {
    console.log(`  POST /chat-sessions`);
    console.log(`  GET  /chat-sessions`);
    console.log(`  GET  /chat-sessions/:id`);
    console.log(`  PUT  /chat-sessions/:id`);
    console.log(`  PATCH /chat-sessions/:id/title`);
    console.log(`  DELETE /chat-sessions/:id`);
  }
  if (documentsRouter) console.log(`  GET  /documents`);
  if (wordpressRouter) {
    console.log(`  POST /wordpress/test`);
    console.log(`  GET  /wordpress/links`);
  }
  console.log(`\n🔧 Environment:`);
  console.log(`  NODE_ENV: ${process.env.NODE_ENV || 'not set'}`);
  console.log(`  DB_PROVIDER: ${process.env.DB_PROVIDER || 'not set'}`);
  console.log(`  ALLOWED_ORIGIN: ${process.env.ALLOWED_ORIGIN || 'not set'}`);
  console.log(`\n✨ Server ready to handle requests!`);
});

// Handle process termination gracefully
process.on('SIGINT', () => {
  console.log('\n🛑 Server shutting down gracefully...');
  process.exit(0);
});

process.on('uncaughtException', (err) => {
  console.error('❌ Uncaught Exception:', err);
  process.exit(1);
});

process.on('unhandledRejection', (reason, promise) => {
  console.error('❌ Unhandled Rejection at:', promise, 'reason:', reason);
  process.exit(1);
});