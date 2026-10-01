# Artsy Pisces — Premium Art Gallery & E-Commerce Portal

Artsy Pisces is a premium, interactive online art gallery and e-commerce web application. It features a curated gallery catalog, secure cart and checkout flows, seamless discount coupon campaigns, automated order status tracking, and a comprehensive Admin Dashboard.

---

## 🚀 Key Features

### 🎨 Guest & Customer Experience
* **Curated Gallery Catalog:** Sleek, glassmorphic layout highlighting original artworks, hover quotes, prices, and availability indicators.
* **Smart Shopping Cart:** Animated sidebar cart tracking items, prices, and quantities.
* **Secure Checkout Flow:** Supports Cash on Delivery (COD) and verified online payments.
* **Discount Coupons Panel:** Interactive checkout field to apply promo codes dynamically.
* **Order Status Tracker:** Sleek step-by-step progress visualizer tracking orders from Placement ➔ Confirmation ➔ Processing ➔ Dispatch ➔ Delivery.
* **Isolated Session Carts:** Cart items are tied to individual active user sessions and isolated completely.

### 🛠️ Admin Control Console
* **Real-time Metrics:** Displays gross revenue collected, sales count, and active artwork listings.
* **Artworks CRUD Manager:** Publish new listings (with image file upload to Cloudinary) and update details or availability status.
* **Promo Coupon Campaigns:** Create, toggle active status, set minimum orders, usage limits, and campaign expiration dates.
* **Orders Tracker Panel:** Table logs showing customer billing information, flat user details, and shipment status update dropdowns.

---

## 🛠️ Technology Stack

* **Frontend:** React, Vite, TypeScript, Tailwind CSS, Lucide icons, Radix UI, Framer Motion.
* **Backend:** Node.js, Express, PostgreSQL (`pg`), Multer + Multer Storage Cloudinary.
* **Database & Assets:** Supabase (managed PostgreSQL) and Cloudinary (image file hosting).
* **Payment Gateway:** Razorpay API (online payments & signature verification).

---

## 📁 Project Directory Structure

```text
artsy-pisces/
├── frontend/             # React (Vite) client application
│   ├── src/
│   │   ├── components/   # UI elements (GalleryHeader, UI buttons/inputs)
│   │   ├── contexts/     # Session context (AuthContext, CartContext)
│   │   ├── hooks/        # Custom react hooks (useToast)
│   │   ├── lib/          # API instance (axios wrapper)
│   │   └── pages/        # View Pages (Gallery, Checkout, Admin, user orders)
│   └── package.json
└── backend/              # Node.js (Express) server application
    ├── src/
    │   ├── lib/          # Connections (Cloudinary storage, Supabase pool)
    │   ├── middleware/   # Request interceptors (authenticate, adminOnly)
    │   └── routes/       # API endpoints (Auth, Artworks, Orders, Coupons, Payments)
    └── package.json
```

---

## ⚙️ Database Schema Setup

Create the following tables in your Supabase or local PostgreSQL database:

```sql
-- 1. Users Table
CREATE TABLE users (
    id SERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    email VARCHAR(255) UNIQUE NOT NULL,
    password VARCHAR(255) NOT NULL,
    role VARCHAR(50) DEFAULT 'user', -- 'user' or 'admin'
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Signup and password reset verification codes
CREATE TABLE otp_verifications (
    id SERIAL PRIMARY KEY,
    email VARCHAR(255) NOT NULL,
    otp VARCHAR(6) NOT NULL,
    expires_at TIMESTAMP NOT NULL,
    used BOOLEAN NOT NULL DEFAULT FALSE,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- 2. Artworks Table
CREATE TABLE artworks (
    id SERIAL PRIMARY KEY,
    title VARCHAR(255) NOT NULL,
    description TEXT,
    my_quote VARCHAR(255),
    category VARCHAR(100),
    price NUMERIC(10, 2) NOT NULL,
    image_url VARCHAR(500) NOT NULL,
    available BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 3. Coupons Table
CREATE TABLE coupons (
    id SERIAL PRIMARY KEY,
    code VARCHAR(100) UNIQUE NOT NULL,
    discount_type VARCHAR(50) NOT NULL, -- 'percent' or 'flat'
    discount_value NUMERIC(10, 2) NOT NULL,
    min_order_value NUMERIC(10, 2) DEFAULT 0,
    max_uses INT DEFAULT 100,
    used_count INT DEFAULT 0,
    expires_at TIMESTAMP,
    active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 4. Orders Table
CREATE TABLE orders (
    id SERIAL PRIMARY KEY,
    user_id INT REFERENCES users(id) ON DELETE CASCADE,
    items TEXT NOT NULL,         -- JSON string list of cart items
    address TEXT NOT NULL,       -- JSON string of shipping details
    payment_method VARCHAR(50) NOT NULL,  -- 'online' or 'cod'
    payment_status VARCHAR(50) DEFAULT 'pending', -- 'pending', 'paid', 'refunded'
    order_status VARCHAR(50) DEFAULT 'placed', -- 'placed', 'confirmed', 'processing', 'shipped', 'delivered', 'cancelled'
    coupon_code VARCHAR(100),
    total_amount NUMERIC(10, 2) NOT NULL,
    discount NUMERIC(10, 2) DEFAULT 0,
    final_amount NUMERIC(10, 2) NOT NULL,
    razorpay_order_id VARCHAR(255),
    razorpay_payment_id VARCHAR(255),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

---

## 🔧 Environment Configuration

### Backend Setup (`backend/.env`)
Create a `.env` file inside the `backend` folder:
```env
PORT=4000
DATABASE_URL=your_postgresql_connection_string
JWT_SECRET=your_jwt_signing_secret_key
CLIENT_ORIGIN=http://localhost:5173

