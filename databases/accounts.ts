import { existsSync, readFileSync, writeFileSync } from 'fs';
import { join } from 'path';

interface Account {
  id: string;
  metadata?: Record<string, any>;

  bankName: string;
  bankId: number;
  bankSlug: string;
  accountName: string;
  accountNumber: string;
  assigned: boolean;
  currency: string;
  customerCode: string;
}

class AccountDatabase {
  private accounts: Map<string, Account> = new Map();
  private readonly filePath: string;

  constructor(filePath: string = 'accounts.json') {
    this.filePath = join(__dirname, '..', 'stores', filePath);
    this.loadFromFile();
  }

  private loadFromFile(): void {
    if (existsSync(this.filePath)) {
      try {
        const data = readFileSync(this.filePath, 'utf-8');
        const accounts: Account[] = JSON.parse(data);
        this.accounts = new Map(accounts.map((t) => [t.id, t]));
      } catch (error) {
        console.error('Error loading accounts:', error);
      }
    }
  }

  private saveToFile(): void {
    try {
      const accounts = Array.from(this.accounts.values());
      writeFileSync(this.filePath, JSON.stringify(accounts, null, 2));
    } catch (error) {
      console.error('Error saving accounts:', error);
    }
  }

  create(account: Omit<Account, 'id'>): Account {
    const id = this.generateId();
    const newAccount: Account = {
      id,
      ...account,
    };
    this.accounts.set(id, newAccount);
    this.saveToFile();
    return newAccount;
  }

  findById(id: string): Account | undefined {
    return this.accounts.get(id);
  }

  findByCustomerCode(customerCode: string): Account | undefined {
    return Array.from(this.accounts.values()).find(
      (account) => account.customerCode === customerCode,
    );
  }

  getAll(): Account[] {
    return Array.from(this.accounts.values());
  }

  update(id: string, updates: Partial<Omit<Account, 'id'>>): Account | undefined {
    const existing = this.accounts.get(id);
    if (!existing) return undefined;

    const updated = { ...existing, ...updates };
    this.accounts.set(id, updated);
    this.saveToFile();
    return updated;
  }

  delete(id: string): boolean {
    const result = this.accounts.delete(id);
    if (result) {
      this.saveToFile();
    }
    return result;
  }

  private generateId(): string {
    return `txn_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }
}

export const accountDb = new AccountDatabase();
export type { Account };
