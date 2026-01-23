import { useState } from "react";
import { api } from "@/services/api";
import type { Porte, UpdatePorteInput } from "@/types/api";

export function useUpdatePorte() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const update = async (input: UpdatePorteInput): Promise<Porte | null> => {
    try {
      setLoading(true);
      setError(null);
      const result = await api.portes.update(input);
      return result;
    } catch (err: any) {
      setError(err?.message || "Erreur mise a jour porte");
      return null;
    } finally {
      setLoading(false);
    }
  };

  return { update, loading, error };
}
