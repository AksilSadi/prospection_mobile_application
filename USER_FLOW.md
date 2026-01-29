# Guide d'Utilisation - Application de Prospection

## Vue d'ensemble

Cette application mobile permet aux commerciaux de gérer et suivre leurs activités de prospection immobilière en porte-à-porte. Chaque commercial dispose de son propre compte et gère sa propre base de données d'immeubles prospectés.

---

## 🎯 Objectif Principal

Faciliter le travail de prospection terrain en permettant aux commerciaux de :
- Enregistrer les immeubles à prospecter
- Suivre l'état de chaque porte/appartement
- Analyser leurs performances via des statistiques
- Consulter l'historique de leurs visites

---

## 📱 Architecture de Navigation

L'application est organisée en 3 onglets principaux accessibles via la **Bottom Bar** :

```
┌───────────────────────────────────────────┐
│         Application Prospection           │
├───────────────────────────────────────────┤
│                                           │
│         [Contenu de la page]              │
│                                           │
├───────────────────────────────────────────┤
│  Dashboard  │  Historique  │  Immeubles  │
│     📊      │      📋      │      🏢     │
└───────────────────────────────────────────┘
```

---

## 🔐 Connexion et Authentification

### Page : Login (`app/(auth)/login.tsx`)

**But** : Authentifier le commercial et valider ses droits d'accès

**Informations requises** :
- Email
- Mot de passe

**Processus** :
1. Le commercial entre ses identifiants
2. L'application vérifie son appartenance aux groupes autorisés (COMMERCIAL ou MANAGER)
3. Les tokens JWT sont stockés de manière sécurisée (Expo SecureStore)
4. Redirection automatique vers le Dashboard

**Sécurité** :
- Seuls les utilisateurs des groupes `ALLOWED_GROUPS` peuvent accéder à l'application
- Les tokens sont automatiquement rafraîchis en arrière-plan

---

## 📊 Dashboard (Accueil)

### Page : Dashboard (`app/(app)/(tabs)/dashboard.tsx`)

**But** : Fournir une vue d'ensemble des performances et de la progression du commercial

### Sections du Dashboard

#### 1. Carte Héro (Profil)
**Affiche** :
- Nom et prénom du commercial
- Rôle (Commercial / Manager)
- Rang actuel basé sur les performances
- Points accumulés
- Progression vers le prochain rang
- Nombre total de portes prospectées

**Utilité** : Motivation et gamification - le commercial voit immédiatement sa position et ses accomplissements

#### 2. Progression du Rang
**Affiche** :
- Barre de progression visuelle vers le prochain rang
- Pourcentage de complétion
- Nombre de points restants pour atteindre le prochain niveau
- Objectif du prochain rang

**Utilité** : Encourager le commercial à atteindre ses objectifs

#### 3. Indicateurs Clés (Métriques)
**Affiche 6 cartes statistiques** :

| Métrique | Description | Icône |
|----------|-------------|-------|
| **Contrats signés** | Nombre de contrats finalisés | ✓ Vert |
| **Immeubles visités** | Nombre d'immeubles prospectés | 🏠 Bleu |
| **Rendez-vous pris** | Nombre de RDV planifiés | 📅 Violet |
| **Portes prospectées** | Total de portes visitées (tous statuts sauf NON_VISITE) | 📐 Orange |
| **Refus** | Nombre de portes ayant refusé | ✗ Orange foncé |
| **Taux de refus** | Pourcentage de refus par rapport aux portes prospectées | 📉 Rouge |

**Formule du taux de refus** :
```
Taux de refus = (Nombre de refus / Portes prospectées) × 100
```

**Utilité** : Analyser rapidement ses performances et identifier les points à améliorer

---

## 🏢 Gestion des Immeubles

### Page : Immeubles (`app/(app)/(tabs)/immeubles.tsx`)

**But** : Gérer la liste des immeubles assignés au commercial et en ajouter de nouveaux

### Fonctionnalités Principales

#### 1. Liste des Immeubles
**Affiche pour chaque immeuble** :
- Adresse complète
- Nombre d'étages
- Nombre de portes par étage
- Total de portes
- Progression (portes visitées / total)
- Date de dernière mise à jour
- Informations supplémentaires (ascenseur, digicode)

**Actions possibles** :
- Appuyer sur un immeuble pour voir les détails
- Voir visuellement la progression de prospection

#### 2. Ajouter un Immeuble

**Composant** : `AddImmeubleSheet` (Bottom Sheet)

