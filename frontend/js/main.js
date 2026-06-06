// API Configuration
const API_URL = 'http://localhost:3000/api';
let currentUser = null;

// Initialize app
document.addEventListener('DOMContentLoaded', () => {
    checkAuth();
    loadCartCount();
    
    // Page specific initialization
    if (window.location.pathname.includes('shop.html')) {
        loadProducts();
    } else if (window.location.pathname.includes('cart.html')) {
        loadCart();
    } else if (window.location.pathname.includes('account.html')) {
        loadAccount();
    } else if (window.location.pathname.includes('checkout.html')) {
        loadCheckout();
    }
    
    // Setup event listeners
    setupEventListeners();
});

// Check authentication
async function checkAuth() {
    const token = localStorage.getItem('token');
    if (token) {
        try {
            const response = await fetch(`${API_URL}/auth/me`, {
                headers: {
                    'Authorization': `Bearer ${token}`
                }
            });
            
            if (response.ok) {
                const data = await response.json();
                currentUser = data.user;
                updateUIForLoggedInUser();
            } else {
                logout();
            }
        } catch (error) {
            console.error('Auth check failed:', error);
            logout();
        }
    } else {
        updateUIForLoggedOutUser();
    }
}

// Update UI for logged in user
function updateUIForLoggedInUser() {
    const authLink = document.getElementById('auth-link');
    const logoutLink = document.getElementById('logout-link');
    
    if (authLink) {
        authLink.style.display = 'none';
    }
    if (logoutLink) {
        logoutLink.style.display = 'block';
        logoutLink.addEventListener('click', (e) => {
            e.preventDefault();
            logout();
        });
    }
    
    // Update account link if on account page
    if (window.location.pathname.includes('account.html') && currentUser) {
        displayUserInfo();
    }
}

// Update UI for logged out user
function updateUIForLoggedOutUser() {
    const authLink = document.getElementById('auth-link');
    const logoutLink = document.getElementById('logout-link');
    
    if (authLink) {
        authLink.style.display = 'block';
        authLink.href = 'login.html';
    }
    if (logoutLink) {
        logoutLink.style.display = 'none';
    }
}

// Logout function
function logout() {
    localStorage.removeItem('token');
    currentUser = null;
    window.location.href = 'index.html';
}

// Load cart count
async function loadCartCount() {
    const token = localStorage.getItem('token');
    if (!token) return;
    
    try {
        const response = await fetch(`${API_URL}/cart`, {
            headers: {
                'Authorization': `Bearer ${token}`
            }
        });
        
        if (response.ok) {
            const data = await response.json();
            const cartCount = data.cartItems.reduce((sum, item) => sum + item.quantity, 0);
            const cartCountElements = document.querySelectorAll('#cart-count');
            cartCountElements.forEach(el => {
                if (el) el.textContent = cartCount;
            });
        }
    } catch (error) {
        console.error('Failed to load cart count:', error);
    }
}

// Load products for shop page
async function loadProducts() {
    const searchInput = document.getElementById('search');
    const sortSelect = document.getElementById('sort');
    
    async function fetchProducts() {
        const search = searchInput ? searchInput.value : '';
        const sort = sortSelect ? sortSelect.value : 'name';
        
        try {
            const response = await fetch(`${API_URL}/products?search=${search}&sort=${sort}`);
            if (response.ok) {
                const data = await response.json();
                displayProducts(data.products);
            }
        } catch (error) {
            console.error('Failed to load products:', error);
            showMessage('Erreur lors du chargement des produits', 'error');
        }
    }
    
    if (searchInput) searchInput.addEventListener('input', fetchProducts);
    if (sortSelect) sortSelect.addEventListener('change', fetchProducts);
    
    await fetchProducts();
}

// Display products
function displayProducts(products) {
    const container = document.getElementById('products-container');
    if (!container) return;
    
    if (products.length === 0) {
        container.innerHTML = '<p>Aucun produit trouvé</p>';
        return;
    }
    
    container.innerHTML = products.map(product => `
        <div class="product-card">
            <div class="product-info">
                <h3>${escapeHtml(product.name)}</h3>
                <p>${escapeHtml(product.description || 'Description non disponible')}</p>
                <div class="product-price">${product.price.toFixed(2)} €</div>
                <div class="product-stock ${product.stock < 5 ? (product.stock === 0 ? 'out-of-stock' : 'low-stock') : ''}">
                    ${product.stock > 0 ? `Stock: ${product.stock}` : 'Rupture de stock'}
                </div>
                ${product.stock > 0 ? 
                    `<button onclick="addToCart(${product.id})" class="btn-primary">Ajouter au panier</button>` : 
                    '<button disabled class="btn-secondary">Indisponible</button>'
                }
            </div>
        </div>
    `).join('');
}

