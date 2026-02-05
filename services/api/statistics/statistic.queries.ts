export const GET_STATISTICS = `
  query Statistics($commercialId: Int) {
    statistics(commercialId: $commercialId) {
      id
      commercialId
      managerId
      directeurId
      immeubleId
      zoneId
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
`;

export const GET_PORTES_MODIFIED_TODAY = `
  query PortesModifiedToday($immeubleId: Int) {
    portesModifiedToday(immeubleId: $immeubleId) {
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
      immeubleId
    }
  }
`;

export const GET_PORTES_RDV_TODAY = `
  query PortesRdvToday {
    portesRdvToday {
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
      immeubleId
    }
  }
`;

export const GET_STATS_TIMELINE_BY_COMMERCIAL = `
  query StatsTimelineByCommercial(
    $commercialId: Int!
    $startDate: DateTime
    $endDate: DateTime
  ) {
    statsTimelineByCommercial(
      commercialId: $commercialId
      startDate: $startDate
      endDate: $endDate
    ) {
      date
      rdvPris
      portesProspectees
      contratsSignes
      refus
      absents
      argumentes
    }
  }
`;
