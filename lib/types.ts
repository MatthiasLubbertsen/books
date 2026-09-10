export type Location = 'school' | 'home';

export type Book = {
  id: string;
  title: string;
  subject: string | null;
  location: Location;
  createdAt: string;
};

export function isLocation(value: unknown): value is Location {
  return value === 'school' || value === 'home';
}
