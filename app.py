import os
import sqlite3
import uuid
from datetime import datetime
from functools import wraps
from flask import Flask, request, jsonify, render_template, send_from_directory
from flask_cors import CORS
from werkzeug.security import generate_password_hash, check_password_hash
from werkzeug.utils import secure_filename

app = Flask(__name__, static_folder='static', template_folder='templates')
app.secret_key = 'poga_cakes_secret_key_nigeria_bakery'
CORS(app)

DB_FILE = os.path.join(os.path.dirname(__file__), 'poga_cakes.db')
UPLOAD_FOLDER = os.path.join(os.path.dirname(__file__), 'static', 'uploads')
os.makedirs(UPLOAD_FOLDER, exist_ok=True)
app.config['UPLOAD_FOLDER'] = UPLOAD_FOLDER

def get_db():
    conn = sqlite3.connect(DB_FILE)
    conn.row_factory = sqlite3.Row
    return conn

def init_db():
    conn = get_db()
    cursor = conn.cursor()
    
    # Users Table
    cursor.execute('''
        CREATE TABLE IF NOT EXISTS users (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            name TEXT NOT NULL,
            email TEXT UNIQUE NOT NULL,
            phone TEXT NOT NULL,
            address TEXT NOT NULL,
            password_hash TEXT NOT NULL,
            role TEXT NOT NULL DEFAULT 'customer',
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
    ''')

    # Categories Table
    cursor.execute('''
        CREATE TABLE IF NOT EXISTS categories (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            name TEXT NOT NULL,
            slug TEXT UNIQUE NOT NULL
        )
    ''')

    # Products Table
    cursor.execute('''
        CREATE TABLE IF NOT EXISTS products (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            name TEXT NOT NULL,
            category TEXT NOT NULL,
            price REAL NOT NULL,
            description TEXT,
            image_url TEXT,
            stock INTEGER DEFAULT 100,
            is_active INTEGER DEFAULT 1,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
    ''')

    # Orders Table
    cursor.execute('''
        CREATE TABLE IF NOT EXISTS orders (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            order_ref TEXT UNIQUE NOT NULL,
            user_id INTEGER,
            customer_name TEXT NOT NULL,
            customer_email TEXT NOT NULL,
            customer_phone TEXT NOT NULL,
            delivery_address TEXT NOT NULL,
            total_amount REAL NOT NULL,
            payment_method TEXT NOT NULL,
            status TEXT NOT NULL DEFAULT 'Pending',
            notes TEXT,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
    ''')

    # Order Items Table
    cursor.execute('''
        CREATE TABLE IF NOT EXISTS order_items (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            order_id INTEGER NOT NULL,
            product_id INTEGER NOT NULL,
            product_name TEXT NOT NULL,
            unit_price REAL NOT NULL,
            quantity INTEGER NOT NULL,
            subtotal REAL NOT NULL,
            FOREIGN KEY (order_id) REFERENCES orders (id)
        )
    ''')

    conn.commit()

    # Seed Admin User if not exists
    cursor.execute('SELECT * FROM users WHERE email = ?', ('admin@pogacakes.ng',))
    if not cursor.fetchone():
        admin_pass = generate_password_hash('admin123')
        cursor.execute('''
            INSERT INTO users (name, email, phone, address, password_hash, role)
            VALUES (?, ?, ?, ?, ?, ?)
        ''', ('Poga Admin', 'admin@pogacakes.ng', '+2348012345678', '12 Bakery Lane, Victoria Island, Lagos', admin_pass, 'admin'))

    # Seed Demo Customer User if not exists
    cursor.execute('SELECT * FROM users WHERE email = ?', ('customer@gmail.com',))
    if not cursor.fetchone():
        cust_pass = generate_password_hash('password123')
        cursor.execute('''
            INSERT INTO users (name, email, phone, address, password_hash, role)
            VALUES (?, ?, ?, ?, ?, ?)
        ''', ('Blessing Okeke', 'customer@gmail.com', '+2348129876543', '45 Allen Avenue, Ikeja, Lagos', cust_pass, 'customer'))

    # Seed Products if empty
    cursor.execute('SELECT COUNT(*) as count FROM products')
    if cursor.fetchone()['count'] == 0:
        seed_products = [
            (
                "Fluffy Milk Doughnut",
                "Doughnuts",
                1500,
                "Ultra-soft, pillowy milk-glazed doughnuts dusted with fine icing sugar. Baked fresh daily!",
                "https://images.unsplash.com/photo-1527515637462-cff94eecc1ac?auto=format&fit=crop&w=800&q=80",
                150
            ),
            (
                "Crunchy Sweet Chin Chin (Medium Jar)",
                "Chin Chin & Snacks",
                2500,
                "Golden, crispy, and perfectly sweet homemade Nigerian Chin Chin enriched with real butter and aromatic nutmeg.",
                "https://images.unsplash.com/photo-1599785209707-a456fc1337cc?auto=format&fit=crop&w=800&q=80",
                200
            ),
            (
                "Crispy Spicy Plantain Chips (Family Pack)",
                "Chin Chin & Snacks",
                1200,
                "Thinly sliced, crunchy unripe & ripe plantain chips, lightly salted and seasoned with natural pepper spice.",
                "https://images.unsplash.com/photo-1566478989037-eec170784d0b?auto=format&fit=crop&w=800&q=80",
                180
            ),
            (
                "Rich Chocolate Fudge Layer Cake",
                "Cakes",
                18000,
                "Decadent 3-layer moist dark chocolate cake layered with rich gourmet chocolate ganache and chocolate curls.",
                "https://images.unsplash.com/photo-1578985545062-69928b1d9587?auto=format&fit=crop&w=800&q=80",
                25
            ),
            (
                "Classic Vanilla Buttercream Celebration Cake",
                "Cakes",
                15000,
                "Light, fluffy vanilla bean sponge cake frosted with silky vanilla buttercream icing. Perfect for birthdays!",
                "https://images.unsplash.com/photo-1535141192574-5d4897c13136?auto=format&fit=crop&w=800&q=80",
                30
            ),
            (
                "Red Velvet Cream Cheese Birthday Cake",
                "Cakes",
                22000,
                "Signature Nigerian red velvet cake with subtle cocoa notes and velvety cream cheese frosting finish.",
                "https://images.unsplash.com/photo-1586985289688-ca3cf47d3e6e?auto=format&fit=crop&w=800&q=80",
                20
            ),
            (
                "Nigerian Beef Meat Pie (Box of 4)",
                "Pastries & Meat Pies",
                3500,
                "Buttery, flaky golden pastry stuffed with juicy seasoned minced beef, carrots, and potato filling.",
                "https://images.unsplash.com/photo-1601050690597-df0568f70950?auto=format&fit=crop&w=800&q=80",
                100
            ),
            (
                "Golden Fried Puff Puff Platter (20 Pcs)",
                "Pastries & Meat Pies",
                2000,
                "Sweet, airy, golden fried dough balls prepared fresh on order. Deeply popular Nigerian street snack delicacy!",
                "https://images.unsplash.com/photo-1626777552726-4a6b54c97e46?auto=format&fit=crop&w=800&q=80",
                120
            ),
            (
                "Gourmet Sausage Rolls (Box of 6)",
                "Pastries & Meat Pies",
                4000,
                "Savory seasoned minced pork & sausage wrap baked inside golden flaky puff pastry crust.",
                "https://images.unsplash.com/photo-1509722747041-616f39b57569?auto=format&fit=crop&w=800&q=80",
                80
            ),
            (
                "Chilled Natural Zobo Drink (1 Liter)",
                "Drinks",
                1500,
                "100% natural refreshing hibiscus drink infused with fresh pineapple, ginger, cloves, and natural honey.",
                "https://images.unsplash.com/photo-1556881286-fc6915169721?auto=format&fit=crop&w=800&q=80",
                150
            )
        ]
        cursor.executemany('''
            INSERT INTO products (name, category, price, description, image_url, stock)
            VALUES (?, ?, ?, ?, ?, ?)
        ''', seed_products)
    else:
        # Update existing records with new high-quality authentic URLs
        cursor.execute("UPDATE products SET image_url = 'https://images.unsplash.com/photo-1527515637462-cff94eecc1ac?auto=format&fit=crop&w=800&q=80' WHERE name LIKE '%Doughnut%'")
        cursor.execute("UPDATE products SET image_url = 'https://images.unsplash.com/photo-1599785209707-a456fc1337cc?auto=format&fit=crop&w=800&q=80' WHERE name LIKE '%Chin Chin%'")
        cursor.execute("UPDATE products SET image_url = 'https://images.unsplash.com/photo-1626777552726-4a6b54c97e46?auto=format&fit=crop&w=800&q=80' WHERE name LIKE '%Puff Puff%'")
        cursor.execute("UPDATE products SET image_url = 'https://images.unsplash.com/photo-1556881286-fc6915169721?auto=format&fit=crop&w=800&q=80' WHERE name LIKE '%Zobo%'")

    conn.commit()
    conn.close()

