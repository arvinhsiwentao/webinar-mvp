type Listener = (data: string) => void;

class ChatBroker {
  private listeners: Map<string, Set<Listener>> = new Map();

  subscribe(channel: string, listener: Listener): () => void {
    if (!this.listeners.has(channel)) {
      this.listeners.set(channel, new Set());
    }
    this.listeners.get(channel)!.add(listener);
    return () => {
      this.listeners.get(channel)?.delete(listener);
      if (this.listeners.get(channel)?.size === 0) {
        this.listeners.delete(channel);
      }
    };
  }

  publish(channel: string, data: string): void {
    this.listeners.get(channel)?.forEach(listener => listener(data));
  }

  getConnectionCount(channel: string): number {
    return this.listeners.get(channel)?.size ?? 0;
  }
}

export const chatBroker = new ChatBroker();
