# Sylvara API — Backend

Backend REST API for the **Sylvara** biodiversity research platform, built with **NestJS** and a hybrid database architecture (PostgreSQL + MongoDB).

---

## 🏗️ Architecture

```
src/
├── auth/           → Authentication (PostgreSQL / TypeORM)
├── bio-core/       → Biodiversity engine (MongoDB / Mongoose)
├── export/         → Excel & PDF generation
└── common/         → Shared enums, constants, utilities
```

| Layer | Technology |
|---|---|
| Framework | NestJS 11 |
| Auth / Users | PostgreSQL + TypeORM |
| Biodiversity Data | MongoDB + Mongoose |
| Authentication | JWT (Passport) |
| Validation | class-validator + class-transformer |

---

## 🔐 Auth Module (implemented)

### Endpoints

| Method | Route | Description |
|---|---|---|
| `POST` | `/auth/register` | Register a new researcher |
| `POST` | `/auth/login` | Obtain a JWT access token |

### Register — Request Body

```json
{
  "user_name": "Rafael",
  "user_lastname": "Martínez",
  "user_birthday": "1998-05-15",
  "user_email": "rafael@sylvara.mx",
  "user_password": "segura1234"
}
```

**Validations applied:**
- `user_email` → must be a valid email format
- `user_password` → minimum 8 characters
- `user_name`, `user_lastname`, `user_birthday` → required / non-empty

**Success Response `201`:**
```json
{
  "user_id": 1,
  "user_name": "Rafael",
  "user_lastname": "Martínez",
  "user_birthday": "1998-05-15",
  "user_email": "rafael@sylvara.mx"
}
```
> Password is **never** returned.

---

### Login — Request Body

```json
{
  "user_email": "rafael@sylvara.mx",
  "user_password": "segura1234"
}
```

**Success Response `200`:**
```json
{
  "access_token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
}
```

**Error Responses:**
- `400` → Validation failed (invalid email, short password, missing fields)
- `401` → Invalid credentials
- `409` → Email already registered

---

### Security

- Passwords are hashed with **bcrypt (10 salt rounds)** — never stored in plain text.
- The `user_password` column uses `select: false` in TypeORM — never returned accidentally.
- JWT tokens expire in **7 days** by default (configurable via `.env`).

---

### Protecting Routes

Add `@UseGuards(JwtAuthGuard)` to any controller or route that requires authentication:

```typescript
import { UseGuards, Get } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';

@UseGuards(JwtAuthGuard)
@Get('projects')
findAll() {
  // only accessible with a valid Bearer token
}
```

The authenticated user is available via `@Request() req` → `req.user`:
```typescript
{ user_id: number, user_email: string }
```

---

## ⚙️ Environment Variables

Copy `.env` and fill in your values:

```env
# JWT
JWT_SECRET=<long-random-string>   # ⚠️ Change before deploying

# PostgreSQL
POSTGRES_HOST=localhost
POSTGRES_PORT=5432
POSTGRES_USER=sylvara_user
POSTGRES_PASSWORD=sylvara_password
POSTGRES_DB=sylvara_db

# MongoDB
MONGO_URI=mongodb://localhost:27017/sylvara_data

# Server
PORT=3000
NODE_ENV=development
```

> **Generate a strong secret:** `openssl rand -hex 64`

---

## 🚀 Running the App

```bash
# Install dependencies
npm install

# Development (watch mode)
npm run start:dev

# Production build
npm run build
npm run start:prod
```

---

## 📦 Key Dependencies

| Package | Purpose |
|---|---|
| `@nestjs/jwt` | JWT signing & verification |
| `@nestjs/passport` | Passport integration for NestJS |
| `passport-jwt` | JWT Passport strategy |
| `bcrypt` | Password hashing |
| `class-validator` | DTO request validation |
| `class-transformer` | DTO auto-transformation |
| `typeorm` + `pg` | PostgreSQL ORM & driver |
| `mongoose` | MongoDB ODM |
 
 