# Initialize DB on start
init_db()

@app.route('/')
def index():
    return render_template('index.html')

# API Endpoints

# Auth: Register
@app.route('/api/auth/register', methods=['POST'])
def register():
    data = request.get_json() or {}
    name = data.get('name', '').strip()
    email = data.get('email', '').strip().lower()
    phone = data.get('phone', '').strip()
    address = data.get('address', '').strip()
    password = data.get('password', '')

    if not name or not email or not password or not phone:
        return jsonify({'error': 'Please provide all required fields (Name, Email, Phone, Password)'}), 400

    conn = get_db()
    cursor = conn.cursor()
    cursor.execute('SELECT id FROM users WHERE email = ?', (email,))
    if cursor.fetchone():
        conn.close()
        return jsonify({'error': 'An account with this email address already exists.'}), 400

    pwd_hash = generate_password_hash(password)
    cursor.execute('''
        INSERT INTO users (name, email, phone, address, password_hash, role)
        VALUES (?, ?, ?, ?, ?, 'customer')
    ''', (name, email, phone, address, pwd_hash))
    conn.commit()
    user_id = cursor.lastrowid
    conn.close()

    return jsonify({
        'message': 'Registration successful!',
        'user': {
            'id': user_id,
            'name': name,
            'email': email,
            'phone': phone,
            'address': address,
            'role': 'customer'
        }
    }), 201

