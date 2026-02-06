import type {
  Commercial as SchemaCommercial,
  CommercialInfo as SchemaCommercialInfo,
  CreateImmeubleInput as SchemaCreateImmeubleInput,
  CreatePorteInput as SchemaCreatePorteInput,
  Immeuble as SchemaImmeuble,
  Manager as SchemaManager,
  ManagerInfo as SchemaManagerInfo,
  Porte as SchemaPorte,
  PorteInfo as SchemaPorteInfo,
  Statistic as SchemaStatistic,
  StatusHistorique as SchemaStatusHistorique,
  TeamRanking as SchemaTeamRanking,
  UpdatePorteInput as SchemaUpdatePorteInput,
  Zone as SchemaZone,
} from './graphql-schema';

export type { InputMaybe, Maybe, Scalars, StatutPorte, UserStatus, UserType } from './graphql-schema';

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
  id: SchemaStatistic['id'];
  commercialId?: SchemaStatistic['commercialId'];
  managerId?: SchemaStatistic['managerId'];
  directeurId?: SchemaStatistic['directeurId'];
  immeubleId?: SchemaStatistic['immeubleId'];
  zoneId?: SchemaStatistic['zoneId'];
  contratsSignes: SchemaStatistic['contratsSignes'];
  immeublesVisites: SchemaStatistic['immeublesVisites'];
  rendezVousPris: SchemaStatistic['rendezVousPris'];
  refus: SchemaStatistic['refus'];
  absents?: SchemaStatistic['absents'];
  argumentes?: SchemaStatistic['argumentes'];
  nbImmeublesProspectes?: SchemaStatistic['nbImmeublesProspectes'];
  nbPortesProspectes?: SchemaStatistic['nbPortesProspectes'];
  createdAt?: SchemaStatistic['createdAt'];
  updatedAt?: SchemaStatistic['updatedAt'];
};

export type TimelinePoint = {
  date: string;
  rdvPris: number;
  portesProspectees: number;
  contratsSignes: number;
  refus: number;
  absents: number;
  argumentes: number;
};

export type Zone = {
  id: SchemaZone['id'];
  nom: SchemaZone['nom'];
};

export type Porte = {
  id: SchemaPorte['id'];
  numero: SchemaPorte['numero'];
  nomPersonnalise?: SchemaPorte['nomPersonnalise'];
  etage: SchemaPorte['etage'];
  immeubleId: SchemaPorte['immeubleId'];
  statut: SchemaPorte['statut'] | string;
  nbRepassages?: SchemaPorte['nbRepassages'] | null;
  nbContrats?: SchemaPorte['nbContrats'] | null;
  rdvDate?: SchemaPorte['rdvDate'];
  rdvTime?: SchemaPorte['rdvTime'];
  commentaire?: SchemaPorte['commentaire'];
  derniereVisite?: SchemaPorte['derniereVisite'];
};

export type CreatePorteInput = {
  numero: SchemaCreatePorteInput['numero'];
  nomPersonnalise?: SchemaCreatePorteInput['nomPersonnalise'];
  etage: SchemaCreatePorteInput['etage'];
  immeubleId: SchemaCreatePorteInput['immeubleId'];
  statut?: SchemaCreatePorteInput['statut'] | string;
  nbRepassages?: SchemaCreatePorteInput['nbRepassages'] | null;
  nbContrats?: SchemaCreatePorteInput['nbContrats'] | null;
  rdvDate?: SchemaCreatePorteInput['rdvDate'];
  rdvTime?: SchemaCreatePorteInput['rdvTime'];
  commentaire?: SchemaCreatePorteInput['commentaire'];
  derniereVisite?: SchemaCreatePorteInput['derniereVisite'];
};

export type Immeuble = {
  id: SchemaImmeuble['id'];
  adresse: SchemaImmeuble['adresse'];
  nbEtages: SchemaImmeuble['nbEtages'];
  nbPortesParEtage: SchemaImmeuble['nbPortesParEtage'];
  updatedAt?: SchemaImmeuble['updatedAt'];
  ascenseurPresent?: SchemaImmeuble['ascenseurPresent'] | null;
  digitalCode?: SchemaImmeuble['digitalCode'];
  commercialId?: SchemaImmeuble['commercialId'];
  managerId?: SchemaImmeuble['managerId'];
  zoneId?: SchemaImmeuble['zoneId'];
  portes?: Porte[];
};

