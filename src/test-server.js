import 'dotenv/config';
import express from 'express';
import cors from 'cors';

console.log('🚀 Starting test server...');
console.log('ALLOWED_ORIGIN:', process.env.ALLOWED_ORIGIN);
console.log('PORT:', process.env.PORT || 3001);

const app = express();

// Configure CORS to handle multiple origins
const corsOptions = {
  origin: function (origin, callback) {
    console.log('CORS request from origin:', origin);
    
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
    
    console.log('Allowed origins:', allowedOrigins);
    
    // Check if the origin is in the allowed list or if we're in development
    if (allowedOrigins.includes(origin) || process.env.NODE_ENV === 'development') {
      console.log('✅ CORS allowed for origin:', origin);
      callback(null, true);
    } else {
      console.log('❌ CORS blocked origin:', origin);
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
  res.json({ ok: true, message: 'Server is running!', timestamp: new Date().toISOString() });
});

// Test chat history endpoint
app.post('/chat-history/get', (req, res) => {
  console.log('Chat history requested:', req.body);
  res.json({ 
    ok: true, 
    data: [], 
    count: 0, 
    limit: req.body.limit || 50, 
    offset: req.body.offset || 0,
    message: 'Test response - database not connected'
  });
});

// Test regular chat endpoint
app.post('/chat', (req, res) => {
  console.log('Chat requested:', req.body);
  res.json({ 
    ok: true, 
    answer: 'This is a test response from the server.',
    sources: [],
    images: []
  });
});

// Error handling middleware
app.use((err, req, res, next) => {
  console.error('Server error:', err);
  res.status(500).json({ ok: false, error: err.message });
});

// 404 handler
app.use((req, res) => {
  console.log('404 - Route not found:', req.method, req.path);
  res.status(404).json({ ok: false, error: 'Route not found' });
});

const port = process.env.PORT || 3001;

app.listen(port, () => {
  console.log(`✅ Test server listening on port ${port}`);
  console.log(`🌐 Local URL: http://localhost:${port}`);
  console.log(`🔗 Ngrok URL: https://038526a73431.ngrok-free.app`);
  console.log('📋 Available endpoints:');
  console.log('  GET  /health');
  console.log('  POST /chat');
  console.log('  POST /chat-history/get');
});

// Handle process termination
process.on('SIGINT', () => {
  console.log('\n🛑 Server shutting down...');
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