# Auth: Login
@app.route('/api/auth/login', methods=['POST'])
def login():
    data = request.get_json() or {}
    email = data.get('email', '').strip().lower()
    password = data.get('password', '')

    if not email or not password:
        return jsonify({'error': 'Email and Password are required.'}), 400

    conn = get_db()
    cursor = conn.cursor()
    cursor.execute('SELECT * FROM users WHERE email = ?', (email,))
    row = cursor.fetchone()
    conn.close()

    if not row or not check_password_hash(row['password_hash'], password):
        return jsonify({'error': 'Invalid email address or password.'}), 401

    return jsonify({
        'message': 'Login successful!',
        'user': {
            'id': row['id'],
            'name': row['name'],
            'email': row['email'],
            'phone': row['phone'],
            'address': row['address'],
            'role': row['role']
        }
    })

# Products: Get All
@app.route('/api/products', methods=['GET'])
def get_products():
    category = request.args.get('category', '').strip()
    search = request.args.get('search', '').strip()

    conn = get_db()
    cursor = conn.cursor()
    query = 'SELECT * FROM products WHERE is_active = 1'
    params = []

    if category and category != 'All':
        query += ' AND category = ?'
        params.append(category)

    if search:
        query += ' AND (name LIKE ? OR description LIKE ?)'
        params.append(f'%{search}%')
        params.append(f'%{search}%')

    query += ' ORDER BY id DESC'
    cursor.execute(query, params)
    rows = cursor.fetchall()
    conn.close()

    products = [dict(r) for r in rows]
    return jsonify(products)

