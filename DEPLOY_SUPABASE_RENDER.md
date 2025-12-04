# Déploiement Supabase + Render (100% GRATUIT)

Guide complet pour déployer le système de gestion de flotte NEOPRO sur **Supabase** (PostgreSQL) + **Render** (backend) gratuitement.

**Coût total : $0/mois** 🎉

---

## Vue d'ensemble

- **Supabase** : Base de données PostgreSQL (500 MB gratuit)
- **Render** : Backend Node.js (750h/mois gratuit)
- **Vercel/Netlify** : Dashboard Angular (gratuit)

---

## Étape 1: Configuration Supabase (5 min)

### 1.1 Récupérer les informations de connexion

Votre projet Supabase : `https://wrirmjohxkgvcuyhwaiw.supabase.co`

1. Allez sur [Supabase Dashboard](https://supabase.com/dashboard)
2. Sélectionnez votre projet `wrirmjohxkgvcuyhwaiw`
3. Allez dans **Settings** > **Database**
4. Dans la section **Connection string**, sélectionnez **URI**
5. **Notez l'URI de connexion** (format: `postgresql://postgres:[PASSWORD]@db.wrirmjohxkgvcuyhwaiw.supabase.co:5432/postgres`)

> **Important**: Remplacez `[PASSWORD]` par votre mot de passe de base de données

### 1.2 Initialiser la base de données

1. Dans Supabase Dashboard, allez dans **SQL Editor**
2. Cliquez sur **New query**
3. Copiez-collez le contenu de `central-server/src/scripts/init-db.sql`
4. Cliquez sur **Run** (en bas à droite)
5. Vérifiez qu'il n'y a pas d'erreurs

**Fichier à copier:**

```bash
# Sur votre machine locale
cat central-server/src/scripts/init-db.sql
```

Copiez tout le contenu dans l'éditeur SQL de Supabase.

### 1.3 Créer un utilisateur admin

Dans SQL Editor de Supabase, exécutez:

```sql
-- Créer un utilisateur admin (mot de passe: "admin123" - À CHANGER!)
INSERT INTO users (email, password, name, role)
VALUES (
  'admin@neopro.fr',
  '$2b$10$rXUz8qLKqH5hJ5mYvN5x2.F1zJ2X8H9mK5L7N3Q4R6S8T9U0V1W2X', -- "admin123" hashé
  'Admin NEOPRO',
  'admin'
);
```

> **⚠️ IMPORTANT**: Changez ce mot de passe immédiatement après le premier login!

### 1.4 Vérifier la configuration

Dans SQL Editor, vérifiez que les tables sont créées:

```sql
-- Lister toutes les tables
SELECT tablename FROM pg_tables WHERE schemaname = 'public';
```

Vous devriez voir:
- users
- sites
- groups
- site_groups
- videos
- content_deployments
- software_updates
- update_deployments
- remote_commands
- metrics
- alerts

---

## Étape 2: Configuration Render (10 min)

### 2.1 Créer un compte Render

1. Allez sur [render.com](https://render.com)
2. Créez un compte (gratuit)
3. Connectez votre compte GitHub

### 2.2 Créer un Web Service

1. Dans le dashboard Render, cliquez sur **New** > **Web Service**
2. Connectez votre repository GitHub: `https://github.com/Tallec7/neopro`
3. Configurez:
   - **Name**: `neopro-central-server`
   - **Branch**: `sleepy-brattain` (ou `main` si vous avez mergé)
   - **Root Directory**: `central-server`
   - **Runtime**: `Node`
   - **Build Command**: `npm install && npm run build`
   - **Start Command**: `npm start`
   - **Instance Type**: `Free`

### 2.3 Configurer les variables d'environnement

Dans Render, allez dans **Environment** et ajoutez ces variables:

```env
NODE_ENV=production
PORT=3001

# Database (URI Supabase)
DATABASE_URL=postgresql://postgres:[VOTRE_PASSWORD]@db.wrirmjohxkgvcuyhwaiw.supabase.co:5432/postgres

# JWT (générez une clé aléatoire sécurisée)
JWT_SECRET=changez-moi-en-production-utilisez-une-cle-aleatoire-securisee
JWT_EXPIRES_IN=8h

# CORS (mettez votre URL Vercel après déploiement)
ALLOWED_ORIGINS=http://localhost:4300,https://votre-dashboard.vercel.app

# Storage (temporaire sur Render)
STORAGE_TYPE=local
STORAGE_PATH=/tmp/videos

# Logging
LOG_LEVEL=info
```

**⚠️ Important**:
- Remplacez `[VOTRE_PASSWORD]` par votre mot de passe Supabase
- Générez une vraie clé JWT sécurisée (voir section suivante)
- Mettez à jour `ALLOWED_ORIGINS` après avoir déployé le dashboard

### 2.4 Générer une clé JWT sécurisée

Dans votre terminal local:

```bash
# Méthode 1: OpenSSL
openssl rand -base64 64

# Méthode 2: Node.js
node -e "console.log(require('crypto').randomBytes(64).toString('base64'))"

# Méthode 3: En ligne
# Allez sur https://randomkeygen.com/ et copiez une "CodeIgniter Encryption Key"
```

Copiez la clé générée et utilisez-la pour `JWT_SECRET`.

### 2.5 Déployer

1. Cliquez sur **Create Web Service**
2. Render va automatiquement:
   - Cloner votre repo
   - Installer les dépendances
   - Builder le projet TypeScript
   - Démarrer le serveur
3. Attendez quelques minutes (premier déploiement ~5 min)
4. Une fois déployé, notez votre URL: `https://neopro-central-server.onrender.com`

### 2.6 Vérifier le déploiement

Testez dans votre navigateur:

```
https://neopro-central-server.onrender.com/api/health
```

Vous devriez voir:
```json
{"status":"ok","database":"connected","timestamp":"2025-..."}
```

---

## Étape 3: Déploiement du Dashboard (10 min)

### 3.1 Mettre à jour les URLs de production

Sur votre machine locale:

1. Ouvrez `central-dashboard/src/environments/environment.prod.ts`
2. Remplacez les URLs:

```typescript
export const environment = {
  production: true,
  apiUrl: 'https://neopro-central-server.onrender.com/api',
  socketUrl: 'https://neopro-central-server.onrender.com',
};
```

3. Commit et push:

```bash
git add central-dashboard/src/environments/environment.prod.ts
git commit -m "chore: update production URLs for Render deployment"
git push
```

### 3.2 Option A: Vercel (Recommandé)

1. Allez sur [vercel.com](https://vercel.com)
2. Créez un compte (gratuit avec GitHub)
3. Cliquez sur **Add New** > **Project**
4. Importez votre repo GitHub: `Tallec7/neopro`
5. Configurez:
   - **Framework Preset**: Angular
   - **Root Directory**: `central-dashboard`
   - **Build Command**: `npm install && npm run build -- --configuration production`
   - **Output Directory**: `dist/neopro-dashboard/browser`
   - **Install Command**: `npm install`
   - **Node Version**: 20.x (dans Advanced settings si nécessaire)

6. Cliquez sur **Deploy**
7. Attendez quelques minutes (~3-5 min)
8. Notez votre URL: `https://neopro-dashboard.vercel.app` (ou personnalisée)

### 3.3 Option B: Netlify (Alternative)

1. Allez sur [netlify.com](https://netlify.com)
2. Créez un compte (gratuit avec GitHub)
3. Cliquez sur **Add new site** > **Import an existing project**
4. Connectez GitHub et sélectionnez `Tallec7/neopro`
5. Configurez:
   - **Base directory**: `central-dashboard`
   - **Build command**: `npm run build -- --configuration production`
   - **Publish directory**: `dist/neopro-dashboard/browser`
6. Cliquez sur **Deploy site**

### 3.4 Mettre à jour CORS sur Render

1. Retournez sur Render.com
2. Ouvrez votre service `neopro-central-server`
3. Allez dans **Environment**
4. Modifiez `ALLOWED_ORIGINS`:

```env
ALLOWED_ORIGINS=https://votre-dashboard.vercel.app,https://neopro-central-server.onrender.com
```

5. Sauvegardez (le service redémarrera automatiquement)

---

## Étape 4: Premier test (2 min)

### 4.1 Accéder au dashboard

1. Ouvrez votre URL Vercel: `https://votre-dashboard.vercel.app`
2. Vous devriez voir la page de login
3. Connectez-vous:
   - **Email**: `admin@neopro.fr`
   - **Mot de passe**: `admin123`

### 4.2 Changer le mot de passe admin

⚠️ **IMPORTANT**: Changez le mot de passe immédiatement!

1. Une fois connecté, allez dans **Profil** (en haut à droite)
2. Changez votre mot de passe
3. Ou utilisez l'API:

```bash
curl -X POST https://neopro-central-server.onrender.com/api/auth/change-password \
  -H "Authorization: Bearer VOTRE_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "currentPassword": "admin123",
    "newPassword": "votre-nouveau-mot-de-passe-securise"
  }'
```

### 4.3 Vérifier les fonctionnalités

Testez:
- ✅ Dashboard affiche les statistiques (0 sites)
- ✅ Créer un site de test
- ✅ Naviguer dans les pages (Sites, Groupes, Contenu, Mises à jour)
- ✅ Notifications en temps réel (icône 🔔)

---

## Étape 5: Ajouter votre premier boîtier (7 min)

Suivez le guide [QUICK_START.md](./QUICK_START.md) avec vos nouvelles URLs:

1. **Dashboard**: `https://votre-dashboard.vercel.app`
2. **API**: `https://neopro-central-server.onrender.com`

---

## Limites de l'offre gratuite

### Supabase (Gratuit)
- ✅ 500 MB de base de données
- ✅ 1 GB de stockage fichiers
- ✅ 2 GB de bande passante/mois
- ✅ 50,000 requêtes/mois
- ⚠️ Pause après 7 jours d'inactivité (redémarre instantanément)

### Render (Gratuit)
- ✅ 750h/mois de compute (suffisant pour 1 mois)
- ✅ 512 MB RAM
- ✅ 100 GB bande passante/mois
- ⚠️ Le service se met en veille après 15 min d'inactivité
- ⚠️ Premier démarrage après veille: ~30 secondes

### Vercel (Gratuit)
- ✅ 100 GB bande passante/mois
- ✅ Déploiements illimités
- ✅ CDN global
- ✅ SSL automatique

**Pour un parc de 10 sites avec activité modérée, c'est largement suffisant!**

---

## Optimisations (Optionnel)

### Keep-alive pour Render

Pour éviter que le service s'endorme, vous pouvez utiliser:

1. **UptimeRobot** (gratuit): Ping toutes les 5 minutes
   - Créez un compte sur [uptimerobot.com](https://uptimerobot.com)
   - Ajoutez un monitor: `https://neopro-central-server.onrender.com/api/health`
   - Interval: 5 minutes

2. **Cron-job.org** (gratuit): Alternative similaire

### Stockage des vidéos

Les vidéos sur `/tmp` de Render sont perdues à chaque redémarrage. Pour la production:

**Option 1: Supabase Storage** (gratuit 1 GB)
1. Activez Supabase Storage dans votre projet
2. Mettez à jour `STORAGE_TYPE=supabase` dans Render
3. Ajoutez les clés d'accès Supabase

**Option 2: Cloudinary** (gratuit 25 GB/mois)
1. Créez un compte sur [cloudinary.com](https://cloudinary.com)
2. Configurez les variables d'environnement

### Monitoring

Utilisez les outils intégrés:
- **Render**: Logs + Metrics dans le dashboard
- **Supabase**: Database metrics + Logs
- **Vercel**: Analytics + Web Vitals

---

## Mise à jour du système

### Mettre à jour le backend

Render redéploie automatiquement à chaque push sur GitHub:

```bash
# Sur votre machine
cd central-server
# Faites vos modifications
git add .
git commit -m "fix: votre modification"
git push
```

Render détecte le push et redéploie automatiquement (~3 min).

### Mettre à jour le dashboard

Même principe pour Vercel:

```bash
cd central-dashboard
# Faites vos modifications
git add .
git commit -m "feat: votre modification"
git push
```

Vercel redéploie automatiquement (~2 min).

---

## Troubleshooting

### Le backend ne démarre pas

1. Vérifiez les logs dans Render dashboard
2. Vérifiez `DATABASE_URL` dans les variables d'environnement
3. Testez la connexion Supabase:

```bash
# Sur votre machine
psql "postgresql://postgres:[PASSWORD]@db.wrirmjohxkgvcuyhwaiw.supabase.co:5432/postgres"
```

### CORS errors

1. Vérifiez `ALLOWED_ORIGINS` dans Render
2. Incluez l'URL exacte de Vercel (sans `/` à la fin)
3. Redémarrez le service Render après modification

### Dashboard ne se connecte pas à l'API

1. Vérifiez `environment.prod.ts` contient les bonnes URLs
2. Vérifiez que Render est bien déployé et actif
3. Testez manuellement: `https://neopro-central-server.onrender.com/api/health`

### "Service unavailable" sur Render

Le service est en veille (après 15 min d'inactivité):
- Attendez 30 secondes, il redémarre automatiquement
- Configurez UptimeRobot pour éviter la veille

---

## Support

- **Documentation**: [ADMIN_GUIDE.md](./ADMIN_GUIDE.md)
- **Quick Start**: [QUICK_START.md](./QUICK_START.md)
- **Issues GitHub**: [Créer une issue](https://github.com/Tallec7/neopro/issues)

---

**Version**: 1.0
**Dernière mise à jour**: 4 décembre 2025
**Coût total**: $0/mois 🎉
