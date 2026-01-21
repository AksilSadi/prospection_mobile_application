import { commercialApi } from "./commercials/commercial.service";
import { immeubleApi } from "./immeubles/immeuble.service";
import { managerApi } from "./managers/manager.service";

export const api = {
  commercials: commercialApi,
  immeubles: immeubleApi,
  managers: managerApi,
};