// Add to cart
async function addToCart(productId) {
    const token = localStorage.getItem('token');
    if (!token) {
        if (confirm('Veuillez vous connecter pour ajouter au panier. Aller à la connexion ?')) {
            window.location.href = 'login.html';
        }
        return;
    }
    
    try {
        const response = await fetch(`${API_URL}/cart/add`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify({ productId, quantity: 1 })
        });
        
        if (response.ok) {
            showMessage('Produit ajouté au panier!', 'success');
            loadCartCount();
        } else {
            const error = await response.json();
            showMessage(error.error || 'Erreur lors de l\'ajout', 'error');
        }
    } catch (error) {
        console.error('Failed to add to cart:', error);
        showMessage('Erreur lors de l\'ajout au panier', 'error');
    }
}

// Load cart for cart page
async function loadCart() {
    const token = localStorage.getItem('token');
    if (!token) {
        window.location.href = 'login.html';
        return;
    }
    
    try {
        const response = await fetch(`${API_URL}/cart`, {
            headers: {
                'Authorization': `Bearer ${token}`
            }
        });
        
        if (response.ok) {
            const data = await response.json();
            displayCart(data.cartItems, data.total);
        }
    } catch (error) {
        console.error('Failed to load cart:', error);
    }
}

// Display cart
function displayCart(cartItems, total) {
    const container = document.getElementById('cart-container');
    const totalSpan = document.getElementById('cart-total');
    
    if (!container) return;
    
    if (cartItems.length === 0) {
        container.innerHTML = '<p>Votre panier est vide</p>';
        if (totalSpan) totalSpan.textContent = '0';
        return;
    }
    
    container.innerHTML = `
        <div class="cart-items">
            <div class="cart-item cart-header">
                <div>Produit</div>
                <div>Prix unitaire</div>
                <div>Quantité</div>
                <div>Total</div>
                <div>Actions</div>
            </div>
            ${cartItems.map(item => `
                <div class="cart-item" data-product-id="${item.product_id}">
                    <div>${escapeHtml(item.name)}</div>
                    <div>${item.price.toFixed(2)} €</div>
                    <div>
                        <input type="number" 
                               value="${item.quantity}" 
                               min="1" 
                               max="${item.stock}"
                               onchange="updateCartQuantity(${item.product_id}, this.value)">
                    </div>
                    <div>${(item.price * item.quantity).toFixed(2)} €</div>
                    <div>
                        <button onclick="removeFromCart(${item.product_id})" class="btn-danger">Supprimer</button>
                    </div>
                </div>
            `).join('')}
        </div>
    `;
    
    if (totalSpan) totalSpan.textContent = total.toFixed(2);
}

// Update cart quantity
async function updateCartQuantity(productId, quantity) {
    const token = localStorage.getItem('token');
    quantity = parseInt(quantity);
    
    try {
        const response = await fetch(`${API_URL}/cart/update/${productId}`, {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify({ quantity })
        });
        
        if (response.ok) {
            loadCart();
            loadCartCount();
        } else {
            const error = await response.json();
            showMessage(error.error || 'Erreur lors de la mise à jour', 'error');
            loadCart();
        }
    } catch (error) {
        console.error('Failed to update cart:', error);
    }
}

// Remove from cart
async function removeFromCart(productId) {
    const token = localStorage.getItem('token');
    
    try {
        const response = await fetch(`${API_URL}/cart/remove/${productId}`, {
            method: 'DELETE',
            headers: {
                'Authorization': `Bearer ${token}`
            }
        });
        
        if (response.ok) {
            loadCart();
            loadCartCount();
            showMessage('Produit retiré du panier', 'success');
        }
    } catch (error) {
        console.error('Failed to remove from cart:', error);
    }
}

