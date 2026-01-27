import { gql } from "@/services/core/graphql";
import type { CreateImmeubleInput, Immeuble } from "@/types/api";
import {
  ADD_ETAGE_TO_IMMEUBLE,
  ADD_PORTE_TO_ETAGE,
  CREATE_IMMEUBLE,
  REMOVE_ETAGE_FROM_IMMEUBLE,
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

  async addEtageToImmeuble(id: number): Promise<Immeuble> {
    const response = await gql<{ addEtageToImmeuble: Immeuble }, { id: number }>(
      ADD_ETAGE_TO_IMMEUBLE,
      { id },
    );
    return response.addEtageToImmeuble;
  },

  async addPorteToEtage(immeubleId: number, etage: number): Promise<Immeuble> {
    const response = await gql<
      { addPorteToEtage: Immeuble },
      { immeubleId: number; etage: number }
    >(ADD_PORTE_TO_ETAGE, { immeubleId, etage });
    return response.addPorteToEtage;
  },

  async removeEtageFromImmeuble(id: number): Promise<Immeuble> {
    const response = await gql<
      { removeEtageFromImmeuble: Immeuble },
      { id: number }
    >(REMOVE_ETAGE_FROM_IMMEUBLE, { id });
    return response.removeEtageFromImmeuble;
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
