export const UPDATE_PORTE = `
  mutation UpdatePorte($updatePorteInput: UpdatePorteInput!) {
    updatePorte(updatePorteInput: $updatePorteInput) {
      id
      numero
      nomPersonnalise
      etage
      immeubleId
      statut
      nbRepassages
      nbContrats
      rdvDate
      rdvTime
      commentaire
      derniereVisite
      createdAt
      updatedAt
    }
  }
`;
