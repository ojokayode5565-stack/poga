// Poga Cakes & Pastries Client Application

// Global State
let currentUser = JSON.parse(localStorage.getItem('poga_user')) || null;
let cart = JSON.parse(localStorage.getItem('poga_cart')) || [];
let products = [];
let currentCategory = 'All';

// Utility: Format Currency in Naira (₦)
function formatNaira(amount) {
    return '₦' + Number(amount).toLocaleString('en-NG', { minimumFractionDigits: 0, maximumFractionDigits: 2 });
}

// Utility: Show Toast Notification
function showToast(message, type = 'info') {
    const container = document.getElementById('toast-container');
    if (!container) return;
    const toast = document.createElement('div');
    toast.className = `toast toast-${type}`;
    toast.innerHTML = `<i class="fas fa-info-circle"></i> <span>${message}</span>`;
    container.appendChild(toast);

    setTimeout(() => {
        toast.style.opacity = '0';
        setTimeout(() => toast.remove(), 300);
    }, 3500);
}

// Modal Control Helpers
function openModal(id) {
    const modal = document.getElementById(id);
    if (modal) modal.classList.add('active');
}

function closeModal(id) {
    const modal = document.getElementById(id);
    if (modal) modal.classList.remove('active');
}

// DOM Loaded Initialization
document.addEventListener('DOMContentLoaded', () => {
    updateAuthUI();
    updateCartUI();
    fetchProducts();
    initHeroSlider();

    // Attach Event Listeners
    setupCategoryTabs();
    setupSearch();
    setupCartControls();
    setupAuthForms();
    setupCheckoutForm();
    setupAdminControls();
});

// Auth UI State Update
function updateAuthUI() {
    const authBtn = document.getElementById('nav-auth-btn');
    const userDisplay = document.getElementById('nav-user-display');
    const adminLink = document.getElementById('nav-admin-link');

    if (currentUser) {
        if (authBtn) authBtn.style.display = 'none';
        if (userDisplay) {
            userDisplay.style.display = 'flex';
            userDisplay.querySelector('.user-name').innerText = currentUser.name;
        }
        if (adminLink) {
            adminLink.style.display = currentUser.role === 'admin' ? 'flex' : 'none';
        }
    } else {
        if (authBtn) authBtn.style.display = 'flex';
        if (userDisplay) userDisplay.style.display = 'none';
        if (adminLink) adminLink.style.display = 'none';
    }
}

// Fetch Products from API
async function fetchProducts(searchQuery = '') {
    const grid = document.getElementById('products-grid');
    if (!grid) return;

    grid.innerHTML = '<div style="grid-column: 1/-1; text-align:center; padding: 40px; color:#888;"><i class="fas fa-spinner fa-spin fa-2x"></i><p style="margin-top:10px;">Loading delicious treats...</p></div>';

    try {
        let url = `/api/products?category=${encodeURIComponent(currentCategory)}`;
        if (searchQuery) url += `&search=${encodeURIComponent(searchQuery)}`;

        const res = await fetch(url);
        products = await res.json();

        renderProducts(products);
    } catch (err) {
        console.error("Error fetching products:", err);
        grid.innerHTML = '<div style="grid-column: 1/-1; text-align:center; padding: 40px; color:red;"><p>Failed to load products. Please refresh.</p></div>';
    }
}

// Render Products Grid
function renderProducts(items) {
    const grid = document.getElementById('products-grid');
    if (!grid) return;

    if (!items || items.length === 0) {
        grid.innerHTML = '<div style="grid-column: 1/-1; text-align:center; padding: 50px; background:#fff; border-radius:12px;"><i class="fas fa-cookie-bite fa-3x" style="color:#d4af37; margin-bottom:15px;"></i><h3>No pastries found</h3><p>Try choosing another category or search term.</p></div>';
        return;
    }

    grid.innerHTML = items.map(p => `
        <div class="product-card">
            <div class="product-img-wrap">
                <img src="${p.image_url}" alt="${p.name}" class="product-img" loading="lazy" onerror="this.src='https://images.unsplash.com/photo-1509440159596-0249088772ff?auto=format&fit=crop&w=800&q=80'">
                <span class="product-category-badge">${p.category}</span>
            </div>
            <div class="product-info">
                <h3 class="product-title">${p.name}</h3>
                <p class="product-desc">${p.description || 'Freshly baked with love at Poga Cakes & Pastries.'}</p>
                <div class="product-bottom">
                    <div class="product-price">${formatNaira(p.price)}</div>
                    <button class="btn-add-cart" onclick="addToCart(${p.id})">
                        <i class="fas fa-shopping-bag"></i> Add to Order
                    </button>
                </div>
            </div>
        </div>
    `).join('');
}

