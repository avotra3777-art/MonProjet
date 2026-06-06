// Gestion du panier
class ShoppingCart {
    constructor() {
        this.cart = JSON.parse(localStorage.getItem('cart')) || [];
        this.updateCartCount();
    }

    addProduct(product, quantity = 1) {
        const existingItem = this.cart.find(item => item.id === product.id);
        
        if (existingItem) {
            existingItem.quantity += quantity;
        } else {
            this.cart.push({
                id: product.id,
                name: product.name,
                price: product.price,
                quantity: quantity,
                stock: product.stock
            });
        }
        
        this.saveCart();
        this.updateCartCount();
        this.showNotification('Produit ajouté au panier!');
    }

    removeProduct(productId) {
        this.cart = this.cart.filter(item => item.id !== productId);
        this.saveCart();
        this.updateCartCount();
        this.updateCartDisplay();
    }

    updateQuantity(productId, quantity) {
        const item = this.cart.find(item => item.id === productId);
        if (item) {
            if (quantity > 0 && quantity <= item.stock) {
                item.quantity = quantity;
            } else if (quantity <= 0) {
                this.removeProduct(productId);
            } else {
                this.showNotification('Quantité non disponible en stock!', 'error');
                return;
            }
        }
        this.saveCart();
        this.updateCartCount();
        this.updateCartDisplay();
    }

    getTotal() {
        return this.cart.reduce((total, item) => total + (item.price * item.quantity), 0);
    }

    saveCart() {
        localStorage.setItem('cart', JSON.stringify(this.cart));
    }

    updateCartCount() {
        const count = this.cart.reduce((sum, item) => sum + item.quantity, 0);
        const cartCountElements = document.querySelectorAll('#cart-count');
        cartCountElements.forEach(el => {
            if (el) el.textContent = count;
        });
    }

    updateCartDisplay() {
        const cartContainer = document.getElementById('cart-container');
        if (!cartContainer) return;

        if (this.cart.length === 0) {
            cartContainer.innerHTML = '<p>Votre panier est vide.</p>';
            document.getElementById('cart-total').textContent = '0';
            return;
        }

        cartContainer.innerHTML = '';
        this.cart.forEach(item => {
            const itemElement = document.createElement('div');
            itemElement.className = 'cart-item';
            itemElement.innerHTML = `
                <div>
                    <h4>${item.name}</h4>
                    <p>Prix: ${item.price} </p>
                    <p>Stock disponible: ${item.stock}</p>
                </div>
                <div>
                    <input type="number" value="${item.quantity}" min="1" max="${item.stock}" 
                           data-id="${item.id}" class="cart-quantity">
                    <button data-id="${item.id}" class="btn-remove">Supprimer</button>
                </div>
            `;
            cartContainer.appendChild(itemElement);
        });

        document.getElementById('cart-total').textContent = this.getTotal().toFixed(2);

        // Ajouter les événements
        document.querySelectorAll('.cart-quantity').forEach(input => {
            input.addEventListener('change', (e) => {
                this.updateQuantity(parseInt(e.target.dataset.id), parseInt(e.target.value));
            });
        });

        document.querySelectorAll('.btn-remove').forEach(button => {
            button.addEventListener('click', (e) => {
                this.removeProduct(parseInt(e.target.dataset.id));
            });
        });
    }

    showNotification(message, type = 'success') {
        const notification = document.createElement('div');
        notification.className = `notification ${type}`;
        notification.textContent = message;
        notification.style.cssText = `
            position: fixed;
            top: 80px;
            right: 20px;
            background: ${type === 'success' ? '#4CAF50' : '#f44336'};
            color: white;
            padding: 10px 20px;
            border-radius: 5px;
            z-index: 1000;
            animation: slideIn 0.3s ease;
        `;
        document.body.appendChild(notification);
        setTimeout(() => notification.remove(), 3000);
    }
}

// Gestion de l'authentification
class Auth {
    constructor() {
        this.currentUser = JSON.parse(localStorage.getItem('currentUser')) || null;
        this.updateUI();
    }

    login(email, password, role) {
        // Simulation d'authentification
        const users = JSON.parse(localStorage.getItem('users')) || [];
        const user = users.find(u => u.email === email && u.role === role);
        
        if (user && this.verifyPassword(password, user.password)) {
            this.currentUser = user;
            localStorage.setItem('currentUser', JSON.stringify(user));
            this.updateUI();
            return true;
        } else if (users.length === 0) {
            // Premier utilisateur - création automatique
            const newUser = {
                id: Date.now(),
                email: email,
                password: this.hashPassword(password),
                role: role,
                full_name: email.split('@')[0]
            };
            users.push(newUser);
            localStorage.setItem('users', JSON.stringify(users));
            this.currentUser = newUser;
            localStorage.setItem('currentUser', JSON.stringify(newUser));
            this.updateUI();
            return true;
        }
        return false;
    }

    register(email, password, role, fullName) {
        const users = JSON.parse(localStorage.getItem('users')) || [];
        
        if (users.find(u => u.email === email)) {
            return false;
        }
        
        const newUser = {
            id: Date.now(),
            email: email,
            password: this.hashPassword(password),
            role: role,
            full_name: fullName
        };
        
        users.push(newUser);
        localStorage.setItem('users', JSON.stringify(users));
        this.currentUser = newUser;
        localStorage.setItem('currentUser', JSON.stringify(newUser));
        this.updateUI();
        return true;
    }

