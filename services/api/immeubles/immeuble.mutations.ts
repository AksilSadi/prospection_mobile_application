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
