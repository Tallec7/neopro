# Console d'administration locale – Démarrage du dev

Cette première itération met à disposition une page Angular (central-dashboard) accessible sous `/admin/local` pour simuler les actions décrites dans la spécification.

## Parcours couverts

- **Scripts whitelistes** : build central/raspberry, déploiement raspberry, tests complets, relance de sync clients, redémarrage services.
- **Feedback** : chaque lancement crée un job local avec statut (queued → running → succeeded) et logs simulés. Les jobs/clients viennent désormais d'une API backend dédiée.
- **Clients** : formulaire de création rapide (validation basique) + resync côté front. Les données sont servies par `/api/admin/clients`.

## Points techniques

- Composant standalone `LocalAdminComponent` (lazy route) avec formulaires réactifs et états affichés en cartes, synchronisation initiale et bouton d'actualisation.
- Service `AdminOpsService` consomme l'API `/api/admin/jobs` et `/api/admin/clients` via `ApiService` et propage les notifications de succès/erreur.
- Côté backend (`central-server`), route `/api/admin` protégée (rôle admin + rate limit sensible) avec contrôleur `admin.controller` et service en mémoire pour valider et simuler l'exécution des jobs/clients. Les actions restent en **mode stub** (pas d'exécution réelle).

## Étapes suivantes

1. Streamer les logs en SSE/WebSocket et persister l'historique local (fichier ou base) au lieu du stockage en mémoire.
2. Ajouter les actions sensibles (install, purge) avec confirmation renforcée et ACL.
3. Couvrir les formulaires et le service par des tests supplémentaires (validation, scénarios d'échec API et tokens expirés).

## Accès

- Démarrer le front : `npm run start:central`
- Naviguer vers `http://localhost:4200/admin/local` (compte admin requis, même logique que le reste du dashboard).

## Changelog (itération)

- Ajout de l'API `/api/admin` (jobs + clients) côté `central-server` avec validation Joi et service en mémoire.
- Connexion du front `LocalAdminComponent` à l'API via `AdminOpsService` (synchronisation initiale, refresh, notifications).
- Couverture de tests unitaires : service front (mock HTTP) et routes backend (`admin.routes.test.ts`).
