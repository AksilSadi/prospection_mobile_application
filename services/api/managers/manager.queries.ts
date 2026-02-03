export const GET_MANAGER_PERSONAL = `
  query GetManagerPersonal($id: Int!) {
    managerPersonal(id: $id) {
      id
      nom
      prenom
      email
      numTelephone
      zones {
        id
        nom
      }
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
          nbRepassages
          nbContrats
          rdvDate
          rdvTime
          commentaire
          derniereVisite
        }
      }
      commercials {
        id
        nom
        prenom
        email
        numTel
        managerId
        zones {
          id
          nom
        }
        immeubles {
          id
          adresse
          nbEtages
          nbPortesParEtage
          updatedAt
        }
        statistics {
          id
          commercialId
          contratsSignes
          immeublesVisites
          rendezVousPris
          refus
          absents
          argumentes
          nbImmeublesProspectes
          nbPortesProspectes
          createdAt
          updatedAt
        }
      }
      statistics {
        id
        managerId
        contratsSignes
        immeublesVisites
        rendezVousPris
        refus
        absents
        argumentes
        nbImmeublesProspectes
        nbPortesProspectes
        createdAt
        updatedAt
      }
      personalStatistics {
        id
        managerId
        contratsSignes
        immeublesVisites
        rendezVousPris
        refus
        absents
        argumentes
        nbImmeublesProspectes
        nbPortesProspectes
        createdAt
        updatedAt
      }
      teamStatistics {
        id
        managerId
        contratsSignes
        immeublesVisites
        rendezVousPris
        refus
        absents
        argumentes
        nbImmeublesProspectes
        nbPortesProspectes
        createdAt
        updatedAt
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
