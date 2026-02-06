export type Maybe<T> = T | null;
export type InputMaybe<T> = T | null | undefined;
export type Exact<T extends { [key: string]: unknown }> = { [K in keyof T]: T[K] };
export type MakeOptional<T, K extends keyof T> = Omit<T, K> & { [SubKey in K]?: Maybe<T[SubKey]> };
export type MakeMaybe<T, K extends keyof T> = Omit<T, K> & { [SubKey in K]: Maybe<T[SubKey]> };
export type MakeEmpty<T extends { [key: string]: unknown }, K extends keyof T> = { [_ in K]?: never };
export type Incremental<T> = T | { [P in keyof T]?: P extends ' $fragmentName' | '__typename' ? T[P] : never };
/** All built-in and custom scalars, mapped to their actual values */
export type Scalars = {
  ID: { input: string; output: string; }
  String: { input: string; output: string; }
  Boolean: { input: boolean; output: boolean; }
  Int: { input: number; output: number; }
  Float: { input: number; output: number; }
  DateTime: { input: string; output: string; }
};

export type ActiveRoom = {
  __typename?: 'ActiveRoom';
  createdAt: Scalars['DateTime']['output'];
  numParticipants: Scalars['Int']['output'];
  participantNames: Array<Scalars['String']['output']>;
  roomName: Scalars['String']['output'];
};

export type AssignZoneInput = {
  userId: Scalars['Int']['input'];
  userType: UserType;
  zoneId: Scalars['Int']['input'];
};

export type AuthResponse = {
  __typename?: 'AuthResponse';
  access_token: Scalars['String']['output'];
  email?: Maybe<Scalars['String']['output']>;
  expires_in: Scalars['Float']['output'];
  groups: Array<Scalars['String']['output']>;
  refresh_token: Scalars['String']['output'];
  role: Scalars['String']['output'];
  scope?: Maybe<Scalars['String']['output']>;
  token_type?: Maybe<Scalars['String']['output']>;
  userId: Scalars['Float']['output'];
};

export type Commercial = {
  __typename?: 'Commercial';
  age?: Maybe<Scalars['Int']['output']>;
  createdAt: Scalars['DateTime']['output'];
  directeurId?: Maybe<Scalars['Int']['output']>;
  email: Scalars['String']['output'];
  id: Scalars['Int']['output'];
  immeubles: Array<Immeuble>;
  managerId?: Maybe<Scalars['Int']['output']>;
  nom: Scalars['String']['output'];
  numTel?: Maybe<Scalars['String']['output']>;
  prenom: Scalars['String']['output'];
  statistics: Array<Statistic>;
  status: UserStatus;
  updatedAt: Scalars['DateTime']['output'];
  zones: Array<Zone>;
};

export type CommercialInfo = {
  __typename?: 'CommercialInfo';
  id: Scalars['Int']['output'];
  nom: Scalars['String']['output'];
  prenom: Scalars['String']['output'];
};

export type CreateCommercialInput = {
  age: Scalars['Int']['input'];
  directeurId?: InputMaybe<Scalars['Int']['input']>;
  email: Scalars['String']['input'];
  managerId?: InputMaybe<Scalars['Int']['input']>;
  nom: Scalars['String']['input'];
  numTel: Scalars['String']['input'];
  prenom: Scalars['String']['input'];
  status?: InputMaybe<UserStatus>;
};

export type CreateDirecteurInput = {
  adresse: Scalars['String']['input'];
  email: Scalars['String']['input'];
  nom: Scalars['String']['input'];
  numTelephone: Scalars['String']['input'];
  prenom: Scalars['String']['input'];
  status?: InputMaybe<UserStatus>;
};

export type CreateImmeubleInput = {
  adresse: Scalars['String']['input'];
  ascenseurPresent: Scalars['Boolean']['input'];
  commercialId?: InputMaybe<Scalars['Int']['input']>;
  digitalCode?: InputMaybe<Scalars['String']['input']>;
  latitude?: InputMaybe<Scalars['Float']['input']>;
  longitude?: InputMaybe<Scalars['Float']['input']>;
  managerId?: InputMaybe<Scalars['Int']['input']>;
  nbEtages: Scalars['Int']['input'];
  nbPortesParEtage: Scalars['Int']['input'];
  zoneId?: InputMaybe<Scalars['Int']['input']>;
};

export type CreateManagerInput = {
  directeurId?: InputMaybe<Scalars['Int']['input']>;
  email: Scalars['String']['input'];
  nom: Scalars['String']['input'];
  numTelephone?: InputMaybe<Scalars['String']['input']>;
  prenom: Scalars['String']['input'];
  status?: InputMaybe<UserStatus>;
};

