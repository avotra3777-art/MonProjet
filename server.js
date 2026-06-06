const express = require('express');
const cors = require('cors');
const dotenv = require('dotenv');
const path = require('path');
const { openDatabase, initDatabase } = require('./database');

dotenv.config();

const app = express();

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Static files for uploads
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// Database
let db;

// Initialize database
(async () => {
    try {
        db = await openDatabase();
        await initDatabase(db);
        
        // Make db available to routes
        app.locals.db = db;
        
        // Routes
        app.use('/api/auth', require('./routes/auth')(app));
        app.use('/api/products', require('./routes/products')(app));
        app.use('/api/cart', require('./routes/cart')(app));
        app.use('/api/users', require('./routes/users')(app));

        // Error handling middleware
        app.use((err, req, res, next) => {
            console.error(err.stack);
            res.status(500).json({ error: 'Something went wrong!' });
        });

        // Start server
        const PORT = process.env.PORT || 3000;
        app.listen(PORT, () => {
            console.log(`Server running on port ${PORT}`);
        });
    } catch (error) {
        console.error('Failed to initialize database:', error);
        process.exit(1);
    }
})();
