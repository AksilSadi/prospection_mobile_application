import { gql } from "@/services/core/graphql";
import type { CreateImmeubleInput, Immeuble } from "@/types/api";
import { CREATE_IMMEUBLE } from "./immeuble.mutations";

export const immeubleApi = {
  async create(input: CreateImmeubleInput): Promise<Immeuble> {
    const response = await gql<
      { createImmeuble: Immeuble },
      { createImmeubleInput: CreateImmeubleInput }
    >(CREATE_IMMEUBLE, { createImmeubleInput: input });
    return response.createImmeuble;
  },
};
