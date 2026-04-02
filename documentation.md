# Backend Project Structure

A production-ready Node.js + Express + MongoDB backend architecture.

---

## 📋 Project Overview

| Property | Value |
|----------|-------|
| **Project Name** | my-backend |
| **Version** | 1.0.0 |
| **Node.js Version** | >= 18.0.0 |
| **Module System** | ES Modules (`"type": "module"`) |
| **Package Manager** | npm |
| **License** | ISC |

---

## 🛠 Technology Stack

### Core Technologies
| Technology | Version | Purpose |
|------------|---------|---------|
| **Node.js** | >= 18.0.0 | Runtime environment |
| **Express** | ^4.18.2 | Web framework |
| **MongoDB** | - | Database |
| **Mongoose** | ^8.0.0 | ODM for MongoDB |

### Security & Authentication
| Package | Version | Purpose |
|---------|---------|---------|
| **jsonwebtoken** | ^9.0.2 | JWT token generation/verification |
| **bcryptjs** | ^2.4.3 | Password hashing |
| **helmet** | ^7.1.0 | HTTP security headers |
| **express-rate-limit** | ^7.1.5 | Rate limiting |

### Validation & Error Handling
| Package | Version | Purpose |
|---------|---------|---------|
| **joi** | ^17.11.0 | Request validation |

### Logging & Monitoring
| Package | Version | Purpose |
|---------|---------|---------|
| **winston** | ^3.11.0 | Logging framework |
| **morgan** | ^1.10.0 | HTTP request logging |

### Additional Tools
| Package | Version | Purpose |
|---------|---------|---------|
| **dotenv** | ^16.3.1 | Environment variables |
| **cors** | ^2.8.5 | Cross-origin resource sharing |
| **cookie-parser** | ^1.4.6 | Cookie parsing |

---

## 📁 Folder Structure

```
my-backend/
├── src/
│   ├── config/                  # Configuration files
│   │   ├── env.js               # Environment variables
│   │   ├── db.js                # Database connection
│   │   ├── constants.js         # App constants
│   │   └── logger.js            # Logging configuration
│   ├── controllers/             # Request handlers
│   │   ├── auth.controller.js  # Authentication logic
│   │   └── user.controller.js  # User operations
│   ├── middlewares/             # Middleware functions
│   │   ├── errorHandler.js      # Global error handling
│   │   ├── notFound.js          # 404 handler
│   │   ├── auth.middleware.js   # JWT verification
│   │   ├── validate.js          # Request validation
│   │   ├── rateLimiter.js       # Rate limiting
│   │   └── requestLogger.js     # Request logging
│   ├── models/                  # MongoDB schemas
│   │   ├── User.model.js        # User schema
│   │   ├── Token.model.js       # Token schema
│   │   └── [Resource].model.js
│   ├── routes/                  # Route definitions
│   │   ├── index.js             # Main router
│   │   ├── auth.routes.js       # Auth endpoints
│   │   └── user.routes.js       # User endpoints
│   ├── services/                # Business logic
│   │   ├── auth.service.js      # Auth operations
│   │   └── user.service.js      # User operations
│   ├── utils/                   # Utility functions
│   │   ├── AppError.js          # Custom error class
│   │   ├── asyncHandler.js      # Async wrapper
│   │   ├── jwt.js               # JWT utilities
│   │   ├── pagination.js        # Pagination helper
│   │   ├── hashPassword.js      # Password hashing
│   │   └── apiResponse.js       # Response formatter
│   ├── validators/              # Request validation
│   │   ├── auth.validator.js    # Auth validation
│   │   └── user.validator.js    # User validation
│   ├── app.js                   # Express app setup
│   └── server.js                # Server entry point
├── tests/
│   ├── unit/
│   │   ├── services/            # Service unit tests
│   │   └── utils/               # Utility unit tests
│   └── integration/
│       └── auth.test.js         # Auth integration tests
├── logs/                        # Log files
│   ├── combined.log             # All logs
│   └── error.log                # Error logs only
├── .env.example                # Environment template
├── .gitignore                   # Git ignore rules
├── package.json                 # Dependencies
├── jest.config.js               # Test configuration
└── documentation.md             # Project docs
```

---

## 📦 Package.json Scripts

| Command | Description |
|---------|-------------|
| `npm start` | Start production server |
| `npm run dev` | Start development server with nodemon |
| `npm test` | Run all tests |
| `npm run test:coverage` | Run tests with coverage |
| `npm run lint` | Run ESLint |
| `npm run format` | Format code with Prettier |

---

## 🔄 REQUEST LIFECYCLE