// Category Tab Filtering
function setupCategoryTabs() {
    const tabs = document.querySelectorAll('.category-tab');
    tabs.forEach(tab => {
        tab.addEventListener('click', (e) => {
            tabs.forEach(t => t.classList.remove('active'));
            e.target.classList.add('active');
            currentCategory = e.target.getAttribute('data-category');
            fetchProducts();
        });
    });
}

// Search functionality
function setupSearch() {
    const input = document.getElementById('search-input');
    if (input) {
        let debounceTimer;
        input.addEventListener('input', (e) => {
            clearTimeout(debounceTimer);
            debounceTimer = setTimeout(() => {
                fetchProducts(e.target.value);
            }, 300);
        });
    }
}

// Cart System
function addToCart(productId) {
    const prod = products.find(p => p.id === productId);
    if (!prod) return;

    const existingIndex = cart.findIndex(item => item.id === productId);
    if (existingIndex > -1) {
        cart[existingIndex].quantity += 1;
    } else {
        cart.push({
            id: prod.id,
            name: prod.name,
            price: prod.price,
            image_url: prod.image_url,
            quantity: 1
        });
    }

    saveCart();
    showToast(`Added 1x ${prod.name} to cart!`, 'success');
}

function updateQuantity(productId, delta) {
    const index = cart.findIndex(item => item.id === productId);
    if (index > -1) {
        cart[index].quantity += delta;
        if (cart[index].quantity <= 0) {
            cart.splice(index, 1);
        }
        saveCart();
    }
}

function saveCart() {
    localStorage.setItem('poga_cart', JSON.stringify(cart));
    updateCartUI();
}

function updateCartUI() {
    const badge = document.getElementById('cart-badge-count');
    const list = document.getElementById('cart-items-container');
    const totalElem = document.getElementById('cart-total-amount');

    const totalQty = cart.reduce((sum, item) => sum + item.quantity, 0);
    const totalPrice = cart.reduce((sum, item) => sum + (item.price * item.quantity), 0);

    if (badge) badge.innerText = totalQty;
    if (totalElem) totalElem.innerText = formatNaira(totalPrice);

    if (list) {
        if (cart.length === 0) {
            list.innerHTML = '<div style="text-align:center; padding:30px; color:#888;"><i class="fas fa-shopping-basket fa-2x" style="margin-bottom:10px;"></i><p>Your cart is empty.</p></div>';
        } else {
            list.innerHTML = cart.map(item => `
                <div class="cart-item">
                    <div class="cart-item-info">
                        <img src="${item.image_url}" class="cart-item-img" alt="${item.name}">
                        <div>
                            <div class="cart-item-name">${item.name}</div>
                            <div class="cart-item-price">${formatNaira(item.price)} each</div>
                        </div>
                    </div>
                    <div class="cart-item-qty-controls">
                        <button class="qty-btn" onclick="updateQuantity(${item.id}, -1)">-</button>
                        <span style="font-weight:600; min-width:20px; text-align:center;">${item.quantity}</span>
                        <button class="qty-btn" onclick="updateQuantity(${item.id}, 1)">+</button>
                    </div>
                </div>
            `).join('');
        }
    }
}

function setupCartControls() {
    const cartBtn = document.getElementById('nav-cart-btn');
    if (cartBtn) {
        cartBtn.addEventListener('click', () => openModal('cart-modal'));
    }
}

