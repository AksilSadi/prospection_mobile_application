import { commercialApi } from "./commercials/commercial.service";
import { immeubleApi } from "./immeubles/immeuble.service";
import { managerApi } from "./managers/manager.service";
import { porteApi } from "./portes/porte.service";
import { statisticApi } from "./statistics/statistic.service";

export const api = {
  commercials: commercialApi,
  immeubles: immeubleApi,
  managers: managerApi,
  portes: porteApi,
  statistics: statisticApi,
};
