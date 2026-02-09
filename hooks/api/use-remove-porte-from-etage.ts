import { useState } from "react";
import { api } from "@/services/api";
import type { Immeuble } from "@/types/api";
import { syncWorkspaceMutation } from "./data-sync";

export function useRemovePorteFromEtage() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const remove = async (
    immeubleId: number,
    etage: number,
  ): Promise<Immeuble | null> => {
    try {
      setLoading(true);
      setError(null);
      const result = await api.immeubles.removePorteFromEtage(
        immeubleId,
        etage,
      );
      syncWorkspaceMutation("IMMEUBLE_UPDATED", { immeubleId });
      return result;
    } catch (err: any) {
      setError(err?.message || "Erreur suppression porte");
      return null;
    } finally {
      setLoading(false);
    }
  };

  return { remove, loading, error };
}