**Workflow d'ajout** :
1. Le commercial appuie sur le bouton "+" ou "Ajouter un immeuble"
2. Un bottom sheet s'ouvre avec un formulaire

**Informations à saisir** :
- **Adresse** (obligatoire) : Adresse complète de l'immeuble
- **Nombre d'étages** (obligatoire) : Ex: 5
- **Nombre de portes par étage** (obligatoire) : Ex: 4
- **Ascenseur présent** (optionnel) : Oui/Non
- **Code d'accès** (optionnel) : Digicode ou code porte

**Calcul automatique** :
```
Total de portes = Nombre d'étages × Portes par étage
Exemple : 5 étages × 4 portes = 20 portes
```

**Actions** :
- **Enregistrer** : Crée l'immeuble et génère automatiquement toutes les portes avec statut "NON_VISITE"
- **Annuler** : Ferme le formulaire sans sauvegarder

**Après création** :
- L'immeuble est automatiquement assigné au commercial connecté
- Toutes les portes sont créées dans la base de données
- Le commercial peut commencer la prospection immédiatement

---

## 🚪 Détails d'un Immeuble et Prospection

### Page : Détails Immeuble (`components/immeubles/ImmeubleDetailsScreen.tsx`)

**But** : Visualiser et gérer la prospection porte par porte d'un immeuble spécifique

### Structure de la Page

#### 1. En-tête
**Affiche** :
- Adresse de l'immeuble
- Bouton retour vers la liste
- Bouton actions (modifier, supprimer)

#### 2. Informations Générales
**Affiche** :
- Nombre d'étages
- Nombre de portes par étage
- Ascenseur (présent/absent)
- Code d'accès
- Statistiques de prospection :
  - Portes visitées / Total
  - Taux de complétion
  - Date dernière visite

#### 3. Vue par Étage

**Organisation** : Onglets ou sections par étage

```
┌─────────────────────────────────────────┐
│  Étage 1  │  Étage 2  │  Étage 3  │ ... │
└─────────────────────────────────────────┘
     │
     ▼
┌─────────────────────────────────────────┐
│  Porte 101  [Statut: À VISITER]         │
│  Porte 102  [Statut: REFUS]             │
│  Porte 103  [Statut: CONTRAT SIGNÉ] ✓   │
│  Porte 104  [Statut: RDV PRIS] 📅       │
└─────────────────────────────────────────┘
```

#### 4. Gestion des Portes

**Pour chaque porte, affichage de** :
- Numéro de la porte (ex: 101, 102...)
- Nom personnalisé (optionnel, ex: "M. Dupont")
- Statut actuel avec code couleur
- Nombre de repassages
- Date/heure du dernier passage
- Icône visuelle selon le statut

### Statuts de Porte Disponibles

| Statut | Description | Utilisation | Couleur |
|--------|-------------|-------------|---------|
| **NON_VISITE** | Porte jamais visitée | État initial de toutes les portes | Gris |
| **ABSENT** | Personne absente | Le commercial doit repasser (noter si matin/soir préférable) | Orange clair |
| **REFUS** | Prospect a refusé | Pas intéressé par l'offre | Rouge |
| **ARGUMENTE** | Discussion en cours | Intéressé mais besoin de réflexion | Jaune |
| **RDV_PRIS** | Rendez-vous planifié | Date et heure du RDV enregistrées | Bleu |
| **CONTRAT_SIGNE** | Contrat signé | Vente réussie ✓ | Vert |

### Actions sur une Porte

**Appuyer sur une porte ouvre** : `AddPorteSheet` en mode édition

**Informations modifiables** :
- **Statut** (liste déroulante avec les 6 statuts)
- **Nom personnalisé** : Ex: "M. Dupont - Appt 302"
- **Commentaire** : Notes libres sur la visite
- **Date/Heure RDV** : Si statut = RDV_PRIS
- **Nombre de repassages** : Incrémenté automatiquement
- **Dernière visite** : Timestamp automatique

**Workflow typique de prospection** :