export type CreatePorteInput = {
  commentaire?: InputMaybe<Scalars['String']['input']>;
  derniereVisite?: InputMaybe<Scalars['DateTime']['input']>;
  etage: Scalars['Int']['input'];
  immeubleId: Scalars['Int']['input'];
  nbContrats?: Scalars['Int']['input'];
  nbRepassages?: Scalars['Int']['input'];
  nomPersonnalise?: InputMaybe<Scalars['String']['input']>;
  numero: Scalars['String']['input'];
  rdvDate?: InputMaybe<Scalars['DateTime']['input']>;
  rdvTime?: InputMaybe<Scalars['String']['input']>;
  statut?: StatutPorte;
};

export type CreateStatisticInput = {
  absents: Scalars['Int']['input'];
  argumentes: Scalars['Int']['input'];
  commercialId?: InputMaybe<Scalars['Int']['input']>;
  contratsSignes: Scalars['Int']['input'];
  directeurId?: InputMaybe<Scalars['Int']['input']>;
  immeubleId?: InputMaybe<Scalars['Int']['input']>;
  immeublesVisites: Scalars['Int']['input'];
  managerId?: InputMaybe<Scalars['Int']['input']>;
  nbImmeublesProspectes: Scalars['Int']['input'];
  nbPortesProspectes: Scalars['Int']['input'];
  refus: Scalars['Int']['input'];
  rendezVousPris: Scalars['Int']['input'];
  zoneId?: InputMaybe<Scalars['Int']['input']>;
};

export type CreateZoneInput = {
  directeurId?: InputMaybe<Scalars['Int']['input']>;
  managerId?: InputMaybe<Scalars['Int']['input']>;
  nom: Scalars['String']['input'];
  rayon: Scalars['Float']['input'];
  xOrigin: Scalars['Float']['input'];
  yOrigin: Scalars['Float']['input'];
};

export type CreerUtilisateurInput = {
  email?: InputMaybe<Scalars['String']['input']>;
  nom: Scalars['String']['input'];
  prenom: Scalars['String']['input'];
  role: RoleUtilisateur;
};

export type Directeur = {
  __typename?: 'Directeur';
  adresse?: Maybe<Scalars['String']['output']>;
  createdAt: Scalars['DateTime']['output'];
  email: Scalars['String']['output'];
  id: Scalars['Int']['output'];
  nom: Scalars['String']['output'];
  numTelephone?: Maybe<Scalars['String']['output']>;
  prenom: Scalars['String']['output'];
  statistics?: Maybe<Array<Statistic>>;
  status: UserStatus;
  updatedAt: Scalars['DateTime']['output'];
};

export type EgressState = {
  __typename?: 'EgressState';
  egressId: Scalars['String']['output'];
  error?: Maybe<Scalars['String']['output']>;
  roomName?: Maybe<Scalars['String']['output']>;
  status: Scalars['String']['output'];
};

export type EtageInStatistics = {
  __typename?: 'EtageInStatistics';
  count: Scalars['Int']['output'];
  etage: Scalars['Int']['output'];
};

export type HistoriqueZone = {
  __typename?: 'HistoriqueZone';
  assignedAt: Scalars['DateTime']['output'];
  id: Scalars['Int']['output'];
  totalContratsSignes: Scalars['Int']['output'];
  totalImmeublesProspectes: Scalars['Int']['output'];
  totalImmeublesVisites: Scalars['Int']['output'];
  totalPortesProspectes: Scalars['Int']['output'];
  totalRefus: Scalars['Int']['output'];
  totalRendezVousPris: Scalars['Int']['output'];
  unassignedAt: Scalars['DateTime']['output'];
  userId: Scalars['Int']['output'];
  userType: UserType;
  zone?: Maybe<Zone>;
  zoneId: Scalars['Int']['output'];
};

export type Immeuble = {
  __typename?: 'Immeuble';
  adresse: Scalars['String']['output'];
  ascenseurPresent: Scalars['Boolean']['output'];
  commercialId?: Maybe<Scalars['Int']['output']>;
  createdAt: Scalars['DateTime']['output'];
  digitalCode?: Maybe<Scalars['String']['output']>;
  id: Scalars['Int']['output'];
  latitude?: Maybe<Scalars['Float']['output']>;
  longitude?: Maybe<Scalars['Float']['output']>;
  managerId?: Maybe<Scalars['Int']['output']>;
  nbEtages: Scalars['Int']['output'];
  nbPortesParEtage: Scalars['Int']['output'];
  portes?: Maybe<Array<Porte>>;
  updatedAt: Scalars['DateTime']['output'];
  zoneId?: Maybe<Scalars['Int']['output']>;
};

