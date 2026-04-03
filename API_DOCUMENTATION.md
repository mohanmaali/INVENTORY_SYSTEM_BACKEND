# API Documentation

Notes:
- All protected endpoints require `Authorization: Bearer <token>` header.
- Permissions use `authorize(module, action)` middleware. Examples below show required module/action.
- ID format: MongoDB ObjectId (24 hex chars).

---

## Auth

### POST /api/auth/register
- Description: Register a new user
- Body (JSON):
  - `name` (string, required)
  - `email` (string, required)
  - `password` (string, required)
  - optional other profile fields (avatar)
- Response 201:
  - `user` object (public fields)
  - `token` (JWT)
- Errors: 409 if email exists, 400 for validation

### POST /api/auth/login
- Description: Authenticate and receive token
- Body (JSON):
  - `email` (string, required)
  - `password` (string, required)
- Response 200:
  - `user` object (public fields)
  - `token` (JWT)
- Errors: 401 invalid credentials, 401 account deactivated

### GET /api/auth/profile
- Description: Get current user profile
- Auth: required
- Response 200: `user` public profile
- Errors: 401 if unauthenticated, 404 if user removed

---

## Users
Base path: `/api/users`

All user routes require authentication. Permissions shown as `authorize(module, action)`.

### GET /api/users
- Description: List users (paginated)
- Query params: `page`, `limit`, `search`, `sort`, `fields`
- Auth: `authorize('users', 'read')`
- Response 200:
  - `meta`: { page, limit, total }
  - `data`: [ userPublic ]
  - Each user includes:
    - `roleId`: ObjectId or `null`
    - `role`: populated role object or `null`
- Example user object:
```json
{
  "_id": "660d2f1f4f1a2b3c4d5e6f70",
  "name": "John Doe",
  "email": "john@example.com",
  "roleId": "660d2a1f4f1a2b3c4d5e6f60",
  "role": {
    "_id": "660d2a1f4f1a2b3c4d5e6f60",
    "name": "Admin",
    "description": "System administrator",
    "permissions": [
      {
        "module": "users",
        "actions": ["create", "read", "update", "delete"]
      }
    ]
  }
}
```

### GET /api/users/:id
- Description: Get user by id
- Auth: `authorize('users', 'read')`
- Response 200: user public object
- Errors: 404 if not found

### PUT /api/users/:id
- Description: Update user (admin or permitted role)
- Auth: `authorize('users', 'update')`
- Body: allowed fields: `name`, `email`, `isActive`, `avatar`
- Response 200: updated user public object

### DELETE /api/users/:id
- Description: Delete user
- Auth: `authorize('users', 'delete')`
- Response 204: no content

### PATCH /api/users/:id/role
- Description: Assign/change user's role
- Auth: `authorize('users', 'update')` (requires roles management permission in practice)
- Body (JSON):
  - `roleId` (string ObjectId, required)
- Response 200: updated user public object (new `roleId` set)
- Errors: 400 invalid roleId, 404 role not found

---

## Roles
Base path: `/api/roles`

All role-management routes require authentication and the appropriate `roles` permissions.

