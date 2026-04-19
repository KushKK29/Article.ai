# ArticleShip Frontend

Next.js 14 + Tailwind frontend for generating and managing SEO articles through the ArticleShip backend.

## Setup

1. Install dependencies:

```bash
npm install
```

2. Create environment file:

```bash
copy .env.example .env.local
```

3. Start dev server:

```bash
npm run dev
```

Frontend runs on `http://localhost:3000`.

## Backend Integration

Default backend base URL is set via `BACKEND_BASE_URL` and points to:

`http://127.0.0.1:8000`

The frontend app route appends the endpoint path automatically:

`/api/v1/generate_full_article_hybrid_html`

The frontend route `POST /api/generate` proxies and normalizes backend output into:

```json
{
  "keywords": {},
  "structure": {},
  "content": "",
  "images": []
}
```

## Save Article Persistence (MongoDB)

The route `/api/save-article` is a proxy to backend endpoints:

- `GET /api/v1/articles`
- `POST /api/v1/articles`

MongoDB credentials are configured in the backend ArticleShip `.env` file.

Frontend only needs:

```bash
BACKEND_BASE_URL=http://127.0.0.1:8000
```