```
1. Commercial arrive à la porte 101
   ↓
2. Sonne/toque à la porte
   ↓
3. Ouvre l'app → Immeuble → Étage → Porte 101
   ↓
4. Selon le résultat :

   • Personne absente
     → Statut: ABSENT
     → Commentaire: "Boîte aux lettres pleine, repasser soir"
     → Incrémente repassages

   • Personne refuse
     → Statut: REFUS
     → Commentaire: "Pas intéressé"

   • Discussion positive
     → Statut: ARGUMENTE
     → Commentaire: "Intéressé, veut réfléchir 2 jours"

   • Rendez-vous accepté
     → Statut: RDV_PRIS
     → Date: 15/02/2025
     → Heure: 14:00
     → Commentaire: "Couple de retraités, préfère après-midi"

   • Contrat signé immédiatement
     → Statut: CONTRAT_SIGNE
     → Commentaire: "3 ans - Eau + Électricité"
   ↓
5. Sauvegarde
   ↓
6. Passe à la porte suivante
```

### Gestion des Étages et Portes

**Ajouter un étage** :
- Bouton "Ajouter étage" en bas de la liste
- Crée automatiquement le nombre de portes défini lors de la création de l'immeuble
- Les portes sont numérotées automatiquement (ex: Étage 3 → Portes 301, 302, 303, 304)

**Supprimer un étage** :
- Action disponible si l'étage est vide ou non commencé
- Supprime toutes les portes de l'étage

**Ajouter une porte à un étage** :
- Si un étage a moins de portes que prévu
- Bouton "+" dans la section de l'étage

**Supprimer une porte** :
- Confirmation requise
- Supprime définitivement la porte et ses données

---

## 📋 Historique

### Page : Historique (`app/(app)/(tabs)/historique.tsx`)

**But** : Consulter la chronologie complète des actions de prospection

### Vue d'Ensemble

**Affiche une liste chronologique inversée** (du plus récent au plus ancien) :

```
┌─────────────────────────────────────────┐
│  📅 Aujourd'hui - 29 janvier 2026       │
├─────────────────────────────────────────┤
│  15:23  🏢 24 Rue Victor Hugo           │
│         Porte 302 → CONTRAT_SIGNE       │
│         Commentaire: "Excellent contact"│
├─────────────────────────────────────────┤
│  14:10  🏢 24 Rue Victor Hugo           │
│         Porte 301 → RDV_PRIS            │
│         RDV: 02/02 à 18h00              │
├─────────────────────────────────────────┤
│  13:45  🏢 12 Avenue de la Liberté      │
│         Porte 105 → REFUS               │
├─────────────────────────────────────────┤
│  📅 Hier - 28 janvier 2026              │
├─────────────────────────────────────────┤
│  17:30  🏢 8 Rue des Lilas              │
│         Porte 204 → ARGUMENTE           │
│  ...                                    │
└─────────────────────────────────────────┘
```

### Informations par Entrée

**Chaque ligne d'historique contient** :
- **Timestamp** : Heure exacte de l'action
- **Immeuble** : Adresse
- **Porte** : Numéro
- **Action** : Changement de statut (avec flèche de transition)
- **Détails** : Commentaire, date RDV si applicable
- **Icône visuelle** : Code couleur selon le statut final

### Filtres et Recherche

