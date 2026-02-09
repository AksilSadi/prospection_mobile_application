import { useState } from "react";
import { api } from "@/services/api";
import type { CreatePorteInput, Porte } from "@/types/api";
import { syncWorkspaceMutation } from "./data-sync";

export function useCreatePorte() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const create = async (input: CreatePorteInput): Promise<Porte | null> => {
    try {
      setLoading(true);
      setError(null);
      const result = await api.portes.create(input);
      syncWorkspaceMutation("PORTE_CREATED", {
        immeubleId: input.immeubleId,
        porteId: result.id,
      });
      return result;
    } catch (err: any) {
      setError(err?.message || "Erreur creation porte");
      return null;
    } finally {
      setLoading(false);
    }
  };

  return { create, loading, error };
}