```
┌─────────────┐     ┌─────────┐     ┌────────────┐     ┌─────────────┐
│ HTTP Request│────▶│ Routes  │────▶│Middlewares │────▶│Controllers  │
└─────────────┘     └─────────┘     └────────────┘     └─────────────┘
                                                                  │
                                                                  ▼
                                                          ┌─────────────┐
                                                          │  Services   │
                                                          └─────────────┘
                                                                  │
                                                                  ▼
                                                          ┌─────────────┐
                                                          │   Models    │
                                                          └─────────────┘
                                                                  │
                                                                  ▼
                                                          ┌─────────────┐
                                                          │  MongoDB    │
                                                          └─────────────┘
```

**Flow Description:**
1. HTTP Request enters through routes
2. Middlewares process request (auth, validation, rate limiting)
3. Controllers receive validated request
4. Controllers call services for business logic
5. Services interact with models
6. Models communicate with MongoDB
7. Response flows back through the same chain

---

## 📂 LAYER-BY-LAYER BREAKDOWN

### src/config/

| File | Purpose |
|------|---------|
| `env.js` | Load and validate environment variables |
| `db.js` | MongoDB connection setup |
| `constants.js` | App-wide constants (status codes, roles) |
| `logger.js` | Winston logger configuration |

**Hard Rules:**
- ❌ Must NOT contain business logic
- ❌ Must NOT access request/response objects
- ❌ Must NOT throw application errors

---

### src/controllers/

| File | Purpose |
|------|---------|
| `[feature].controller.js` | Handle HTTP requests, return responses |

**Hard Rules:**
- ❌ Must NOT write database queries directly
- ❌ Must NOT contain complex business logic (delegate to services)
- ❌ Must NOT validate input (use validators)

---

### src/middlewares/

| File | Purpose |
|------|---------|
| `errorHandler.js` | Catch and format errors |
| `notFound.js` | Handle undefined routes |
| `auth.middleware.js` | Verify JWT tokens |
| `validate.js` | Run validator functions |
| `rateLimiter.js` | Prevent abuse |
| `requestLogger.js` | Log incoming requests |

**Hard Rules:**
- ❌ Must NOT contain business logic
- ❌ Must NOT make direct database calls
- ❌ Must NOT return final response (except error handlers)

---

### src/models/

| File | Purpose |
|------|---------|
| `[Resource].model.js` | Mongoose schema definitions |

**Hard Rules:**
- ❌ Must NOT contain HTTP-related code
- ❌ Must NOT handle business logic
- ❌ Must NOT access other models directly (use services)

---

### src/routes/

| File | Purpose |
|------|---------|
| `index.js` | Combine all route files |
| `[feature].routes.js` | Define API endpoints |

**Hard Rules:**
- ❌ Must NOT contain business logic
- ❌ Must NOT handle errors (use middlewares)
- ❌ Must NOT validate (use validators)

---

### src/services/

| File | Purpose |
|------|---------|
| `[feature].service.js` | Business logic implementation |

**Hard Rules:**
- ❌ Must NOT access req/res objects
- ❌ Must NOT handle HTTP errors directly
- ❌ Should be framework-agnostic where possible

---

### src/utils/

| File | Purpose |
|------|---------|
| `AppError.js` | Custom error class |
| `asyncHandler.js` | Wrapper for async routes |
| `jwt.js` | JWT token utilities |
| `pagination.js` | Pagination calculations |
| `hashPassword.js` | Password hashing |
| `apiResponse.js` | Standardized responses |

**Hard Rules:**
- ❌ Must NOT access application state
- ❌ Must NOT make network calls
- ❌ Should be pure functions where possible

---

### src/validators/

| File | Purpose |
|------|---------|
| `[feature].validator.js` | Joi validation schemas |

**Hard Rules:**
- ❌ Must NOT contain business logic
- ❌ Must NOT make database calls
- ❌ Must NOT handle errors

---

### src/app.js

**Purpose:** Express application setup, middleware registration, route mounting

**Key Responsibilities:**
- Register all middlewares
- Mount routes
- Global error handling setup

---

### src/server.js

**Purpose:** Application entry point, server initialization

**Key Responsibilities:**
- Connect to database
- Start HTTP server
- Handle graceful shutdown

---

### tests/

| Folder | Purpose |
|--------|---------|
| `unit/services/` | Service layer unit tests |
| `unit/utils/` | Utility function tests |
| `integration/` | End-to-end API tests |

**Hard Rules:**
- ❌ Must NOT test multiple layers simultaneously (in unit tests)
- ❌ Must use test database, not production

