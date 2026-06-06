const express = require('express');
const { body, validationResult } = require('express-validator');
const { protect, admin } = require('../middleware/auth');
const bcrypt = require('bcryptjs');

module.exports = (app) => {
    const router = express.Router();

    // Get all users (admin only)
    router.get('/', protect, admin, async (req, res) => {
        const db = req.app.locals.db;
        
        try {
            const users = await db.all('SELECT id, email, name, role, created_at FROM users');
            res.json({ users });
        } catch (error) {
            console.error(error);
            res.status(500).json({ error: 'Erreur serveur' });
        }
    });

    // Get user by id (admin or self)
    router.get('/:id', protect, async (req, res) => {
        const db = req.app.locals.db;
        
        try {
            if (req.user.role !== 'admin' && parseInt(req.params.id) !== req.user.id) {
                return res.status(403).json({ error: 'Accès refusé' });
            }
            
            const user = await db.get('SELECT id, email, name, role, created_at FROM users WHERE id = ?', [req.params.id]);
            if (!user) {
                return res.status(404).json({ error: 'Utilisateur non trouvé' });
            }
            
            res.json({ user });
        } catch (error) {
            console.error(error);
            res.status(500).json({ error: 'Erreur serveur' });
        }
    });

    // Update user
    router.put('/:id', protect, [
        body('name').optional().notEmpty(),
        body('email').optional().isEmail(),
        body('role').optional().isIn(['user', 'admin', 'employee'])
    ], async (req, res) => {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({ errors: errors.array() });
        }
        
        const db = req.app.locals.db;
        const { name, email, role } = req.body;
        
        try {
            if (req.user.role !== 'admin' && parseInt(req.params.id) !== req.user.id) {
                return res.status(403).json({ error: 'Accès refusé' });
            }
            
            if (role && req.user.role !== 'admin') {
                return res.status(403).json({ error: 'Seul un admin peut changer le rôle' });
            }
            
            let query = 'UPDATE users SET';
            let params = [];
            
            if (name) {
                query += ' name = ?,';
                params.push(name);
            }
            if (email) {
                query += ' email = ?,';
                params.push(email);
            }
            if (role) {
                query += ' role = ?,';
                params.push(role);
            }
            
            query = query.slice(0, -1);
            query += ' WHERE id = ?';
            params.push(req.params.id);
            
            await db.run(query, params);
            
            const updatedUser = await db.get('SELECT id, email, name, role FROM users WHERE id = ?', [req.params.id]);
            res.json({ user: updatedUser });
        } catch (error) {
            console.error(error);
            res.status(500).json({ error: 'Erreur serveur' });
        }
    });

    // Change password
    router.put('/:id/password', protect, [
        body('currentPassword').notEmpty(),
        body('newPassword').isLength({ min: 6 })
    ], async (req, res) => {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({ errors: errors.array() });
        }
        
        const db = req.app.locals.db;
        const { currentPassword, newPassword } = req.body;
        
        try {
            if (parseInt(req.params.id) !== req.user.id) {
                return res.status(403).json({ error: 'Accès refusé' });
            }
            
            const user = await db.get('SELECT * FROM users WHERE id = ?', [req.params.id]);
            const isMatch = await bcrypt.compare(currentPassword, user.password);
            
            if (!isMatch) {
                return res.status(401).json({ error: 'Mot de passe actuel incorrect' });
            }
            
            const hashedPassword = await bcrypt.hash(newPassword, 10);
            await db.run('UPDATE users SET password = ? WHERE id = ?', [hashedPassword, req.params.id]);
            
            res.json({ message: 'Mot de passe modifié avec succès' });
        } catch (error) {
            console.error(error);
            res.status(500).json({ error: 'Erreur serveur' });
        }
    });

    // Delete user (admin only)
    router.delete('/:id', protect, admin, async (req, res) => {
        const db = req.app.locals.db;
        
        try {
            const user = await db.get('SELECT * FROM users WHERE id = ?', [req.params.id]);
            if (!user) {
                return res.status(404).json({ error: 'Utilisateur non trouvé' });
            }
            
            await db.run('DELETE FROM users WHERE id = ?', [req.params.id]);
            res.json({ message: 'Utilisateur supprimé avec succès' });
        } catch (error) {
            console.error(error);
            res.status(500).json({ error: 'Erreur serveur' });
        }
    });

    return router;
};
