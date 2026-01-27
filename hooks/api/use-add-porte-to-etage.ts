import { useState } from "react";
import { api } from "@/services/api";
import type { Immeuble } from "@/types/api";

export function useAddPorteToEtage() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const add = async (
    immeubleId: number,
    etage: number,
  ): Promise<Immeuble | null> => {
    try {
      setLoading(true);
      setError(null);
      const result = await api.immeubles.addPorteToEtage(immeubleId, etage);
      return result;
    } catch (err: any) {
      setError(err?.message || "Erreur ajout porte");
      return null;
    } finally {
      setLoading(false);
    }
  };

  return { add, loading, error };
}
