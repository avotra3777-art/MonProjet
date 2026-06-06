const express = require('express');
const { body, query, validationResult } = require('express-validator');
const { protect, admin, employee } = require('../middleware/auth');

module.exports = (app) => {
    const router = express.Router();

    // Get all products with search and sort
    router.get('/', [
        query('search').optional().isString(),
        query('sort').optional().isIn(['name', 'price-asc', 'price-desc'])
    ], async (req, res) => {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({ errors: errors.array() });
        }

        const { search, sort = 'name' } = req.query;
        const db = req.app.locals.db;

        try {
            let query = 'SELECT * FROM products';
            let params = [];

            if (search) {
                query += ' WHERE name LIKE ? OR description LIKE ?';
                params.push(`%${search}%`, `%${search}%`);
            }

            switch (sort) {
                case 'price-asc':
                    query += ' ORDER BY price ASC';
                    break;
                case 'price-desc':
                    query += ' ORDER BY price DESC';
                    break;
                default:
                    query += ' ORDER BY name ASC';
            }

            const products = await db.all(query, params);
            res.json({ products });
        } catch (error) {
            console.error(error);
            res.status(500).json({ error: 'Erreur serveur' });
        }
    });

    // Get single product
    router.get('/:id', async (req, res) => {
        const db = req.app.locals.db;
        
        try {
            const product = await db.get('SELECT * FROM products WHERE id = ?', [req.params.id]);
            if (!product) {
                return res.status(404).json({ error: 'Produit non trouvé' });
            }
            res.json({ product });
        } catch (error) {
            console.error(error);
            res.status(500).json({ error: 'Erreur serveur' });
        }
    });

    // Create product (admin only)
    router.post('/', protect, admin, [
        body('name').notEmpty().withMessage('Nom requis'),
        body('price').isFloat({ min: 0 }).withMessage('Prix invalide'),
        body('stock').optional().isInt({ min: 0 }),
        body('category').optional().isString()
    ], async (req, res) => {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({ errors: errors.array() });
        }

        const { name, description, price, stock = 0, image, category } = req.body;
        const db = req.app.locals.db;

        try {
            const result = await db.run(
                'INSERT INTO products (name, description, price, stock, image, category) VALUES (?, ?, ?, ?, ?, ?)',
                [name, description, price, stock, image, category]
            );
            
            const product = await db.get('SELECT * FROM products WHERE id = ?', [result.lastID]);
            res.status(201).json({ product });
        } catch (error) {
            console.error(error);
            res.status(500).json({ error: 'Erreur serveur' });
        }
    });

    // Update product (admin only)
    router.put('/:id', protect, admin, async (req, res) => {
        const { name, description, price, stock, image, category } = req.body;
        const db = req.app.locals.db;

        try {
            const product = await db.get('SELECT * FROM products WHERE id = ?', [req.params.id]);
            if (!product) {
                return res.status(404).json({ error: 'Produit non trouvé' });
            }

            await db.run(
                'UPDATE products SET name = COALESCE(?, name), description = COALESCE(?, description), price = COALESCE(?, price), stock = COALESCE(?, stock), image = COALESCE(?, image), category = COALESCE(?, category) WHERE id = ?',
                [name, description, price, stock, image, category, req.params.id]
            );

            const updatedProduct = await db.get('SELECT * FROM products WHERE id = ?', [req.params.id]);
            res.json({ product: updatedProduct });
        } catch (error) {
            console.error(error);
            res.status(500).json({ error: 'Erreur serveur' });
        }
    });

    // Delete product (admin only)
    router.delete('/:id', protect, admin, async (req, res) => {
        const db = req.app.locals.db;

        try {
            const product = await db.get('SELECT * FROM products WHERE id = ?', [req.params.id]);
            if (!product) {
                return res.status(404).json({ error: 'Produit non trouvé' });
            }

            await db.run('DELETE FROM products WHERE id = ?', [req.params.id]);
            res.json({ message: 'Produit supprimé avec succès' });
        } catch (error) {
            console.error(error);
            res.status(500).json({ error: 'Erreur serveur' });
        }
    });

    return router;
};