export type CommercialInfo = {
  id: SchemaCommercialInfo['id'];
  nom: SchemaCommercialInfo['nom'];
  prenom: SchemaCommercialInfo['prenom'];
};

export type ManagerInfo = {
  id: SchemaManagerInfo['id'];
  nom: SchemaManagerInfo['nom'];
  prenom: SchemaManagerInfo['prenom'];
};

export type PorteInfo = {
  id: SchemaPorteInfo['id'];
  numero: SchemaPorteInfo['numero'];
  etage: SchemaPorteInfo['etage'];
};

export type StatusHistorique = {
  id: SchemaStatusHistorique['id'];
  porteId: SchemaStatusHistorique['porteId'];
  commercialId?: SchemaStatusHistorique['commercialId'];
  managerId?: SchemaStatusHistorique['managerId'];
  statut: SchemaStatusHistorique['statut'] | string;
  commentaire?: SchemaStatusHistorique['commentaire'];
  rdvDate?: SchemaStatusHistorique['rdvDate'];
  rdvTime?: SchemaStatusHistorique['rdvTime'];
  createdAt: SchemaStatusHistorique['createdAt'];
  porte?: PorteInfo | null;
  commercial?: CommercialInfo | null;
  manager?: ManagerInfo | null;
};

export type CreateImmeubleInput = {
  adresse: SchemaCreateImmeubleInput['adresse'];
  nbEtages: SchemaCreateImmeubleInput['nbEtages'];
  nbPortesParEtage: SchemaCreateImmeubleInput['nbPortesParEtage'];
  commercialId?: SchemaCreateImmeubleInput['commercialId'];
  managerId?: SchemaCreateImmeubleInput['managerId'];
  zoneId?: SchemaCreateImmeubleInput['zoneId'];
  ascenseurPresent?: SchemaCreateImmeubleInput['ascenseurPresent'] | null;
  digitalCode?: SchemaCreateImmeubleInput['digitalCode'];
  latitude?: SchemaCreateImmeubleInput['latitude'];
  longitude?: SchemaCreateImmeubleInput['longitude'];
};

export type Commercial = {
  id: SchemaCommercial['id'];
  nom: SchemaCommercial['nom'];
  prenom: SchemaCommercial['prenom'];
  email?: SchemaCommercial['email'] | null;
  numTel?: SchemaCommercial['numTel'];
  managerId?: SchemaCommercial['managerId'];
  immeubles?: Immeuble[];
  statistics?: Statistic[];
  zones?: Zone[];
};

export type Manager = {
  id: SchemaManager['id'];
  nom: SchemaManager['nom'];
  prenom: SchemaManager['prenom'];
  email?: SchemaManager['email'];
  numTelephone?: SchemaManager['numTelephone'];
  immeubles?: Immeuble[];
  statistics?: Statistic[];
  personalStatistics?: Statistic[];
  commercials?: Commercial[];
  teamStatistics?: Statistic[];
  zones?: Zone[];
};

export type CommercialTeamRanking = {
  position: SchemaTeamRanking['position'];
  total: SchemaTeamRanking['total'];
  points: SchemaTeamRanking['points'];
  trend?: SchemaTeamRanking['trend'];
  managerNom?: SchemaTeamRanking['managerNom'];
  managerPrenom?: SchemaTeamRanking['managerPrenom'];
  managerEmail?: SchemaTeamRanking['managerEmail'];
  managerNumTel?: SchemaTeamRanking['managerNumTel'];
};

export type UpdatePorteInput = {
  id: SchemaUpdatePorteInput['id'];
  numero?: SchemaUpdatePorteInput['numero'];
  nomPersonnalise?: SchemaUpdatePorteInput['nomPersonnalise'];
  etage?: SchemaUpdatePorteInput['etage'];
  statut?: SchemaUpdatePorteInput['statut'] | string;
  nbRepassages?: SchemaUpdatePorteInput['nbRepassages'] | null;
  nbContrats?: SchemaUpdatePorteInput['nbContrats'] | null;
  rdvDate?: SchemaUpdatePorteInput['rdvDate'];
  rdvTime?: SchemaUpdatePorteInput['rdvTime'];
  commentaire?: SchemaUpdatePorteInput['commentaire'];
  derniereVisite?: SchemaUpdatePorteInput['derniereVisite'];
};