    logout() {
        this.currentUser = null;
        localStorage.removeItem('currentUser');
        this.updateUI();
        window.location.href = 'index.html';
    }

    hashPassword(password) {
        // Simulation de hash (en réalité, utiliser bcrypt côté serveur)
        return btoa(password);
    }

    verifyPassword(password, hash) {
        return btoa(password) === hash;
    }

    updateUI() {
        const authLink = document.getElementById('auth-link');
        const logoutLink = document.getElementById('logout-link');
        
        if (this.currentUser) {
            if (authLink) authLink.style.display = 'none';
            if (logoutLink) logoutLink.style.display = 'block';
        } else {
            if (authLink) authLink.style.display = 'block';
            if (logoutLink) logoutLink.style.display = 'none';
        }
    }
}

// Gestion des produits
class ProductManager {
    constructor(cart) {
        this.cart = cart;
        this.products = [];
        this.loadProducts();
    }

    loadProducts() {
        // Produits de démonstration
        this.products = [
            { id: 1, name: 'Ordinateur Portable Pro', price: 899.99, stock: 10, description: 'Performances exceptionnelles' },
            { id: 2, name: 'Smartphone X', price: 699.99, stock: 15, description: 'Dernière génération' },
            { id: 3, name: 'Casque Audio Sans Fil', price: 129.99, stock: 20, description: 'Qualité sonore premium' },
            { id: 4, name: 'Montre Connectée', price: 249.99, stock: 8, description: 'Suivez votre santé' },
            { id: 5, name: 'Tablette Graphique', price: 199.99, stock: 12, description: 'Pour créatifs' },
            { id: 6, name: 'Enceinte Bluetooth', price: 79.99, stock: 25, description: 'Son puissant' }
        ];
        this.displayProducts();
    }

    displayProducts() {
        const container = document.getElementById('products-container');
        if (!container) return;

        let filteredProducts = [...this.products];
        
        // Filtre recherche
        const searchInput = document.getElementById('search');
        if (searchInput && searchInput.value) {
            filteredProducts = filteredProducts.filter(p => 
                p.name.toLowerCase().includes(searchInput.value.toLowerCase())
            );
        }
        
        // Tri
        const sortSelect = document.getElementById('sort');
        if (sortSelect) {
            switch(sortSelect.value) {
                case 'name':
                    filteredProducts.sort((a, b) => a.name.localeCompare(b.name));
                    break;
                case 'price-asc':
                    filteredProducts.sort((a, b) => a.price - b.price);
                    break;
                case 'price-desc':
                    filteredProducts.sort((a, b) => b.price - a.price);
                    break;
            }
        }

        container.innerHTML = '';
        filteredProducts.forEach(product => {
            const productCard = document.createElement('div');
            productCard.className = 'product-card';
            productCard.innerHTML = `
                <div class="product-info">
                    <h3 class="product-title">${product.name}</h3>
                    <p>${product.description}</p>
                    <div class="product-price">${product.price} </div>
                    <div class="product-stock">Stock: ${product.stock}</div>
                    <button class="btn-primary add-to-cart" data-id="${product.id}">
                        Ajouter au panier
                    </button>
                </div>
            `;
            container.appendChild(productCard);
        });

        // Ajouter les événements d'ajout au panier
        document.querySelectorAll('.add-to-cart').forEach(button => {
            button.addEventListener('click', (e) => {
                const productId = parseInt(e.target.dataset.id);
                const product = this.products.find(p => p.id === productId);
                if (product && product.stock > 0) {
                    this.cart.addProduct(product);
                    product.stock--;
                    this.displayProducts(); // Rafraîchir l'affichage
                } else {
                    this.cart.showNotification('Produit plus en stock!', 'error');
                }
            });
        });
    }
}

// Initialisation
document.addEventListener('DOMContentLoaded', () => {
    const cart = new ShoppingCart();
    const auth = new Auth();
    const productManager = new ProductManager(cart);

    // Formulaire de connexion
    const loginForm = document.getElementById('login-form');
    if (loginForm) {
        loginForm.addEventListener('submit', (e) => {
            e.preventDefault();
            const email = document.getElementById('email').value;
            const password = document.getElementById('password').value;
            const role = document.getElementById('role').value;
            
            if (auth.login(email, password, role)) {
                window.location.href = 'account.html';
            } else {
                document.getElementById('login-message').textContent = 'Email ou mot de passe incorrect';
            }
        });
    }

    // Déconnexion
    const logoutLink = document.getElementById('logout-link');
    if (logoutLink) {
        logoutLink.addEventListener('click', (e) => {
            e.preventDefault();
            auth.logout();
        });
    }

    // Affichage du panier
    if (window.location.pathname.includes('cart.html')) {
        cart.updateCartDisplay();
    }

    // Checkout
    const checkoutForm = document.getElementById('checkout-form');
    if (checkoutForm) {
        checkoutForm.addEventListener('submit', (e) => {
            e.preventDefault();
            if (!auth.currentUser) {
                window.location.href = 'login.html';
                return;
            }
            
            if (cart.cart.length === 0) {
                cart.showNotification('Votre panier est vide!', 'error');
                return;
            }
            
            // Simuler la commande
            cart.showNotification('Commande validée avec succès!');
            localStorage.removeItem('cart');
            setTimeout(() => {
                window.location.href = 'index.html';
            }, 2000);
        });
    }
});
