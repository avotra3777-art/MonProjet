const sqlite3 = require('sqlite3');
const { open } = require('sqlite');
const path = require('path');
const bcrypt = require('bcryptjs');

async function openDatabase() {
    return open({
        filename: path.join(__dirname, 'database.sqlite'),
        driver: sqlite3.Database
    });
}

async function initDatabase(db) {
    // Users table
    await db.exec(`
        CREATE TABLE IF NOT EXISTS users (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            email TEXT UNIQUE NOT NULL,
            password TEXT NOT NULL,
            name TEXT,
            role TEXT DEFAULT 'user',
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP
        )
    `);

    // Products table
    await db.exec(`
        CREATE TABLE IF NOT EXISTS products (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            name TEXT NOT NULL,
            description TEXT,
            price DECIMAL(10,2) NOT NULL,
            stock INTEGER DEFAULT 0,
            image TEXT,
            category TEXT,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP
        )
    `);

    // Cart table
    await db.exec(`
        CREATE TABLE IF NOT EXISTS cart (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            user_id INTEGER NOT NULL,
            product_id INTEGER NOT NULL,
            quantity INTEGER DEFAULT 1,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
            FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE CASCADE,
            UNIQUE(user_id, product_id)
        )
    `);

    // Orders table
    await db.exec(`
        CREATE TABLE IF NOT EXISTS orders (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            user_id INTEGER NOT NULL,
            total DECIMAL(10,2) NOT NULL,
            status TEXT DEFAULT 'pending',
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (user_id) REFERENCES users(id)
        )
    `);

    // Order items table
    await db.exec(`
        CREATE TABLE IF NOT EXISTS order_items (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            order_id INTEGER NOT NULL,
            product_id INTEGER NOT NULL,
            quantity INTEGER NOT NULL,
            price DECIMAL(10,2) NOT NULL,
            FOREIGN KEY (order_id) REFERENCES orders(id) ON DELETE CASCADE,
            FOREIGN KEY (product_id) REFERENCES products(id)
        )
    `);

    // Insert demo products
    const productCount = await db.get('SELECT COUNT(*) as count FROM products');
    if (productCount.count === 0) {
        const demoProducts = [
            ['Laptop Pro X1', 'Laptop haute performance pour professionnels', 1299.99, 10, 'laptop.jpg', 'informatique'],
            ['Souris Sans Fil', 'Souris ergonomique sans fil', 29.99, 50, 'mouse.jpg', 'accessoires'],
            ['Clavier Mécanique', 'Clavier mécanique RGB', 89.99, 30, 'keyboard.jpg', 'accessoires'],
            ['Écran 24"', 'Écran Full HD 24 pouces', 199.99, 15, 'monitor.jpg', 'informatique'],
            ['Casque Audio', 'Casque audio professionnel', 79.99, 25, 'headphones.jpg', 'audio'],
            ['Webcam HD', 'Webcam 1080p pour visioconférence', 59.99, 20, 'webcam.jpg', 'informatique'],
            ['Support PC', 'Support ajustable pour ordinateur', 34.99, 40, 'stand.jpg', 'accessoires']
        ];

        for (const product of demoProducts) {
            await db.run(
                'INSERT INTO products (name, description, price, stock, image, category) VALUES (?, ?, ?, ?, ?, ?)',
                product
            );
        }
    }

    // Check if admin exists
    const adminUser = await db.get('SELECT * FROM users WHERE email = ?', ['admin@gestionpro.com']);
    if (!adminUser) {
        const hashedPassword = await bcrypt.hash('admin123', 10);
        await db.run(
            'INSERT INTO users (email, password, name, role) VALUES (?, ?, ?, ?)',
            ['admin@gestionpro.com', hashedPassword, 'Administrateur', 'admin']
        );
    }

    // Demo user
    const demoUser = await db.get('SELECT * FROM users WHERE email = ?', ['user@example.com']);
    if (!demoUser) {
        const hashedPassword = await bcrypt.hash('user123', 10);
        await db.run(
            'INSERT INTO users (email, password, name, role) VALUES (?, ?, ?, ?)',
            ['user@example.com', hashedPassword, 'Utilisateur Démo', 'user']
        );
    }

    // Demo employee
    const demoEmployee = await db.get('SELECT * FROM users WHERE email = ?', ['employee@example.com']);
    if (!demoEmployee) {
        const hashedPassword = await bcrypt.hash('employee123', 10);
        await db.run(
            'INSERT INTO users (email, password, name, role) VALUES (?, ?, ?, ?)',
            ['employee@example.com', hashedPassword, 'Employé Démo', 'employee']
        );
    }

    console.log('Database initialized successfully');
}

module.exports = { openDatabase, initDatabase };