---

## 🔐 Environment Variables (.env.example)

```env
# Server Configuration
PORT=3000
NODE_ENV=development

# Database
MONGODB_URI=mongodb://localhost:27017/mybackend

# JWT Configuration
JWT_SECRET=your-super-secret-key-change-in-production
JWT_EXPIRE=7d
JWT_COOKIE_EXPIRE=7

# Email Configuration (for services)
SMTP_HOST=smtp.mailtrap.io
SMTP_PORT=587
SMTP_USER=your-smtp-user
SMTP_PASS=your-smtp-password
FROM_EMAIL=noreply@mybackend.com

# File Upload
MAX_FILE_SIZE=5242880
UPLOAD_PATH=./uploads

# Rate Limiting
RATE_LIMIT_WINDOW_MS=900000
RATE_LIMIT_MAX_REQUESTS=100

# CORS
CORS_ORIGIN=http://localhost:3000

# Logging
LOG_LEVEL=info
LOG_FILE_DIR=./logs
```

---

## 🎯 CORE DESIGN PRINCIPLES

1. **Single Responsibility** — Each layer has one job. Controllers handle HTTP, Services handle business logic, Models define data structure.

2. **Validate Early** — Run validators at the route layer before any processing. Catch invalid input immediately.

3. **Services are Framework-Agnostic** — Services should work without HTTP context. This makes them testable and reusable.

4. **Never Expose Raw Database** — Controllers never query directly. Always go through services.

5. **Error Handling at Edge** — Middlewares handle errors. Controllers just throw. Services return meaningful data or throw specific errors.

6. **Consistent Response Format** — Use apiResponse utility for all responses. Never mix response structures.

7. **Environment Configuration** — All config in config folder. Never hardcode values. Use .env for sensitive data.

8. **Test at Every Layer** — Unit tests for utils/services, integration tests for full request flow.

---

## 🚀 Getting Started

```bash
# Install dependencies
npm install

# Copy environment file
cp .env.example .env

# Start development server
npm run dev

# Run tests
npm test
```

---

## 📡 API Response Format

### Success Response
```json
{
  "success": true,
  "message": "Operation successful",
  "data": { },
  "meta": {
    "page": 1,
    "limit": 10,
    "total": 100
  }
}
```

### Error Response
```json
{
  "success": false,
  "message": "Error message here"
}
```

---

## 🔗 API Endpoints

### Authentication Routes

| Method | Endpoint | Description | Access |
|--------|----------|-------------|--------|
| POST | `/api/auth/register` | Register new user | Public |
| POST | `/api/auth/login` | Login user | Public |
| POST | `/api/auth/logout` | Logout user | Private |
| GET | `/api/auth/profile` | Get current user profile | Private |
| PUT | `/api/auth/profile` | Update user profile | Private |
| PUT | `/api/auth/change-password` | Change password | Private |

### User Routes (Admin Only)

| Method | Endpoint | Description | Access |
|--------|----------|-------------|--------|
| GET | `/api/users` | Get all users with pagination | Admin |
| GET | `/api/users/:id` | Get user by ID | Admin |
| PUT | `/api/users/:id` | Update user | Admin |
| DELETE | `/api/users/:id` | Delete user | Admin |

### Health Check

| Method | Endpoint | Description | Access |
|--------|----------|-------------|--------|
| GET | `/api/health` | API health status | Public |
| GET | `/` | Welcome message | Public |

---

## 🔑 Key Features

- ✅ **ES Modules** - Using `"type": "module"` in package.json
- ✅ **JWT Authentication** - Token-based auth with role-based access control
- ✅ **Request Validation** - Using Joi for input validation
- ✅ **Rate Limiting** - Protect against abuse with express-rate-limit
- ✅ **Error Handling** - Global error handler middleware
- ✅ **Pagination** - Built-in pagination utilities
- ✅ **Logging** - Winston logger with file rotation
- ✅ **MongoDB** - Mongoose ODM with connection handling
- ✅ **Security** - Helmet, CORS, and security headers
- ✅ **Graceful Shutdown** - Handle SIGTERM and SIGINT properly
- ✅ **Testing** - Jest configuration with unit and integration tests

---

## 📝 Development Dependencies

| Package | Version | Purpose |
|---------|---------|---------|
| **nodemon** | ^3.0.2 | Auto-restart server on changes |
| **jest** | ^29.7.0 | Testing framework |
| **supertest** | ^6.3.3 | HTTP testing |
| **eslint** | ^8.55.0 | Code linting |
| **prettier** | ^3.1.1 | Code formatting |