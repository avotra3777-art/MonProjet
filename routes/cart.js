const express = require('express');
const { body, validationResult } = require('express-validator');
const { protect } = require('../middleware/auth');

module.exports = (app) => {
    const router = express.Router();

    // Get user cart
    router.get('/', protect, async (req, res) => {
        const db = req.app.locals.db;

        try {
            const cartItems = await db.all(`
                SELECT c.*, p.name, p.price, p.image, p.stock 
                FROM cart c 
                JOIN products p ON c.product_id = p.id 
                WHERE c.user_id = ?
            `, [req.user.id]);

            const total = cartItems.reduce((sum, item) => sum + (item.price * item.quantity), 0);
            
            res.json({ cartItems, total });
        } catch (error) {
            console.error(error);
            res.status(500).json({ error: 'Erreur serveur' });
        }
    });

    // Add to cart
    router.post('/add', protect, [
        body('productId').isInt().withMessage('ID produit invalide'),
        body('quantity').isInt({ min: 1 }).withMessage('Quantité invalide')
    ], async (req, res) => {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({ errors: errors.array() });
        }

        const { productId, quantity } = req.body;
        const db = req.app.locals.db;

        try {
            // Check if product exists and has enough stock
            const product = await db.get('SELECT * FROM products WHERE id = ?', [productId]);
            if (!product) {
                return res.status(404).json({ error: 'Produit non trouvé' });
            }
            if (product.stock < quantity) {
                return res.status(400).json({ error: 'Stock insuffisant' });
            }

            // Check if item already in cart
            const existingItem = await db.get(
                'SELECT * FROM cart WHERE user_id = ? AND product_id = ?',
                [req.user.id, productId]
            );

            if (existingItem) {
                await db.run(
                    'UPDATE cart SET quantity = quantity + ? WHERE user_id = ? AND product_id = ?',
                    [quantity, req.user.id, productId]
                );
            } else {
                await db.run(
                    'INSERT INTO cart (user_id, product_id, quantity) VALUES (?, ?, ?)',
                    [req.user.id, productId, quantity]
                );
            }

            // Get updated cart
            const cartItems = await db.all(`
                SELECT c.*, p.name, p.price, p.image, p.stock 
                FROM cart c 
                JOIN products p ON c.product_id = p.id 
                WHERE c.user_id = ?
            `, [req.user.id]);

            const total = cartItems.reduce((sum, item) => sum + (item.price * item.quantity), 0);
            
            res.json({ cartItems, total });
        } catch (error) {
            console.error(error);
            res.status(500).json({ error: 'Erreur serveur' });
        }
    });

    // Update cart item quantity
    router.put('/update/:productId', protect, [
        body('quantity').isInt({ min: 1 }).withMessage('Quantité invalide')
    ], async (req, res) => {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({ errors: errors.array() });
        }

        const { quantity } = req.body;
        const { productId } = req.params;
        const db = req.app.locals.db;

        try {
            const product = await db.get('SELECT * FROM products WHERE id = ?', [productId]);
            if (!product) {
                return res.status(404).json({ error: 'Produit non trouvé' });
            }
            if (product.stock < quantity) {
                return res.status(400).json({ error: 'Stock insuffisant' });
            }

            await db.run(
                'UPDATE cart SET quantity = ? WHERE user_id = ? AND product_id = ?',
                [quantity, req.user.id, productId]
            );

            const cartItems = await db.all(`
                SELECT c.*, p.name, p.price, p.image, p.stock 
                FROM cart c 
                JOIN products p ON c.product_id = p.id 
                WHERE c.user_id = ?
            `, [req.user.id]);

            const total = cartItems.reduce((sum, item) => sum + (item.price * item.quantity), 0);
            
            res.json({ cartItems, total });
        } catch (error) {
            console.error(error);
            res.status(500).json({ error: 'Erreur serveur' });
        }
    });

    // Remove from cart
    router.delete('/remove/:productId', protect, async (req, res) => {
        const { productId } = req.params;
        const db = req.app.locals.db;

        try {
            await db.run(
                'DELETE FROM cart WHERE user_id = ? AND product_id = ?',
                [req.user.id, productId]
            );

            const cartItems = await db.all(`
                SELECT c.*, p.name, p.price, p.image, p.stock 
                FROM cart c 
                JOIN products p ON c.product_id = p.id 
                WHERE c.user_id = ?
            `, [req.user.id]);

            const total = cartItems.reduce((sum, item) => sum + (item.price * item.quantity), 0);
            
            res.json({ cartItems, total });
        } catch (error) {
            console.error(error);
            res.status(500).json({ error: 'Erreur serveur' });
        }
    });

    // Checkout
    router.post('/checkout', protect, async (req, res) => {
        const db = req.app.locals.db;

        try {
            // Get cart items
            const cartItems = await db.all(`
                SELECT c.*, p.name, p.price, p.stock 
                FROM cart c 
                JOIN products p ON c.product_id = p.id 
                WHERE c.user_id = ?
            `, [req.user.id]);

            if (cartItems.length === 0) {
                return res.status(400).json({ error: 'Panier vide' });
            }

            // Check stock and calculate total
            let total = 0;
            for (const item of cartItems) {
                if (item.stock < item.quantity) {
                    return res.status(400).json({ error: `Stock insuffisant pour ${item.name}` });
                }
                total += item.price * item.quantity;
            }

            // Create order
            const orderResult = await db.run(
                'INSERT INTO orders (user_id, total, status) VALUES (?, ?, ?)',
                [req.user.id, total, 'pending']
            );

            // Create order items and update stock
            for (const item of cartItems) {
                await db.run(
                    'INSERT INTO order_items (order_id, product_id, quantity, price) VALUES (?, ?, ?, ?)',
                    [orderResult.lastID, item.product_id, item.quantity, item.price]
                );
                
                await db.run(
                    'UPDATE products SET stock = stock - ? WHERE id = ?',
                    [item.quantity, item.product_id]
                );
            }

            // Clear cart
            await db.run('DELETE FROM cart WHERE user_id = ?', [req.user.id]);

            res.json({ 
                message: 'Commande créée avec succès',
                orderId: orderResult.lastID,
                total: total
            });
        } catch (error) {
            console.error(error);
            res.status(500).json({ error: 'Erreur serveur' });
        }
    });

    return router;
};
