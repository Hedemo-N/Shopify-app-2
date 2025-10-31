// Enkel in-memory-lagring för Shopify-sessioner.

type SessionRecord = {
  id: string;
  shop: string;
  [key: string]: any;
};

const store = new Map<string, SessionRecord>();

export const memorySessionStorage = {
  async storeSession(session: SessionRecord): Promise<boolean> {
    store.set(session.id, session);
    return true;
  },

  async loadSession(id: string): Promise<SessionRecord | null> {
    return store.get(id) || null;
  },

  async deleteSession(id: string): Promise<boolean> {
    store.delete(id);
    return true;
  },

  async deleteSessions(ids: string[]): Promise<boolean> {
    ids.forEach((id) => store.delete(id));
    return true;
  },

  async findSessionsByShop(shop: string): Promise<SessionRecord[]> {
    return Array.from(store.values()).filter((s) => s.shop === shop);
  },
};
