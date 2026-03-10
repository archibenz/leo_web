// Database types for future extensibility

export type StoredUser = {
  id: string;
  email: string;
  name: string;
  passwordHash: string; // In real app, use proper hashing
  createdAt: string;
  updatedAt: string;
};

export type DatabaseAdapter = {
  // User operations
  createUser: (user: Omit<StoredUser, 'id' | 'createdAt' | 'updatedAt'>) => Promise<StoredUser | null>;
  getUserByEmail: (email: string) => Promise<StoredUser | null>;
  getUserById: (id: string) => Promise<StoredUser | null>;
  updateUser: (id: string, data: Partial<StoredUser>) => Promise<StoredUser | null>;
  deleteUser: (id: string) => Promise<boolean>;
  getAllUsers: () => Promise<StoredUser[]>;
  
  // Validation
  validatePassword: (email: string, password: string) => Promise<boolean>;
};

// Email validation regex
export const EMAIL_REGEX = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;

export function isValidEmail(email: string): boolean {
  return EMAIL_REGEX.test(email.trim());
}
