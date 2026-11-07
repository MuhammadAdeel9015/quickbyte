# QuickBite Central Backend

Frontend-independent REST API for the customer web application, rider app, and admin portal. The API supports the existing Supabase PostgreSQL schema through a server-only service-role client. Local development and automated tests use seeded in-memory data by default.

## Requirements and run

- Node.js 20 or newer
- npm

From this directory:

```powershell
npm.cmd install
Copy-Item .env.example .env
npm.cmd test
npm.cmd start
```

The API listens on `http://localhost:4000` by default. `GET /health` reports whether the process is responding and which repository is selected. Set `PORT`, `JWT_SECRET`, `JWT_EXPIRES_IN`, `CORS_ORIGINS`, and `DATA_PROVIDER` in `.env` as needed. `JWT_SECRET` must be at least 32 characters in production. Never use the development fallback secret in production.

Local development uses the in-memory repository by default. To use Supabase locally, set `DATA_PROVIDER=supabase` and configure `SUPABASE_URL` and `SUPABASE_SECRET_KEY` in the backend `.env` file. The secret key is server-only; never put it in browser code, Flutter apps, source control, or API responses.

For browser clients, list allowed origins as comma-separated URLs in `CORS_ORIGINS`. An empty list permits all origins for local development; set an explicit allowlist for deployment.

## Demo accounts

| Account | Email | Password |
|---|---|---|
| Customer | `olivia.bennett@email.test` | `CustomerDemo123` |
| Rider | `daniel.brooks@quickbite.test` | `RiderDemo123` |
| Rider | `sofia.garcia@quickbite.test` | `RiderDemo123` |
| Super Admin | `admin@quickbite.test` | `QuickBiteAdmin123` |
| Manager | `chloe.n@email.test` | `ManagerDemo123` |

Seed and newly-created passwords are bcrypt-hashed. For development, send `Authorization: Bearer <token>` on protected requests. The logout endpoint is stateless: clients discard their token; JWT revocation is not implemented.

## API endpoints

All endpoints are prefixed with `/api`. Protected write/read resources require a valid bearer JWT, as well as the role/permission noted below. JSON endpoints return `{ "data": ... }`; errors return `{ "error": { "code", "message", "details" } }`.

### Authentication

| Method | Path | Access |
|---|---|---|
| POST | `/auth/customer/register` | Public |
| POST | `/auth/customer/login` | Public |
| POST | `/auth/rider/login` | Public |
| POST | `/auth/admin/login` | Public (admins and employees) |
| GET | `/auth/me` | Any authenticated user |
| POST | `/auth/logout` | Any authenticated user |

### Public menu

| Method | Path | Description |
|---|---|---|
| GET | `/menu` | List/search menu; optional `q`, `category`, and `available=true` query filters |
| GET | `/menu/categories` | Categories with available items |
| GET | `/menu/:id` | Menu item details |

### Customer (`customer`)

| Method | Path | Description |
|---|---|---|
| GET, PATCH | `/customers/me` | Read/update own profile |
| POST | `/customers/orders` | Create an order from available menu items |
| GET | `/customers/orders` | Own order history |
| GET | `/customers/orders/:id` | Own order details |
| GET | `/customers/orders/:id/tracking` | Own order status history and assigned rider contact |
| POST | `/customers/orders/:id/cancel` | Cancel own Pending or Confirmed order |
| GET | `/customers/feedback` | List own feedback |
| GET | `/customers/feedback/:feedbackId` | Read own feedback |
| POST | `/customers/orders/:id/feedback` | Submit one rating and comment for own delivered order |
| PATCH | `/customers/feedback/:feedbackId` | Update own feedback |
| DELETE | `/customers/feedback/:feedbackId` | Delete own feedback |

### Rider (`rider`)

| Method | Path | Description |
|---|---|---|
| GET, PATCH | `/rider/me` | Read/update own profile |
| PATCH | `/rider/availability` | Set Available or Off duty; cannot go off duty with an active delivery |
| GET | `/rider/orders/assigned` | Own active assignments |
| GET | `/rider/orders/history` | Own delivered orders |
| POST | `/rider/orders/:id/accept` | Accept an assigned order |
| POST | `/rider/orders/:id/reject` | Reject an assigned order and release availability |
| PATCH | `/rider/orders/:id/status` | Advance to Picked Up, On the Way, or Delivered |
| GET | `/rider/earnings` | Daily, weekly, monthly demo earnings and delivery totals |

### Admin and employees (`admin`/`employee`)

All admin endpoints also enforce the demo access role. Roles: Super Admin, Manager, Staff. `GET /admin/roles` returns each role's resource permissions; only Super Admin has access to role administration.

