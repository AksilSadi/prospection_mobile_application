import { gql } from "@/services/core/graphql";
import type { Porte, UpdatePorteInput } from "@/types/api";
import { UPDATE_PORTE } from "./porte.mutations";

export const porteApi = {
  async update(input: UpdatePorteInput): Promise<Porte> {
    const response = await gql<
      { updatePorte: Porte },
      { updatePorteInput: UpdatePorteInput }
    >(UPDATE_PORTE, { updatePorteInput: input });
    return response.updatePorte;
  },
};
