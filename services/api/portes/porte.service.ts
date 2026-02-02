import { gql } from "@/services/core/graphql";
import type {
  CreatePorteInput,
  Porte,
  StatusHistorique,
  UpdatePorteInput,
} from "@/types/api";
import { CREATE_PORTE, REMOVE_PORTE, UPDATE_PORTE } from "./porte.mutations";

const STATUS_HISTORIQUE_BY_IMMEUBLE = `
  query StatusHistoriqueByImmeuble($immeubleId: Int!) {
    statusHistoriqueByImmeuble(immeubleId: $immeubleId) {
      id
      porteId
      statut
      commentaire
      rdvDate
      rdvTime
      createdAt
      porte {
        id
        numero
        etage
      }
      commercial {
        id
        nom
        prenom
      }
      manager {
        id
        nom
        prenom
      }
    }
  }
`;

export const porteApi = {
  async create(input: CreatePorteInput): Promise<Porte> {
    const response = await gql<
      { createPorte: Porte },
      { createPorteInput: CreatePorteInput }
    >(CREATE_PORTE, { createPorteInput: input });
    return response.createPorte;
  },

  async update(input: UpdatePorteInput): Promise<Porte> {
    const response = await gql<
      { updatePorte: Porte },
      { updatePorteInput: UpdatePorteInput }
    >(UPDATE_PORTE, { updatePorteInput: input });
    return response.updatePorte;
  },

  async remove(id: number): Promise<Porte> {
    const response = await gql<{ removePorte: Porte }, { id: number }>(
      REMOVE_PORTE,
      { id },
    );
    return response.removePorte;
  },

  async statusHistoriqueByImmeuble(
    immeubleId: number,
  ): Promise<StatusHistorique[]> {
    const response = await gql<
      { statusHistoriqueByImmeuble: StatusHistorique[] },
      { immeubleId: number }
    >(STATUS_HISTORIQUE_BY_IMMEUBLE, { immeubleId });
    return response.statusHistoriqueByImmeuble;
  },
};
