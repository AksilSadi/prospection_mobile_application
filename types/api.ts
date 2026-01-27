export interface GraphQLResponse<T> {
  data?: T;
  errors?: Array<{
    message: string;
    locations?: Array<{
      line: number;
      column: number;
    }>;
    path?: Array<string | number>;
  }>;
}

export interface ApiError {
  message: string;
  statusCode?: number;
  timestamp?: string;
  path?: string;
}

export class ApiException extends Error {
  constructor(
    message: string,
    public statusCode?: number,
    public errors?: ApiError[]
  ) {
    super(message);
    this.name = 'ApiException';
  }
}

export type Statistic = {
  id: number;
  commercialId?: number | null;
  managerId?: number | null;
  immeubleId?: number | null;
  zoneId?: number | null;
  contratsSignes: number;
  immeublesVisites: number;
  rendezVousPris: number;
  refus: number;
};

export type Porte = {
  id: number;
  numero: string;
  nomPersonnalise?: string | null;
  etage: number;
  immeubleId: number;
  statut: string;
  nbRepassages?: number | null;
  nbContrats?: number | null;
  rdvDate?: string | null;
  rdvTime?: string | null;
  commentaire?: string | null;
  derniereVisite?: string | null;
};

export type CreatePorteInput = {
  numero: string;
  nomPersonnalise?: string | null;
  etage: number;
  immeubleId: number;
  statut?: string;
  nbRepassages?: number | null;
  nbContrats?: number | null;
  rdvDate?: string | null;
  rdvTime?: string | null;
  commentaire?: string | null;
  derniereVisite?: string | null;
};

export type Immeuble = {
  id: number;
  adresse: string;
  nbEtages: number;
  nbPortesParEtage: number;
  updatedAt?: string;
  ascenseurPresent?: boolean | null;
  digitalCode?: string | null;
  commercialId?: number | null;
  managerId?: number | null;
  zoneId?: number | null;
  portes?: Porte[];
};

export type CreateImmeubleInput = {
  adresse: string;
  nbEtages: number;
  nbPortesParEtage: number;
  commercialId?: number;
  managerId?: number;
  zoneId?: number;
  ascenseurPresent?: boolean | null;
  digitalCode?: string | null;
  latitude?: number | null;
  longitude?: number | null;
};

export type Commercial = {
  id: number;
  nom: string;
  prenom: string;
  email?: string | null;
  numTel?: string | null;
  managerId?: number | null;
  immeubles?: Immeuble[];
  statistics?: Statistic[];
};

export type Manager = {
  id: number;
  nom: string;
  prenom: string;
  email?: string | null;
  numTelephone?: string | null;
  immeubles?: Immeuble[];
  statistics?: Statistic[];
  personalStatistics?: Statistic[];
};

export type CommercialTeamRanking = {
  position: number;
  total: number;
  points: number;
  trend?: string | null;
  managerNom?: string | null;
  managerPrenom?: string | null;
  managerEmail?: string | null;
  managerNumTel?: string | null;
};

export type UpdatePorteInput = {
  id: number;
  numero?: string;
  nomPersonnalise?: string | null;
  etage?: number;
  statut?: string;
  nbRepassages?: number | null;
  nbContrats?: number | null;
  rdvDate?: string | null;
  rdvTime?: string | null;
  commentaire?: string | null;
  derniereVisite?: string | null;
};
