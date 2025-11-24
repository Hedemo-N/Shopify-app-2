// customSessionStorage.ts
import type { Session } from "@shopify/shopify-api";
import { supabase } from "./frontend/lib/supabaseClient.js";

export const customSessionStorage = {
  async storeSession(session: Session): Promise<boolean> {
    const { data, error } = await supabase
      .from("shopify_sessions")
      .upsert({ id: session.id, session: JSON.stringify(session) });

    return !error;
  },

  async loadSession(id: string): Promise<Session | undefined> {
    const { data, error } = await supabase
      .from("shopify_sessions")
      .select("session")
      .eq("id", id)
      .single();

    if (error || !data) return undefined;
    return JSON.parse(data.session);
  },

  async deleteSession(id: string): Promise<boolean> {
    const { error } = await supabase
      .from("shopify_sessions")
      .delete()
      .eq("id", id);

    return !error;
  },

  async deleteSessions(ids: string[]): Promise<boolean> {
    const { error } = await supabase
      .from("shopify_sessions")
      .delete()
      .in("id", ids);

    return !error;
  },

  async findSessionsByShop(shop: string): Promise<Session[]> {
    const { data, error } = await supabase
      .from("shopify_sessions")
      .select("session");

    if (error || !data) return [];

    return data
      .map((row) => JSON.parse(row.session))
      .filter((session) => session.shop === shop);
  },
};