// Load account page
async function loadAccount() {
    const token = localStorage.getItem('token');
    if (!token) {
        window.location.href = 'login.html';
        return;
    }
    
    try {
        const response = await fetch(`${API_URL}/auth/me`, {
            headers: {
                'Authorization': `Bearer ${token}`
            }
        });
        
        if (response.ok) {
            const data = await response.json();
            currentUser = data.user;
            displayUserInfo();
            loadUserOrders();
        }
    } catch (error) {
        console.error('Failed to load account:', error);
    }
}

// Display user info
function displayUserInfo() {
    const accountInfo = document.getElementById('account-info');
    if (!accountInfo) return;
    
    accountInfo.innerHTML = `
        <div class="info-row">
            <strong>Nom:</strong>
            <span>${escapeHtml(currentUser.name || 'Non renseigné')}</span>
        </div>
        <div class="info-row">
            <strong>Email:</strong>
            <span>${escapeHtml(currentUser.email)}</span>
        </div>
        <div class="info-row">
            <strong>Rôle:</strong>
            <span>${escapeHtml(currentUser.role === 'admin' ? 'Administrateur' : currentUser.role === 'employee' ? 'Employé' : 'Utilisateur')}</span>
        </div>
        <div class="info-row">
            <strong>Membre depuis:</strong>
            <span>${new Date().toLocaleDateString()}</span>
        </div>
    `;
}

// Load user orders
async function loadUserOrders() {
    // This would require an orders endpoint
    const ordersContainer = document.getElementById('orders-list');
    if (!ordersContainer) return;
    
    ordersContainer.innerHTML = '<p>Fonctionnalité à venir: Historique des commandes</p>';
}

// Load checkout
async function loadCheckout() {
    const token = localStorage.getItem('token');
    if (!token) {
        window.location.href = 'login.html';
        return;
    }
    
    try {
        const response = await fetch(`${API_URL}/cart`, {
            headers: {
                'Authorization': `Bearer ${token}`
            }
        });
        
        if (response.ok) {
            const data = await response.json();
            displayCheckout(data.cartItems, data.total);
        }
    } catch (error) {
        console.error('Failed to load checkout:', error);
    }
}

// Display checkout
function displayCheckout(cartItems, total) {
    const container = document.getElementById('checkout-container');
    if (!container) return;
    
    if (cartItems.length === 0) {
        container.innerHTML = '<p>Votre panier est vide. <a href="shop.html">Continuer vos achats</a></p>';
        return;
    }
    
    container.innerHTML = `
        <div class="cart-items">
            <div class="cart-header" style="display: grid; grid-template-columns: 2fr 1fr 1fr; gap: 1rem; padding: 1rem;">
                <div>Produit</div>
                <div>Quantité</div>
                <div>Total</div>
            </div>
            ${cartItems.map(item => `
                <div style="display: grid; grid-template-columns: 2fr 1fr 1fr; gap: 1rem; padding: 1rem; border-bottom: 1px solid #eee;">
                    <div>${escapeHtml(item.name)}</div>
                    <div>${item.quantity}</div>
                    <div>${(item.price * item.quantity).toFixed(2)} €</div>
                </div>
            `).join('')}
        </div>
        <div class="cart-summary">
            <h3>Total: ${total.toFixed(2)} €</h3>
            <button onclick="confirmOrder()" class="btn-primary">Confirmer la commande</button>
        </div>
    `;
}

