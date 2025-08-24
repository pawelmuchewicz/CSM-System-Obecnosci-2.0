// User types for authentication storage
export interface User {
  id: number;
  username: string;
  firstName: string;
  lastName: string;
  email?: string;
  groupIds: string[];
  isAdmin: boolean;
}

export interface InsertUser {
  username: string;
  firstName: string;
  lastName: string;
  email?: string;
  groupIds: string[];
  isAdmin?: boolean;
}

import { randomUUID } from "crypto";

// modify the interface with any CRUD methods
// you might need

export interface IStorage {
  getUser(id: string): Promise<User | undefined>;
  getUserByUsername(username: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;
}

export class MemStorage implements IStorage {
  private users: Map<string, User>;

  constructor() {
    this.users = new Map();
  }

  async getUser(id: string): Promise<User | undefined> {
    return this.users.get(id);
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    return Array.from(this.users.values()).find(
      (user) => user.username === username,
    );
  }

  async createUser(insertUser: InsertUser): Promise<User> {
    const id = Math.floor(Math.random() * 1000000);
    const user: User = { ...insertUser, id };
    this.users.set(id.toString(), user);
    return user;
  }
}

export const storage = new MemStorage();
