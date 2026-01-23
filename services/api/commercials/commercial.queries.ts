export const GET_COMMERCIAL_FULL = `
  query GetCommercialFull($id: Int!) {
    commercial(id: $id) {
      id
      nom
      prenom
      email
      numTel
      managerId
      immeubles {
        id
        adresse
        nbEtages
        nbPortesParEtage
        ascenseurPresent
        digitalCode
        commercialId
        zoneId
        updatedAt
        portes {
          id
          numero
          nomPersonnalise
          etage
          statut
          nbRepassages
          nbContrats
          rdvDate
          rdvTime
          commentaire
          derniereVisite
        }
      }
      statistics {
        id
        commercialId
        contratsSignes
        immeublesVisites
        rendezVousPris
        refus
      }
    }
  }
`;

export const GET_COMMERCIALS = `
  query GetCommercials {
    commercials {
      id
      nom
      prenom
      email
      numTel
      managerId
      directeurId
    }
  }
`;
