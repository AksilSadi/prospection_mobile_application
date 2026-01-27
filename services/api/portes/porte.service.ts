import { gql } from "@/services/core/graphql";
import type { CreatePorteInput, Porte, UpdatePorteInput } from "@/types/api";
import { CREATE_PORTE, REMOVE_PORTE, UPDATE_PORTE } from "./porte.mutations";

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
};
