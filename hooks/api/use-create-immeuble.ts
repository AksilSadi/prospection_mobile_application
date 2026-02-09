import { useRef, useState } from "react";
import { api } from "@/services/api";
import type { CreateImmeubleInput, Immeuble } from "@/types/api";
import { syncWorkspaceMutation } from "./data-sync";

export function useCreateImmeuble() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const requestVersionRef = useRef(0);

  const cancel = () => {
    requestVersionRef.current += 1;
    setLoading(false);
  };

  const create = async (input: CreateImmeubleInput): Promise<Immeuble | null> => {
    const requestVersion = requestVersionRef.current + 1;
    requestVersionRef.current = requestVersion;
    try {
      setLoading(true);
      setError(null);
      console.log("[Immeuble] create payload", input);
      const result = await api.immeubles.create(input);
      if (requestVersion !== requestVersionRef.current) {
        return null;
      }
      syncWorkspaceMutation("IMMEUBLE_CREATED", { immeubleId: result.id });
      console.log("[Immeuble] create success", result);
      return result;
    } catch (err: any) {
      if (requestVersion !== requestVersionRef.current) {
        return null;
      }
      console.log("[Immeuble] create error", err);
      setError(err?.message || "Erreur creation immeuble");
      return null;
    } finally {
      if (requestVersion === requestVersionRef.current) {
        setLoading(false);
      }
    }
  };

  return { create, cancel, loading, error };
}