### POST /api/roles
- Description: Create a new role
- Auth: `authorize('roles', 'create')`
- Body (JSON):
  - `name` (string, required)
  - `description` (string, optional)
  - `permissions` (array of objects)
    - each permission: `{ module: string, actions: [ 'create'|'read'|'update'|'delete' ] }
- Response 201: created role object
- Errors: 409 duplicate name, 400 validation

### GET /api/roles
- Description: List roles
- Auth: `authorize('roles', 'read')`
- Response 200: `[ role ]`

### GET /api/roles/:id
- Description: Get specific role
- Auth: `authorize('roles', 'read')`
- Response 200: role object

### PATCH /api/roles/:id
- Description: Update role
- Auth: `authorize('roles', 'update')`
- Body: any updatable fields (name, description, permissions)
- Response 200: updated role object

### DELETE /api/roles/:id
- Description: Delete role
- Auth: `authorize('roles', 'delete')`
- Response 204: no content
- Note: Deleting a role will not automatically reassign users — handle carefully.

---

## Suppliers
Base path: `/api/suppliers`

All supplier routes require authentication and the appropriate `suppliers` permissions.

### GET /api/suppliers
- Description: List suppliers with pagination and search/filter support
- Auth: `authorize('suppliers', 'read')`
- Query params: `page`, `limit`, `sort`, `search`, `name`, `contact`
- Response 200:
  - `meta`: { page, limit, total }
  - `data`: [ supplier ]

### GET /api/suppliers/:id
- Description: Get supplier by id
- Auth: `authorize('suppliers', 'read')`
- Response 200: supplier object
- Errors: 404 if not found

### POST /api/suppliers
- Description: Create supplier
- Auth: `authorize('suppliers', 'create')`
- Body (JSON):
  - `name` (string, required)
  - `contact` (string, required)
  - `email` (string, required)
  - `address` (string, required)
- Response 201: created supplier object
- Errors: 409 if supplier already exists, 422 for validation

### PUT /api/suppliers/:id
- Description: Update supplier details
- Auth: `authorize('suppliers', 'update')`
- Body (JSON):
  - `name` (string, optional)
  - `contact` (string, optional)
  - `email` (string, optional)
  - `address` (string, optional)
- Response 200: updated supplier object
- Errors: 404 if not found, 422 for validation

### DELETE /api/suppliers/:id
- Description: Delete supplier
- Auth: `authorize('suppliers', 'delete')`
- Response 204: no content
- Errors: 404 if not found

Example supplier object:
```json
{
  "_id": "660d2f1f4f1a2b3c4d5e6f70",
  "name": "Global Traders",
  "contact": "+91 9876543210",
  "email": "global@example.com",
  "address": "123 Market Road, Pune",
  "createdAt": "2026-04-02T10:00:00.000Z",
  "updatedAt": "2026-04-02T10:00:00.000Z"
}
```

---

## Customers
Base path: `/api/customers`

All customer routes require authentication and the appropriate `customers` permissions.

### POST /api/customers
- Description: Create customer
- Auth: `authorize('customers', 'create')`
- Extra rule: only `Admin` or `Manager` can create customers
- Body (JSON):
  - `name` (string, required)
  - `type` (`individual` | `business`, required)
  - `email` (string, optional, unique if provided)
  - `phone` (string, required)
  - `address` (object, optional)
    - `street`, `city`, `state`, `zipCode`, `country`
  - `companyName` (string, optional)
  - `taxId` (string, optional)
  - `creditLimit` (number, optional, default `0`)
  - `status` (`active` | `inactive` | `blacklisted`, optional)
  - `notes` (string, optional)
- Response 201: created customer
- Notes:
  - `customerCode` is auto-generated like `CUST-0001`
  - customer has no login and no password

### GET /api/customers
- Description: List customers with pagination, search, and filters
- Auth: `authorize('customers', 'read')`
- Query params:
  - `page`, `limit`
  - `search` (matches `name`, `phone`, `email`, `customerCode`)
  - `type`
  - `status`
- Response 200:
  - `meta`: pagination details
  - `data`: [ customer ]

### GET /api/customers/:id
- Description: Get customer profile
- Auth: `authorize('customers', 'read')`
- Response 200: customer object

### PATCH /api/customers/:id
- Description: Update customer profile
- Auth: `authorize('customers', 'update')`
- Rules:
  - `customerCode` cannot be changed
  - `outstandingBalance` cannot be changed directly
  - only `Admin` can set status to `blacklisted` or reactivate a blacklisted customer
- Response 200: updated customer

### DELETE /api/customers/:id
- Description: Soft delete customer
- Auth: `authorize('customers', 'delete')`
- Response 204: no content
- Rules:
  - sets `status = inactive`
  - blocked if customer has open sale orders with status `pending` or `processing`

### DELETE /api/customers/:id/permanent
- Description: Permanently delete customer
- Auth: `authorize('customers', 'delete')`
- Response 204: no content
- Rules:
  - allowed only when customer has no order history
  - removes customer document from MongoDB

### GET /api/customers/:id/orders
- Description: Get paginated sales order history for a customer
- Auth: `authorize('customers', 'read')`
- Query params:
  - `page`, `limit`
  - `status`
  - `fromDate`
  - `toDate`
- Response 200:
  - `data.orders`: paginated sale orders
  - `data.summary.totalOrders`
  - `data.summary.totalSpend`
  - `meta`: pagination details

### GET /api/customers/:id/summary
- Description: Customer dashboard stats
- Auth: `authorize('customers', 'read')`
- Response 200:
  - `totalOrders`
  - `totalSpend`
  - `outstandingBalance`
  - `lastOrderDate`
  - `mostPurchasedProduct`

Example customer object:
```json
{
  "_id": "660d2f1f4f1a2b3c4d5e6f55",
  "customerCode": "CUST-0001",
  "name": "Acme Retail",
  "type": "business",
  "email": "buyer@acme.com",
  "phone": "+91 9999999999",
  "address": {
    "street": "123 Market Road",
    "city": "Pune",
    "state": "Maharashtra",
    "zipCode": "411001",
    "country": "India"
  },
  "companyName": "Acme Retail Pvt Ltd",
  "taxId": "GSTIN123456",
  "creditLimit": 100000,
  "outstandingBalance": 25000,
  "status": "active",
  "notes": "Priority wholesale buyer",
  "createdAt": "2026-04-03T10:00:00.000Z",
  "updatedAt": "2026-04-03T10:00:00.000Z"
}
```

---

## Orders
Base path: `/api/orders`

All order routes require authentication and the appropriate `orders` permissions.

### GET /api/orders
- Description: List orders with pagination and filters
- Auth: `authorize('orders', 'read')`
- Query params:
  - `page` (integer, default 1)
  - `limit` (integer, default 20, max 100)
  - `type` (`purchase` | `sale`)
  - `status` (`pending` | `confirmed` | `processing` | `completed` | `cancelled`)
  - `supplier` (ObjectId)
  - `fromDate` (ISO date)
  - `toDate` (ISO date)
- Notes:
  - uses aggregation for enriched order reads
  - timeline history is excluded from the list response for lighter payloads
- Response 200:
  - `meta`: { page, limit, total, totalPages, hasNextPage, hasPrevPage, nextPage, prevPage }
  - `data`: [ order ]

### GET /api/orders/:id
- Description: Get one order with full details
- Auth: `authorize('orders', 'read')`
- Notes:
  - uses aggregation
  - returns populated `supplier`, `createdBy`, `items.product`, and `statusHistory.changedBy`
- Response 200: order object

### GET /api/orders/:id/timeline
- Description: Get order status timeline
- Auth: `authorize('orders', 'read')`
- Response 200:
  - `data.orderId`
  - `data.orderNumber`
  - `data.type`
  - `data.status`
  - `data.timeline`: [ status change entries ]

### GET /api/orders/summary
- Description: Dashboard summary grouped by order type and status
- Auth: `authorize('orders', 'read')`
- Query params:
  - `type` (`purchase` | `sale`, optional)
  - `status` (optional)
  - `supplier` (ObjectId, optional)
  - `fromDate` (ISO date, optional)
  - `toDate` (ISO date, optional)
- Response 200:
  - `data.summary`: grouped rows from aggregation
  - `data.grouped.purchase`
  - `data.grouped.sale`

### POST /api/orders
- Description: Create purchase or sale order
- Auth: `authorize('orders', 'create')`
- Body (JSON):
  - `type` (`purchase` | `sale`, required)
  - `items` (array, min 1, required)
    - `product` (ObjectId, required)
    - `quantity` (integer >= 1, required)
    - `unitPrice` (number >= 0, optional; defaults to current product price and then stored as snapshot)
  - `supplier` (ObjectId, required for purchase)
  - `customerId` (ObjectId, required for sale)
  - `note` (string, optional)
- Behavior:
  - validates every product exists and is `active`
  - validates sale customer before order creation
  - blocks sale order creation if customer is `blacklisted`
  - blocks sale order creation if customer credit limit would be exceeded
  - snapshots `unitPrice` and stores `subtotal` for each line item
  - computes and stores `totalAmount`
  - sets initial `status = pending`
  - sale order creation deducts stock immediately
  - sale orders store `customerId` and order reads populate `customerRecord`
  - purchase order creation does not change stock until status becomes `confirmed`
  - all line-item stock updates run inside a MongoDB transaction
- Response 201: created order
- Errors:
  - 400 invalid input or insufficient stock
  - 404 supplier or product not found
  - 409 order number conflict retry failure

Example create sale order:
```json
{
  "type": "sale",
  "customerId": "660d2f1f4f1a2b3c4d5e6f55",
  "items": [
    {
      "product": "660d2f1f4f1a2b3c4d5e6f80",
      "quantity": 2
    }
  ],
  "note": "Urgent dispatch"
}
```

### PATCH /api/orders/:id
- Description: Update a pending order
- Auth: `authorize('orders', 'update')`
- Rules:
  - only orders with `status = pending` can be updated
  - `type`, `status`, `orderNumber`, and `createdBy` cannot be changed
  - update only fields you need: `items`, `supplier`, `customerId`, `note`
- Body (JSON):
  - `items` (array, optional, min 1)
  - `supplier` (ObjectId, optional, purchase orders only)
  - `customerId` (ObjectId, optional, sale orders only)
  - `note` (string, optional)
- Stock behavior:
  - pending purchase order: updates order details only, no stock moved yet
  - pending sale order: old reserved stock is restored first, then new item stock is deducted inside the same transaction
  - if any new item fails stock validation, the full update rolls back
- Response 200: updated order
- Errors:
  - 409 if order is not pending
  - 400 if updated sale items do not have enough stock

### PATCH /api/orders/:id/status
- Description: Update order status with transition validation
- Auth: `authorize('orders', 'update')`
- Body (JSON):
  - `status` (`confirmed` | `processing` | `completed` | `cancelled`, required)
  - `note` (string, optional)
- Allowed transitions:
  - purchase: `pending -> confirmed -> completed`
  - purchase cancel: from `pending` or `confirmed`
  - sale: `pending -> confirmed -> processing -> completed`
  - sale cancel: from `pending` or `confirmed`
- Stock side effects:
  - purchase `confirmed`: stock restored for all items
  - sale `confirmed`: no stock change because stock already deducted at create time
  - sale `confirmed`: customer `outstandingBalance` increases by order total
  - `cancelled`: restores or reverses stock only if `stockMoved = true`
  - `cancelled`: if customer balance was already applied, outstanding balance is reduced atomically
- Response 200: updated order
- Errors:
  - 409 invalid status transition

### DELETE /api/orders/:id
- Description: Soft cancel order using delete endpoint
- Auth: `authorize('orders', 'delete')`
- Response 204: no content
- Notes:
  - this does not permanently delete the order document from MongoDB
  - it updates the order status to `cancelled`
  - only pending orders can be cancelled from this endpoint
  - order timeline/history remains preserved
  - if stock was already moved, cancellation reverses it atomically inside the same transaction
  - sale orders restore reserved/deducted stock on cancel
  - pending purchase orders usually have no stock movement yet, so cancel only changes status

### DELETE /api/orders/:id/permanent
- Description: Permanently delete an order document
- Auth: `authorize('orders', 'delete')`
- Response 204: no content
- Rules:
  - only `pending` or `cancelled` orders can be permanently deleted
  - if stock is still marked as moved/reserved, it is reversed before deleting the order
  - this endpoint removes the order document from MongoDB
- Notes:
  - use this carefully because order history will be lost after deletion
  - for pending sale orders, reserved stock is restored before delete
  - for cancelled orders, stock usually has already been reversed

Example order object:
```json
{
  "_id": "660d2f1f4f1a2b3c4d5e6faa",
  "orderNumber": "SO-20260403-0001",
  "type": "sale",
  "status": "pending",
  "items": [
    {
      "quantity": 2,
      "unitPrice": 259900,
      "subtotal": 519800,
      "product": {
        "_id": "660d2f1f4f1a2b3c4d5e6f80",
        "name": "Bluetooth Scanner",
        "sku": "SKU-ABC123",
        "price": 259900,
        "quantity": 10,
        "status": "active",
        "supplier": "660d2f1f4f1a2b3c4d5e6f70"
      }
    }
  ],
  "customerId": "660d2f1f4f1a2b3c4d5e6f55",
  "customerRecord": {
    "_id": "660d2f1f4f1a2b3c4d5e6f55",
    "customerCode": "CUST-0001",
    "name": "Acme Retail",
    "status": "active",
    "outstandingBalance": 25000
  },
  "totalAmount": 519800,
  "note": "Urgent dispatch",
  "createdBy": {
    "_id": "660d2f1f4f1a2b3c4d5e6f10",
    "name": "Admin User",
    "email": "admin@example.com"
  },
  "stockMoved": true,
  "balanceApplied": false,
  "cancelledAt": null,
  "statusHistory": [
    {
      "status": "pending",
      "note": "Order created",
      "changedAt": "2026-04-03T08:00:00.000Z",
      "changedBy": {
        "_id": "660d2f1f4f1a2b3c4d5e6f10",
        "name": "Admin User",
        "email": "admin@example.com"
      }
    }
  ],
  "createdAt": "2026-04-03T08:00:00.000Z",
  "updatedAt": "2026-04-03T08:00:00.000Z"
}
```

---

## Products
Base path: `/api/products`

All product routes require authentication and the appropriate `products` permissions.

### POST /api/products
- Description: Create a product
- Auth: `authorize('products', 'create')`
- Body (JSON):
  - `name` (string, required)
  - `sku` (string, optional, auto-generated if omitted)
  - `price` (integer, required, stored in smallest currency unit)
  - `quantity` (integer, required)
  - `supplier` (string ObjectId, required)
  - `category` (string, required)
  - `unit` (string, optional)
  - `lowStockThreshold` (integer, optional, default 10)
  - `status` (`active` | `inactive` | `discontinued`, optional)
- Response 201: created product with populated supplier
- Errors: 400 invalid input, 404 supplier not found, 409 duplicate SKU or duplicate product name for supplier

### GET /api/products
- Description: List products with pagination, search, and filters
- Auth: `authorize('products', 'read')`
- Query params: `page`, `limit`, `sort`, `search`, `category`, `status`, `supplier`
- Search fields: `name`, `sku`
- Response 200:
  - `meta`: { page, limit, total }
  - `data`: [ product ]

### GET /api/products/:id
- Description: Get product by id with supplier populated
- Auth: `authorize('products', 'read')`
- Response 200: product object
- Errors: 404 if not found

### PATCH /api/products/:id
- Description: Partial product update
- Auth: `authorize('products', 'update')`
- Notes:
  - `sku` cannot be changed after creation
  - `quantity` cannot be changed from this endpoint
  - use stock endpoints for quantity changes
- Response 200: updated product object

### DELETE /api/products/:id
- Description: Soft delete product by marking status as `discontinued`
- Auth: `authorize('products', 'delete')`
- Response 204: no content

### DELETE /api/products/:id/permanent
- Description: Permanently delete product
- Auth: `authorize('products', 'delete')`
- Query params:
  - `deleteStockLogs` (`true` | `false`, optional, default `false`)
- Rules:
  - product quantity must be `0`
  - if stock history exists, request must include `?deleteStockLogs=true`
- Response 204: no content
- Errors:
  - 400 if quantity is greater than 0
  - 409 if stock history exists and `deleteStockLogs` is not enabled

### PATCH /api/products/:id/stock
- Description: Manually adjust product stock
- Auth: `authorize('products', 'update')`
- Body (JSON):
  - `type` (`restock` | `adjustment` | `return`, required)
  - `delta` (integer, required, non-zero)
  - `note` (string, optional)
- Response 200:
  - `data.product`: updated product object
  - `data.stockLog`: created stock log entry
- Errors:
  - 400 invalid delta or insufficient stock
  - 404 if product not found

### GET /api/products/:id/stock/history
- Description: Get paginated stock movement history for a product
- Auth: `authorize('products', 'read')`
- Query params: `page`, `limit`
- Response 200:
  - `meta`: { page, limit, total }
  - `data`: [ stockLog ]

Example product object:
```json
{
  "_id": "660d2f1f4f1a2b3c4d5e6f80",
  "name": "Bluetooth Scanner",
  "sku": "SKU-ABC123",
  "price": 259900,
  "quantity": 12,
  "category": "Electronics",
  "unit": "pcs",
  "lowStockThreshold": 10,
  "status": "active",
  "supplier": {
    "_id": "660d2f1f4f1a2b3c4d5e6f70",
    "name": "Global Traders",
    "contact": "+91 9876543210",
    "email": "global@example.com",
    "address": "123 Market Road, Pune"
  },
  "isLowStock": false,
  "createdAt": "2026-04-02T10:00:00.000Z",
  "updatedAt": "2026-04-02T10:05:00.000Z"
}
```

Example stock log object:
```json
{
  "_id": "660d2f1f4f1a2b3c4d5e6f90",
  "productId": "660d2f1f4f1a2b3c4d5e6f80",
  "type": "restock",
  "delta": 5,
  "quantityBefore": 7,
  "quantityAfter": 12,
  "note": "Manual correction",
  "performedBy": {
    "_id": "660d2f1f4f1a2b3c4d5e6f10",
    "name": "Admin User",
    "email": "admin@example.com"
  },
  "createdAt": "2026-04-02T10:05:00.000Z"
}
```

---

## Errors & Response formats
- Validation error: 400 with `{ success: false, code: 'VALIDATION_ERROR', message: '...' }`
- Authentication error: 401 with `{ success: false, code: 'INVALID_TOKEN', message: '...' }`
- Authorization error: 403 with `{ success: false, message: 'Access denied' }`
- Not found: 404 with `{ success: false, code: 'NOT_FOUND', message: '...' }`
- Conflict: 409 with `{ success: false, code: 'CONFLICT', message: '...' }`
- Stock error example: `{ success: false, code: 'STOCK_INSUFFICIENT', product: 'SKU-001', message: 'Insufficient stock for product SKU-001' }`
- Credit error example: `{ success: false, code: 'CREDIT_LIMIT_EXCEEDED', limit: 100000, outstanding: 90000, message: 'Customer credit limit exceeded' }`
- Blacklist error example: `{ success: false, code: 'CUSTOMER_BLACKLISTED', message: 'Customer is blacklisted and cannot place new orders' }`

## Notes for developers
- Permissions are evaluated at request time using the DB-backed `Role` documents and `req.user.roleId`. Role changes are effective immediately.
- Seeder behavior: default roles are inserted non-destructively; custom edits are preserved.
- When adding a new module, add the module key to roles' permission entries (e.g., `module: 'inventory'`) and assign actions.

---

## File
- This documentation: `API_DOCUMENTATION.md`
