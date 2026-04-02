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

## Orders (example module)
Base path: `/api/orders`

### GET /api/orders
- Description: List orders
- Auth: `authorize('orders', 'read')`
- Response 200: paginated list of orders

### GET /api/orders/:id
- Description: Get an order
- Auth: `authorize('orders', 'read')`
- Response 200: order object

### POST /api/orders
- Description: Create order
- Auth: `authorize('orders', 'create')`
- Body: order payload (depends on app models)
- Response 201: created order

### PUT /api/orders/:id
- Description: Update order
- Auth: `authorize('orders', 'update')`
- Response 200: updated order

### DELETE /api/orders/:id
- Description: Delete order
- Auth: `authorize('orders', 'delete')`
- Response 204: no content

---

## Errors & Response formats
- Validation error: 400 with `{ error: 'Validation error', details: {...} }`
- Authentication error: 401 with `{ error: 'Unauthenticated' }`
- Authorization error: 403 with `{ error: 'Access denied' }`
- Not found: 404 with `{ error: 'Not found' }`
- Conflict: 409 with `{ error: 'Conflict' }`

## Notes for developers
- Permissions are evaluated at request time using the DB-backed `Role` documents and `req.user.roleId`. Role changes are effective immediately.
- Seeder behavior: default roles are inserted non-destructively; custom edits are preserved.
- When adding a new module, add the module key to roles' permission entries (e.g., `module: 'inventory'`) and assign actions.

---

## File
- This documentation: `API_DOCUMENTATION.md`