export type LiveKitConnectionDetails = {
  __typename?: 'LiveKitConnectionDetails';
  participantName: Scalars['String']['output'];
  participantToken: Scalars['String']['output'];
  roomName: Scalars['String']['output'];
  serverUrl: Scalars['String']['output'];
};

export type LoginInput = {
  password: Scalars['String']['input'];
  username: Scalars['String']['input'];
};

export type Manager = {
  __typename?: 'Manager';
  commercials?: Maybe<Array<Commercial>>;
  createdAt: Scalars['DateTime']['output'];
  directeur?: Maybe<Directeur>;
  directeurId?: Maybe<Scalars['Int']['output']>;
  email?: Maybe<Scalars['String']['output']>;
  id: Scalars['Int']['output'];
  immeubles?: Maybe<Array<Immeuble>>;
  nom: Scalars['String']['output'];
  numTelephone?: Maybe<Scalars['String']['output']>;
  personalStatistics?: Maybe<Array<Statistic>>;
  prenom: Scalars['String']['output'];
  statistics?: Maybe<Array<Statistic>>;
  status: UserStatus;
  teamStatistics?: Maybe<Array<Statistic>>;
  updatedAt: Scalars['DateTime']['output'];
  zones?: Maybe<Array<Zone>>;
};

export type ManagerInfo = {
  __typename?: 'ManagerInfo';
  id: Scalars['Int']['output'];
  nom: Scalars['String']['output'];
  prenom: Scalars['String']['output'];
};

export type ModifierUtilisateurInput = {
  email: Scalars['String']['input'];
  nouveauMotDePasse: Scalars['String']['input'];
};

export type MonitoringSession = {
  __typename?: 'MonitoringSession';
  endedAt?: Maybe<Scalars['DateTime']['output']>;
  id: Scalars['ID']['output'];
  participantToken?: Maybe<Scalars['String']['output']>;
  roomName: Scalars['String']['output'];
  startedAt: Scalars['DateTime']['output'];
  status: MonitoringStatus;
  supervisorId: Scalars['Int']['output'];
  userId: Scalars['Int']['output'];
  userType: Scalars['String']['output'];
};

export type MonitoringStatus =
  | 'ACTIVE'
  | 'PAUSED'
  | 'STOPPED';

export type Mutation = {
  __typename?: 'Mutation';
  addEtageToImmeuble: Immeuble;
  addPorteToEtage: Immeuble;
  assignZoneToCommercial: Scalars['Boolean']['output'];
  assignZoneToDirecteur: Scalars['Boolean']['output'];
  assignZoneToManager: Scalars['Boolean']['output'];
  assignZoneToUser: ZoneEnCours;
  createCommercial: Commercial;
  createDirecteur: Directeur;
  createImmeuble: Immeuble;
  createManager: Manager;
  createPorte: Porte;
  createPortesForImmeuble: Scalars['Boolean']['output'];
  createStatistic: Statistic;
  createZone: Zone;
  creerUtilisateurProWin: ReponseCreationUtilisateur;
  generateCommercialToken: LiveKitConnectionDetails;
  generateManagerToken: LiveKitConnectionDetails;
  logAudioEvent: Scalars['Boolean']['output'];
  login: AuthResponse;
  modifierUtilisateur: ReponseModifierUtilisateur;
  recalculateAllStats: Scalars['String']['output'];
  refreshToken: AuthResponse;
  removeCommercial: Commercial;
  removeDirecteur: Directeur;
  removeEtageFromImmeuble: Immeuble;
  removeImmeuble: Immeuble;
  removeManager: Manager;
  removePorte: Porte;
  removePorteFromEtage: Immeuble;
  removeStatistic: Statistic;
  removeZone: Zone;
  startMonitoring: LiveKitConnectionDetails;
  startRecording: RecordingResult;
  stopMonitoring: Scalars['Boolean']['output'];
  stopRecording: Scalars['Boolean']['output'];
  supprimerUtilisateur: ReponseSupprimerUtilisateur;
  syncCommercialStats: Scalars['String']['output'];
  syncManagerStats: Scalars['String']['output'];
  unassignUser: Scalars['Boolean']['output'];
  unassignZoneFromCommercial: Scalars['Boolean']['output'];
  updateCommercial: Commercial;
  updateDirecteur: Directeur;
  updateImmeuble: Immeuble;
  updateManager: Manager;
  updatePorte: Porte;
  updateStatistic: Statistic;
  updateZone: Zone;
};


