export const GET_MANAGER_PERSONAL = `
  query GetManagerPersonal($id: Int!) {
    managerPersonal(id: $id) {
      id
      nom
      prenom
      email
      numTelephone
      immeubles {
        id
        adresse
        nbEtages
        nbPortesParEtage
        ascenseurPresent
        digitalCode
        managerId
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
        managerId
        contratsSignes
        immeublesVisites
        rendezVousPris
        refus
      }
      personalStatistics {
        id
        managerId
        contratsSignes
        immeublesVisites
        rendezVousPris
        refus
      }
    }
  }
`;

export const GET_MANAGERS = `
  query GetManagers {
    managers {
      id
      nom
      prenom
      email
      numTelephone
      directeurId
    }
  }
`;
