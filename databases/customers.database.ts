import { existsSync, readFileSync, writeFileSync } from 'fs';
import { join } from 'path';

interface Customer {
  id: string;

  email: string;
  firstName: string;
  lastName: string;
  code: string;

  metadata?: Record<string, any>;
}

class CustomerDatabase {
  private customers: Map<string, Customer> = new Map();
  private readonly filePath: string;

  constructor(filePath: string = 'customers.json') {
    this.filePath = join(__dirname, '..', 'stores', filePath);
    this.loadFromFile();
  }

  private loadFromFile(): void {
    if (existsSync(this.filePath)) {
      try {
        const data = readFileSync(this.filePath, 'utf-8');
        const customers: Customer[] = JSON.parse(data);
        this.customers = new Map(customers.map((t) => [t.id, t]));
      } catch (error) {
        console.error('Error loading customers:', error);
      }
    }
  }

  private saveToFile(): void {
    try {
      const customers = Array.from(this.customers.values());
      writeFileSync(this.filePath, JSON.stringify(customers, null, 2));
    } catch (error) {
      console.error('Error saving customers:', error);
    }
  }

  create(customer: Omit<Customer, 'id'>): Customer {
    const id = this.generateId();
    const newCustomer: Customer = {
      id,
      ...customer,
    };
    this.customers.set(id, newCustomer);
    this.saveToFile();
    return newCustomer;
  }

  findById(id: string): Customer | undefined {
    return this.customers.get(id);
  }

  findByCode(code: string): Customer | undefined {
    return Array.from(this.customers.values()).find((customer) => customer.code === code);
  }

  getAll(): Customer[] {
    return Array.from(this.customers.values());
  }

  update(id: string, updates: Partial<Omit<Customer, 'id'>>): Customer | undefined {
    const existing = this.customers.get(id);
    if (!existing) return undefined;

    const updated = { ...existing, ...updates };
    this.customers.set(id, updated);
    this.saveToFile();
    return updated;
  }

  delete(id: string): boolean {
    const result = this.customers.delete(id);
    if (result) {
      this.saveToFile();
    }
    return result;
  }

  private generateId(): string {
    return `txn_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }
}

export const customerDb = new CustomerDatabase();
export type { Customer };