// Authentication Forms & Actions
function setupAuthForms() {
    // Login Form Submit
    const loginForm = document.getElementById('login-form');
    if (loginForm) {
        loginForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            const email = document.getElementById('login-email').value;
            const password = document.getElementById('login-password').value;

            try {
                const res = await fetch('/api/auth/login', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ email, password })
                });

                const data = await res.json();
                if (!res.ok) {
                    showToast(data.error || 'Login failed', 'danger');
                    return;
                }

                currentUser = data.user;
                localStorage.setItem('poga_user', JSON.stringify(currentUser));
                updateAuthUI();
                closeModal('auth-modal');
                showToast(`Welcome back, ${currentUser.name}!`, 'success');
            } catch (err) {
                showToast('Login error. Please try again.', 'danger');
            }
        });
    }

    // Register Form Submit
    const regForm = document.getElementById('register-form');
    if (regForm) {
        regForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            const name = document.getElementById('reg-name').value;
            const email = document.getElementById('reg-email').value;
            const phone = document.getElementById('reg-phone').value;
            const address = document.getElementById('reg-address').value;
            const password = document.getElementById('reg-password').value;

            try {
                const res = await fetch('/api/auth/register', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ name, email, phone, address, password })
                });

                const data = await res.json();
                if (!res.ok) {
                    showToast(data.error || 'Registration failed', 'danger');
                    return;
                }

                currentUser = data.user;
                localStorage.setItem('poga_user', JSON.stringify(currentUser));
                updateAuthUI();
                closeModal('auth-modal');
                showToast('Account created successfully!', 'success');
            } catch (err) {
                showToast('Registration error.', 'danger');
            }
        });
    }
}

function logoutUser() {
    currentUser = null;
    localStorage.removeItem('poga_user');
    updateAuthUI();
    showToast('Logged out successfully.', 'info');
}

// Checkout & Order Placement
function proceedToCheckout() {
    if (cart.length === 0) {
        showToast('Your cart is empty!', 'warning');
        return;
    }

    closeModal('cart-modal');
    openModal('checkout-modal');

    // Pre-fill user details if logged in
    if (currentUser) {
        document.getElementById('checkout-name').value = currentUser.name || '';
        document.getElementById('checkout-email').value = currentUser.email || '';
        document.getElementById('checkout-phone').value = currentUser.phone || '';
        document.getElementById('checkout-address').value = currentUser.address || '';
    }

    const total = cart.reduce((sum, item) => sum + (item.price * item.quantity), 0);
    document.getElementById('checkout-summary-amount').innerText = formatNaira(total);
}

function setupCheckoutForm() {
    const form = document.getElementById('checkout-form');
    if (form) {
        form.addEventListener('submit', async (e) => {
            e.preventDefault();

            const orderData = {
                user_id: currentUser ? currentUser.id : null,
                customer_name: document.getElementById('checkout-name').value,
                customer_email: document.getElementById('checkout-email').value,
                customer_phone: document.getElementById('checkout-phone').value,
                delivery_address: document.getElementById('checkout-address').value,
                payment_method: document.getElementById('checkout-payment').value,
                notes: document.getElementById('checkout-notes').value,
                items: cart
            };

            try {
                const res = await fetch('/api/orders', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(orderData)
                });

                const data = await res.json();
                if (!res.ok) {
                    showToast(data.error || 'Failed to place order', 'danger');
                    return;
                }

                // Clear Cart
                cart = [];
                saveCart();
                closeModal('checkout-modal');

                // Display Confirmation Modal
                document.getElementById('confirm-order-ref').innerText = data.order_ref;
                document.getElementById('confirm-order-total').innerText = formatNaira(data.total_amount);
                openModal('confirmation-modal');

            } catch (err) {
                showToast('Error placing order. Please try again.', 'danger');
            }
        });
    }
}

// User Orders View Modal
async function viewUserOrders() {
    if (!currentUser) return;

    openModal('my-orders-modal');
    const container = document.getElementById('my-orders-list');
    container.innerHTML = '<p style="text-align:center;"><i class="fas fa-spinner fa-spin"></i> Loading order history...</p>';

    try {
        const res = await fetch(`/api/orders?user_id=${currentUser.id}`);
        const orders = await res.json();

        if (!orders || orders.length === 0) {
            container.innerHTML = '<p style="text-align:center; color:#888;">You have not placed any orders yet.</p>';
            return;
        }

        container.innerHTML = orders.map(o => `
            <div style="background:#fdfaf6; border:1px solid #e0d5cb; border-radius:10px; padding:15px; margin-bottom:15px;">
                <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:10px;">
                    <div>
                        <strong>Ref: ${o.order_ref}</strong>
                        <div style="font-size:0.8rem; color:#666;">Placed on: ${new Date(o.created_at).toLocaleString()}</div>
                    </div>
                    <span class="status-badge status-${o.status.toLowerCase().replace(/ /g, '-')}">${o.status}</span>
                </div>
                <div style="font-size:0.9rem; margin-bottom:8px;">
                    <strong>Items:</strong>
                    <ul style="padding-left:20px; margin-top:4px;">
                        ${o.items.map(i => `<li>${i.quantity}x ${i.product_name} (${formatNaira(i.unit_price)})</li>`).join('')}
                    </ul>
                </div>
                <div style="text-align:right; font-size:1.05rem; font-weight:bold; color:#2c1810;">
                    Total: ${formatNaira(o.total_amount)} (${o.payment_method})
                </div>
            </div>
        `).join('');

    } catch (err) {
        container.innerHTML = '<p style="color:red; text-align:center;">Failed to load order history.</p>';
    }
}

