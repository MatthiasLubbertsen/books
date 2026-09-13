# books

Tracks which of your school books are at school vs. at home. Drag a book
across to move it, or scan its barcode to add it with a cover and title
pulled in automatically.

Anyone can view the board. Adding, moving, editing, and deleting books
requires logging in with a registered security key (YubiKey or similar —
WebAuthn/FIDO2). There's no password or PIN.

## Stack

Next.js (App Router, TypeScript) + Tailwind CSS + shadcn/ui, SQLite via
Prisma, dnd-kit for drag-and-drop, `@simplewebauthn` for the security-key
auth, `@zxing/browser` for barcode scanning, Open Library for ISBN lookups
and cover art. Server Actions handle all writes, no separate API layer.

## Security keys require HTTPS

This is a hard browser requirement, not a setting: WebAuthn only works over
HTTPS, with a single exception — `http://localhost` is allowed, which is
fine for local dev but useless for reaching the app from your phone or from
another machine.

For a real deployment, put something in front of this container that
terminates TLS — a reverse proxy with automatic HTTPS (Caddy, Traefik,
nginx + certbot) or a Tailscale HTTPS certificate all work. Then set
`RP_ID`/`ORIGIN` in `.env` to match exactly how you access the site (see
`.env.example` for details). The app shows a banner in the UI if it detects
it's being served insecurely.

## Run

```
cp .env.example .env   # then edit RP_ID/ORIGIN for your actual domain
docker compose up -d
```

Data lives in a SQLite file inside a Docker volume, so it survives restarts
and rebuilds. Runs on port `8312`.

The first time you open the app, there are no security keys registered yet
— you'll see a "register security key" button. Registering your first key
also logs you in with it. Register a second (backup) key from the key icon
in the header once you're logged in, so a lost key doesn't lock you out.

**Locked out?** If you lose every registered key, there's no in-app
recovery — that's the tradeoff for not having a password. Clear the
`Credential` table directly and you'll get the "register security key"
flow again:

```
docker compose exec books sh -c "apk add --no-cache sqlite && sqlite3 /app/data/books.db 'DELETE FROM Credential;'"
```

## Local development (without Docker)

```
npm install
npx prisma migrate dev
npm run dev
```
