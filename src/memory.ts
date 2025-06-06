import { Message } from 'ai';

export interface MemoryStore {
  load(name: string): Promise<Message[] | undefined> | Message[] | undefined;
  save(name: string, history: Message[]): Promise<void> | void;
}

export class InMemoryStore implements MemoryStore {
  private store = new Map<string, Message[]>();

  load(name: string): Message[] | undefined {
    return this.store.get(name);
  }

  async save(name: string, history: Message[]): Promise<void> {
    this.store.set(name, history);
  }
}