// Admin Panel Logic
function openAdminPanel() {
    if (!currentUser || currentUser.role !== 'admin') {
        showToast('Access restricted to Bakery Administrators.', 'danger');
        return;
    }

    openModal('admin-modal');
    loadAdminStats();
    loadAdminProducts();
    loadAdminOrders();
}

async function loadAdminStats() {
    try {
        const res = await fetch('/api/admin/stats');
        const stats = await res.json();
        document.getElementById('admin-stat-revenue').innerText = formatNaira(stats.total_revenue);
        document.getElementById('admin-stat-orders').innerText = stats.total_orders;
        document.getElementById('admin-stat-pending').innerText = stats.pending_orders;
        document.getElementById('admin-stat-products').innerText = stats.total_products;
    } catch (err) {
        console.error("Error loading stats:", err);
    }
}

async function loadAdminProducts() {
    const tbody = document.getElementById('admin-products-table-body');
    tbody.innerHTML = '<tr><td colspan="5" text-align="center"><i class="fas fa-spinner fa-spin"></i> Loading...</td></tr>';

    try {
        const res = await fetch('/api/products');
        const prods = await res.json();

        tbody.innerHTML = prods.map(p => `
            <tr>
                <td><img src="${p.image_url}" style="width:40px; height:40px; border-radius:6px; object-fit:cover;"></td>
                <td><strong>${p.name}</strong></td>
                <td>${p.category}</td>
                <td>${formatNaira(p.price)}</td>
                <td>
                    <button class="btn btn-sm btn-outline" onclick="editProductPrompt(${p.id}, '${p.name.replace(/'/g, "\\'")}', ${p.price}, '${p.category}')">Edit</button>
                    <button class="btn btn-sm btn-accent" onclick="deleteProductConfirm(${p.id})">Delete</button>
                </td>
            </tr>
        `).join('');
    } catch (err) {
        tbody.innerHTML = '<tr><td colspan="5" style="color:red;">Failed to load products</td></tr>';
    }
}

async function loadAdminOrders() {
    const tbody = document.getElementById('admin-orders-table-body');
    tbody.innerHTML = '<tr><td colspan="6" text-align="center"><i class="fas fa-spinner fa-spin"></i> Loading...</td></tr>';

    try {
        const res = await fetch('/api/orders?admin=true');
        const orders = await res.json();

        tbody.innerHTML = orders.map(o => `
            <tr>
                <td><strong>${o.order_ref}</strong></td>
                <td>${o.customer_name}<br><small>${o.customer_phone}</small></td>
                <td>${formatNaira(o.total_amount)}<br><small style="color:#777;">${o.payment_method}</small></td>
                <td>
                    <select onchange="updateOrderStatus(${o.id}, this.value)" style="padding:4px 8px; border-radius:6px;">
                        <option value="Pending" ${o.status==='Pending'?'selected':''}>Pending</option>
                        <option value="Confirmed" ${o.status==='Confirmed'?'selected':''}>Confirmed</option>
                        <option value="Preparing" ${o.status==='Preparing'?'selected':''}>Preparing</option>
                        <option value="Out for Delivery" ${o.status==='Out for Delivery'?'selected':''}>Out for Delivery</option>
                        <option value="Delivered" ${o.status==='Delivered'?'selected':''}>Delivered</option>
                        <option value="Cancelled" ${o.status==='Cancelled'?'selected':''}>Cancelled</option>
                    </select>
                </td>
                <td><small>${new Date(o.created_at).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}</small></td>
                <td>
                    <button class="btn btn-sm btn-primary" onclick="alert('Delivery Address: ${o.delivery_address.replace(/'/g, "\\'")}\\n\\nNotes: ${o.notes ? o.notes.replace(/'/g, "\\'") : 'None'}')">Details</button>
                </td>
            </tr>
        `).join('');
    } catch (err) {
        tbody.innerHTML = '<tr><td colspan="6" style="color:red;">Failed to load orders</td></tr>';
    }
}

