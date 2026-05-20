# Jersey Ecommerce Website

A football jersey ecommerce storefront built with Next.js App Router, TypeScript, Tailwind CSS v4, Appwrite TablesDB, and Razorpay checkout. The app includes product discovery, personalized recommendations, size guidance, order history, admin tools, and protected auth flows.

## What It Does

- Browse jersey collections, matchday deals, and product detail pages.
- Sign up, log in, and manage a protected dashboard.
- Save wishlist items, favorite teams, and personalized preferences.
- Estimate jersey size from height and weight inputs.
- Create and verify Razorpay orders with server-side validation.
- Browse admin pages for catalog management, analytics, and uploads.
- Serve product images, fonts, and authenticated backend routes through Next.js route handlers.

## Tech Stack

- Frontend: Next.js 16.2.1 App Router, React 19, TypeScript, Tailwind CSS v4
- State: Zustand
- Animations and feedback: Framer Motion, react-hot-toast
- Validation: Zod
- Auth: Appwrite sessions plus an app JWT cookie
- Database: Appwrite TablesDB
- Payments: Razorpay order creation and payment verification
- Utilities: bcryptjs, jsonwebtoken, lucide-react, clsx

## Project Layout

```text
.
|-- appwrite.config.json
|-- docs/
|   `-- APPWRITE_SETUP.md
|-- scripts/
|   `-- seed.mjs
|-- src/
|   |-- app/
|   |   |-- about-us/
|   |   |-- admin/
|   |   |-- api/
|   |   |-- auth/
|   |   |-- cart/
|   |   |-- category/
|   |   |-- checkout/
|   |   |-- collections/
|   |   |-- contact-us/
|   |   |-- dashboard/
|   |   |-- login/
|   |   |-- matchday-deals/
|   |   |-- privacy-policy/
|   |   |-- products/
|   |   |-- return-policy/
|   |   |-- returns-exchange/
|   |   |-- shipping-cancellation-policy/
|   |   |-- signup/
|   |   |-- terms-and-conditions/
|   |   |-- globals.css
|   |   |-- layout.tsx
|   |   `-- page.tsx
|   |-- components/
|   |-- lib/
|   `-- store/
`-- README.md
```

## Getting Started

1. Install dependencies.

```bash
npm install
```

2. Create your local environment file.

```bash
New-Item .env.local -ItemType File
```

Then add the variables below to `.env.local`.

3. Start the app.

```bash
npm run dev
```

Open http://localhost:3000.

## Environment Variables

Minimum recommended configuration:

```env
APPWRITE_ENDPOINT=https://nyc.cloud.appwrite.io/v1
APPWRITE_PROJECT_ID=your_appwrite_project_id
APPWRITE_API_KEY=your_appwrite_api_key
APPWRITE_DATABASE_ID=asher_store_db
APPWRITE_COLLECTION_USERS_PROFILE_ID=user_profiles
APPWRITE_COLLECTION_ORDERS_ID=orders
APPWRITE_COLLECTION_PRODUCTS_ID=products
APPWRITE_COLLECTION_WISHLISTS_ID=wishlists
APPWRITE_COLLECTION_REVIEWS_ID=reviews
APPWRITE_COLLECTION_TEAMS_ID=teams
APPWRITE_PRODUCTS_BUCKET_ID=your_products_bucket_id
RAZORPAY_KEY_ID=your_razorpay_key_id
RAZORPAY_KEY_SECRET=your_razorpay_key_secret
JWT_SECRET=strong_random_secret
ADMIN_EMAILS=admin@yourdomain.com
```

Optional environment overrides are supported for separate development and production Appwrite projects:

```env
NEXT_PUBLIC_APPWRITE_ENDPOINT_DEVELOPMENT=https://nyc.cloud.appwrite.io/v1
NEXT_PUBLIC_APPWRITE_ENDPOINT_PRODUCTION=https://nyc.cloud.appwrite.io/v1
NEXT_PUBLIC_APPWRITE_PROJECT_ID_DEVELOPMENT=your_dev_project_id
NEXT_PUBLIC_APPWRITE_PROJECT_ID_PRODUCTION=your_prod_project_id
APPWRITE_ENDPOINT_DEVELOPMENT=https://nyc.cloud.appwrite.io/v1
APPWRITE_ENDPOINT_PRODUCTION=https://nyc.cloud.appwrite.io/v1
APPWRITE_PROJECT_ID_DEVELOPMENT=your_dev_project_id
APPWRITE_PROJECT_ID_PRODUCTION=your_prod_project_id
NEXT_PUBLIC_APPWRITE_PRODUCTS_BUCKET_ID=your_products_bucket_id
APPWRITE_BUCKET_ID=your_products_bucket_id
```

## Available Scripts

```bash
npm run dev     # Start the Next.js dev server
npm run build   # Build the production app
npm run start   # Start the production server
npm run lint    # Run ESLint
npm run seed    # Seed sample products into Appwrite
```

## Main Pages

- `/` Home
- `/about-us` About the store
- `/category` Category browsing
- `/collections` Featured collections
- `/contact-us` Contact page
- `/cart` Shopping cart
- `/checkout` Checkout flow
- `/checkout/success` Payment success screen
- `/checkout/failure` Payment failure screen
- `/dashboard` Auth-protected user dashboard
- `/login` Login page
- `/signup` Registration page
- `/products` Product listing and filters
- `/products/[id]` Product detail page
- `/admin` Admin overview
- `/privacy-policy`, `/terms-and-conditions`, `/return-policy`, `/returns-exchange`, `/shipping-cancellation-policy`
- `/matchday-deals` Promo landing page

## API Routes

Auth and session routes:

- `GET /api/auth/me`
- `POST /api/auth/login`
- `POST /api/auth/logout`
- `POST /api/auth/register`
- `GET /api/auth/oauth-callback`
- `POST /api/auth/oauth-sync`

Catalog and content routes:

- `GET /api/products`
- `GET /api/products/:id`
- `GET /api/products/:id/reviews`
- `POST /api/products/:id/reviews`
- `GET /api/images/:fileId`
- `GET /api/fonts/appwrite/*`
- `GET /api/teams`

Personalization and utility routes:

- `POST /api/recommendations`
- `POST /api/size`
- `POST /api/eta`
- `PATCH /api/profile/favorite-team`
- `GET /api/profile/wishlist`
- `PATCH /api/profile/wishlist`

Order and checkout routes:

- `POST /api/create-order`
- `POST /api/checkout`
- `POST /api/verify-payment`
- `POST /api/webhook`
- `GET /api/orders`
- `POST /api/orders`

Admin routes:

- `GET /api/admin/analytics`
- `GET /api/admin/orders`
- `PATCH /api/admin/orders/:id`
- `GET /api/admin/products`
- `POST /api/admin/products`
- `PATCH /api/admin/products/:id`
- `DELETE /api/admin/products/:id`
- `POST /api/admin/upload`

## Appwrite Setup

The repository includes [docs/APPWRITE_SETUP.md](docs/APPWRITE_SETUP.md) with the current tables, columns, and CLI commands. In short, the app expects these primary tables in the configured Appwrite database:

- `user_profiles` for users, roles, and preferences
- `orders` for user orders and payment state
- `products` for catalog data
- `wishlists` for saved items
- `reviews` and `teams` where your deployment uses them

If you are setting up Appwrite from scratch, follow the setup guide in [docs/APPWRITE_SETUP.md](docs/APPWRITE_SETUP.md) and then seed catalog data with `npm run seed`.

## Authentication and Access Control

- Register and login create Appwrite-authenticated sessions.
- The app also uses a signed JWT cookie named `asherstore-session` for app-side authorization.
- Dashboard, checkout, and admin routes are protected by the route guard in `src/proxy.ts`.
- Admin access is controlled with `ADMIN_EMAILS` or `APPWRITE_ADMIN_EMAILS`.

## Development Notes

- Product recommendation and size prediction are logic-based rather than model-backed.
- Product reads can fall back to local data when Appwrite configuration is incomplete in development.
- Keep `APPWRITE_API_KEY` server-side only.
- Keep `JWT_SECRET` strong and unique per environment.
- If your deployment uses a different Appwrite schema, update the relevant collection IDs in `.env.local` instead of hardcoding values.

## Seeding Data

Run the seed script after configuring Appwrite:

```bash
npm run seed
```

This inserts or updates sample products so the catalog is usable immediately in development.

## Need To Verify Setup

If something does not load correctly, the most common causes are missing Appwrite environment variables, an invalid `APPWRITE_API_KEY`, or collection IDs that do not match your Appwrite tables.
