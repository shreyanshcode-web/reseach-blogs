# Blog Backend API

A FastAPI backend for a blog system with clean architecture.

## Architecture

```
app/
├── api/            # Route handlers (controllers)
├── core/           # Config & security utilities
├── db/             # Database engine & session
├── middleware/      # Auth dependency (JWT bearer)
├── models/         # SQLAlchemy ORM models
├── repositories/   # Data-access layer
├── schemas/        # Pydantic request/response schemas
├── services/       # Business logic layer
└── main.py         # Application entry point
```

## Quick Start

```bash
# 1. Create & activate a virtual environment
python -m venv venv
venv\Scripts\activate        # Windows
# source venv/bin/activate   # macOS/Linux

# 2. Install dependencies
pip install -r requirements.txt

# 3. Run the server
uvicorn app.main:app --reload
```

The API will be available at **http://127.0.0.1:8000** and interactive docs at **http://127.0.0.1:8000/docs**.

## API Endpoints

### Users
| Method | Path | Auth | Description |
|--------|------|------|-------------|
| POST | `/api/users/register` | No | Register a new user |
| POST | `/api/users/login` | No | Login and receive JWT |
| GET | `/api/users/me` | Yes | Get current user profile |
| GET | `/api/users/` | No | List all users |
| GET | `/api/users/{id}` | No | Get user by ID |
| PUT | `/api/users/{id}` | Yes | Update user |
| DELETE | `/api/users/{id}` | Yes | Delete user |

### Posts
| Method | Path | Auth | Description |
|--------|------|------|-------------|
| POST | `/api/posts/` | Yes | Create a post |
| GET | `/api/posts/` | No | List all posts |
| GET | `/api/posts/{id}` | No | Get post by ID |
| PUT | `/api/posts/{id}` | Yes | Update post (owner only) |
| DELETE | `/api/posts/{id}` | Yes | Delete post (owner only) |

## Environment Variables

| Variable | Default | Description |
|----------|---------|-------------|
| `DATABASE_URL` | `sqlite+aiosqlite:///./blog.db` | Async database URL |
| `SECRET_KEY` | — | JWT signing key |
| `ACCESS_TOKEN_EXPIRE_MINUTES` | `30` | Token lifetime |
| `APP_NAME` | `Blog API` | Application name |
