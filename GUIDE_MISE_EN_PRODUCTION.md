# Guide complet de mise en production - NeoPro

Ce document détaille **toutes les actions** nécessaires pour déployer NeoPro en production.

---

## Table des matières

1. [Comptes à créer](#1-comptes-à-créer)
2. [Configuration Supabase (Base de données)](#2-configuration-supabase-base-de-données)
3. [Configuration Redis](#3-configuration-redis)
4. [Configuration Render (Hébergement)](#4-configuration-render-hébergement)
5. [Configuration Docker Hub](#5-configuration-docker-hub)
6. [Configuration GitHub Actions](#6-configuration-github-actions)
7. [Configuration Email (Alertes)](#7-configuration-email-alertes)
8. [Configuration Slack (Notifications)](#8-configuration-slack-notifications)
9. [Configuration Monitoring](#9-configuration-monitoring)
10. [Migrations Base de données](#10-migrations-base-de-données)
11. [Variables d'environnement](#11-variables-denvironnement-complètes)
12. [Checklist finale](#12-checklist-finale)

---

## 1. Comptes à créer

| Service | Usage | Gratuit | Lien |
|---------|-------|---------|------|
| **Supabase** | Base de données PostgreSQL | ✅ 500MB | https://supabase.com |
| **Upstash** | Redis serverless | ✅ 10K req/jour | https://upstash.com |
| **Render** | Hébergement application | ✅ 750h/mois | https://render.com |
| **Docker Hub** | Registry images Docker | ✅ 1 repo privé | https://hub.docker.com |
| **SendGrid** | Envoi d'emails | ✅ 100/jour | https://sendgrid.com |
| **Slack** | Notifications alertes | ✅ | https://slack.com |
| **Grafana Cloud** | Monitoring (optionnel) | ✅ 10K métriques | https://grafana.com |
| **UptimeRobot** | Surveillance uptime | ✅ 50 monitors | https://uptimerobot.com |

---

## 2. Configuration Supabase (Base de données)

### Étape 2.1 : Créer un compte
1. Aller sur https://supabase.com
2. Cliquer **Start your project**
3. Se connecter avec GitHub (recommandé)

### Étape 2.2 : Créer un projet
1. Cliquer **New Project**
2. Remplir :
   - **Name** : `neopro-production`
   - **Database Password** : Générer un mot de passe fort (NOTER LE !)
   - **Region** : `West EU (Paris)` ou le plus proche
3. Cliquer **Create new project**
4. Attendre 2 minutes la création

### Étape 2.3 : Récupérer les informations de connexion
1. Aller dans **Settings** (icône engrenage)
2. Cliquer **Database**
3. Dans la section **Connection string**, copier l'URI :
   ```
   postgresql://postgres:[YOUR-PASSWORD]@db.xxxxx.supabase.co:5432/postgres
   ```
4. Remplacer `[YOUR-PASSWORD]` par le mot de passe créé à l'étape 2.2

### Étape 2.4 : Configurer la sécurité
1. Aller dans **Settings → Database**
2. Section **Connection Pooling** : Activer (recommandé pour production)
3. Copier aussi l'URI du pooler :
   ```
   postgresql://postgres:[YOUR-PASSWORD]@db.xxxxx.supabase.co:6543/postgres?pgbouncer=true
   ```

> 📝 **À noter** :
> - `DATABASE_URL` = URI avec pooler (port 6543)
> - Garder le mot de passe en lieu sûr

---

## 3. Configuration Redis

### Option A : Upstash (Recommandé - Serverless)

#### Étape 3.1 : Créer un compte
1. Aller sur https://upstash.com
2. Cliquer **Sign Up**
3. Se connecter avec GitHub

#### Étape 3.2 : Créer une base Redis
1. Cliquer **Create Database**
2. Remplir :
   - **Name** : `neopro-redis`
   - **Type** : `Regional`
   - **Region** : `eu-west-1` (Ireland) ou Paris si disponible
3. Cliquer **Create**

#### Étape 3.3 : Récupérer l'URL de connexion
1. Dans le dashboard de la base créée
2. Copier **UPSTASH_REDIS_REST_URL** et **UPSTASH_REDIS_REST_TOKEN**
3. Ou copier l'URL Redis classique :
   ```
   redis://default:xxxxx@eu1-xxxx.upstash.io:6379
   ```

### Option B : Redis Cloud

1. Aller sur https://redis.com/try-free/
2. Créer un compte
3. Créer une base gratuite (30MB)
4. Copier l'URL de connexion

---

## 4. Configuration Render (Hébergement)

### Étape 4.1 : Créer un compte
1. Aller sur https://render.com
2. Cliquer **Get Started**
3. Se connecter avec GitHub (pour lier les repos)

### Étape 4.2 : Connecter le repository GitHub
1. Dans Render, aller dans **Account Settings**
2. Section **Git Providers**
3. Connecter votre compte GitHub
4. Autoriser l'accès au repo `neopro`

### Étape 4.3 : Créer le service Web
1. Cliquer **New +** → **Web Service**
2. Sélectionner le repo `neopro`
3. Configurer :
   - **Name** : `neopro-central-server`
   - **Region** : `Frankfurt (EU Central)`
   - **Branch** : `main`
   - **Root Directory** : `central-server`
   - **Runtime** : `Node`
   - **Build Command** : `npm install && npm run build`
   - **Start Command** : `npm start`
   - **Instance Type** : `Free` (ou Starter $7/mois pour prod)

### Étape 4.4 : Configurer les variables d'environnement
1. Dans le service créé, aller dans **Environment**
2. Ajouter chaque variable (voir section 11)
3. Cliquer **Save Changes**

### Étape 4.5 : Configurer le Health Check
1. Aller dans **Settings**
2. Section **Health Check Path** : `/health`
3. Sauvegarder

### Étape 4.6 : Récupérer l'URL
Après déploiement, Render fournit une URL :
```
https://neopro-central-server.onrender.com
```

---

## 5. Configuration Docker Hub

### Étape 5.1 : Créer un compte
1. Aller sur https://hub.docker.com
2. Cliquer **Sign Up**
3. Choisir un username (ex: `monentreprise`)

### Étape 5.2 : Créer un repository
1. Cliquer **Create Repository**
2. Remplir :
   - **Name** : `neopro-central-server`
   - **Visibility** : `Private` (recommandé) ou `Public`
3. Cliquer **Create**

### Étape 5.3 : Créer un Access Token
1. Cliquer sur votre profil → **Account Settings**
2. Aller dans **Security**
3. Cliquer **New Access Token**
4. Remplir :
   - **Description** : `GitHub Actions CI/CD`
   - **Permissions** : `Read & Write`
5. Cliquer **Generate**
6. **COPIER LE TOKEN** (il ne sera plus visible après)

> 📝 **À noter** :
> - `DOCKER_USERNAME` = votre username Docker Hub
> - `DOCKER_PASSWORD` = le token généré (PAS votre mot de passe)

---

## 6. Configuration GitHub Actions

### Étape 6.1 : Accéder aux secrets
1. Aller sur votre repo GitHub
2. Cliquer **Settings** (onglet)
3. Dans le menu gauche : **Secrets and variables** → **Actions**

### Étape 6.2 : Ajouter les secrets
Cliquer **New repository secret** pour chaque secret :

| Nom du secret | Valeur | Obligatoire |
|---------------|--------|-------------|
| `DATABASE_URL` | URL Supabase (étape 2.3) | ✅ |
| `REDIS_URL` | URL Upstash (étape 3.3) | ✅ |
| `JWT_SECRET` | Chaîne aléatoire 64 caractères | ✅ |
| `DOCKER_USERNAME` | Username Docker Hub | ✅ |
| `DOCKER_PASSWORD` | Token Docker Hub (étape 5.3) | ✅ |
| `RENDER_API_KEY` | Clé API Render (voir ci-dessous) | Pour auto-deploy |
| `SENDGRID_API_KEY` | Clé API SendGrid | Pour emails |
| `SLACK_WEBHOOK_URL` | URL Webhook Slack | Pour notifications |

### Étape 6.3 : Obtenir la clé API Render
1. Sur Render, aller dans **Account Settings**
2. Section **API Keys**
3. Cliquer **Create API Key**
4. Copier la clé générée

---

## 7. Configuration Email (Alertes)

### Option A : SendGrid (Recommandé)

#### Étape 7.1 : Créer un compte
1. Aller sur https://sendgrid.com
2. Cliquer **Start For Free**
3. Créer un compte (email + mot de passe)

#### Étape 7.2 : Vérifier un expéditeur
1. Aller dans **Settings** → **Sender Authentication**
2. Cliquer **Verify a Single Sender**
3. Remplir le formulaire avec votre email
4. Confirmer via l'email reçu

#### Étape 7.3 : Créer une clé API
1. Aller dans **Settings** → **API Keys**
2. Cliquer **Create API Key**
3. Remplir :
   - **Name** : `neopro-alerts`
   - **Permissions** : `Restricted Access` → activer **Mail Send**
4. Cliquer **Create & View**
5. **COPIER LA CLÉ** (commence par `SG.`)

### Option B : Gmail SMTP (Simple mais limité)

```env
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=votre.email@gmail.com
SMTP_PASSWORD=xxxx xxxx xxxx xxxx  # Mot de passe d'application
```

Pour créer un mot de passe d'application Gmail :
1. Aller sur https://myaccount.google.com/apppasswords
2. Sélectionner **Mail** et **Autre (nom personnalisé)**
3. Copier le mot de passe généré

---

## 8. Configuration Slack (Notifications)

### Étape 8.1 : Créer une App Slack
1. Aller sur https://api.slack.com/apps
2. Cliquer **Create New App**
3. Choisir **From scratch**
4. Remplir :
   - **App Name** : `NeoPro Alerts`
   - **Workspace** : Sélectionner votre workspace
5. Cliquer **Create App**

### Étape 8.2 : Activer les Webhooks
1. Dans le menu gauche, cliquer **Incoming Webhooks**
2. Activer **Activate Incoming Webhooks** → `On`
3. Cliquer **Add New Webhook to Workspace**
4. Sélectionner le channel (ex: `#alerts-neopro`)
5. Cliquer **Allow**
6. Copier l'URL du Webhook :
   ```
   https://hooks.slack.com/services/T00000000/B00000000/XXXXXXXXXXXXXXXXXXXXXXXX
   ```

### Étape 8.3 : Tester le Webhook
```bash
curl -X POST -H 'Content-type: application/json' \
  --data '{"text":"Test NeoPro Alert!"}' \
  https://hooks.slack.com/services/xxx/yyy/zzz
```

---

## 9. Configuration Monitoring

### Option A : UptimeRobot (Surveillance basique)

#### Étape 9.1 : Créer un compte
1. Aller sur https://uptimerobot.com
2. Cliquer **Register for FREE**

#### Étape 9.2 : Créer un monitor
1. Cliquer **Add New Monitor**
2. Remplir :
   - **Monitor Type** : `HTTP(s)`
   - **Friendly Name** : `NeoPro API`
   - **URL** : `https://neopro-central-server.onrender.com/health`
   - **Monitoring Interval** : `5 minutes`
3. Configurer les alertes (email, Slack, etc.)
4. Cliquer **Create Monitor**

### Option B : Grafana Cloud (Monitoring avancé)

#### Étape 9.1 : Créer un compte
1. Aller sur https://grafana.com/products/cloud/
2. Cliquer **Create free account**

#### Étape 9.2 : Configurer Prometheus remote write
1. Dans Grafana Cloud, aller dans **Connections** → **Hosted Prometheus**
2. Copier les informations :
   - Remote Write URL
   - Username
   - API Key
3. Configurer dans votre application ou Prometheus local

---

## 10. Migrations Base de données

### Étape 10.1 : Se connecter à Supabase SQL Editor
1. Dans Supabase, aller dans **SQL Editor**
2. Cliquer **New Query**

### Étape 10.2 : Exécuter la migration MFA
Copier-coller et exécuter :

```sql
-- Migration: Ajout des colonnes MFA
-- Date: 2024
-- Description: Ajoute le support de l'authentification multi-facteurs

-- Ajouter les colonnes MFA à la table users
ALTER TABLE users
ADD COLUMN IF NOT EXISTS mfa_enabled BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS mfa_secret TEXT,
ADD COLUMN IF NOT EXISTS mfa_backup_codes TEXT[],
ADD COLUMN IF NOT EXISTS mfa_verified_at TIMESTAMP WITH TIME ZONE;

-- Index pour les requêtes MFA
CREATE INDEX IF NOT EXISTS idx_users_mfa_enabled ON users(mfa_enabled) WHERE mfa_enabled = TRUE;

-- Commentaires
COMMENT ON COLUMN users.mfa_enabled IS 'Indique si MFA est activé pour cet utilisateur';
COMMENT ON COLUMN users.mfa_secret IS 'Secret TOTP chiffré pour génération des codes';
COMMENT ON COLUMN users.mfa_backup_codes IS 'Codes de secours hachés';
COMMENT ON COLUMN users.mfa_verified_at IS 'Date de dernière vérification MFA';
```

### Étape 10.3 : Vérifier la migration
Exécuter :
```sql
SELECT column_name, data_type
FROM information_schema.columns
WHERE table_name = 'users'
AND column_name LIKE 'mfa%';
```

Résultat attendu :
```
column_name      | data_type
-----------------+---------------------------
mfa_enabled      | boolean
mfa_secret       | text
mfa_backup_codes | ARRAY
mfa_verified_at  | timestamp with time zone
```

---

## 11. Variables d'environnement complètes

### Fichier `.env` local (développement)

```env
# ============================================
# CONFIGURATION NEOPRO - DÉVELOPPEMENT
# ============================================

# ----- Application -----
NODE_ENV=development
PORT=3001

# ----- Base de données (Supabase) -----
DATABASE_URL=postgresql://postgres:VOTRE_MDP@db.xxxxx.supabase.co:6543/postgres?pgbouncer=true

# ----- Redis (Upstash) -----
REDIS_URL=redis://default:xxxxx@eu1-xxxx.upstash.io:6379

# ----- Authentification -----
JWT_SECRET=votre_secret_jwt_64_caracteres_minimum_tres_long_et_aleatoire
JWT_EXPIRES_IN=7d

# ----- MFA -----
MFA_ISSUER=NeoPro
MFA_ENCRYPTION_KEY=32_caracteres_aleatoires_ici!!

# ----- Email (SendGrid) -----
SENDGRID_API_KEY=SG.xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
EMAIL_FROM=noreply@votredomaine.com

# ----- Slack -----
SLACK_WEBHOOK_URL=https://hooks.slack.com/services/xxx/yyy/zzz
ALERT_SLACK_CHANNEL=#alerts-neopro

# ----- Monitoring -----
METRICS_ENABLED=true
```

### Variables Render (production)

Dans Render **Environment**, ajouter :

| Clé | Valeur |
|-----|--------|
| `NODE_ENV` | `production` |
| `PORT` | `3001` |
| `DATABASE_URL` | `postgresql://postgres:xxx@db.xxx.supabase.co:6543/postgres?pgbouncer=true` |
| `REDIS_URL` | `redis://default:xxx@eu1-xxx.upstash.io:6379` |
| `JWT_SECRET` | `(générer 64 caractères aléatoires)` |
| `JWT_EXPIRES_IN` | `7d` |
| `MFA_ISSUER` | `NeoPro` |
| `MFA_ENCRYPTION_KEY` | `(générer 32 caractères aléatoires)` |
| `SENDGRID_API_KEY` | `SG.xxx` |
| `EMAIL_FROM` | `alerts@votredomaine.com` |
| `SLACK_WEBHOOK_URL` | `https://hooks.slack.com/services/xxx` |
| `METRICS_ENABLED` | `true` |

### Générer des secrets aléatoires

```bash
# JWT_SECRET (64 caractères)
openssl rand -base64 48

# MFA_ENCRYPTION_KEY (32 caractères)
openssl rand -base64 24
```

Ou utiliser : https://randomkeygen.com/

---

## 12. Checklist finale

### Comptes créés
- [ ] Supabase (base de données)
- [ ] Upstash (Redis)
- [ ] Render (hébergement)
- [ ] Docker Hub (images Docker)
- [ ] SendGrid (emails)
- [ ] Slack App (notifications)
- [ ] UptimeRobot (monitoring uptime)

### Configuration Supabase
- [ ] Projet créé
- [ ] URL de connexion copiée
- [ ] Connection pooling activé
- [ ] Migration MFA exécutée

### Configuration Redis
- [ ] Base créée sur Upstash
- [ ] URL de connexion copiée

### Configuration Render
- [ ] Repository GitHub connecté
- [ ] Service Web créé
- [ ] Variables d'environnement configurées
- [ ] Health check configuré (`/health`)
- [ ] Premier déploiement réussi

### Configuration Docker Hub
- [ ] Repository créé
- [ ] Access Token généré

### Configuration GitHub
- [ ] Tous les secrets ajoutés
- [ ] Premier workflow CI/CD passé ✅

### Configuration Alertes
- [ ] SendGrid : expéditeur vérifié + clé API
- [ ] Slack : Webhook créé et testé

### Configuration Monitoring
- [ ] UptimeRobot : monitor créé
- [ ] Alertes email/Slack configurées

### Tests finaux
- [ ] `https://votre-app.onrender.com/health` → `{"status":"healthy"}`
- [ ] `https://votre-app.onrender.com/api-docs` → Swagger UI
- [ ] `https://votre-app.onrender.com/metrics` → Métriques Prometheus
- [ ] Login fonctionne
- [ ] MFA peut être activé
- [ ] Alertes arrivent sur Slack

---

## Aide et dépannage

### L'application ne démarre pas sur Render
1. Vérifier les logs dans Render → **Logs**
2. Vérifier que toutes les variables d'environnement sont définies
3. Vérifier que `DATABASE_URL` est correcte

### Erreur de connexion à la base de données
1. Vérifier le mot de passe dans l'URL
2. Utiliser le port `6543` (pooler) et non `5432`
3. Ajouter `?pgbouncer=true` à la fin de l'URL

### Redis ne se connecte pas
1. Vérifier l'URL Upstash
2. Vérifier que le mot de passe est inclus dans l'URL

### Les emails ne partent pas
1. Vérifier que l'expéditeur est vérifié dans SendGrid
2. Vérifier la clé API (commence par `SG.`)
3. Vérifier les logs pour les erreurs

### Les alertes Slack n'arrivent pas
1. Tester le webhook manuellement (curl)
2. Vérifier que le channel existe
3. Vérifier les permissions de l'app Slack

---

## Contact support

En cas de problème :
- **Supabase** : https://supabase.com/docs
- **Render** : https://render.com/docs
- **Upstash** : https://docs.upstash.com
- **SendGrid** : https://docs.sendgrid.com

---

*Document généré le : $(date)*
*Version : 1.0*
