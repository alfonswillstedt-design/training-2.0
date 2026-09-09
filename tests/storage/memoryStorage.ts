/** En Storage i minnet, så lagringen kan testas utan webbläsare. */
export class MemoryStorage implements Storage {
  private entries = new Map<string, string>();
  /** Sätts för att härma privat läge eller full disk. */
  failWrites = false;
  failReads = false;

  get length(): number {
    return this.entries.size;
  }

  clear(): void {
    this.entries.clear();
  }

  getItem(key: string): string | null {
    if (this.failReads) throw new DOMException('SecurityError');
    return this.entries.get(key) ?? null;
  }

  key(index: number): string | null {
    return [...this.entries.keys()][index] ?? null;
  }

  removeItem(key: string): void {
    this.entries.delete(key);
  }

  setItem(key: string, value: string): void {
    if (this.failWrites) throw new DOMException('QuotaExceededError');
    this.entries.set(key, value);
  }
}