export type MutationAddEtageToImmeubleArgs = {
  id: Scalars['Int']['input'];
};


export type MutationAddPorteToEtageArgs = {
  etage: Scalars['Int']['input'];
  immeubleId: Scalars['Int']['input'];
};


export type MutationAssignZoneToCommercialArgs = {
  commercialId: Scalars['Int']['input'];
  zoneId: Scalars['Int']['input'];
};


export type MutationAssignZoneToDirecteurArgs = {
  directeurId: Scalars['Int']['input'];
  zoneId: Scalars['Int']['input'];
};


export type MutationAssignZoneToManagerArgs = {
  managerId: Scalars['Int']['input'];
  zoneId: Scalars['Int']['input'];
};


export type MutationAssignZoneToUserArgs = {
  input: AssignZoneInput;
};


export type MutationCreateCommercialArgs = {
  createCommercialInput: CreateCommercialInput;
};


export type MutationCreateDirecteurArgs = {
  createDirecteurInput: CreateDirecteurInput;
};


export type MutationCreateImmeubleArgs = {
  createImmeubleInput: CreateImmeubleInput;
};


export type MutationCreateManagerArgs = {
  createManagerInput: CreateManagerInput;
};


export type MutationCreatePorteArgs = {
  createPorteInput: CreatePorteInput;
};


export type MutationCreatePortesForImmeubleArgs = {
  immeubleId: Scalars['Int']['input'];
  nbEtages: Scalars['Int']['input'];
  nbPortesParEtage: Scalars['Int']['input'];
};


export type MutationCreateStatisticArgs = {
  createStatisticInput: CreateStatisticInput;
};


export type MutationCreateZoneArgs = {
  createZoneInput: CreateZoneInput;
};


export type MutationCreerUtilisateurProWinArgs = {
  input: CreerUtilisateurInput;
};


export type MutationGenerateCommercialTokenArgs = {
  commercialId?: InputMaybe<Scalars['Int']['input']>;
  roomName?: InputMaybe<Scalars['String']['input']>;
};


export type MutationGenerateManagerTokenArgs = {
  managerId?: InputMaybe<Scalars['Int']['input']>;
  roomName?: InputMaybe<Scalars['String']['input']>;
};


export type MutationLogAudioEventArgs = {
  details?: InputMaybe<Scalars['String']['input']>;
  eventType: Scalars['String']['input'];
  message: Scalars['String']['input'];
};


export type MutationLoginArgs = {
  loginInput: LoginInput;
};


export type MutationModifierUtilisateurArgs = {
  input: ModifierUtilisateurInput;
};


export type MutationRefreshTokenArgs = {
  refreshToken: Scalars['String']['input'];
};


export type MutationRemoveCommercialArgs = {
  id: Scalars['Int']['input'];
};


export type MutationRemoveDirecteurArgs = {
  id: Scalars['Int']['input'];
};


export type MutationRemoveEtageFromImmeubleArgs = {
  id: Scalars['Int']['input'];
};


export type MutationRemoveImmeubleArgs = {
  id: Scalars['Int']['input'];
};


export type MutationRemoveManagerArgs = {
  id: Scalars['Int']['input'];
};


export type MutationRemovePorteArgs = {
  id: Scalars['Int']['input'];
};


export type MutationRemovePorteFromEtageArgs = {
  etage: Scalars['Int']['input'];
  immeubleId: Scalars['Int']['input'];
};


export type MutationRemoveStatisticArgs = {
  id: Scalars['Int']['input'];
};


export type MutationRemoveZoneArgs = {
  id: Scalars['Int']['input'];
};


export type MutationStartMonitoringArgs = {
  input: StartMonitoringInput;
};


export type MutationStartRecordingArgs = {
  input: StartRecordingInput;
};


export type MutationStopMonitoringArgs = {
  input: StopMonitoringInput;
};


export type MutationStopRecordingArgs = {
  input: StopRecordingInput;
};


export type MutationSupprimerUtilisateurArgs = {
  input: SupprimerUtilisateurInput;
};


export type MutationSyncCommercialStatsArgs = {
  immeubleId: Scalars['Int']['input'];
};


export type MutationSyncManagerStatsArgs = {
  managerId: Scalars['Int']['input'];
};


export type MutationUnassignUserArgs = {
  userId: Scalars['Int']['input'];
  userType: UserType;
};


export type MutationUnassignZoneFromCommercialArgs = {
  commercialId: Scalars['Int']['input'];
  zoneId: Scalars['Int']['input'];
};