# Razorpay credentials
RAZORPAY_KEY_ID=your_razorpay_key_id
RAZORPAY_KEY_SECRET=your_razorpay_key_secret

# Personal Email Delivery (Send OTP directly through your personal Gmail / SMTP)
# For Gmail: Use your Gmail address and 16-character App Password (from Google Account > Security > App Passwords)
EMAIL_SERVICE=gmail
EMAIL_USER=your_personal_email@gmail.com
EMAIL_PASS=your_16_char_app_password

# Or Standard SMTP:
# SMTP_HOST=smtp.gmail.com
# SMTP_PORT=587
# SMTP_USER=your_personal_email@gmail.com
# SMTP_PASSWORD=your_app_password

# Supabase Auto-Pause Prevention (Interval in hours)
SUPABASE_PING_INTERVAL_HOURS=12

# Cloudinary credentials
CLOUDINARY_CLOUD_NAME=your_cloudinary_cloud_name
CLOUDINARY_API_KEY=your_cloudinary_api_key
CLOUDINARY_API_SECRET=your_cloudinary_api_secret
```

### Frontend Setup (`frontend/.env`)
Create a `.env` file inside the `frontend` folder:
```env
VITE_API_URL=http://localhost:4000/api
```

---

## 🔐 2-Step OTP Verification Flow
Both **Login** and **Forgot Password** (as well as Signup) now use secure 2-step email verification:
1. **Login:** User enters email and password. Once credentials pass verification, a 6-digit OTP is automatically generated and delivered directly to the user's email via your configured personal email. The user enters the OTP to complete login and receive their JWT session token.
2. **Forgot Password:** User requests a password reset code to their email. After entering the 6-digit OTP and their new password, the account password is encrypted and updated.
3. **Resend OTP & Cooldown:** Built-in 60-second cooldown timer prevents abuse while allowing users to easily request a fresh code.
4. **Development Fallback:** In development mode without email credentials, the generated OTP is logged to the console and displayed in a handy UI badge for testing.

---

## 🛡️ Supabase Auto-Pause Prevention (Keep-Alive)
Supabase free tier automatically pauses inactive projects after 7 days without queries. This project includes **three automated solutions** to keep the project active:
1. **Built-in Backend Heartbeat:** Whenever the backend is running, `keepAlive.js` queries Supabase PostgreSQL every 12 hours (configurable via `SUPABASE_PING_INTERVAL_HOURS`), continuously resetting the inactivity timer.
2. **Public Keep-Alive Endpoint (`GET /api/keep-alive`):** Allows any free external monitor (e.g., [cron-job.org](https://cron-job.org) or UptimeRobot) to ping the backend and touch the database.
3. **GitHub Actions Cron Workflow (`.github/workflows/supabase-keepalive.yml`):** Runs every 2 days on GitHub's cloud completely free, querying Supabase directly so the database stays alive even if the backend server is temporarily offline.
4. **Manual Ping Script:** Run `npm run keep-alive` inside `backend/` anytime.

---

## 🏃 Run Locally

### 1. Start the Backend Server
```bash
cd backend
npm install
npm run dev
```

### 2. Start the Frontend Client
```bash
cd frontend
npm install
npm run dev
```
Open [http://localhost:5173](http://localhost:5173) in your browser.