# Products: Add New (Admin)
@app.route('/api/products', methods=['POST'])
def add_product():
    data = request.get_json() or {}
    name = data.get('name', '').strip()
    category = data.get('category', 'Cakes').strip()
    price = data.get('price', 0)
    description = data.get('description', '').strip()
    image_url = data.get('image_url', '').strip()
    stock = data.get('stock', 100)

    if not name or not price:
        return jsonify({'error': 'Product Name and Price are required.'}), 400

    if not image_url:
        image_url = 'https://images.unsplash.com/photo-1509440159596-0249088772ff?auto=format&fit=crop&w=800&q=80'

    conn = get_db()
    cursor = conn.cursor()
    cursor.execute('''
        INSERT INTO products (name, category, price, description, image_url, stock)
        VALUES (?, ?, ?, ?, ?, ?)
    ''', (name, category, float(price), description, image_url, int(stock)))
    conn.commit()
    product_id = cursor.lastrowid
    conn.close()

    return jsonify({
        'message': 'Product added successfully!',
        'product_id': product_id
    }), 201

# Products: Edit Product (Admin)
@app.route('/api/products/<int:prod_id>', methods=['PUT'])
def edit_product(prod_id):
    data = request.get_json() or {}
    name = data.get('name', '').strip()
    category = data.get('category', '').strip()
    price = data.get('price')
    description = data.get('description', '').strip()
    image_url = data.get('image_url', '').strip()
    stock = data.get('stock')

    conn = get_db()
    cursor = conn.cursor()
    cursor.execute('SELECT * FROM products WHERE id = ?', (prod_id,))
    if not cursor.fetchone():
        conn.close()
        return jsonify({'error': 'Product not found.'}), 404

    cursor.execute('''
        UPDATE products
        SET name = COALESCE(?, name),
            category = COALESCE(?, category),
            price = COALESCE(?, price),
            description = COALESCE(?, description),
            image_url = COALESCE(?, image_url),
            stock = COALESCE(?, stock)
        WHERE id = ?
    ''', (name if name else None, category if category else None,
          float(price) if price is not None else None,
          description if description else None,
          image_url if image_url else None,
          int(stock) if stock is not None else None,
          prod_id))
    conn.commit()
    conn.close()

    return jsonify({'message': 'Product updated successfully!'})

# Products: Delete Product (Admin)
@app.route('/api/products/<int:prod_id>', methods=['DELETE'])
def delete_product(prod_id):
    conn = get_db()
    cursor = conn.cursor()
    cursor.execute('UPDATE products SET is_active = 0 WHERE id = ?', (prod_id,))
    conn.commit()
    conn.close()
    return jsonify({'message': 'Product deleted successfully.'})

# Image Upload (Admin / Product Form)
@app.route('/api/upload', methods=['POST'])
def upload_image():
    if 'image' not in request.files:
        return jsonify({'error': 'No image file uploaded.'}), 400
    file = request.files['image']
    if file.filename == '':
        return jsonify({'error': 'Empty filename.'}), 400

    filename = secure_filename(f"{uuid.uuid4().hex[:8]}_{file.filename}")
    filepath = os.path.join(app.config['UPLOAD_FOLDER'], filename)
    file.save(filepath)

    image_url = f"/static/uploads/{filename}"
    return jsonify({'image_url': image_url})

