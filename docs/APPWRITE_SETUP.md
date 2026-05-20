# Appwrite Auth + Dashboard Setup

This project is now wired to Appwrite for:

- Email/password authentication (register, login, logout, current user)
- Session cookie handling on the app domain
- User profile + orders data for dashboard
- Role-based admin guard (`user` / `admin`)
- Route protection for dashboard, checkout, and admin pages

## 1) Step-by-step setup

1. Install and login to Appwrite CLI.
2. Initialize this project with Appwrite.
3. Create database and tables.
4. Add table columns and indexes.
5. Add env values to `.env.local`.
6. Run app with `npm run dev`.
7. Register from `/signup`, login from `/login`, and open `/dashboard`.

## 2) Appwrite CLI commands

Use Appwrite CLI `tables-db` commands (validated against CLI help).

```bash
# install + login + init
npm install -g appwrite-cli
appwrite login --endpoint "https://nyc.cloud.appwrite.io/v1"
appwrite init project

# set active client context (CI/non-interactive style)
appwrite client --endpoint "https://nyc.cloud.appwrite.io/v1" --projectId "69c69d1c0001317b3d6a"

# create database
appwrite tables-db create \
  --database-id "asher_store_db" \
  --name "Asher Store DB" \
  --enabled true

# create user_profiles table
appwrite tables-db create-table \
  --database-id "asher_store_db" \
  --table-id "user_profiles" \
  --name "User Profiles" \
  --row-security true \
  --enabled true

# user_profiles columns
appwrite tables-db create-string-column --database-id "asher_store_db" --table-id "user_profiles" --key "userId" --size 64 --required true
appwrite tables-db create-email-column --database-id "asher_store_db" --table-id "user_profiles" --key "email" --required true
appwrite tables-db create-string-column --database-id "asher_store_db" --table-id "user_profiles" --key "name" --size 128 --required true
appwrite tables-db create-string-column --database-id "asher_store_db" --table-id "user_profiles" --key "passwordHash" --size 255 --required true
appwrite tables-db create-enum-column --database-id "asher_store_db" --table-id "user_profiles" --key "role" --elements user admin --required true --xdefault user
appwrite tables-db create-string-column --database-id "asher_store_db" --table-id "user_profiles" --key "favoriteTeams" --size 64 --array true
appwrite tables-db create-string-column --database-id "asher_store_db" --table-id "user_profiles" --key "phone" --size 24
appwrite tables-db create-boolean-column --database-id "asher_store_db" --table-id "user_profiles" --key "newsletter" --required true --xdefault false

# user_profiles indexes
appwrite tables-db create-index --database-id "asher_store_db" --table-id "user_profiles" --key "idx_user_profiles_userId" --type unique --columns userId --orders ASC
appwrite tables-db create-index --database-id "asher_store_db" --table-id "user_profiles" --key "idx_user_profiles_email" --type key --columns email --orders ASC

# create orders table
appwrite tables-db create-table \
  --database-id "asher_store_db" \
  --table-id "orders" \
  --name "Orders" \
  --row-security true \
  --enabled true

# orders columns
appwrite tables-db create-string-column --database-id "asher_store_db" --table-id "orders" --key "userId" --size 64 --required true
appwrite tables-db create-email-column --database-id "asher_store_db" --table-id "orders" --key "userEmail" --required true
appwrite tables-db create-string-column --database-id "asher_store_db" --table-id "orders" --key "items" --size 65535 --required true
appwrite tables-db create-integer-column --database-id "asher_store_db" --table-id "orders" --key "total" --required true --min 1
appwrite tables-db create-string-column --database-id "asher_store_db" --table-id "orders" --key "currency" --size 8 --required true --xdefault INR
appwrite tables-db create-enum-column --database-id "asher_store_db" --table-id "orders" --key "paymentStatus" --elements created paid failed --required true --xdefault created
appwrite tables-db create-enum-column --database-id "asher_store_db" --table-id "orders" --key "shippingStatus" --elements processing packed shipped out_for_delivery delivered --required true --xdefault processing

# orders indexes
appwrite tables-db create-index --database-id "asher_store_db" --table-id "orders" --key "idx_orders_userId" --type key --columns userId --orders ASC
appwrite tables-db create-index --database-id "asher_store_db" --table-id "orders" --key "idx_orders_createdAt" --type key --columns "$createdAt" --orders DESC

# create products table
appwrite tables-db create-table \
  --database-id "asher_store_db" \
  --table-id "products" \
  --name "Products" \
  --row-security true \
  --enabled true

# products columns
appwrite tables-db create-string-column --database-id "asher_store_db" --table-id "products" --key "id" --size 96 --required true
appwrite tables-db create-string-column --database-id "asher_store_db" --table-id "products" --key "name" --size 255 --required true
appwrite tables-db create-string-column --database-id "asher_store_db" --table-id "products" --key "team" --size 96 --required true
appwrite tables-db create-string-column --database-id "asher_store_db" --table-id "products" --key "league" --size 96 --required true
appwrite tables-db create-integer-column --database-id "asher_store_db" --table-id "products" --key "price" --required true --min 1
appwrite tables-db create-string-column --database-id "asher_store_db" --table-id "products" --key "images" --size 4096 --array true --required true
appwrite tables-db create-enum-column --database-id "asher_store_db" --table-id "products" --key "version" --elements player fan --required true --xdefault fan
appwrite tables-db create-string-column --database-id "asher_store_db" --table-id "products" --key "sizes" --size 4 --array true --required true
appwrite tables-db create-string-column --database-id "asher_store_db" --table-id "products" --key "description" --size 4096 --required true
appwrite tables-db create-integer-column --database-id "asher_store_db" --table-id "products" --key "stock" --required true --min 0
appwrite tables-db create-float-column --database-id "asher_store_db" --table-id "products" --key "rating" --required true --min 1 --max 5
appwrite tables-db create-string-column --database-id "asher_store_db" --table-id "products" --key "tags" --size 64 --array true
appwrite tables-db create-boolean-column --database-id "asher_store_db" --table-id "products" --key "isCODAvailable" --required true --xdefault true
appwrite tables-db create-boolean-column --database-id "asher_store_db" --table-id "products" --key "isMatchPick" --required true --xdefault true
appwrite tables-db create-boolean-column --database-id "asher_store_db" --table-id "products" --key "isBestSeller" --required false --xdefault false
appwrite tables-db create-string-column --database-id "asher_store_db" --table-id "products" --key "reviews" --size 65535

# products indexes
appwrite tables-db create-index --database-id "asher_store_db" --table-id "products" --key "idx_products_id" --type unique --columns id --orders ASC
appwrite tables-db create-index --database-id "asher_store_db" --table-id "products" --key "idx_products_team" --type key --columns team --orders ASC
appwrite tables-db create-index --database-id "asher_store_db" --table-id "products" --key "idx_products_league" --type key --columns league --orders ASC
appwrite tables-db create-index --database-id "asher_store_db" --table-id "products" --key "idx_products_isBestSeller" --type key --columns isBestSeller --orders ASC

# optional: wishlists table
appwrite tables-db create-table \
  --database-id "asher_store_db" \
  --table-id "wishlists" \
  --name "Wishlists" \
  --row-security true \
  --enabled true

appwrite tables-db create-string-column --database-id "asher_store_db" --table-id "wishlists" --key "userId" --size 64 --required true
appwrite tables-db create-string-column --database-id "asher_store_db" --table-id "wishlists" --key "productIds" --size 64 --array true
appwrite tables-db create-index --database-id "asher_store_db" --table-id "wishlists" --key "idx_wishlists_userId" --type unique --columns userId --orders ASC
```

