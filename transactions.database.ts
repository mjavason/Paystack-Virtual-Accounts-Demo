import { existsSync, readFileSync, writeFileSync } from 'fs';
import { join } from 'path';

interface Transaction {
  id: string;
  amount: number;
  reference: string;
  authUrl: string;
  metadata?: Record<string, any>;
  status?: 'pending' | 'completed' | 'failed';
}

class TransactionDatabase {
  private transactions: Map<string, Transaction> = new Map();
  private readonly filePath: string;

  constructor(filePath: string = 'transactions.json') {
    this.filePath = join(process.cwd(), filePath);
    this.loadFromFile();
  }

  private loadFromFile(): void {
    if (existsSync(this.filePath)) {
      try {
        const data = readFileSync(this.filePath, 'utf-8');
        const transactions: Transaction[] = JSON.parse(data);
        this.transactions = new Map(transactions.map((t) => [t.id, t]));
      } catch (error) {
        console.error('Error loading transactions:', error);
      }
    }
  }

  private saveToFile(): void {
    try {
      const transactions = Array.from(this.transactions.values());
      writeFileSync(this.filePath, JSON.stringify(transactions, null, 2));
    } catch (error) {
      console.error('Error saving transactions:', error);
    }
  }

  create(transaction: Omit<Transaction, 'id'>): Transaction {
    const id = this.generateId();
    const newTransaction: Transaction = {
      id,
      ...transaction,
      status: 'pending',
    };
    this.transactions.set(id, newTransaction);
    this.saveToFile();
    return newTransaction;
  }

  findById(id: string): Transaction | undefined {
    return this.transactions.get(id);
  }

  findByReference(reference: string): Transaction | undefined {
    return Array.from(this.transactions.values()).find(
      (transaction) => transaction.reference === reference,
    );
  }

  getAll(): Transaction[] {
    return Array.from(this.transactions.values());
  }

  update(id: string, updates: Partial<Omit<Transaction, 'id'>>): Transaction | undefined {
    const existing = this.transactions.get(id);
    if (!existing) return undefined;

    const updated = { ...existing, ...updates };
    this.transactions.set(id, updated);
    this.saveToFile();
    return updated;
  }

  delete(id: string): boolean {
    const result = this.transactions.delete(id);
    if (result) {
      this.saveToFile();
    }
    return result;
  }

  private generateId(): string {
    return `txn_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }
}

export const transactionDb = new TransactionDatabase();
export type { Transaction };