export type MutationUpdateCommercialArgs = {
  updateCommercialInput: UpdateCommercialInput;
};


export type MutationUpdateDirecteurArgs = {
  updateDirecteurInput: UpdateDirecteurInput;
};


export type MutationUpdateImmeubleArgs = {
  updateImmeubleInput: UpdateImmeubleInput;
};


export type MutationUpdateManagerArgs = {
  updateManagerInput: UpdateManagerInput;
};


export type MutationUpdatePorteArgs = {
  updatePorteInput: UpdatePorteInput;
};


export type MutationUpdateStatisticArgs = {
  updateStatisticInput: UpdateStatisticInput;
};


export type MutationUpdateZoneArgs = {
  updateZoneInput: UpdateZoneInput;
};

export type Porte = {
  __typename?: 'Porte';
  commentaire?: Maybe<Scalars['String']['output']>;
  createdAt: Scalars['DateTime']['output'];
  derniereVisite?: Maybe<Scalars['DateTime']['output']>;
  etage: Scalars['Int']['output'];
  id: Scalars['Int']['output'];
  immeubleId: Scalars['Int']['output'];
  nbContrats: Scalars['Int']['output'];
  nbRepassages: Scalars['Int']['output'];
  nomPersonnalise?: Maybe<Scalars['String']['output']>;
  numero: Scalars['String']['output'];
  rdvDate?: Maybe<Scalars['DateTime']['output']>;
  rdvTime?: Maybe<Scalars['String']['output']>;
  statut: StatutPorte;
  updatedAt: Scalars['DateTime']['output'];
};

export type PorteInfo = {
  __typename?: 'PorteInfo';
  etage: Scalars['Int']['output'];
  id: Scalars['Int']['output'];
  numero: Scalars['String']['output'];
};

export type PorteStatistics = {
  __typename?: 'PorteStatistics';
  absent: Scalars['Int']['output'];
  argumente: Scalars['Int']['output'];
  contratsSigne: Scalars['Int']['output'];
  necessiteRepassage: Scalars['Int']['output'];
  nonVisitees: Scalars['Int']['output'];
  portesParEtage: Array<EtageInStatistics>;
  portesVisitees: Scalars['Int']['output'];
  rdvPris: Scalars['Int']['output'];
  refus: Scalars['Int']['output'];
  tauxConversion: Scalars['String']['output'];
  totalPortes: Scalars['Int']['output'];
};

export type Query = {
  __typename?: 'Query';
  allCurrentAssignments: Array<ZoneEnCours>;
  allZoneHistory: Array<HistoriqueZone>;
  commercial: Commercial;
  commercialTeamRanking: TeamRanking;
  commercials: Array<Commercial>;
  currentUserAssignment?: Maybe<ZoneEnCours>;
  directeur: Directeur;
  directeurs: Array<Directeur>;
  egressState: EgressState;
  getActiveRooms: Array<ActiveRoom>;
  getActiveSessions: Array<MonitoringSession>;
  getStreamingUrl: Scalars['String']['output'];
  immeuble: Immeuble;
  immeubles: Array<Immeuble>;
  listRecordings: Array<RecordingItem>;
  manager: Manager;
  managerFull?: Maybe<Manager>;
  managerPersonal?: Maybe<Manager>;
  managers: Array<Manager>;
  me: UserInfo;
  porte: Porte;
  porteStatistics: PorteStatistics;
  portes: Array<Porte>;
  portesByImmeuble: Array<Porte>;
  portesModifiedToday: Array<Porte>;
  portesRdvToday: Array<Porte>;
  statistic: Statistic;
  statistics: Array<Statistic>;
  statusHistoriqueByImmeuble: Array<StatusHistorique>;
  statusHistoriqueByPorte: Array<StatusHistorique>;
  userZoneHistory: Array<HistoriqueZone>;
  validateStatsCoherence: Scalars['String']['output'];
  zone: Zone;
  zoneCurrentAssignments: Array<ZoneEnCours>;
  zoneHistory: Array<HistoriqueZone>;
  zoneStatistics: Array<ZoneStatistic>;
  zones: Array<Zone>;
};


export type QueryCommercialArgs = {
  id: Scalars['Int']['input'];
};


export type QueryCommercialTeamRankingArgs = {
  commercialId: Scalars['Int']['input'];
};


export type QueryCurrentUserAssignmentArgs = {
  userId: Scalars['Int']['input'];
  userType: UserType;
};


export type QueryDirecteurArgs = {
  id: Scalars['Int']['input'];
};


export type QueryEgressStateArgs = {
  egressId: Scalars['String']['input'];
};


