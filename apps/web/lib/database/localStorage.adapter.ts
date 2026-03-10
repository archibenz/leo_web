// LocalStorage adapter - for development and demo purposes
// Can be replaced with real database adapter (PostgreSQL, MongoDB, etc.)

import type {DatabaseAdapter, StoredUser} from './types';

const USERS_STORAGE_KEY = 'reinasleo_users_db';

// Simple hash function for demo (in production use bcrypt or similar)
function simpleHash(str: string): string {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash;
  }
  return hash.toString(36) + '_' + btoa(str).slice(0, 10);
}

function getUsers(): StoredUser[] {
  if (typeof window === 'undefined') return [];
  try {
    const stored = localStorage.getItem(USERS_STORAGE_KEY);
    return stored ? JSON.parse(stored) : [];
  } catch {
    return [];
  }
}

function saveUsers(users: StoredUser[]): void {
  if (typeof window === 'undefined') return;
  localStorage.setItem(USERS_STORAGE_KEY, JSON.stringify(users));
}

export const localStorageAdapter: DatabaseAdapter = {
  async createUser(userData) {
    const users = getUsers();
    
    // Check if email already exists
    if (users.some(u => u.email.toLowerCase() === userData.email.toLowerCase())) {
      return null;
    }
    
    const now = new Date().toISOString();
    const newUser: StoredUser = {
      id: crypto.randomUUID(),
      email: userData.email.toLowerCase().trim(),
      name: userData.name.trim(),
      passwordHash: simpleHash(userData.passwordHash), // passwordHash here is actually plain password
      createdAt: now,
      updatedAt: now,
    };
    
    users.push(newUser);
    saveUsers(users);
    
    return newUser;
  },

  async getUserByEmail(email) {
    const users = getUsers();
    return users.find(u => u.email.toLowerCase() === email.toLowerCase().trim()) || null;
  },

  async getUserById(id) {
    const users = getUsers();
    return users.find(u => u.id === id) || null;
  },

  async updateUser(id, data) {
    const users = getUsers();
    const index = users.findIndex(u => u.id === id);
    
    if (index === -1) return null;
    
    users[index] = {
      ...users[index],
      ...data,
      updatedAt: new Date().toISOString(),
    };
    
    saveUsers(users);
    return users[index];
  },

  async deleteUser(id) {
    const users = getUsers();
    const index = users.findIndex(u => u.id === id);
    
    if (index === -1) return false;
    
    users.splice(index, 1);
    saveUsers(users);
    return true;
  },

  async getAllUsers() {
    return getUsers();
  },

  async validatePassword(email, password) {
    const user = await this.getUserByEmail(email);
    if (!user) return false;
    
    return user.passwordHash === simpleHash(password);
  },
};
