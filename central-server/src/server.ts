import express, { Request, Response, NextFunction } from 'express';
import http from 'http';
import dns from 'node:dns';
import helmet from 'helmet';
import compression from 'compression';
import rateLimit from 'express-rate-limit';
import cookieParser from 'cookie-parser';
import dotenv from 'dotenv';

import logger from './config/logger';
import pool from './config/database';
import socketService from './services/socket.service';

import authRoutes from './routes/auth.routes';
import mfaRoutes from './routes/mfa.routes';
import sitesRoutes from './routes/sites.routes';
import groupsRoutes from './routes/groups.routes';
import contentRoutes from './routes/content.routes';
import updatesRoutes from './routes/updates.routes';
import analyticsRoutes from './routes/analytics.routes';
import auditRoutes from './routes/audit.routes';
import canaryRoutes from './routes/canary.routes';
import { authRateLimit, apiRateLimit, sensitiveRateLimit } from './middleware/user-rate-limit';

dotenv.config();

// Render ne supporte pas encore IPv6 en sortie, on force la résolution IPv4 des hôtes (Supabase)
dns.setDefaultResultOrder('ipv4first');

const allowedOrigins =
  process.env.ALLOWED_ORIGINS?.split(',')
    .map((origin) => origin.trim())
    .filter(Boolean) || [];

const app = express();
const httpServer = http.createServer(app);

const PORT = process.env.PORT || 3001;
const NODE_ENV = process.env.NODE_ENV || 'development';

// Trust proxy pour fonctionner derrière un reverse proxy (Render, etc.)
// Nécessaire pour express-rate-limit et pour obtenir la vraie IP client
if (NODE_ENV === 'production') {
  app.set('trust proxy', 1);
}

app.use(helmet());

const resolveOrigin = (origin?: string | undefined) => {
  if (!origin) return null;
  if (allowedOrigins.length === 0) {
    return origin;
  }
  return allowedOrigins.includes(origin) ? origin : null;
};

app.use((req, res, next) => {
  const origin = req.headers.origin;

  // Déterminer l'origine à autoriser
  let allowedOrigin: string | null = null;

  if (origin) {
    const matchedOrigin = resolveOrigin(origin);
    if (matchedOrigin) {
      allowedOrigin = matchedOrigin;
    }
  } else if (allowedOrigins.length === 0) {
    allowedOrigin = '*';
  }

  // Toujours définir les headers CORS si une origine est autorisée
  if (allowedOrigin) {
    res.header('Access-Control-Allow-Origin', allowedOrigin);
    if (allowedOrigin !== '*') {
      res.header('Vary', 'Origin');
      res.header('Access-Control-Allow-Credentials', 'true');
    }
  }

  // Toujours définir ces headers pour les requêtes OPTIONS
  res.header('Access-Control-Allow-Methods', 'GET,POST,PUT,PATCH,DELETE,OPTIONS');
  res.header('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-Requested-With');

  // Gérer les requêtes preflight
  if (req.method === 'OPTIONS') {
    return res.sendStatus(204);
  }

  next();
});

app.use(compression());
app.use(cookieParser());

app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

const limiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: NODE_ENV === 'production' ? 100 : 1000,
  message: 'Trop de requêtes, veuillez réessayer plus tard',
});
app.use('/api/', limiter);

app.use((req: Request, _res: Response, next: NextFunction) => {
  logger.debug('Request', {
    method: req.method,
    path: req.path,
    ip: req.ip,
  });
  next();
});

app.get('/', (_req: Request, res: Response) => {
  res.json({
    service: 'NEOPRO Central Server',
    version: '1.0.0',
    status: 'online',
    timestamp: new Date().toISOString(),
  });
});

