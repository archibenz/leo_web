// Database service - abstraction layer for different database adapters
// 
// Currently uses localStorage for demo/development
// Can be easily switched to:
// - PostgreSQL adapter
// - MongoDB adapter  
// - Excel/Google Sheets adapter
// - Supabase adapter
// - Firebase adapter
// - etc.

import {localStorageAdapter} from './localStorage.adapter';
import type {DatabaseAdapter} from './types';

export * from './types';

// Current adapter - change this to switch database backends
// Example future usage:
// import {postgresAdapter} from './postgres.adapter';
// import {excelAdapter} from './excel.adapter';
// export const db: DatabaseAdapter = postgresAdapter;

export const db: DatabaseAdapter = localStorageAdapter;

// Placeholder for future Excel/Google Sheets integration
// export const excelAdapter: DatabaseAdapter = {
//   // Implementation for Excel export/import
// };

// Placeholder for future PostgreSQL integration
// export const postgresAdapter: DatabaseAdapter = {
//   // Implementation using pg or prisma
// };