# Orders: Place New Order (Customer)
@app.route('/api/orders', methods=['POST'])
def place_order():
    data = request.get_json() or {}
    items = data.get('items', [])
    customer_name = data.get('customer_name', '').strip()
    customer_email = data.get('customer_email', '').strip()
    customer_phone = data.get('customer_phone', '').strip()
    delivery_address = data.get('delivery_address', '').strip()
    payment_method = data.get('payment_method', 'Pay on Delivery').strip()
    notes = data.get('notes', '').strip()
    user_id = data.get('user_id')

    if not items or not customer_name or not customer_phone or not delivery_address:
        return jsonify({'error': 'Cart is empty or delivery details are missing.'}), 400

    # Calculate total and verify items
    conn = get_db()
    cursor = conn.cursor()

    total_amount = 0
    order_items_prepared = []

    for item in items:
        prod_id = item.get('id')
        qty = int(item.get('quantity', 1))
        cursor.execute('SELECT * FROM products WHERE id = ? AND is_active = 1', (prod_id,))
        p = cursor.fetchone()
        if p:
            unit_price = p['price']
            subtotal = unit_price * qty
            total_amount += subtotal
            order_items_prepared.append({
                'product_id': p['id'],
                'product_name': p['name'],
                'unit_price': unit_price,
                'quantity': qty,
                'subtotal': subtotal
            })

    order_ref = f"POGA-{uuid.uuid4().hex[:6].upper()}"

    cursor.execute('''
        INSERT INTO orders (order_ref, user_id, customer_name, customer_email, customer_phone, delivery_address, total_amount, payment_method, status, notes)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'Pending', ?)
    ''', (order_ref, user_id, customer_name, customer_email, customer_phone, delivery_address, total_amount, payment_method, notes))

    order_id = cursor.lastrowid

    for oi in order_items_prepared:
        cursor.execute('''
            INSERT INTO order_items (order_id, product_id, product_name, unit_price, quantity, subtotal)
            VALUES (?, ?, ?, ?, ?, ?)
        ''', (order_id, oi['product_id'], oi['product_name'], oi['unit_price'], oi['quantity'], oi['subtotal']))

    conn.commit()
    conn.close()

    return jsonify({
        'message': 'Order placed successfully!',
        'order_ref': order_ref,
        'order_id': order_id,
        'total_amount': total_amount
    }), 201

# Orders: Get Orders (Customer by user_id or email, or All for Admin)
@app.route('/api/orders', methods=['GET'])
def get_orders():
    user_id = request.args.get('user_id')
    email = request.args.get('email')
    is_admin = request.args.get('admin', 'false').lower() == 'true'

    conn = get_db()
    cursor = conn.cursor()

    if is_admin:
        cursor.execute('SELECT * FROM orders ORDER BY id DESC')
    elif user_id:
        cursor.execute('SELECT * FROM orders WHERE user_id = ? ORDER BY id DESC', (user_id,))
    elif email:
        cursor.execute('SELECT * FROM orders WHERE customer_email = ? ORDER BY id DESC', (email,))
    else:
        conn.close()
        return jsonify([])

    orders_rows = cursor.fetchall()
    orders_list = []

    for o in orders_rows:
        order_dict = dict(o)
        cursor.execute('SELECT * FROM order_items WHERE order_id = ?', (o['id'],))
        items_rows = cursor.fetchall()
        order_dict['items'] = [dict(i) for i in items_rows]
        orders_list.append(order_dict)

    conn.close()
    return jsonify(orders_list)

# Orders: Update Status (Admin)
@app.route('/api/orders/<int:order_id>/status', methods=['PATCH'])
def update_order_status(order_id):
    data = request.get_json() or {}
    new_status = data.get('status', '').strip()

    if not new_status:
        return jsonify({'error': 'Status is required.'}), 400

    conn = get_db()
    cursor = conn.cursor()
    cursor.execute('UPDATE orders SET status = ? WHERE id = ?', (new_status, order_id))
    conn.commit()
    conn.close()

    return jsonify({'message': f'Order status updated to {new_status}'})

# Admin Dashboard Stats
@app.route('/api/admin/stats', methods=['GET'])
def get_admin_stats():
    conn = get_db()
    cursor = conn.cursor()

    cursor.execute('SELECT COUNT(*) as count FROM orders')
    total_orders = cursor.fetchone()['count']

    cursor.execute("SELECT COUNT(*) as count FROM orders WHERE status = 'Pending'")
    pending_orders = cursor.fetchone()['count']

    cursor.execute('SELECT SUM(total_amount) as total FROM orders WHERE status != "Cancelled"')
    res = cursor.fetchone()
    total_revenue = res['total'] if res and res['total'] else 0.0

    cursor.execute('SELECT COUNT(*) as count FROM products WHERE is_active = 1')
    total_products = cursor.fetchone()['count']

    conn.close()

    return jsonify({
        'total_orders': total_orders,
        'pending_orders': pending_orders,
        'total_revenue': total_revenue,
        'total_products': total_products
    })

if __name__ == '__main__':
    print("Starting Poga Cakes and Pastries Server on http://localhost:5000")
    app.run(host='0.0.0.0', port=5000, debug=True)
