import { gql } from "@/services/core/graphql";
import type { Manager } from "@/types/api";
import { GET_MANAGER_PERSONAL } from "./manager.queries";

export const managerApi = {
  async getPersonalById(id: number): Promise<Manager> {
    const response = await gql<{ managerPersonal: Manager }, { id: number }>(GET_MANAGER_PERSONAL, {
      id,
    });
    return response.managerPersonal;
  },
};
