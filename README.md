# books

Tracks which of your school books are at school vs. at home. Drag a book
across to move it.

Anyone can view the board. Adding, moving, and deleting books requires the
6-digit PIN.

## Stack

Next.js (App Router, TypeScript) + Tailwind CSS, SQLite via Prisma, dnd-kit
for drag-and-drop, Radix UI for the modals. Server Actions handle all writes,
no separate API layer.

## Run

```
cp .env.example .env   # then edit PIN to your own 6 digits
docker compose up -d
```

`docker-compose.yml` reads `PIN` from your `.env` file, so edit it there
before deploying anywhere real — don't ship with the example value. Data
lives in a SQLite file inside a Docker volume, so it survives restarts and
rebuilds.

Runs on port `8312`.

## Local development (without Docker)

```
npm install
npx prisma migrate dev
npm run dev
```
