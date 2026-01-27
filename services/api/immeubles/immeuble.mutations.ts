export const CREATE_IMMEUBLE = `
  mutation CreateImmeuble($createImmeubleInput: CreateImmeubleInput!) {
    createImmeuble(createImmeubleInput: $createImmeubleInput) {
      id
      adresse
      nbEtages
      nbPortesParEtage
      ascenseurPresent
      digitalCode
      latitude
      longitude
      createdAt
      updatedAt
    }
  }
`;

export const ADD_ETAGE_TO_IMMEUBLE = `
  mutation AddEtageToImmeuble($id: Int!) {
    addEtageToImmeuble(id: $id) {
      id
      adresse
      nbEtages
      nbPortesParEtage
      updatedAt
    }
  }
`;

export const REMOVE_ETAGE_FROM_IMMEUBLE = `
  mutation RemoveEtageFromImmeuble($id: Int!) {
    removeEtageFromImmeuble(id: $id) {
      id
      adresse
      nbEtages
      nbPortesParEtage
      updatedAt
    }
  }
`;

export const ADD_PORTE_TO_ETAGE = `
  mutation AddPorteToEtage($immeubleId: Int!, $etage: Int!) {
    addPorteToEtage(immeubleId: $immeubleId, etage: $etage) {
      id
      adresse
      nbEtages
      nbPortesParEtage
      updatedAt
    }
  }
`;

export const REMOVE_PORTE_FROM_ETAGE = `
  mutation RemovePorteFromEtage($immeubleId: Int!, $etage: Int!) {
    removePorteFromEtage(immeubleId: $immeubleId, etage: $etage) {
      id
      adresse
      nbEtages
      nbPortesParEtage
      updatedAt
    }
  }
`;
