const express = require("express");
const cors = require("cors");
const app = express();
const connectDB = require('./config/db');
const { errorHandler, notFound } = require('./middleware/errorMiddleware');
const dotenv = require('dotenv');

dotenv.config();
connectDB();

app.use(cors());
app.use(express.json());

// ══════════════════════════════════════════════════════════════
// API ROUTES
// ══════════════════════════════════════════════════════════════

// Auth Routes (login, register, google)
app.use('/nutrlink/api/auth', require('./route/auth'));

// Admin Routes (approve, reject, pending)  THIS WAS MISSING!
app.use('/nutrlink/api/admin', require('./route/admin'));

app.use('/nutrlink/api/customer/profile', require('./route/customer'));

app.use('/nutrlink/api/nutritionist', require('./route/nutritionist'));

app.use('/nutrlink/api/appointments', require('./route/appointment'))

app.use('/nutrlink/api/customer/goal', require('./route/goal'));

app.use('/nutrlink/api/plan', require('./route/dietPlan'))
app.use('/nutrlink/api/AI', require('./route/ai'));

app.use('/nutrlink/api/dashboard', require('./route/dashboard'))
app.use('/nutrlink/api/calculator',require('./route/calculator'))
 app.use('/nutrlink/api/progress',require('./route/progress'))
// ══════════════════════════════════════════════════════════════
// OTHER ROUTES
// ══════════════════════════════════════════════════════════════

// The Home Route
app.get('/nutrlink/login', (req, res) => {
    res.send('<a href="/nutrlink/login/google">Authentication with Google</a>');
});

// Health check
app.get('/', (req, res) => {
    res.json({ 
        message: 'NutriPlan API is running',
        cloudinary: process.env.CLOUDINARY_CLOUD_NAME ? '✅ Configured' : '❌ Not configured'
    });
});

// ══════════════════════════════════════════════════════════════
// ERROR HANDLERS (MUST come after all routes)
// ══════════════════════════════════════════════════════════════
app.use(notFound);
app.use(errorHandler);

// ══════════════════════════════════════════════════════════════
// START SERVER
// ══════════════════════════════════════════════════════════════
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
    console.log(`\n${'═'.repeat(60)}`);
    console.log('🚀 NutriPlan Server Started');
    console.log('═'.repeat(60));
    console.log(`📡 Server:     http://localhost:${PORT}`);
    console.log(`📁 Cloudinary: ${process.env.CLOUDINARY_CLOUD_NAME || '❌ NOT CONFIGURED'}`);
    console.log(`${'═'.repeat(60)}\n`);
});