// Update Order Status via Admin
async function updateOrderStatus(orderId, newStatus) {
    try {
        const res = await fetch(`/api/orders/${orderId}/status`, {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ status: newStatus })
        });
        if (res.ok) {
            showToast(`Order status updated to "${newStatus}"`, 'success');
            loadAdminStats();
        } else {
            showToast('Failed to update status', 'danger');
        }
    } catch (err) {
        showToast('Error updating status', 'danger');
    }
}

// Add New Product via Admin
function setupAdminControls() {
    const addForm = document.getElementById('admin-add-product-form');
    if (addForm) {
        addForm.addEventListener('submit', async (e) => {
            e.preventDefault();

            const productData = {
                name: document.getElementById('prod-add-name').value,
                category: document.getElementById('prod-add-category').value,
                price: parseFloat(document.getElementById('prod-add-price').value),
                description: document.getElementById('prod-add-desc').value,
                image_url: document.getElementById('prod-add-image').value,
                stock: parseInt(document.getElementById('prod-add-stock').value) || 100
            };

            try {
                const res = await fetch('/api/products', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(productData)
                });

                if (res.ok) {
                    showToast('Product added successfully!', 'success');
                    addForm.reset();
                    closeModal('add-product-modal');
                    loadAdminProducts();
                    loadAdminStats();
                    fetchProducts();
                } else {
                    const data = await res.json();
                    showToast(data.error || 'Error adding product', 'danger');
                }
            } catch (err) {
                showToast('Error adding product', 'danger');
            }
        });
    }
}

// Edit Product Prompt
async function editProductPrompt(prodId, oldName, oldPrice, oldCat) {
    const newPrice = prompt(`Update price for "${oldName}" in Naira (₦):`, oldPrice);
    if (newPrice !== null && !isNaN(newPrice)) {
        try {
            const res = await fetch(`/api/products/${prodId}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ price: parseFloat(newPrice) })
            });

            if (res.ok) {
                showToast('Price updated successfully!', 'success');
                loadAdminProducts();
                fetchProducts();
            }
        } catch (err) {
            showToast('Error updating product.', 'danger');
        }
    }
}

// Delete Product
async function deleteProductConfirm(prodId) {
    if (confirm('Are you sure you want to delete this product?')) {
        try {
            const res = await fetch(`/api/products/${prodId}`, { method: 'DELETE' });
            if (res.ok) {
                showToast('Product deleted.', 'info');
                loadAdminProducts();
                loadAdminStats();
                fetchProducts();
            }
        } catch (err) {
            showToast('Error deleting product', 'danger');
        }
    }
}

// Toggle Admin View Tabs
function switchAdminTab(tabName) {
    document.querySelectorAll('.admin-tab').forEach(t => t.classList.remove('active'));
    document.querySelectorAll('.admin-tab-content').forEach(c => c.style.display = 'none');

    if (tabName === 'products') {
        document.getElementById('admin-tab-products-btn').classList.add('active');
        document.getElementById('admin-tab-products').style.display = 'block';
    } else if (tabName === 'orders') {
        document.getElementById('admin-tab-orders-btn').classList.add('active');
        document.getElementById('admin-tab-orders').style.display = 'block';
    }
}

// Hero Slider Auto Carousel Logic
let currentSlideIndex = 0;
let slideInterval = null;

function initHeroSlider() {
    const slides = document.querySelectorAll('.hero-slide');
    if (!slides || slides.length === 0) return;

    if (slideInterval) clearInterval(slideInterval);
    slideInterval = setInterval(() => {
        currentSlideIndex = (currentSlideIndex + 1) % slides.length;
        goToSlide(currentSlideIndex);
    }, 4500);
}

function goToSlide(index) {
    const slides = document.querySelectorAll('.hero-slide');
    const dots = document.querySelectorAll('.hero-dot');
    if (!slides || slides.length === 0) return;

    currentSlideIndex = index;
    slides.forEach((s, i) => {
        if (i === index) {
            s.classList.add('active');
        } else {
            s.classList.remove('active');
        }
    });

    dots.forEach((d, i) => {
        if (i === index) {
            d.classList.add('active');
        } else {
            d.classList.remove('active');
        }
    });
}

