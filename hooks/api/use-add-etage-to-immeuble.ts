import { useState } from "react";
import { api } from "@/services/api";
import type { Immeuble } from "@/types/api";
import { syncWorkspaceMutation } from "./data-sync";

export function useAddEtageToImmeuble() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const add = async (id: number): Promise<Immeuble | null> => {
    try {
      setLoading(true);
      setError(null);
      const result = await api.immeubles.addEtageToImmeuble(id);
      syncWorkspaceMutation("IMMEUBLE_UPDATED", { immeubleId: id });
      return result;
    } catch (err: any) {
      setError(err?.message || "Erreur ajout etage");
      return null;
    } finally {
      setLoading(false);
    }
  };

  return { add, loading, error };
}
