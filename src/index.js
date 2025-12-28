require('dotenv').config();
const express = require('express');
const cors = require('cors');
const connectDB = require('./db');
const authRoutes = require('./routes/auth');
const advanceRoutes = require('./routes/advances');

const app = express();
// CORS configuration
// Allow origins from env variable CORS_ORIGINS (comma-separated) or default to Vite dev server origin.
const allowedOrigins = (process.env.CORS_ORIGINS || 'http://localhost:5173').split(',').map(s => s.trim()).filter(Boolean);
const corsOptions = {
    origin: function (origin, callback) {
        // allow requests with no origin (like mobile apps, curl, postman)
        if (!origin) return callback(null, true);
        if (allowedOrigins.indexOf(origin) !== -1) {
            return callback(null, true);
        } else {
            return callback(new Error('CORS policy: Origin not allowed'), false);
        }
    },
    credentials: true,
    optionsSuccessStatus: 200,
};

app.use(cors(corsOptions));
// enable preflight for all routes
app.options('*', cors(corsOptions));
app.use(express.json());

// API routes
app.use('/api/auth', authRoutes);
app.use('/api/advances', advanceRoutes);

const PORT = process.env.PORT || 3000;

app.get('/ping', (req, res) => {
    res.json({ ok: true, env: process.env.NODE_ENV || 'development' });
});

// Example route using an env var
app.get('/info', (req, res) => {
    res.json({
        node_env: process.env.NODE_ENV || 'development',
        mongo: !!process.env.MONGODB_URI
    });
});

// Connect to DB and start server
connectDB()
    .then(() => {
        app.listen(PORT, () => {
            console.log(`Server running on port ${PORT}`);
        });
    })
    .catch((err) => {
        console.error('Failed to start server:', err.message || err);
        process.exit(1);
    });