app.get('/health', async (_req: Request, res: Response) => {
  const startTime = Date.now();
  const health: {
    status: 'healthy' | 'degraded' | 'unhealthy';
    timestamp: string;
    version: string;
    uptime: number;
    memory: NodeJS.MemoryUsage;
    checks: {
      database: { status: string; latencyMs: number };
      sockets: { connected: number; status: string };
    };
  } = {
    status: 'healthy',
    timestamp: new Date().toISOString(),
    version: process.env.npm_package_version || '1.0.0',
    uptime: process.uptime(),
    memory: process.memoryUsage(),
    checks: {
      database: { status: 'unknown', latencyMs: 0 },
      sockets: { connected: 0, status: 'unknown' },
    },
  };

  // Check database
  const dbStart = Date.now();
  try {
    await pool.query('SELECT 1');
    health.checks.database = { status: 'ok', latencyMs: Date.now() - dbStart };
  } catch (error) {
    health.checks.database = { status: 'error', latencyMs: Date.now() - dbStart };
    health.status = 'degraded';
    logger.error('Health check - database failed:', error);
  }

  // Check sockets
  try {
    const connectedSites = socketService.getConnectionCount();
    health.checks.sockets = {
      connected: connectedSites,
      status: 'ok',
    };
  } catch (error) {
    health.checks.sockets = { connected: 0, status: 'error' };
    health.status = 'degraded';
  }

  // Determine overall status
  const allChecksOk = Object.values(health.checks).every(
    (check) => check.status === 'ok'
  );

  if (!allChecksOk) {
    health.status = 'degraded';
  }

  const httpStatus = health.status === 'healthy' ? 200 : 503;
  res.status(httpStatus).json(health);
});

// Rate limiters spécifiques par type d'endpoint
app.use('/api/auth', authRateLimit, authRoutes); // Restrictif pour auth
app.use('/api/mfa', authRateLimit, mfaRoutes);   // MFA - même restrictions que auth
app.use('/api/sites', apiRateLimit, sitesRoutes);
app.use('/api/groups', apiRateLimit, groupsRoutes);
app.use('/api/videos', sensitiveRateLimit); // Upload de vidéos - plus restrictif
app.use('/api', apiRateLimit, contentRoutes);
app.use('/api', sensitiveRateLimit, updatesRoutes); // Mises à jour - sensible
app.use('/api/analytics', apiRateLimit, analyticsRoutes);
app.use('/api/audit', apiRateLimit, auditRoutes);
app.use('/api/canary', sensitiveRateLimit, canaryRoutes); // Déploiements canary - sensible

app.use((req: Request, res: Response) => {
  res.status(404).json({
    error: 'Route non trouvée',
    path: req.path,
  });
});

app.use((err: Error, req: Request, res: Response, _next: NextFunction) => {
  logger.error('Unhandled error:', {
    error: err.message,
    stack: err.stack,
    path: req.path,
    method: req.method,
  });

  res.status(500).json({
    error: 'Erreur serveur interne',
    message: NODE_ENV === 'development' ? err.message : undefined,
  });
});

const startServer = async () => {
  try {
    // Tester la connexion à la base de données
    await pool.query('SELECT NOW()');
    logger.info('Database connection established');

    // Initialiser Socket.IO (avec Redis si configuré)
    await socketService.initialize(httpServer);

    httpServer.listen(PORT, () => {
      logger.info(`🚀 NEOPRO Central Server démarré`, {
        port: PORT,
        environment: NODE_ENV,
        processId: process.pid,
        redisEnabled: socketService.isRedisConnected(),
      });
      logger.info(`API disponible sur http://localhost:${PORT}`);
      logger.info(`WebSocket disponible sur ws://localhost:${PORT}`);
    });
  } catch (error) {
    logger.error('Failed to start server:', error);
    process.exit(1);
  }
};

process.on('SIGTERM', async () => {
  logger.info('SIGTERM signal received: closing HTTP server');
  httpServer.close(async () => {
    logger.info('HTTP server closed');
    await socketService.cleanup();
    await pool.end();
    logger.info('Database pool closed');
    process.exit(0);
  });
});

process.on('unhandledRejection', (reason, promise) => {
  logger.error('Unhandled Rejection at:', { promise, reason });
});

process.on('uncaughtException', (error) => {
  logger.error('Uncaught Exception:', error);
  process.exit(1);
});

startServer();

export { app, httpServer };