export type QueryGetStreamingUrlArgs = {
  key: Scalars['String']['input'];
};


export type QueryImmeubleArgs = {
  id: Scalars['Int']['input'];
};


export type QueryListRecordingsArgs = {
  roomName: Scalars['String']['input'];
};


export type QueryManagerArgs = {
  id: Scalars['Int']['input'];
};


export type QueryManagerFullArgs = {
  id: Scalars['Int']['input'];
};


export type QueryManagerPersonalArgs = {
  id: Scalars['Int']['input'];
};


export type QueryPorteArgs = {
  id: Scalars['Int']['input'];
};


export type QueryPorteStatisticsArgs = {
  immeubleId: Scalars['Int']['input'];
};


export type QueryPortesByImmeubleArgs = {
  etage?: InputMaybe<Scalars['Int']['input']>;
  immeubleId: Scalars['Int']['input'];
  skip?: InputMaybe<Scalars['Int']['input']>;
  take?: InputMaybe<Scalars['Int']['input']>;
};


export type QueryPortesModifiedTodayArgs = {
  immeubleId?: InputMaybe<Scalars['Int']['input']>;
};


export type QueryStatisticArgs = {
  id: Scalars['Int']['input'];
};


export type QueryStatisticsArgs = {
  commercialId?: InputMaybe<Scalars['Int']['input']>;
};


export type QueryStatusHistoriqueByImmeubleArgs = {
  immeubleId: Scalars['Int']['input'];
};


export type QueryStatusHistoriqueByPorteArgs = {
  porteId: Scalars['Int']['input'];
};


export type QueryUserZoneHistoryArgs = {
  userId: Scalars['Int']['input'];
  userType: UserType;
};


export type QueryZoneArgs = {
  id: Scalars['Int']['input'];
};


export type QueryZoneCurrentAssignmentsArgs = {
  zoneId: Scalars['Int']['input'];
};


export type QueryZoneHistoryArgs = {
  zoneId: Scalars['Int']['input'];
};

export type RecordingItem = {
  __typename?: 'RecordingItem';
  key: Scalars['String']['output'];
  lastModified?: Maybe<Scalars['DateTime']['output']>;
  size?: Maybe<Scalars['Float']['output']>;
  url?: Maybe<Scalars['String']['output']>;
};

export type RecordingResult = {
  __typename?: 'RecordingResult';
  egressId: Scalars['String']['output'];
  roomName: Scalars['String']['output'];
  s3Key: Scalars['String']['output'];
  status: Scalars['String']['output'];
  url?: Maybe<Scalars['String']['output']>;
};

export type ReponseCreationUtilisateur = {
  __typename?: 'ReponseCreationUtilisateur';
  email?: Maybe<Scalars['String']['output']>;
  message?: Maybe<Scalars['String']['output']>;
  password?: Maybe<Scalars['String']['output']>;
  success: Scalars['Boolean']['output'];
  userId?: Maybe<Scalars['String']['output']>;
};

export type ReponseModifierUtilisateur = {
  __typename?: 'ReponseModifierUtilisateur';
  message?: Maybe<Scalars['String']['output']>;
  success: Scalars['Boolean']['output'];
};

export type ReponseSupprimerUtilisateur = {
  __typename?: 'ReponseSupprimerUtilisateur';
  message?: Maybe<Scalars['String']['output']>;
  success: Scalars['Boolean']['output'];
};

/** Rôle de l'utilisateur dans Pro Win */
export type RoleUtilisateur =
  | 'COMMERCIAL'
  | 'DIRECTEUR'
  | 'MANAGER';

export type StartMonitoringInput = {
  roomName?: InputMaybe<Scalars['String']['input']>;
  userId: Scalars['Int']['input'];
  userType: Scalars['String']['input'];
};

export type StartRecordingInput = {
  audioOnly?: InputMaybe<Scalars['Boolean']['input']>;
  immeubleId?: InputMaybe<Scalars['Float']['input']>;
  participantIdentity?: InputMaybe<Scalars['String']['input']>;
  roomName: Scalars['String']['input'];
};

export type Statistic = {
  __typename?: 'Statistic';
  absents: Scalars['Int']['output'];
  argumentes: Scalars['Int']['output'];
  commercialId?: Maybe<Scalars['Int']['output']>;
  contratsSignes: Scalars['Int']['output'];
  createdAt: Scalars['DateTime']['output'];
  directeurId?: Maybe<Scalars['Int']['output']>;
  id: Scalars['Int']['output'];
  immeubleId?: Maybe<Scalars['Int']['output']>;
  immeublesVisites: Scalars['Int']['output'];
  managerId?: Maybe<Scalars['Int']['output']>;
  nbImmeublesProspectes: Scalars['Int']['output'];
  nbPortesProspectes: Scalars['Int']['output'];
  refus: Scalars['Int']['output'];
  rendezVousPris: Scalars['Int']['output'];
  updatedAt: Scalars['DateTime']['output'];
  zoneId?: Maybe<Scalars['Int']['output']>;
};

