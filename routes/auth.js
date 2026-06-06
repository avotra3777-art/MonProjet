const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { body, validationResult } = require('express-validator');

module.exports = (app) => {
    const router = express.Router();

    // Register
    router.post('/register', [
        body('email').isEmail().withMessage('Email invalide'),
        body('password').isLength({ min: 6 }).withMessage('Mot de passe doit avoir au moins 6 caractères'),
        body('name').notEmpty().withMessage('Nom requis'),
        body('role').optional().isIn(['user', 'admin', 'employee'])
    ], async (req, res) => {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({ errors: errors.array() });
        }

        const { email, password, name, role = 'user' } = req.body;
        const db = req.app.locals.db;

        try {
            // Check if user exists
            const existingUser = await db.get('SELECT * FROM users WHERE email = ?', [email]);
            if (existingUser) {
                return res.status(400).json({ error: 'Utilisateur déjà existant' });
            }

            // Hash password
            const hashedPassword = await bcrypt.hash(password, 10);

            // Create user
            const result = await db.run(
                'INSERT INTO users (email, password, name, role) VALUES (?, ?, ?, ?)',
                [email, hashedPassword, name, role]
            );

            // Generate token
            const token = jwt.sign(
                { id: result.lastID, email, role, name },
                process.env.JWT_SECRET,
                { expiresIn: process.env.JWT_EXPIRE }
            );

            res.status(201).json({
                token,
                user: { id: result.lastID, email, name, role }
            });
        } catch (error) {
            console.error(error);
            res.status(500).json({ error: 'Erreur serveur' });
        }
    });

    // Login
    router.post('/login', [
        body('email').isEmail().withMessage('Email invalide'),
        body('password').notEmpty().withMessage('Mot de passe requis')
    ], async (req, res) => {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({ errors: errors.array() });
        }

        const { email, password } = req.body;
        const db = req.app.locals.db;

        try {
            // Get user
            const user = await db.get('SELECT * FROM users WHERE email = ?', [email]);
            if (!user) {
                return res.status(401).json({ error: 'Email ou mot de passe incorrect' });
            }

            // Check password
            const isMatch = await bcrypt.compare(password, user.password);
            if (!isMatch) {
                return res.status(401).json({ error: 'Email ou mot de passe incorrect' });
            }

            // Generate token
            const token = jwt.sign(
                { id: user.id, email: user.email, role: user.role, name: user.name },
                process.env.JWT_SECRET,
                { expiresIn: process.env.JWT_EXPIRE }
            );

            res.json({
                token,
                user: { id: user.id, email: user.email, name: user.name, role: user.role }
            });
        } catch (error) {
            console.error(error);
            res.status(500).json({ error: 'Erreur serveur' });
        }
    });

    // Get current user
    router.get('/me', async (req, res) => {
        const token = req.headers.authorization?.split(' ')[1];
        
        if (!token) {
            return res.status(401).json({ error: 'Non autorisé' });
        }

        try {
            const decoded = jwt.verify(token, process.env.JWT_SECRET);
            const db = req.app.locals.db;
            const user = await db.get('SELECT id, email, name, role FROM users WHERE id = ?', [decoded.id]);
            
            if (!user) {
                return res.status(404).json({ error: 'Utilisateur non trouvé' });
            }
            
            res.json({ user });
        } catch (error) {
            res.status(401).json({ error: 'Token invalide' });
        }
    });

    return router;
};
