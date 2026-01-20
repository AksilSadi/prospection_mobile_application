import { commercialApi } from "./commercials/commercial.service";
import { managerApi } from "./managers/manager.service";

export const api = {
  commercials: commercialApi,
  managers: managerApi,
};