// Confirm order
async function confirmOrder() {
    const token = localStorage.getItem('token');
    
    try {
        const response = await fetch(`${API_URL}/cart/checkout`, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${token}`
            }
        });
        
        if (response.ok) {
            const data = await response.json();
            showMessage('Commande confirmée avec succès!', 'success');
            setTimeout(() => {
                window.location.href = 'account.html';
            }, 2000);
        } else {
            const error = await response.json();
            showMessage(error.error || 'Erreur lors de la commande', 'error');
        }
    } catch (error) {
        console.error('Failed to confirm order:', error);
        showMessage('Erreur lors de la confirmation', 'error');
    }
}

// Setup event listeners
function setupEventListeners() {
    // Login form
    const loginForm = document.getElementById('login-form');
    if (loginForm) {
        loginForm.addEventListener('submit', handleLogin);
    }
    
    // Register link
    const registerLink = document.getElementById('register-link');
    if (registerLink) {
        registerLink.addEventListener('click', showRegisterForm);
    }
    
    // Change password form
    const changePasswordForm = document.getElementById('change-password-form');
    if (changePasswordForm) {
        changePasswordForm.addEventListener('submit', handleChangePassword);
    }
}

// Handle login
async function handleLogin(e) {
    e.preventDefault();
    
    const email = document.getElementById('email').value;
    const password = document.getElementById('password').value;
    const role = document.getElementById('role') ? document.getElementById('role').value : 'user';
    
    try {
        const response = await fetch(`${API_URL}/auth/login`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ email, password, role })
        });
        
        if (response.ok) {
            const data = await response.json();
            localStorage.setItem('token', data.token);
            currentUser = data.user;
            window.location.href = 'index.html';
        } else {
            const error = await response.json();
            showMessage(error.error || 'Login failed', 'error', 'login-message');
        }
    } catch (error) {
        console.error('Login failed:', error);
        showMessage('Erreur de connexion', 'error', 'login-message');
    }
}

// Show register form
function showRegisterForm(e) {
    e.preventDefault();
    
    const authBox = document.querySelector('.auth-box');
    if (!authBox) return;
    
    authBox.innerHTML = `
        <h2>Inscription</h2>
        <form id="register-form">
            <div class="form-group">
                <label for="name">Nom complet</label>
                <input type="text" id="name" name="name" required>
            </div>
            <div class="form-group">
                <label for="email">Email</label>
                <input type="email" id="email" name="email" required>
            </div>
            <div class="form-group">
                <label for="password">Mot de passe</label>
                <input type="password" id="password" name="password" required>
            </div>
            <div class="form-group">
                <label for="role">Rôle</label>
                <select id="role" name="role">
                    <option value="user">Utilisateur</option>
                    <option value="employee">Employé</option>
                </select>
            </div>
            <button type="submit" class="btn-primary">S'inscrire</button>
        </form>
        <p id="register-message"></p>
        <p>Déjà un compte ? <a href="#" id="login-link">Se connecter</a></p>
    `;
    
    const registerForm = document.getElementById('register-form');
    if (registerForm) {
        registerForm.addEventListener('submit', handleRegister);
    }
    
    const loginLink = document.getElementById('login-link');
    if (loginLink) {
        loginLink.addEventListener('click', () => window.location.reload());
    }
}

// Handle register
async function handleRegister(e) {
    e.preventDefault();
    
    const name = document.getElementById('name').value;
    const email = document.getElementById('email').value;
    const password = document.getElementById('password').value;
    const role = document.getElementById('role').value;
    
    try {
        const response = await fetch(`${API_URL}/auth/register`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ name, email, password, role })
        });
        
        if (response.ok) {
            const data = await response.json();
            localStorage.setItem('token', data.token);
            currentUser = data.user;
            window.location.href = 'index.html';
        } else {
            const error = await response.json();
            showMessage(error.error || 'Erreur lors de l\'inscription', 'error', 'register-message');
        }
    } catch (error) {
        console.error('Registration failed:', error);
        showMessage('Erreur lors de l\'inscription', 'error', 'register-message');
    }
}

// Handle change password
async function handleChangePassword(e) {
    e.preventDefault();
    
    const token = localStorage.getItem('token');
    const currentPassword = document.getElementById('current-password').value;
    const newPassword = document.getElementById('new-password').value;
    const confirmPassword = document.getElementById('confirm-password').value;
    
    if (newPassword !== confirmPassword) {
        showMessage('Les mots de passe ne correspondent pas', 'error', 'password-message');
        return;
    }
    
    try {
        const response = await fetch(`${API_URL}/users/${currentUser.id}/password`, {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify({ currentPassword, newPassword })
        });
        
        if (response.ok) {
            showMessage('Mot de passe modifié avec succès', 'success', 'password-message');
            document.getElementById('change-password-form').reset();
        } else {
            const error = await response.json();
            showMessage(error.error || 'Erreur lors du changement', 'error', 'password-message');
        }
    } catch (error) {
        console.error('Password change failed:', error);
        showMessage('Erreur lors du changement', 'error', 'password-message');
    }
}

// Show message
function showMessage(message, type, elementId = 'message-container') {
    let container = document.getElementById(elementId);
    
    if (!container) {
        container = document.createElement('div');
        container.id = elementId;
        const form = document.querySelector('form');
        if (form) {
            form.insertAdjacentElement('afterend', container);
        }
    }
    
    container.innerHTML = `<div class="alert alert-${type}">${escapeHtml(message)}</div>`;
    
    setTimeout(() => {
        if (container) container.innerHTML = '';
    }, 5000);
}

// Escape HTML
function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}