export type StatusHistorique = {
  __typename?: 'StatusHistorique';
  commentaire?: Maybe<Scalars['String']['output']>;
  commercial?: Maybe<CommercialInfo>;
  commercialId?: Maybe<Scalars['Int']['output']>;
  createdAt: Scalars['DateTime']['output'];
  id: Scalars['Int']['output'];
  manager?: Maybe<ManagerInfo>;
  managerId?: Maybe<Scalars['Int']['output']>;
  porte?: Maybe<PorteInfo>;
  porteId: Scalars['Int']['output'];
  rdvDate?: Maybe<Scalars['DateTime']['output']>;
  rdvTime?: Maybe<Scalars['String']['output']>;
  statut: StatutPorte;
};

/** Statut possible pour une porte */
export type StatutPorte =
  | 'ABSENT'
  | 'ARGUMENTE'
  | 'CONTRAT_SIGNE'
  | 'NECESSITE_REPASSAGE'
  | 'NON_VISITE'
  | 'REFUS'
  | 'RENDEZ_VOUS_PRIS';

export type StopMonitoringInput = {
  sessionId: Scalars['ID']['input'];
};

export type StopRecordingInput = {
  egressId: Scalars['String']['input'];
};

export type SupprimerUtilisateurInput = {
  email: Scalars['String']['input'];
};

export type TeamRanking = {
  __typename?: 'TeamRanking';
  managerEmail?: Maybe<Scalars['String']['output']>;
  managerNom?: Maybe<Scalars['String']['output']>;
  managerNumTel?: Maybe<Scalars['String']['output']>;
  managerPrenom?: Maybe<Scalars['String']['output']>;
  points: Scalars['Int']['output'];
  position: Scalars['Int']['output'];
  total: Scalars['Int']['output'];
  trend?: Maybe<Scalars['String']['output']>;
};

export type UpdateCommercialInput = {
  age?: InputMaybe<Scalars['Int']['input']>;
  directeurId?: InputMaybe<Scalars['Int']['input']>;
  email?: InputMaybe<Scalars['String']['input']>;
  id: Scalars['Int']['input'];
  managerId?: InputMaybe<Scalars['Int']['input']>;
  nom?: InputMaybe<Scalars['String']['input']>;
  numTel?: InputMaybe<Scalars['String']['input']>;
  prenom?: InputMaybe<Scalars['String']['input']>;
  status?: InputMaybe<UserStatus>;
};

export type UpdateDirecteurInput = {
  adresse?: InputMaybe<Scalars['String']['input']>;
  email?: InputMaybe<Scalars['String']['input']>;
  id: Scalars['Int']['input'];
  nom?: InputMaybe<Scalars['String']['input']>;
  numTelephone?: InputMaybe<Scalars['String']['input']>;
  prenom?: InputMaybe<Scalars['String']['input']>;
  status?: InputMaybe<UserStatus>;
};

export type UpdateImmeubleInput = {
  adresse?: InputMaybe<Scalars['String']['input']>;
  ascenseurPresent?: InputMaybe<Scalars['Boolean']['input']>;
  commercialId?: InputMaybe<Scalars['Int']['input']>;
  digitalCode?: InputMaybe<Scalars['String']['input']>;
  id: Scalars['Int']['input'];
  latitude?: InputMaybe<Scalars['Float']['input']>;
  longitude?: InputMaybe<Scalars['Float']['input']>;
  managerId?: InputMaybe<Scalars['Int']['input']>;
  nbEtages?: InputMaybe<Scalars['Int']['input']>;
  nbPortesParEtage?: InputMaybe<Scalars['Int']['input']>;
  zoneId?: InputMaybe<Scalars['Int']['input']>;
};

export type UpdateManagerInput = {
  directeurId?: InputMaybe<Scalars['Int']['input']>;
  email?: InputMaybe<Scalars['String']['input']>;
  id: Scalars['Int']['input'];
  nom?: InputMaybe<Scalars['String']['input']>;
  numTelephone?: InputMaybe<Scalars['String']['input']>;
  prenom?: InputMaybe<Scalars['String']['input']>;
  status?: InputMaybe<UserStatus>;
};