| Method | Path | Permission | Description |
|---|---|---|---|
| GET | `/admin/dashboard` | dashboard | Order/customer/rider/employee/revenue/stock summary |
| GET, POST | `/admin/customers` | customers | List or add customers |
| PATCH, DELETE | `/admin/customers/:id` | customers | Update or remove a customer |
| GET, POST | `/admin/riders` | riders | List or add riders |
| PATCH, DELETE | `/admin/riders/:id` | riders | Update or remove a rider |
| GET, POST | `/admin/employees` | employees | List or add employees |
| PATCH, DELETE | `/admin/employees/:id` | employees | Update or remove an employee |
| GET, POST | `/admin/employees/:id/shifts` | employees | List or schedule an employee shift |
| PATCH, DELETE | `/admin/employees/:id/shifts/:shiftId` | employees | Update or remove an employee shift |
| GET, POST | `/admin/employees/:id/attendance` | employees | List or record employee attendance |
| PATCH, DELETE | `/admin/employees/:id/attendance/:attendanceId` | employees | Update or remove an attendance record |
| GET | `/admin/roles` | roles | List demo roles and resource permissions |
| PATCH | `/admin/employees/:id/access-role` | roles | Assign an employee demo role |
| GET, POST | `/admin/menu` | menu | List or add menu items |
| PATCH, DELETE | `/admin/menu/:id` | menu | Update or remove a menu item |
| GET, POST | `/admin/inventory` | inventory | List or add stock items |
| PATCH, DELETE | `/admin/inventory/:id` | inventory | Update or remove a stock item |
| POST | `/admin/inventory/:id/adjust` | inventory | Apply `{ "quantityChange": integer }`; stock cannot go below zero |
| GET | `/admin/orders` | orders | List orders; optional `status` and `q` filters |
| GET | `/admin/orders/:id` | orders | Order details |
| POST | `/admin/orders/:id/assign` | orders | Assign `{ "riderId": "..." }` to a confirmed order |
| PATCH | `/admin/orders/:id/status` | orders | Admin confirmation or permitted cancellation |
| GET | `/admin/reports/sales?period=day\|week\|month` | reports | Revenue, order totals, average value, and item sales |
| GET, POST | `/admin/notifications` | notifications | List or create notifications |
| PATCH | `/admin/notifications/:id/read` | notifications | Mark a notification read |
| DELETE | `/admin/notifications/:id` | notifications | Remove a notification |

Customer registration and admin-created accounts validate input; order line prices are computed server-side and stored as snapshots. Employee records include job title, shift, status, and a `joined` date (defaulting to the current date for new records). Employees' and riders' passwords are hashed and not returned in API responses. Unknown fields are rejected on the main mutation schemas to prevent mass assignment.

Customer feedback is scoped to the authenticated customer and can only be created for that customer's delivered orders. The API prevents duplicate submissions for the same order within a running backend instance and also returns database uniqueness conflicts as HTTP 409. Employee shift and attendance endpoints are restricted to users with the employees permission; child records are always scoped to the employee in the URL. Employee profile PATCH accepts only fields supplied by the caller.

## Order workflow and safeguards

The workflow is `Pending → Confirmed → Assigned → Accepted → Picked Up → On the Way → Delivered`. Customers may cancel only Pending or Confirmed orders. Admins confirm Pending orders, assign only Confirmed orders, and may cancel permitted non-terminal orders. Assigned riders alone can accept/reject and advance their delivery. Rejected and Cancelled are terminal outcomes. Active delivery prevents assignment of the same rider to another order; unavailable/off-duty riders cannot be assigned. Rider availability returns to Available on delivery, rejection, or admin cancellation. Customer order routes enforce ownership; rider actions enforce assignment ownership.

Order tracking uses REST polling. Socket.IO was not needed for this phase.

## Data providers and architecture

`data/seed.js` initializes local demo records and hashed sample passwords. `data/memoryRepository.js` remains available for tests and local development; its changes reset on restart. `data/supabaseRepository.js` maps the existing profiles, menu categories/items, orders/items/status history, inventory items/transactions, feedback, employee shifts/attendance, and notifications tables to the existing repository contract.

For Vercel, configure the project root as this `backend` directory and set `NODE_ENV=production`, `JWT_SECRET`, `SUPABASE_URL`, `SUPABASE_SECRET_KEY`, and an explicit `CORS_ORIGINS` allowlist in the Vercel project settings. `api/index.js` exports the Express app without starting an HTTP listener; `vercel.json` routes requests to that handler. Keep `server.js` for local development.

Order creation and status changes use the `quickbite_create_order_atomic` and `quickbite_update_order_atomic` Postgres functions to commit order, items, history, and confirmation-time inventory deductions in one database transaction. Install `supabase/migrations/20261107000100_atomic_orders_and_inventory.sql` in the Supabase SQL editor before deploying the backend update. This additive migration creates only the two RPC functions and their execution grants; it does not alter table definitions. The backend does not apply the migration automatically.

Inventory confirmation deducts recipe quantities from `inventory_items`, records each deduction in `inventory_transactions`, and locks the order and stock rows to prevent duplicate deduction and overselling on concurrent confirmations. Repeated confirmation of an already-confirmed order is idempotent. The schema stores an order's rider in one scalar `rider_id`; atomic order updates reject changing a non-null rider assignment to a different rider. Order contents are not editable through existing API routes, and the database RPC rejects attempts to change order content after confirmation.

## Tests and limitations

Run `npm.cmd test` for the Node built-in test runner and Supertest API tests. Tests cover registration/login, protected and role-restricted routes, menu retrieval, ownership, assignment guards, rider workflow and availability, sales periods, inventory, menu CRUD, notifications, validation, and safe account creation.

The Supabase RPC migration must be applied before using these atomic order operations; otherwise order creation and status updates through Supabase will fail explicitly. Automated tests cover the in-memory workflow and repository RPC payload/error handling; they do not execute the Postgres migration against the live project. There is no password reset, refresh/revocation mechanism, rate limiting, payment processing, or real-time push tracking. Do not expose demo credentials or the development secret in a deployed system.
