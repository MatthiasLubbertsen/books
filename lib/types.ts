export type Location = 'school' | 'home';

export type Book = {
  id: string;
  title: string;
  subject: string | null;
  location: Location;
  isbn: string | null;
  coverUrl: string | null;
  hidden: boolean;
  createdAt: string;
  moveCount: number;
};

export type BookMove = {
  id: string;
  fromLocation: Location;
  toLocation: Location;
  movedAt: string;
};

export function isLocation(value: unknown): value is Location {
  return value === 'school' || value === 'home';
}
