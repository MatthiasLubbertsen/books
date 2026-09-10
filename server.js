'use strict';

const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const express = require('express');
const cookieParser = require('cookie-parser');

const PORT = Number(process.env.PORT) || 8312;
const PIN = process.env.PIN;
const DATA_DIR = process.env.DATA_DIR || path.join(__dirname, 'data');
const DATA_FILE = path.join(DATA_DIR, 'books.json');
const SESSION_TTL_MS = 30 * 24 * 60 * 60 * 1000; // 30 days
const COOKIE_NAME = 'books_session';

if (!PIN || !/^\d{6}$/.test(PIN)) {
  console.error('PIN must be set to exactly 6 digits (env var PIN). Refusing to start.');
  process.exit(1);
}

// --- data store (flat JSON file, single writer, no concurrency worries) ---

function loadBooks() {
  if (!fs.existsSync(DATA_FILE)) return [];
  try {
    return JSON.parse(fs.readFileSync(DATA_FILE, 'utf8'));
  } catch {
    return [];
  }
}

function saveBooks(books) {
  fs.mkdirSync(DATA_DIR, { recursive: true });
  fs.writeFileSync(DATA_FILE, JSON.stringify(books, null, 2));
}

let books = loadBooks();

// --- sessions (in-memory; restarting the server logs everyone out) ---

const sessions = new Map(); // token -> expiry timestamp

function createSession() {
  const token = crypto.randomBytes(32).toString('hex');
  sessions.set(token, Date.now() + SESSION_TTL_MS);
  return token;
}

function isValidSession(token) {
  if (!token) return false;
  const expiry = sessions.get(token);
  if (!expiry) return false;
  if (expiry < Date.now()) {
    sessions.delete(token);
    return false;
  }
  return true;
}

function requireAuth(req, res, next) {
  if (isValidSession(req.cookies[COOKIE_NAME])) return next();
  res.status(401).json({ error: 'not authenticated' });
}

// --- naive login rate limiting: a 6-digit PIN only has 1e6 possibilities ---

const loginAttempts = new Map(); // ip -> { count, resetAt }
const MAX_ATTEMPTS = 10;
const ATTEMPT_WINDOW_MS = 5 * 60 * 1000;

function isRateLimited(ip) {
  const entry = loginAttempts.get(ip);
  if (!entry || entry.resetAt < Date.now()) return false;
  return entry.count >= MAX_ATTEMPTS;
}

function recordFailedAttempt(ip) {
  const entry = loginAttempts.get(ip);
  if (!entry || entry.resetAt < Date.now()) {
    loginAttempts.set(ip, { count: 1, resetAt: Date.now() + ATTEMPT_WINDOW_MS });
  } else {
    entry.count += 1;
  }
}

function pinMatches(candidate) {
  if (typeof candidate !== 'string' || candidate.length !== PIN.length) return false;
  return crypto.timingSafeEqual(Buffer.from(candidate), Buffer.from(PIN));
}

// --- app ---

const app = express();
app.disable('x-powered-by');
app.use(express.json({ limit: '10kb' }));
app.use(cookieParser());
app.use(express.static(path.join(__dirname, 'public')));

app.get('/api/session', (req, res) => {
  res.json({ authenticated: isValidSession(req.cookies[COOKIE_NAME]) });
});

app.post('/api/login', (req, res) => {
  const ip = req.ip;
  if (isRateLimited(ip)) {
    return res.status(429).json({ error: 'too many attempts, try again later' });
  }
  const { pin } = req.body || {};
  if (!pinMatches(pin)) {
    recordFailedAttempt(ip);
    return res.status(401).json({ error: 'wrong pin' });
  }
  const token = createSession();
  res.cookie(COOKIE_NAME, token, {
    httpOnly: true,
    sameSite: 'lax',
    maxAge: SESSION_TTL_MS,
  });
  res.json({ authenticated: true });
});

app.post('/api/logout', (req, res) => {
  sessions.delete(req.cookies[COOKIE_NAME]);
  res.clearCookie(COOKIE_NAME);
  res.json({ authenticated: false });
});

app.get('/api/books', (req, res) => {
  res.json(books);
});

app.post('/api/books', requireAuth, (req, res) => {
  const { title, author, location } = req.body || {};
  const cleanTitle = typeof title === 'string' ? title.trim().slice(0, 200) : '';
  const cleanAuthor = typeof author === 'string' ? author.trim().slice(0, 200) : '';
  if (!cleanTitle) return res.status(400).json({ error: 'title is required' });
  if (location !== 'school' && location !== 'home') {
    return res.status(400).json({ error: 'location must be "school" or "home"' });
  }
  const book = {
    id: crypto.randomUUID(),
    title: cleanTitle,
    author: cleanAuthor,
    location,
    addedAt: new Date().toISOString(),
  };
  books.push(book);
  saveBooks(books);
  res.status(201).json(book);
});

app.post('/api/books/:id/move', requireAuth, (req, res) => {
  const book = books.find((b) => b.id === req.params.id);
  if (!book) return res.status(404).json({ error: 'not found' });
  book.location = book.location === 'school' ? 'home' : 'school';
  saveBooks(books);
  res.json(book);
});

app.delete('/api/books/:id', requireAuth, (req, res) => {
  const before = books.length;
  books = books.filter((b) => b.id !== req.params.id);
  if (books.length === before) return res.status(404).json({ error: 'not found' });
  saveBooks(books);
  res.status(204).end();
});

app.listen(PORT, () => {
  console.log(`books app listening on port ${PORT}`);
});
