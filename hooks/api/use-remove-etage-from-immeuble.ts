import { useState } from "react";
import { api } from "@/services/api";
import type { Immeuble } from "@/types/api";

export function useRemoveEtageFromImmeuble() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const remove = async (id: number): Promise<Immeuble | null> => {
    try {
      setLoading(true);
      setError(null);
      const result = await api.immeubles.removeEtageFromImmeuble(id);
      return result;
    } catch (err: any) {
      setError(err?.message || "Erreur suppression etage");
      return null;
    } finally {
      setLoading(false);
    }
  };

  return { remove, loading, error };
}