export type UpdatePorteInput = {
  commentaire?: InputMaybe<Scalars['String']['input']>;
  derniereVisite?: InputMaybe<Scalars['DateTime']['input']>;
  etage?: InputMaybe<Scalars['Int']['input']>;
  id: Scalars['Int']['input'];
  nbContrats?: InputMaybe<Scalars['Int']['input']>;
  nbRepassages?: InputMaybe<Scalars['Int']['input']>;
  nomPersonnalise?: InputMaybe<Scalars['String']['input']>;
  numero?: InputMaybe<Scalars['String']['input']>;
  rdvDate?: InputMaybe<Scalars['DateTime']['input']>;
  rdvTime?: InputMaybe<Scalars['String']['input']>;
  statut?: InputMaybe<StatutPorte>;
};

export type UpdateStatisticInput = {
  absents?: InputMaybe<Scalars['Int']['input']>;
  argumentes?: InputMaybe<Scalars['Int']['input']>;
  commercialId?: InputMaybe<Scalars['Int']['input']>;
  contratsSignes?: InputMaybe<Scalars['Int']['input']>;
  directeurId?: InputMaybe<Scalars['Int']['input']>;
  id: Scalars['Int']['input'];
  immeubleId?: InputMaybe<Scalars['Int']['input']>;
  immeublesVisites?: InputMaybe<Scalars['Int']['input']>;
  managerId?: InputMaybe<Scalars['Int']['input']>;
  nbImmeublesProspectes?: InputMaybe<Scalars['Int']['input']>;
  nbPortesProspectes?: InputMaybe<Scalars['Int']['input']>;
  refus?: InputMaybe<Scalars['Int']['input']>;
  rendezVousPris?: InputMaybe<Scalars['Int']['input']>;
  zoneId?: InputMaybe<Scalars['Int']['input']>;
};

export type UpdateZoneInput = {
  directeurId?: InputMaybe<Scalars['Int']['input']>;
  id: Scalars['Int']['input'];
  managerId?: InputMaybe<Scalars['Int']['input']>;
  nom?: InputMaybe<Scalars['String']['input']>;
  rayon?: InputMaybe<Scalars['Float']['input']>;
  xOrigin?: InputMaybe<Scalars['Float']['input']>;
  yOrigin?: InputMaybe<Scalars['Float']['input']>;
};

export type UserInfo = {
  __typename?: 'UserInfo';
  email: Scalars['String']['output'];
  id: Scalars['Int']['output'];
  role: Scalars['String']['output'];
};

/** Statut d’un utilisateur (commercial, manager ou directeur) */
export type UserStatus =
  | 'ACTIF'
  | 'CONTRAT_FINIE'
  | 'UTILISATEUR_TEST';

/** Type d'utilisateur pouvant être assigné à une zone */
export type UserType =
  | 'COMMERCIAL'
  | 'DIRECTEUR'
  | 'MANAGER';

export type Zone = {
  __typename?: 'Zone';
  createdAt: Scalars['DateTime']['output'];
  directeurId?: Maybe<Scalars['Int']['output']>;
  id: Scalars['Int']['output'];
  immeubles?: Maybe<Array<Immeuble>>;
  managerId?: Maybe<Scalars['Int']['output']>;
  nom: Scalars['String']['output'];
  rayon: Scalars['Float']['output'];
  updatedAt: Scalars['DateTime']['output'];
  xOrigin: Scalars['Float']['output'];
  yOrigin: Scalars['Float']['output'];
};

export type ZoneEnCours = {
  __typename?: 'ZoneEnCours';
  assignedAt: Scalars['DateTime']['output'];
  id: Scalars['Int']['output'];
  userId: Scalars['Int']['output'];
  userType: UserType;
  zone?: Maybe<Zone>;
  zoneId: Scalars['Int']['output'];
};

export type ZoneStatistic = {
  __typename?: 'ZoneStatistic';
  nombreCommerciaux: Scalars['Int']['output'];
  performanceGlobale: Scalars['Float']['output'];
  tauxConversion: Scalars['Float']['output'];
  tauxSuccesRdv: Scalars['Float']['output'];
  totalContratsSignes: Scalars['Int']['output'];
  totalImmeublesProspectes: Scalars['Int']['output'];
  totalImmeublesVisites: Scalars['Int']['output'];
  totalPortesProspectes: Scalars['Int']['output'];
  totalRefus: Scalars['Int']['output'];
  totalRendezVousPris: Scalars['Int']['output'];
  zoneId: Scalars['Int']['output'];
  zoneName: Scalars['String']['output'];
};
