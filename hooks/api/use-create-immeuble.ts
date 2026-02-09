import { useState } from "react";
import { api } from "@/services/api";
import type { CreateImmeubleInput, Immeuble } from "@/types/api";
import { syncWorkspaceMutation } from "./data-sync";

export function useCreateImmeuble() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const create = async (input: CreateImmeubleInput): Promise<Immeuble | null> => {
    try {
      setLoading(true);
      setError(null);
      console.log("[Immeuble] create payload", input);
      const result = await api.immeubles.create(input);
      syncWorkspaceMutation("IMMEUBLE_CREATED", { immeubleId: result.id });
      console.log("[Immeuble] create success", result);
      return result;
    } catch (err: any) {
      console.log("[Immeuble] create error", err);
      setError(err?.message || "Erreur creation immeuble");
      return null;
    } finally {
      setLoading(false);
    }
  };

  return { create, loading, error };
}
