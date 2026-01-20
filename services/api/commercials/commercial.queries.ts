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
          rdvDate
          rdvTime
          commentaire
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
