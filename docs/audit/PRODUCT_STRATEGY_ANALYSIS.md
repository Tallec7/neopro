# Analyse Stratégique Produit - NEOPRO

> **Date** : 26 décembre 2025
> **Auteur** : Audit Product Strategy
> **Version** : 1.1
> **Statut** : Analyse complète basée sur le code source
> **Alignement** : Business Plan v1.6 (26 décembre 2025)

---

## Changelog v1.1

| Section | Modification |
|---------|--------------|
| Phase 0 | Ajout positionnement **Two-Sided Marketplace** |
| Phase 1 | Nouvel usage actuel **E - Production Vidéo** |
| Phase 2 | Enrichissement **U1 - Réseau Annonceurs** avec modèle économique |
| Phase 2 | Détail **U3 - Fan Engagement** avec fonctionnalités BP |
| Phase 3 | Ajout fonctionnalités **Production Vidéo** |
| Phase 4 | Intégration **Seuils Critiques Réseau** (15/30/100/300 clubs) |
| Phase 4 | Alignement **Pricing** Bronze/Silver/Gold (€50/€80/€120) |
| Synthèse | Mise à jour recommandations avec modèle annonceurs |

---

## Table des matières

1. [Phase 0 - Compréhension de l'existant](#phase-0--compréhension-de-lexistant)
2. [Phase 1 - Usages actuels & latents](#phase-1--usages-actuels--latents)
3. [Phase 2 - Nouveaux usages potentiels](#phase-2--nouveaux-usages-potentiels)
4. [Phase 3 - Fonctionnalités nécessaires par usage](#phase-3--fonctionnalités-nécessaires-par-usage)
5. [Phase 4 - Roadmap fonctionnelle](#phase-4--roadmap-fonctionnelle)
6. [Synthèse exécutive](#synthèse-exécutive)

---

# PHASE 0 — Compréhension de l'existant

## 1. Ce que le produit permet de faire aujourd'hui

### Description fonctionnelle

**NEOPRO** est une plateforme SaaS de gestion d'écrans TV interactifs pour clubs sportifs, composée de :

| Composant | Fonction | Technologie |
|-----------|----------|-------------|
| **Raspberry Pi (Edge)** | Affichage TV + télécommande locale | Angular 20 + Node.js + Video.js |
| **Central Server** | API backend + WebSocket temps réel | Express.js + PostgreSQL + Redis |
| **Central Dashboard** | Console d'administration web | Angular 20 |

### Positionnement stratégique : Two-Sided Marketplace

> **Référence** : Business Plan v1.6, Section 1.2

NEOPRO se positionne comme le **premier réseau publicitaire sportif amateur en France**, opérant une marketplace double-face :

```
┌─────────────────────────────────────────────────────────────────────┐
│                    TWO-SIDED MARKETPLACE                             │
├─────────────────────────────────────────────────────────────────────┤
│                                                                     │
│   CÔTÉ 1 : CLUBS                    CÔTÉ 2 : ANNONCEURS            │
│   ─────────────────                 ──────────────────              │
│   • Abonnement plateforme           • Diffusion sur réseau         │
│   • €50-120/mois                    • €250/mois                    │
│   • Analytics + rapports            • Présence multi-clubs         │
│   • Production vidéo (option)       • Analytics campagnes          │
│                                                                     │
│                    ┌─────────────────┐                              │
│                    │     NEOPRO      │                              │
│                    │  Garde 90%      │                              │
│                    │  Reverse 10%    │                              │
│                    └─────────────────┘                              │
│                                                                     │
│   EFFET RÉSEAU :                                                    │
│   Plus clubs → Plus audience → CPM attractif → Plus annonceurs     │
│                       ↓                                             │
│   Revenus augmentent → Reverse clubs → Clubs payent moins          │
│                                                                     │
└─────────────────────────────────────────────────────────────────────┘
```

| Segment | TAM France | Objectif 2026 | Objectif 2028 |
|---------|------------|---------------|---------------|
| **Clubs** | €5,2M (13,000 clubs × €400/an) | €53K (35 clubs) | €450K (300 clubs) |
| **Annonceurs** | €1,2M (150 annonceurs × €8K/an) | €16K (6 annonceurs) | €80K (25 annonceurs) |
| **TOTAL** | **€6,4M** | **€69K** | **€530K** |

### Capacités observées dans le code

#### A. Gestion de parc d'écrans distribués
- **Enregistrement de sites** : Création/modification de sites avec métadonnées (nom club, localisation, sports, modèle hardware)
- **Monitoring temps réel** : Métriques CPU, RAM, température, disque, uptime via heartbeats WebSocket
- **Statuts de connexion** : online, offline, maintenance, error
- **Groupement** : Organisation par sport, géographie, version logicielle, ou personnalisé

#### B. Distribution de contenu vidéo
- **Upload vidéos** : Single et bulk upload vers Supabase Storage
- **Catégorisation** : sponsor, jingle, ambiance, other (catégories analytics)
- **Déploiement ciblé** : Vers site individuel ou groupe
- **Suivi de déploiement** : pending → in_progress → completed/failed
- **Déploiement Canary** : Rollout progressif avec rollback automatique

#### C. Mises à jour logicielles
- **Gestion versions** : Upload packages, changelogs, flags critiques
- **Déploiement OTA** : Mise à jour à distance des Raspberry Pi
- **Historique** : Tracking des versions installées par site

#### D. Analytics et reporting
- **Sessions club** : Tracking des sessions d'utilisation (durée, vidéos jouées)
- **Video plays** : Enregistrement de chaque lecture (catégorie, durée, trigger auto/manuel)
- **Stats quotidiennes** : Agrégation daily_stats par club
- **Sponsor impressions** : Tracking des impressions publicitaires
- **Rapports PDF** : Génération de rapports club (6 pages)

#### E. Interface locale (Raspberry Pi)
- **Affichage TV** : Lecteur vidéo plein écran avec boucle automatique
- **Télécommande web** : Interface mobile pour contrôler l'affichage
- **Score en live** : Overlay optionnel du score (feature premium en développement)
- **Gestion phases** : avant-match, match, après-match, neutre
- **Admin locale** : Interface http://192.168.4.1/admin pour actions système

#### F. Sécurité et administration
- **RBAC** : 3 rôles (admin, operator, viewer)
- **MFA** : Authentification TOTP optionnelle
- **Audit logs** : Traçabilité des actions
- **Row-Level Security** : Isolation des données via Supabase RLS

---

## 2. Usages principaux identifiés

| Usage | Description | Observé dans |
|-------|-------------|--------------|
| **Diffusion sponsors** | Afficher les pubs des sponsors locaux sur écran TV du club | `sponsor-analytics.service.ts`, catégories vidéos |
| **Animation matchs** | Diffuser contenu avant/pendant/après les matchs | Phases temporelles, télécommande |
| **Valorisation partenariats** | Prouver l'impact des diffusions aux sponsors (analytics) | PDF reports, sponsor stats |
| **Gestion multi-sites** | Opérer un parc d'écrans depuis une console centrale | Dashboard, groupes, déploiements |
| **Maintenance à distance** | Surveiller et dépanner les équipements à distance | Métriques, alertes, commandes |

---

## 3. Limites fonctionnelles actuelles observables

### Limites techniques

| Limite | Evidence dans le code | Impact |
|--------|----------------------|--------|
| **Pas de planification horaire** | Aucune table `schedules`, feature "Mode Programmation" en pause (BACKLOG.md) | Les clubs doivent déclencher manuellement les vidéos |
| **Analytics sans audience réelle** | `audience_estimate` (estimation manuelle), pas d'intégration billetterie | ROI sponsors approximatif |
| **Pas de multi-tenant sponsor** | Sponsors créés par admins, pas d'accès self-service | Dépendance au club pour rapports |
| **Score manuel uniquement** | Saisie manuelle depuis télécommande, pas d'API fédérations | Friction opérationnelle |
| **Pas d'alertes proactives** | Table `alerts` existe mais pas de notifications email/SMS | Détection tardive des problèmes |
| **Pas de benchmarking** | Données par club isolées | Pas de comparaison inter-clubs |
| **Overlay score incomplet** | UI télécommande terminée, overlay TV non implémenté | Feature premium incomplète |

### Limites UX

| Limite | Evidence | Impact |
|--------|----------|--------|
| **Télécommande basique** | Interface fonctionnelle mais peu d'automatisation | Charge opérationnelle club |
| **Pas de favoris/raccourcis** | Navigation par catégories uniquement | Temps de sélection élevé |
| **Configuration manuelle score** | Saisie équipes à chaque match | Répétitivité |

### Limites business model

| Limite | Evidence | Impact |
|--------|----------|--------|
| **Feature premium non monétisée** | `liveScoreEnabled` boolean, mais pas de gestion abonnements | Pas de revenus récurrents visibles |
| **Pas d'API partenaires** | Pas d'OAuth, pas de portail développeurs | Écosystème fermé |

---

# PHASE 1 — Usages actuels & usages latents

## 1. Usages actuels (factuels)

### Usage A : Diffusion publicitaire locale

| Aspect | Détail |
|--------|--------|
| **Description** | Les clubs diffusent les vidéos de leurs sponsors locaux sur l'écran TV |
| **Evidence code** | `sponsors` table, `sponsor_videos`, `sponsor_impressions`, `sponsor-analytics.service.ts` |
| **Fréquence observée** | Jours de match principalement (phases temporelles) |
| **Profils utilisateurs** | Responsable club (télécommande), Gestionnaire NEOPRO (dashboard) |

### Usage B : Animation événementielle

| Aspect | Détail |
|--------|--------|
| **Description** | Diffuser du contenu d'ambiance adapté aux moments du match |
| **Evidence code** | `timeCategories` (before/during/after), catégories jingle/ambiance |
| **Fréquence observée** | Événements sportifs |
| **Profils utilisateurs** | Responsable club |

### Usage C : Monitoring opérationnel

| Aspect | Détail |
|--------|--------|
| **Description** | Surveiller l'état du parc d'écrans, diagnostiquer les problèmes |
| **Evidence code** | Métriques heartbeat, statuts, `remote_commands`, logs |
| **Fréquence observée** | Continue (heartbeats toutes les X secondes) |
| **Profils utilisateurs** | Opérateur NEOPRO, Admin |

### Usage D : Reporting sponsors

| Aspect | Détail |
|--------|--------|
| **Description** | Générer des rapports pour prouver la valeur aux sponsors |
| **Evidence code** | `pdf-report.service.ts`, `sponsor_impressions`, export CSV |
| **Fréquence observée** | Mensuelle/trimestrielle (hypothèse) |
| **Profils utilisateurs** | Gestionnaire commercial |

### Usage E : Production vidéo professionnelle

> **Référence** : Business Plan v1.6, Section 2.7 - Différenciateur majeur

| Aspect | Détail |
|--------|--------|
| **Description** | Produire des vidéos de célébration joueurs et contenus professionnels pour les clubs |
| **Evidence** | BP v1.6 détaille les packs Bronze/Silver/Gold (€800-€2,000) |
| **Fréquence observée** | Ponctuelle (début de saison, événements) |
| **Profils utilisateurs** | Clubs (clients), Équipe NEOPRO (production) |

**Offres Production Vidéo (BP v1.6)** :

| Pack | Prix | Contenu | Marge |
|------|------|---------|-------|
| **Bronze** | €800 | 10 vidéos 30s (contenu club fourni), motion design basique | 56% |
| **Silver** ⭐ | €1,500 | Shooting 1h30 + 10 vidéos 30s + 1 présentation, motion design pro | 32% |
| **Gold** | €2,000 | Shooting 2h + 15 vidéos + interviews, révisions illimitées | 30% |

**Valeur stratégique** :
- Argument commercial massue : *"Vos joueurs comme des pros"*
- Différenciateur vs concurrence (intégration automatique plateforme)
- Source de revenus complémentaires (~€12,800 en 2026)
- Prévision : 53% des clubs adoptent (16/30)

---

## 2. Usages latents identifiés

### Usage latent L1 : Scoring automatique en temps réel

| Aspect | Détail |
|--------|--------|
| **Statut** | Partiellement couvert |
| **Evidence** | UI télécommande score terminée (`BACKLOG.md`), overlay TV non implémenté, intégrations externes non présentes |
| **Frein actuel** | Saisie manuelle fastidieuse, pas de connexion aux tableaux d'affichage |
| **Potentiel** | Automatisation complète = différenciation majeure |
| **Justification** | Le backlog mentionne explicitement "Score en Live Phase 2" avec intégrations API fédérations et tableaux Bodet |

### Usage latent L2 : Programmation automatique de playlists

| Aspect | Détail |
|--------|--------|
| **Statut** | Non abouti (feature en pause) |
| **Evidence** | "Mode Programmation" listé dans `BACKLOG.md` section "En pause" |
| **Frein actuel** | Déclenchement manuel obligatoire |
| **Potentiel** | Ritualisation (avant-match automatique à H-30, mi-temps, etc.) |
| **Justification** | Infrastructure phases temporelles existe, manque le scheduler |

### Usage latent L3 : Alerting proactif et objectifs

| Aspect | Détail |
|--------|--------|
| **Statut** | Infrastructure présente, notifications absentes |
| **Evidence** | Table `alerts` existe, `alert.service.ts` présent, mais pas de canaux notification (email/SMS) |
| **Frein actuel** | Pas de notifications push, pas d'objectifs configurables |
| **Potentiel** | Réduction churn, engagement proactif |
| **Justification** | "Objectifs & Alertes" en P2 dans le backlog avec email/SMS/webhook prévus |

### Usage latent L4 : Accès sponsor self-service

| Aspect | Détail |
|--------|--------|
| **Statut** | Suggéré mais non implémenté |
| **Evidence** | Sponsors gérés uniquement par admins/operators, portail sponsor prévu en P3 (BACKLOG.md) |
| **Frein actuel** | Dépendance au club pour chaque rapport |
| **Potentiel** | Autonomie sponsor, réduction charge opérationnelle |
| **Justification** | Tables `sponsor_users`, `sponsor_access_logs` prévues dans le backlog |

### Usage latent L5 : Benchmarking inter-clubs

| Aspect | Détail |
|--------|--------|
| **Statut** | Données présentes, comparaison absente |
| **Evidence** | `club_daily_stats` agrège par site, mais pas de vues comparatives |
| **Frein actuel** | Chaque club voit ses données isolément |
| **Potentiel** | Gamification, motivation, insights sectoriels |
| **Justification** | "Benchmark Anonymisé" en P2 dans le backlog |

### Usage latent L6 : A/B testing créas publicitaires

| Aspect | Détail |
|--------|--------|
| **Statut** | Non implémenté, prévu |
| **Evidence** | Tables `ab_test_campaigns`, `ab_test_variants` décrites dans BACKLOG.md |
| **Frein actuel** | Impossible de comparer l'efficacité de différentes versions d'une pub |
| **Potentiel** | Optimisation continue des campagnes sponsors |
| **Justification** | Feature P3 documentée avec calcul statistique prévu |

### Usage latent L7 : Intégration billetterie pour audience réelle

| Aspect | Détail |
|--------|--------|
| **Statut** | Estimation manuelle uniquement |
| **Evidence** | `audience_estimate` dans `club_sessions`, intégrations Weezevent/Ticketmaster prévues |
| **Frein actuel** | Audience déclarée ≠ audience réelle |
| **Potentiel** | Crédibilité analytics, tarification dynamique sponsors |
| **Justification** | "Intégrations Billetterie" dans backlog long terme |

---

# PHASE 2 — Nouveaux usages potentiels

## Usage potentiel U1 : Réseau publicitaire annonceurs (CÔTÉ 2 MARKETPLACE)

> **Usage stratégique validé par BP v1.6 - Section 2.5 & 2.6**

| Aspect | Détail |
|--------|--------|
| **Ce qui le rend possible** | Groupes par géographie, analytics sponsors, déploiement multi-sites, infrastructure de tracking |
| **Description** | NEOPRO opère le seul réseau publicitaire sportif amateur en France, permettant aux annonceurs régionaux/nationaux de diffuser sur tous les clubs partenaires |
| **Valeur utilisateur** | 1 contrat = présence automatique sur 30+ salles, CPM attractif (€8-12 vs €15-25 digital) |
| **Valeur business** | €250/mois × annonceurs, NEOPRO garde 90%, source de revenus récurrents majeure |
| **Risque si non adressé** | Marché vierge capté par un concurrent |

### Modèle économique annonceurs (BP v1.6)

```
ANNONCEUR paie €250/mois
        ↓
Vidéos diffusées sur tous clubs partenaires (max 3/club)
        ↓
NEOPRO garde 90% (€225/mois)
        ↓
CLUBS reçoivent 10% (€25/mois × 6 annonceurs = €1,800/an passifs)
```

### Cibles annonceurs prioritaires

| Tier | Profil | Exemples | Budget | Objectif 2026 |
|------|--------|----------|--------|---------------|
| **1** | Régionaux | Decathlon Nantes, Crédit Mutuel Bretagne | €250-500/mois | 3-6 |
| **2** | Nationaux | McDonald's, Nike, Orange | €500-2,000/mois | 0 (2027) |
| **3** | Locaux | Restaurants, PME | €100-250/mois | Self-service 2027+ |

### Seuils critiques réseau

| Seuil | Clubs | Impact stratégique |
|-------|-------|-------------------|
| **15 clubs** | Lancement réseau annonceurs (reach minimal viable) |
| **30 clubs** | Scale annonceurs régionaux (CPM compétitif) |
| **100 clubs** | Attractivité annonceurs nationaux |
| **300 clubs** | Pricing premium (quasi-monopole) |

### Arguments vs publicité digitale

| Critère | Digital Display | NEOPRO |
|---------|-----------------|--------|
| **CPM** | €15-25 | €8-12 |
| **Attention** | Faible (ad-block) | Captive (salle) |
| **Ciblage** | Imprécis (cookies) | Hyper-local garanti |
| **Fraude** | Risque élevé (bots) | Zéro (spectateurs physiques) |
| **Brand safety** | Variable | 100% sport amateur |

**Fonctionnalités enablers existantes :**
- Groupes géographiques
- Sponsor analytics agrégées (`sponsor_impressions`)
- Déploiement par groupe
- Rapports PDF automatiques

**Gap à combler :**
- Portail annonceur self-service
- Dashboard consolidé multi-clubs
- Facturation automatisée par impressions
- Gestion droits annonceur (nouveau rôle)

---

## Usage potentiel U2 : Monétisation DOOH (Digital Out-Of-Home)

> **Usage potentiel suggéré (extension de l'existant)**

| Aspect | Détail |
|--------|--------|
| **Ce qui le rend possible** | Tracking impressions, audience estimée, infrastructure déploiement |
| **Description** | Vendre de l'espace publicitaire programmatique à des annonceurs nationaux via DSP |
| **Valeur utilisateur** | Revenus passifs pour les clubs sans démarche commerciale |
| **Valeur business** | Commission sur transactions, scale massif |
| **Risque si non adressé** | Les clubs restent dépendants des sponsors locaux limités |

**Prérequis business :**
- Volume minimum ~100 sites (mentionné dans BACKLOG.md "rejeté" mais pertinent à moyen terme)
- Audience vérifiable

---

## Usage potentiel U3 : Fan engagement interactif

> **Usage potentiel validé par BP v1.6 - Section 1.2 (Fonctionnalités Match)**

| Aspect | Détail |
|--------|--------|
| **Ce qui le rend possible** | Infrastructure WebSocket temps réel, télécommande accessible aux spectateurs potentiels |
| **Description** | Permettre aux spectateurs d'interagir (votes, quiz, réactions) via leur smartphone |
| **Valeur utilisateur** | Expérience match enrichie, engagement communauté |
| **Valeur business** | Différenciation produit, données first-party, upsell |
| **Risque si non adressé** | Produit perçu comme simple diffuseur passif |

### Fonctionnalités prévues (BP v1.6)

| Catégorie | Fonctionnalités |
|-----------|-----------------|
| **Engagement Spectateurs** | Jeux-concours QR code (vote meilleur joueur) |
| | Sondages en direct mi-temps |
| | Feed réseaux sociaux sur écran |
| **Affichage Dynamique** | Annonces joueurs (vidéos célébrations 5-10s) |
| | Affichage buteurs temps réel (1 clic smartphone) |
| | Faits de jeu (cartons, temps-morts) |

**Fonctionnalités enablers existantes :**
- WebSocket bidirectionnel
- Interface web mobile
- Phases temporelles
- QR code pour accès télécommande

---

## Usage potentiel U4 : Affichage dynamique multi-écrans

> **Usage potentiel suggéré (extension de l'existant)**

| Aspect | Détail |
|--------|--------|
| **Ce qui le rend possible** | Architecture multi-sites, groupes, déploiement synchronisé |
| **Description** | Gérer plusieurs écrans dans un même club (entrée, buvette, vestiaires) avec contenus différenciés |
| **Valeur utilisateur** | Couverture complète du lieu, messages contextuels |
| **Valeur business** | Plus d'écrans = plus d'abonnements |
| **Risque si non adressé** | Limité à 1 écran/club = potentiel bridé |

**Gap à combler :**
- Concept de "zones" au sein d'un site
- Playlists différenciées par zone

---

## Usage potentiel U5 : Services aux fédérations sportives

> **Usage potentiel suggéré (extension de l'existant)**

| Aspect | Détail |
|--------|--------|
| **Ce qui le rend possible** | Groupes par sport, données agrégées, infrastructure centralisée |
| **Description** | Les fédérations utilisent NEOPRO pour diffuser du contenu institutionnel et collecter des analytics sectoriels |
| **Valeur utilisateur** | Communication unifiée vers tous les clubs affiliés |
| **Valeur business** | Contrats B2B fédérations, légitimité sectorielle |
| **Risque si non adressé** | Opportunité captée par des acteurs institutionnels |

---

## Usage potentiel U6 : Formation et sensibilisation

> **Usage potentiel suggéré (extension de l'existant)**

| Aspect | Détail |
|--------|--------|
| **Ce qui le rend possible** | Catégories de contenu flexibles, déploiement ciblé |
| **Description** | Diffuser des messages de prévention (santé, fair-play, sécurité) pendant les événements |
| **Valeur utilisateur** | Rôle sociétal, image positive |
| **Valeur business** | Partenariats institutionnels (ministères, assurances, mutuelles) |
| **Risque si non adressé** | Perception uniquement commerciale |

---

## Usage potentiel U7 : Franchise et white-label

> **Usage potentiel suggéré (extension de l'existant)**

| Aspect | Détail |
|--------|--------|
| **Ce qui le rend possible** | Architecture multi-tenant, rôles RBAC, isolation des données |
| **Description** | Licencier la plateforme à des partenaires (équipementiers, intégrateurs) qui l'opèrent sous leur marque |
| **Valeur utilisateur** | Accès à une solution clé-en-main |
| **Valeur business** | Revenus de licence, expansion géographique sans coût commercial |
| **Risque si non adressé** | Croissance limitée à la capacité commerciale propre |

---

# PHASE 3 — Fonctionnalités nécessaires par usage

## Pour Usage E : Production Vidéo

> **Référence** : BP v1.6 Section 2.7

### Fonctionnalités existantes contributives
- ✅ Upload vidéos vers plateforme (`content.controller.ts`)
- ✅ Catégorisation des vidéos
- ✅ Déploiement automatique vers sites

### Fonctionnalités complémentaires suggérées (nouvel usage)

| Fonctionnalité | Description | Effort |
|----------------|-------------|--------|
| **F.E.1 - Workflow production** | Suivi des commandes vidéo (brief → shooting → livraison) | Moyen |
| **F.E.2 - Templates motion design** | Bibliothèque de templates réutilisables | Moyen |
| **F.E.3 - Galerie assets club** | Stockage photos/vidéos sources par club | Faible |
| **F.E.4 - Média Day multi-équipes** | Gestion des shootings groupés (prévu €2,500/journée) | Moyen |

---

## Pour U1 : Réseau publicitaire annonceurs

### Fonctionnalités existantes contributives
- ✅ Groupes géographiques (`groups` avec type='geography')
- ✅ Sponsor analytics (`sponsor_impressions`, `sponsor-analytics.service.ts`)
- ✅ Déploiement par groupe (`content_deployments` avec `target_type='group'`)
- ✅ Rapports PDF (`pdf-report.service.ts`)

### Fonctionnalités complémentaires suggérées (nouvel usage)

| Fonctionnalité | Description | Effort |
|----------------|-------------|--------|
| **F1.1 - Portail annonceur self-service** | Interface dédiée pour annonceurs (upload créas, analytics, facturation) | Élevé |
| **F1.2 - Dashboard consolidé multi-clubs** | Vue agrégée des performances sur tous les clubs du réseau | Moyen |
| **F1.3 - Facturation automatisée** | Calcul et facturation basée sur les impressions réelles | Élevé |
| **F1.4 - Rôle annonceur** | Nouveau rôle avec accès limité à ses campagnes uniquement | Moyen |
| **F1.5 - Rotation intelligente** | Algorithme de distribution équitable des créas (max 3/club) | Moyen |

---

## Pour U2 : Monétisation DOOH

### Fonctionnalités existantes contributives
- ✅ Tracking impressions (`sponsor_impressions`)
- ✅ Audience estimée (`audience_estimate` dans `club_sessions`)
- ✅ Infrastructure de déploiement

### Fonctionnalités complémentaires suggérées (nouvel usage)

| Fonctionnalité | Description | Effort |
|----------------|-------------|--------|
| **F2.1 - Intégration SSP/DSP** | Connexion aux plateformes programmatiques (Google DV360, etc.) | Très élevé |
| **F2.2 - Audience vérifiée** | Intégration billetterie + capteurs (proof of play) | Élevé |
| **F2.3 - Slots publicitaires temps réel** | Gestion des créneaux disponibles en temps réel | Élevé |
| **F2.4 - Reporting DOOH standards** | Métriques conformes aux standards IAB DOOH | Moyen |

---

## Pour U3 : Fan engagement interactif

### Fonctionnalités existantes contributives
- ✅ WebSocket bidirectionnel (`socket.service.ts`)
- ✅ Interface mobile (`remote.component.ts`)
- ✅ Phases temporelles (`timeCategories`)

### Fonctionnalités complémentaires suggérées (nouvel usage)

| Fonctionnalité | Description | Effort |
|----------------|-------------|--------|
| **F3.1 - Mode spectateur** | Accès public (QR code) à une interface simplifiée | Moyen |
| **F3.2 - Système de votes/quiz** | Création et affichage de sondages temps réel | Moyen |
| **F3.3 - Affichage résultats live** | Visualisation des votes sur l'écran TV | Moyen |
| **F3.4 - Gamification** | Points, classements, récompenses | Élevé |

---

## Pour U4 : Affichage multi-écrans

### Fonctionnalités existantes contributives
- ✅ Architecture multi-sites
- ✅ Déploiement ciblé

### Fonctionnalités complémentaires suggérées (nouvel usage)

| Fonctionnalité | Description | Effort |
|----------------|-------------|--------|
| **F4.1 - Concept de zones** | Hiérarchie site → zones (ex: entrée, buvette, terrain) | Moyen |
| **F4.2 - Playlists par zone** | Contenu différencié selon l'emplacement de l'écran | Moyen |
| **F4.3 - Synchronisation multi-écrans** | Option de diffusion synchrone sur plusieurs écrans | Élevé |
| **F4.4 - Tarification multi-écrans** | Pricing adapté au nombre d'écrans par site | Faible |

---

## Pour Usage latent L1 : Score automatique

### Fonctionnalités existantes contributives
- ✅ UI saisie score télécommande (terminé)
- ✅ Communication WebSocket score-update
- ✅ Flag `liveScoreEnabled`

### Fonctionnalités complémentaires suggérées (nouvel usage)

| Fonctionnalité | Description | Effort |
|----------------|-------------|--------|
| **F.L1.1 - Overlay TV score** | Affichage incrusté du score sur la vidéo | Faible |
| **F.L1.2 - Intégration API FFHB/FFVB/FFBB** | Récupération automatique des scores fédérations | Moyen |
| **F.L1.3 - Intégration tableaux Bodet** | Lecture du score depuis le tableau d'affichage local | Élevé |
| **F.L1.4 - OCR fallback** | Lecture optique du tableau via caméra | Très élevé |

---

## Pour Usage latent L2 : Programmation playlists

### Fonctionnalités existantes contributives
- ✅ Phases temporelles (before/during/after)
- ✅ Catégories de contenu

### Fonctionnalités complémentaires suggérées (nouvel usage)

| Fonctionnalité | Description | Effort |
|----------------|-------------|--------|
| **F.L2.1 - Scheduler** | Programmation horaire (ex: sponsors de 14h à 16h) | Moyen |
| **F.L2.2 - Triggers événementiels** | Déclenchement auto sur phase de match | Moyen |
| **F.L2.3 - Templates de programmation** | Modèles réutilisables (jour de match type) | Faible |
| **F.L2.4 - Calendrier intégré** | Connexion au calendrier des matchs du club | Moyen |

---

## Pour Usage latent L3 : Alerting proactif

### Fonctionnalités existantes contributives
- ✅ Table `alerts`
- ✅ Service `alert.service.ts`
- ✅ Métriques de santé

### Fonctionnalités complémentaires suggérées (nouvel usage)

| Fonctionnalité | Description | Effort |
|----------------|-------------|--------|
| **F.L3.1 - Notifications email** | Envoi emails sur alertes critiques | Faible |
| **F.L3.2 - Notifications SMS** | Alertes SMS (Twilio) | Faible |
| **F.L3.3 - Objectifs configurables** | Définir cibles (ex: 40h écran/mois) | Moyen |
| **F.L3.4 - Rapports automatiques** | Envoi mensuel automatique des PDF | Faible |

---

## Pour Usage latent L5 : Benchmarking

### Fonctionnalités existantes contributives
- ✅ `club_daily_stats` agrégé par site
- ✅ Groupes par sport/région

### Fonctionnalités complémentaires suggérées (nouvel usage)

| Fonctionnalité | Description | Effort |
|----------------|-------------|--------|
| **F.L5.1 - Vue benchmark** | Comparaison anonymisée avec clubs similaires | Moyen |
| **F.L5.2 - Percentiles** | Positionnement (top 10%, médiane, etc.) | Faible |
| **F.L5.3 - Insights automatiques** | Recommandations basées sur les écarts | Moyen |
| **F.L5.4 - Cohort filtering** | Segmentation par sport, taille, région | Faible |

---

# PHASE 4 — Roadmap fonctionnelle

## Seuils critiques réseau (BP v1.6)

> Les fonctionnalités sont conditionnées par le nombre de clubs actifs

| Seuil | Clubs | Déclencheur stratégique |
|-------|-------|-------------------------|
| **S1** | 15 | Lancement réseau annonceurs (reach minimal) |
| **S2** | 30 | Scale annonceurs régionaux, premiers revenus passifs clubs |
| **S3** | 100 | Attractivité annonceurs nationaux |
| **S4** | 300 | Pricing premium, quasi-monopole marché |

## Pricing clubs (BP v1.6)

| Offre | Prix/mois | Inclus |
|-------|-----------|--------|
| **Bronze** | €50 | Plateforme + support |
| **Silver** | €80 | Bronze + analytics avancés |
| **Gold** | €120 | Silver + analytics sponsors + priorité support |

## Vue d'ensemble

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                           ROADMAP NEOPRO 2026                                │
│                    Alignée BP v1.6 + Seuils Réseau                           │
├─────────────────────────────────────────────────────────────────────────────┤
│ COURT TERME (0-3 mois)          │ MOYEN TERME (3-6 mois)                    │
│ Objectif: 15 clubs (S1)         │ Objectif: 30 clubs (S2)                   │
│ ─────────────────────────       │ ──────────────────────                    │
│ • Overlay score TV (P0)         │ • Scheduler playlists (P1)               │
│ • Notifications email (P0)      │ • Benchmarking anonymisé (P1)            │
│ • Rapports auto email (P0)      │ • Objectifs & alertes (P1)               │
│ • Objectifs simples (P1)        │ • Intégration score FFHB (P1)            │
│ • Templates programmation (P1)  │ • Mode spectateur MVP (P2)               │
│ • [S1] Lancement annonceurs     │ • [S2] Scale annonceurs régionaux        │
├─────────────────────────────────────────────────────────────────────────────┤
│ LONG TERME (6-12 mois)                                                       │
│ Objectif: 100 clubs (S3)                                                     │
│ ─────────────────────────────────────────────────────────────                │
│ • Portail annonceur self-service (P2)                                        │
│ • API OAuth partenaires (P2)                                                 │
│ • A/B testing créas (P2)                                                     │
│ • Multi-écrans / zones (P2)                                                  │
│ • Intégration billetterie (P3)                                               │
│ • [S3] Annonceurs nationaux                                                  │
│ • Préparation DOOH (P3)                                                      │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## Détail de la roadmap

### COURT TERME (0-3 mois)

| ID | Fonctionnalité | Usage associé | Type | Priorité | Valeur principale | Effort |
|----|----------------|---------------|------|----------|-------------------|--------|
| **R1** | Overlay score TV | L1 - Score temps réel | Amélioration | **P0** | Rétention | Faible |
| **R2** | Notifications email alertes | L3 - Alerting | Amélioration | **P0** | Réduction friction | Faible |
| **R3** | Envoi rapports PDF auto | L3 - Alerting | Amélioration | **P0** | Rétention | Faible |
| **R4** | Objectifs temps d'écran simples | L3 - Alerting | Extension | **P1** | Rétention | Moyen |
| **R5** | Templates de programmation | L2 - Programmation | Amélioration | **P1** | Adoption | Faible |

**Justification P0 :**
- R1 : Feature premium promise, différenciation, code largement prêt
- R2 : Quick win, infrastructure `alerts` existe, réduit churn
- R3 : Demande récurrente présumée, valorise les analytics existants

---

### MOYEN TERME (3-6 mois)

| ID | Fonctionnalité | Usage associé | Type | Priorité | Valeur principale | Effort |
|----|----------------|---------------|------|----------|-------------------|--------|
| **R6** | Scheduler playlists horaires | L2 - Programmation | Extension | **P1** | Adoption | Moyen |
| **R7** | Benchmarking anonymisé | L5 - Benchmark | Nouveau cas | **P1** | Rétention | Moyen |
| **R8** | Dashboard objectifs & alertes complet | L3 - Alerting | Extension | **P1** | Rétention | Moyen |
| **R9** | Intégration score FFHB | L1 - Score | Extension | **P1** | Montée en gamme | Moyen |
| **R10** | Mode spectateur (MVP) | U3 - Fan engagement | Nouveau cas | **P2** | Adoption | Moyen |

**Justification P1 :**
- R6-R8 : Complètent les usages latents identifiés, fort impact rétention
- R9 : Différenciation, réduction friction opérationnelle

---

### LONG TERME (6-12 mois)

| ID | Fonctionnalité | Usage associé | Type | Priorité | Valeur principale | Effort |
|----|----------------|---------------|------|----------|-------------------|--------|
| **R11** | Portail sponsor self-service | L4 - Accès sponsor | Nouveau cas | **P2** | Montée en gamme | Élevé |
| **R12** | API OAuth partenaires | Écosystème | Extension | **P2** | Montée en gamme | Élevé |
| **R13** | A/B testing créas sponsors | L6 - A/B testing | Nouveau cas | **P2** | Montée en gamme | Élevé |
| **R14** | Gestion multi-écrans / zones | U4 - Multi-écrans | Extension | **P2** | Adoption | Moyen |
| **R15** | Intégration billetterie Weezevent | L7 - Audience réelle | Extension | **P3** | Montée en gamme | Moyen |
| **R16** | Dashboard régie régionale | U1 - Régies | Nouveau cas | **P3** | Montée en gamme | Élevé |
| **R17** | Préparation DOOH (specs SSP) | U2 - DOOH | Nouveau cas | **P3** | Montée en gamme | Élevé |

---

## Matrice impact/effort

```
                    EFFORT
            Faible      Moyen       Élevé
         ┌──────────┬───────────┬───────────┐
    Haut │ R1, R2   │ R7, R8    │ R11, R16  │
         │ R3, R5   │ R9        │ R17       │
IMPACT   ├──────────┼───────────┼───────────┤
  Moyen  │          │ R4, R6    │ R12, R13  │
         │          │ R10, R14  │           │
         ├──────────┼───────────┼───────────┤
    Bas  │          │ R15       │           │
         └──────────┴───────────┴───────────┘
```

**Quick wins (Faible effort + Haut impact)** : R1, R2, R3, R5
**Projets stratégiques (Effort élevé + Haut impact)** : R11, R16, R17

---

# Synthèse exécutive

## 1. Synthèse des usages actuels

NEOPRO est une **two-sided marketplace** positionnée comme le **premier réseau publicitaire sportif amateur en France** :

| Usage | Maturité | Couverture |
|-------|----------|------------|
| Diffusion sponsors locaux | ⭐⭐⭐⭐ | Complète |
| Animation matchs | ⭐⭐⭐ | Fonctionnelle |
| Monitoring parc d'écrans | ⭐⭐⭐⭐ | Complète |
| Reporting sponsors | ⭐⭐⭐ | PDF manuels |
| Déploiement contenu | ⭐⭐⭐⭐ | Complète + canary |
| **Production vidéo** | ⭐⭐⭐ | Service proposé (BP v1.6) |

**Points forts observés :**
- Architecture distribuée mature (Raspberry Pi + Cloud)
- Stack technique moderne (Angular 20, Node.js, PostgreSQL)
- Analytics sponsor différenciantes
- Déploiement progressif (canary) rare dans ce marché
- **Production vidéo intégrée** : différenciateur majeur (BP v1.6)
- **Modèle two-sided** : clubs + annonceurs = 2 sources revenus

---

## 2. Usages latents identifiés

| Usage latent | Maturité infra | Priorité suggérée |
|--------------|----------------|-------------------|
| L1 - Score automatique temps réel | 70% (UI prête) | **P0** |
| L2 - Programmation playlists | 40% (phases existent) | **P1** |
| L3 - Alerting proactif | 60% (tables prêtes) | **P0** |
| L4 - Accès sponsor self-service | 20% (prévu backlog) | P2 |
| L5 - Benchmarking inter-clubs | 50% (données agrégées) | **P1** |
| L6 - A/B testing créas | 10% (prévu backlog) | P2 |
| L7 - Intégration billetterie | 0% | P3 |

---

## 3. Nouveaux usages proposés

| Usage potentiel | Opportunité | Faisabilité | Recommandation |
|-----------------|-------------|-------------|----------------|
| **U1 - Réseau annonceurs** | **Très haute** | Haute | **PRIORITAIRE - Seuil S1 (15 clubs)** |
| U2 - DOOH programmatique | Très haute | Faible (volume S3+) | Long terme (100+ clubs) |
| U3 - Fan engagement | Haute | Haute | **Prototype H2 2026** |
| U4 - Multi-écrans | Haute | Haute | **Développer 2026** |
| U5 - Services fédérations | Haute | Moyenne | Opportuniste |
| U6 - Formation/sensibilisation | Moyenne | Haute | Quick win contenu |
| U7 - White-label | Haute | Moyenne | Stratégique 2027 |

### Focus stratégique : Réseau Annonceurs (U1)

> **TAM Annonceurs** : €1,2M ARR (BP v1.6)

| Phase | Seuil | Action | Revenus attendus |
|-------|-------|--------|------------------|
| **2026 T2** | 15 clubs | Lancement réseau, 3-6 annonceurs régionaux | €16K ARR |
| **2027** | 30 clubs | Scale, +10 annonceurs | €40K ARR |
| **2028** | 100 clubs | Annonceurs nationaux | €80K ARR |

---

## 4. Recommandations prioritaires

### Priorité 0 (immédiat - 0-1 mois)
1. **Finaliser overlay score TV** - Code 90% prêt, feature premium bloquante
2. **Activer notifications email** - Quick win, réduction churn significative
3. **Automatiser envoi PDF mensuels** - Valorise le travail analytics existant

### Priorité 1 (court terme - 1-3 mois) → Objectif S1 (15 clubs)
4. **Implémenter objectifs simples** - Engagement proactif des clubs
5. **Créer scheduler playlists** - Débloquer l'usage latent programmation
6. **Lancer benchmarking anonymisé** - Différenciation + rétention
7. **[S1] Préparer lancement réseau annonceurs** - Prospection Tier 1

### Priorité 2 (moyen terme - 3-6 mois) → Objectif S2 (30 clubs)
8. **Intégrer API score FFHB** - Automatisation = montée en gamme premium
9. **[S2] Onboarder 3-6 annonceurs régionaux** - Premiers revenus passifs clubs
10. **Développer portail annonceur MVP** - Self-service simplifié
11. **Préparer multi-écrans** - Expansion du panier moyen

---

## 5. Risques si non adressés

| Risque | Usages concernés | Impact |
|--------|------------------|--------|
| Churn clubs par manque d'engagement proactif | L3, L5 | **Élevé** |
| Feature premium incomplète (score) | L1 | **Moyen** |
| Dépendance aux sponsors locaux limités | U1, U2 | Moyen |
| Concurrence sur automatisation | L1, L2 | **Élevé** |
| Perception "simple diffuseur" | U3, U6 | Moyen |

---

## 6. Conclusion

NEOPRO dispose d'une **base technique solide** et d'un **positionnement stratégique différenciant** comme **premier réseau publicitaire sportif amateur en France**.

### Constats clés

| Dimension | Analyse |
|-----------|---------|
| **Modèle économique** | Two-sided marketplace validé (clubs + annonceurs) |
| **TAM combiné** | €6,4M (€5,2M clubs + €1,2M annonceurs) |
| **Différenciateur** | Production vidéo intégrée + analytics sponsors |
| **Usages latents** | 7 identifiés, forte valeur de déblocage |
| **Nouveaux usages** | 7 proposés, alignés BP v1.6 |

### Focus stratégique 2026

```
┌─────────────────────────────────────────────────────────────────┐
│                    OBJECTIFS CLÉS 2026                           │
├─────────────────────────────────────────────────────────────────┤
│  T1-T2: Atteindre S1 (15 clubs) → Lancer réseau annonceurs      │
│  T3-T4: Atteindre S2 (30 clubs) → Scale annonceurs régionaux    │
│  ARR cible: €69K (€53K clubs + €16K annonceurs)                 │
└─────────────────────────────────────────────────────────────────┘
```

### Recommandations finales

1. **Compléter features premium** : overlay score, notifications, rapports auto
2. **Atteindre seuil S1** : 15 clubs = déclencheur réseau annonceurs
3. **Activer côté 2 marketplace** : prospection annonceurs Tier 1 dès S1
4. **Capitaliser sur production vidéo** : différenciateur commercial massue
5. **Préparer scale** : multi-écrans, portail annonceur, API partenaires

La plateforme est **bien positionnée** pour évoluer d'un outil de diffusion vers une **marketplace d'engagement sportif complète** avec deux sources de revenus récurrents.

---

*Document mis à jour le 26 décembre 2025*
*Basé sur l'analyse du code source et aligné avec Business Plan v1.6*