## 3) Database schema

| Table | Column | Type | Required | Notes |
|---|---|---|---|---|
| user_profiles | userId | string | yes | Appwrite account user id |
| user_profiles | email | email | yes | profile email |
| user_profiles | name | string | yes | display name |
| user_profiles | passwordHash | string | yes | bcrypt hash for JWT login |
| user_profiles | role | enum(user/admin) | yes | RBAC role |
| user_profiles | favoriteTeams | string[] | no | personalization |
| user_profiles | phone | string | no | optional phone |
| user_profiles | newsletter | boolean | yes | marketing opt-in |
| orders | userId | string | yes | owner user id |
| orders | userEmail | email | yes | owner email |
| orders | items | string | yes | JSON stringified line items |
| orders | total | integer | yes | order total |
| orders | currency | string | yes | default INR |
| orders | paymentStatus | enum | yes | created/paid/failed |
| orders | shippingStatus | enum | yes | processing to delivered |
| products | id | string | yes | external product ID |
| products | name | string | yes | product title |
| products | team | string | yes | club/team |
| products | league | string | yes | competition |
| products | price | integer | yes | product price |
| products | images | string[] | yes | image URLs |
| products | version | enum(player/fan) | yes | jersey version |
| products | sizes | string[] | yes | available sizes |
| products | description | string | yes | product description |
| products | stock | integer | yes | inventory quantity |
| products | rating | float | yes | public rating |
| products | tags | string[] | no | tags for filtering |
| products | isCODAvailable | boolean | yes | COD support flag |
| products | isMatchPick | boolean | yes | home page match pick / matchday deals flag |
| products | isBestSeller | boolean | no | home page best sellers flag |
| products | reviews | string | no | JSON stringified review list |
| wishlists (optional) | userId | string | yes | owner user id |
| wishlists (optional) | productIds | string[] | no | saved product ids |

