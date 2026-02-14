const express = require("express");
const cors = require("cors")
const app = express();
const connectDB = require('./config/db');
const { errorHandler, notFound } = require('./middleware/errorMiddleware');
const dotenv = require('dotenv');

dotenv.config();
connectDB();

app.use(cors())
app.use(express.json());

// 1. API Routes
app.use('/nutrlink/api/auth', require('./route/auth'));

// 2. The Home Route (Now uncommented and active)
app.get('/nutrlink/login', (req, res) => {
    res.send('<a href="/nutrlink/login/google">Authentication with Google</a>');
});

// 3. Error Handlers (These MUST come after all routes)
app.use(notFound);
app.use(errorHandler);

// 4. Start the server (LAST step)
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
});