**Options de filtrage** :
- Par date (aujourd'hui, cette semaine, ce mois, période personnalisée)
- Par statut (voir uniquement les contrats signés, les RDV, etc.)
- Par immeuble (historique d'un immeuble spécifique)
- Recherche par adresse

### Statistiques Rapides

**En haut de la page** :
- Nombre d'actions aujourd'hui
- Contrats signés aujourd'hui
- RDV pris aujourd'hui
- Taux de conversion du jour

**Utilité** :
- Suivre son activité quotidienne
- Vérifier les RDV à venir
- Analyser les tendances
- Justifier son activité auprès du manager

---

## 🎮 Système de Gamification

### Calcul des Points

**Formule** (définie dans `utils/business/ranks.ts`) :
```
Points = (Contrats signés × Poids_Contrat) +
         (RDV pris × Poids_RDV) +
         (Immeubles visités × Poids_Immeuble)
```

**Valeurs typiques** (à vérifier dans le code) :
- 1 Contrat signé = 100 points
- 1 RDV pris = 20 points
- 1 Immeuble visité = 5 points

### Rangs Disponibles

Le système de rangs motive les commerciaux à performer. Les rangs sont définis dans `RANKS` :

Exemple de structure :
```
Débutant     →  0-99 points
Bronze       →  100-249 points
Argent       →  250-499 points
Or           →  500-999 points
Platine      →  1000-1999 points
Diamant      →  2000+ points
```

### Progression Visible

- **Dashboard** : Barre de progression vers le prochain rang
- Points manquants affichés clairement
- Animations de célébration lors du passage de niveau (à implémenter)

---

## 👥 Rôles et Permissions

### Commercial

**Accès** :
- ✅ Voir ses propres immeubles
- ✅ Ajouter des immeubles à sa liste
- ✅ Modifier les statuts de ses portes
- ✅ Consulter son dashboard personnel
- ✅ Voir son historique
- ❌ Voir les données des autres commerciaux
- ❌ Accéder aux fonctions d'administration

### Manager

**Accès supplémentaires** :
- ✅ Tout ce qu'un commercial peut faire
- ✅ Voir les statistiques de son équipe
- ✅ Accéder aux dashboards de ses commerciaux
- ✅ Assigner des immeubles à ses commerciaux
- ✅ Voir les historiques de toute l'équipe
- ✅ Analyser les performances comparatives

---

## 🔄 Synchronisation et Données

### Fonctionnement Hors-Ligne

**À implémenter** (recommandation) :
- Cache local des immeubles actifs
- Synchronisation automatique quand connexion disponible
- Mode offline pour la prospection terrain

### Sauvegarde Automatique

**Toutes les actions sont sauvegardées** :
- Immédiatement dans la base de données GraphQL
- Horodatage précis de chaque action
- Historique complet conservé

---

## 📈 Workflow Typique d'une Journée

### Matin

1. **Connexion** à l'application
2. **Consultation du Dashboard** : Voir ses objectifs et sa progression
3. **Ajout des immeubles** de la journée (si nouveau secteur)
4. **Préparation** : Vérifier les immeubles à prospecter

### Terrain (Prospection)

5. **Sélection d'un immeuble** dans la liste
6. **Début de prospection** étage par étage
7. Pour chaque porte :
   - Frappe/sonne
   - Note le résultat (statut + commentaire)
   - Passe à la porte suivante
8. **Suivi en temps réel** de la progression

### Fin de Journée

9. **Consultation de l'historique** : Revoir les actions du jour
10. **Vérification des RDV** planifiés pour demain
11. **Dashboard** : Voir les points gagnés et la progression du rang

---

## 🎯 Objectifs Métier

### Pour le Commercial

✅ **Simplifier** la prise de notes sur le terrain
✅ **Organiser** sa prospection par immeuble
✅ **Ne pas oublier** les repassages
✅ **Motiver** via la gamification
✅ **Suivre** ses performances en temps réel

### Pour le Manager

✅ **Monitorer** l'activité de l'équipe
✅ **Identifier** les meilleurs performeurs
✅ **Détecter** les problèmes (taux de refus élevé)
✅ **Planifier** l'attribution des secteurs

---

## 🔧 Technologies Utilisées

- **Frontend** : React Native avec Expo
- **Navigation** : Expo Router (file-based routing)
- **UI** : Tamagui
- **API** : GraphQL custom client
- **Authentification** : JWT avec Expo SecureStore
- **État** : React Hooks patterns

---

## 📝 Notes Techniques

### Structure des Données

**Immeuble** :
```typescript
{
  id: number
  adresse: string
  nbEtages: number
  nbPortesParEtage: number
  ascenseurPresent?: boolean
  digitalCode?: string
  commercialId: number
  portes: Porte[]
}
```

**Porte** :
```typescript
{
  id: number
  numero: string
  nomPersonnalise?: string
  etage: number
  immeubleId: number
  statut: string  // NON_VISITE | ABSENT | REFUS | ARGUMENTE | RDV_PRIS | CONTRAT_SIGNE
  nbRepassages?: number
  nbContrats?: number
  rdvDate?: string
  rdvTime?: string
  commentaire?: string
  derniereVisite?: string
}
```

**Commercial** :
```typescript
{
  id: number
  nom: string
  prenom: string
  email?: string
  numTel?: string
  managerId?: number
  immeubles: Immeuble[]
  statistics: Statistic[]
}
```

---

## 🚀 Améliorations Futures Possibles

### Court Terme
- [ ] Mode hors-ligne complet
- [ ] Notifications pour les RDV
- [ ] Export des statistiques en PDF
- [ ] Recherche d'adresse avec autocomplete

### Moyen Terme
- [ ] Géolocalisation et carte des immeubles
- [ ] Photos des immeubles/portes
- [ ] Notes vocales
- [ ] Partage de secteurs entre commerciaux

### Long Terme
- [ ] Intégration CRM
- [ ] Analytics avancées
- [ ] Prédictions de conversion
- [ ] Optimisation de parcours (itinéraire intelligent)

---

*Document créé le 29 janvier 2026 - Version 1.0*
