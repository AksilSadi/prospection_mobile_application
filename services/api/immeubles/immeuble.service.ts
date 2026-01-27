import { gql } from "@/services/core/graphql";
import type { CreateImmeubleInput, Immeuble } from "@/types/api";
import {
  CREATE_IMMEUBLE,
  REMOVE_PORTE_FROM_ETAGE,
} from "./immeuble.mutations";

export const immeubleApi = {
  async create(input: CreateImmeubleInput): Promise<Immeuble> {
    const response = await gql<
      { createImmeuble: Immeuble },
      { createImmeubleInput: CreateImmeubleInput }
    >(CREATE_IMMEUBLE, { createImmeubleInput: input });
    return response.createImmeuble;
  },

  async removePorteFromEtage(
    immeubleId: number,
    etage: number,
  ): Promise<Immeuble> {
    const response = await gql<
      { removePorteFromEtage: Immeuble },
      { immeubleId: number; etage: number }
    >(REMOVE_PORTE_FROM_ETAGE, { immeubleId, etage });
    return response.removePorteFromEtage;
  },
};
