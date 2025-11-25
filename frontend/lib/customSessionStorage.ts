// customSessionStorage.ts
import type { Session } from "@shopify/shopify-api";
import { supabase } from "./supabaseClient";

export const customSessionStorage = {
  async storeSession(session: Session): Promise<boolean> {
    try {
      const { error } = await supabase
        .from("shopify_sessions")
        .upsert({
          id: session.id,
          shop: session.shop,                 // 👈 lägg till shop för snabbare queries
          session: JSON.stringify(session),
        });

      if (error) {
        console.error("❌ storeSession error:", error);
        return false;
      }

      return true;
    } catch (err) {
      console.error("❌ storeSession crash:", err);
      return false;
    }
  },

  async loadSession(id: string): Promise<Session | undefined> {
    try {
      const { data, error } = await supabase
        .from("shopify_sessions")
        .select("session")
        .eq("id", id)
        .single();

      if (error || !data) return undefined;

      return JSON.parse(data.session) as Session;
    } catch (err) {
      console.error("❌ loadSession crash:", err);
      return undefined;
    }
  },

  async deleteSession(id: string): Promise<boolean> {
    try {
      const { error } = await supabase
        .from("shopify_sessions")
        .delete()
        .eq("id", id);

      if (error) {
        console.error("❌ deleteSession error:", error);
        return false;
      }

      return true;
    } catch (err) {
      console.error("❌ deleteSession crash:", err);
      return false;
    }
  },

  async deleteSessions(ids: string[]): Promise<boolean> {
    try {
      const { error } = await supabase
        .from("shopify_sessions")
        .delete()
        .in("id", ids);

      if (error) {
        console.error("❌ deleteSessions error:", error);
        return false;
      }

      return true;
    } catch (err) {
      console.error("❌ deleteSessions crash:", err);
      return false;
    }
  },

  async findSessionsByShop(shop: string): Promise<Session[]> {
    try {
      const { data, error } = await supabase
        .from("shopify_sessions")
        .select("session")
        .eq("shop", shop);       // 👈 nu görs filtreringen i SQL

      if (error || !data) return [];

      return data.map((row) => JSON.parse(row.session) as Session);
    } catch (err) {
      console.error("❌ findSessionsByShop crash:", err);
      return [];
    }
  },
};
