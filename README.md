# Ayurvedic E-commerce Backend

Production-ready Node.js/Express API for an Ayurvedic storefront (ghee, honey, powders, oils, herbs) with JWT auth, Google OAuth, Razorpay payments, role-based admin, and modular MVC structure.

## Tech Stack
- Node.js + Express
- MongoDB + Mongoose
- JWT access/refresh tokens
- Google OAuth (passport-google-oauth20)
- Razorpay payments
- Joi validation
- Helmet, CORS, rate limiting, centralized errors

## Project Structure
```
src/
 ├── controllers/
 ├── models/
 ├── routes/
 ├── middleware/
 ├── services/
 ├── utils/
 ├── config/
 ├── validators/
 └── server.js
```

## Getting Started
1. Install dependencies
   ```bash
   npm install
   ```
2. Copy env and configure secrets
   ```bash
   cp .env.example .env
   # update Mongo URI, JWT secrets, Google + Razorpay keys
   ```
3. Run dev server
   ```bash
   npm run dev
   ```
   Server listens on `PORT` (default 4000).

## Core Environment Variables
- `MONGODB_URI` - Mongo connection string
- `JWT_ACCESS_SECRET`, `JWT_REFRESH_SECRET`, `JWT_ACCESS_EXPIRES`, `JWT_REFRESH_EXPIRES`
- `BCRYPT_SALT_ROUNDS`
- `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`, `GOOGLE_CALLBACK_URL`
- `RAZORPAY_KEY_ID`, `RAZORPAY_KEY_SECRET`
- `CORS_ORIGIN`, `RATE_LIMIT_WINDOW_MS`, `RATE_LIMIT_MAX`

## Key Endpoints (prefix `/api/v1`)
- **Auth**: `/auth/register`, `/auth/login`, `/auth/google`, `/auth/google/callback`, `/auth/refresh`, `/auth/logout`, `/auth/forgot-password`, `/auth/reset-password`
- **Users**: `/users/me` (GET/PUT), `/users/addresses` (POST), `/users/addresses/:addressId` (PUT/DELETE), `/users/orders` (GET), `/users/orders/:id`
- **Products**: `/products` (GET with pagination/filter), `/products/:slug` (GET), admin CRUD on `/products`
- **Categories**: `/categories` (GET) + admin CRUD
- **Cart**: `/cart` (GET/POST/PUT), `/cart/:productId` (DELETE)
- **Orders**: `/orders/cart` (create from cart), `/orders/buy-now` (single product), `/orders` (GET), `/orders/:id` (GET)
- **Payments**: `/payments/create-order`, `/payments/verify`
- **Admin**: `/admin/stats`, `/admin/users`, `/admin/users/:id/block`, `/admin/orders`, `/admin/products`, `/admin/categories`

Admin routes require `role=admin` in JWT. Attach `Authorization: Bearer <accessToken>` header for protected routes.

## Notes
- Password reset issues a short-lived token (demo: returned in response; wire to email provider in production).
- Cart prices use `priceSnapshot` to lock price at checkout time.
- Razorpay verification uses HMAC SHA256 on order/payment ids.

## Scripts
- `npm run dev` – nodemon watch mode
- `npm start` – production start
- `npm run lint` – ESLint (Standard config)

## Production Hardening Checklist
- Serve over HTTPS (proxy/load balancer)
- Configure trusted CORS origins
- Add logging/metrics (e.g., Winston/Datadog)
- Set secure cookies if adding sessions
- Rotate JWT and Razorpay secrets regularly
- Add integration tests before go-live
