export function normalizeIsbn(raw: string): string {
  return raw.replace(/[^0-9Xx]/g, '').toUpperCase();
}

export function isValidIsbn(raw: string): boolean {
  const isbn = normalizeIsbn(raw);
  return isbn.length === 10 || isbn.length === 13;
}

export function coverUrlForIsbn(isbn: string): string {
  return `https://covers.openlibrary.org/b/isbn/${normalizeIsbn(isbn)}-L.jpg`;
}