## 4) Permissions model

- `user_profiles`: document-level permissions include user read/update/delete and admin read/update.
- `orders`: document-level permissions include user read, admin read/update/delete.
- `wishlists`: user read/update/delete, admin read.

## 5) Backend API structure

- `POST /api/auth/register` -> create account + profile + session cookie
- `POST /api/auth/login` -> create session cookie
- `POST /api/auth/logout` -> delete current session + clear cookie
- `GET /api/auth/me` -> return authenticated user + role
- `GET /api/orders` -> list authenticated user orders
- `POST /api/orders` -> create authenticated user order
- `GET /api/products` -> list catalog products
- `GET /api/products/:id` -> get one product
- `GET /api/admin/products` -> admin catalog list
- `POST /api/admin/products` -> admin create product
- `PATCH /api/admin/products/:id` -> admin update product
- `DELETE /api/admin/products/:id` -> admin delete product

## 6) Frontend routes

- `/signup` -> account creation form
- `/login` -> login form
- `/dashboard` -> protected profile + orders + logout
- `src/proxy.ts` -> route guard for `/dashboard`, `/checkout`, `/admin`

## 7) Role-based access

- Profile includes `role` as `user` or `admin`.
- Admin APIs are guarded by `assertAdminAccess()`.
- Admin page verifies `/api/auth/me` and redirects non-admin users.

## 8) Production best practices

- Keep `APPWRITE_API_KEY` server-side only.
- Use HTTPS and secure cookies in production.
- Keep row-level permissions enabled (`--row-security true`).
- Use unique indexes on identity fields (`userId`).
- Validate all payloads with `zod` before writes.
- Restrict admin APIs by role on the server side.

## 9) Creating a separate admin user

- Set `ADMIN_EMAILS` in your `.env.local` (or deployment env) as a comma-separated allowlist, for example: `ADMIN_EMAILS=admin@yourdomain.com,ops@yourdomain.com`.
- Register a new account using one of those emails from `/signup`.
- The account is created with role `admin`, and `assertAdminAccess()` grants admin API permissions.
- Existing profiles using an allowlisted email are also treated as `admin` after login.
