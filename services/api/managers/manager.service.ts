import { gql } from "@/services/core/graphql";
import type { Manager } from "@/types/api";
import { GET_MANAGER_PERSONAL, GET_MANAGERS } from "./manager.queries";

export const managerApi = {
  async getAll(): Promise<Manager[]> {
    const response = await gql<{ managers: Manager[] }>(GET_MANAGERS);
    return response.managers;
  },

  async getPersonalById(id: number): Promise<Manager> {
    const response = await gql<{ managerPersonal: Manager }, { id: number }>(GET_MANAGER_PERSONAL, {
      id,
    });
    return response.managerPersonal;
  },
};
