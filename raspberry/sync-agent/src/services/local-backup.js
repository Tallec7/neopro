/**
 * Service de backup automatique local
 *
 * Cree des sauvegardes quotidiennes de la configuration locale.
 * Garde les N derniers jours de backups et nettoie les anciens.
 */

const fs = require('fs-extra');
const path = require('path');
const logger = require('../logger');
const { config } = require('../config');

const BACKUP_RETENTION_DAYS = 7;

class LocalBackupService {
  constructor() {
    this.cronJob = null;
  }

  start(hour = 3) {
    const now = new Date();
    const nextRun = new Date(now);
    nextRun.setHours(hour, 0, 0, 0);

    if (nextRun <= now) {
      nextRun.setDate(nextRun.getDate() + 1);
    }

    const delayMs = nextRun - now;

    logger.info('Local backup service started', {
      nextBackup: nextRun.toISOString(),
      backupHour: hour,
    });

    setTimeout(() => {
      this.createDailyBackup();
      this.cronJob = setInterval(() => {
        this.createDailyBackup();
      }, 24 * 60 * 60 * 1000);
    }, delayMs);
  }

  stop() {
    if (this.cronJob) {
      clearInterval(this.cronJob);
      this.cronJob = null;
      logger.info('Local backup service stopped');
    }
  }

  async createDailyBackup() {
    const timestamp = new Date().toISOString().split('T')[0];
    const backupDir = path.join(config.paths.backup, 'config-' + timestamp);

    logger.info('Creating daily backup', { backupDir });

    try {
      await fs.ensureDir(backupDir);

      const filesToBackup = [
        { source: config.paths.config, dest: path.join(backupDir, 'configuration.json') },
        { source: path.join(config.paths.root, 'data', 'offline-queue.json'), dest: path.join(backupDir, 'offline-queue.json') },
        { source: '/etc/neopro/site.conf', dest: path.join(backupDir, 'site.conf') },
      ];

      const backedUp = [];
      const errors = [];

      for (const file of filesToBackup) {
        try {
          if (await fs.pathExists(file.source)) {
            await fs.copy(file.source, file.dest);
            backedUp.push(path.basename(file.source));
          }
        } catch (error) {
          errors.push({ file: file.source, error: error.message });
          logger.warn('Failed to backup file:', { file: file.source, error: error.message });
        }
      }

      const metadata = {
        timestamp: new Date().toISOString(),
        backupDir,
        filesBackedUp: backedUp,
        errors,
        systemInfo: {
          hostname: require('os').hostname(),
          siteId: config.site.id,
          siteName: config.site.name,
        },
      };

      await fs.writeFile(path.join(backupDir, 'metadata.json'), JSON.stringify(metadata, null, 2));

      const cleanupResult = await this.cleanOldBackups(BACKUP_RETENTION_DAYS);

      logger.info('Daily backup completed', {
        backupDir,
        filesBackedUp: backedUp,
        oldBackupsRemoved: cleanupResult.removed,
      });

      return { success: true, backupDir, filesBackedUp: backedUp, errors, cleanupResult };
    } catch (error) {
      logger.error('Daily backup failed:', error);
      return { success: false, error: error.message };
    }
  }

  async cleanOldBackups(retentionDays) {
    const result = { checked: 0, removed: 0, errors: [] };

    try {
      const backupRoot = config.paths.backup;
      if (!await fs.pathExists(backupRoot)) return result;

      const entries = await fs.readdir(backupRoot, { withFileTypes: true });
      const now = new Date();
      const cutoffDate = new Date(now.getTime() - retentionDays * 24 * 60 * 60 * 1000);

      for (const entry of entries) {
        if (!entry.isDirectory() || !entry.name.startsWith('config-')) continue;
        result.checked++;

        const dateMatch = entry.name.match(/config-(\d{4}-\d{2}-\d{2})/);
        if (!dateMatch) continue;

        const backupDate = new Date(dateMatch[1]);
        if (backupDate < cutoffDate) {
          try {
            await fs.remove(path.join(backupRoot, entry.name));
            result.removed++;
          } catch (error) {
            result.errors.push({ dir: entry.name, error: error.message });
          }
        }
      }

      if (result.removed > 0) {
        logger.info('Old backups cleaned', { removed: result.removed, retentionDays });
      }
      return result;
    } catch (error) {
      logger.error('Failed to clean old backups:', error);
      result.errors.push({ error: error.message });
      return result;
    }
  }

  async listBackups() {
    const backups = [];
    try {
      const backupRoot = config.paths.backup;
      if (!await fs.pathExists(backupRoot)) return backups;

      const entries = await fs.readdir(backupRoot, { withFileTypes: true });

      for (const entry of entries) {
        if (!entry.isDirectory() || !entry.name.startsWith('config-')) continue;

        const backupPath = path.join(backupRoot, entry.name);
        const metadataPath = path.join(backupPath, 'metadata.json');
        let metadata = null;

        if (await fs.pathExists(metadataPath)) {
          const content = await fs.readFile(metadataPath, 'utf8');
          metadata = JSON.parse(content);
        }

        const stats = await fs.stat(backupPath);
        backups.push({
          name: entry.name,
          path: backupPath,
          date: entry.name.replace('config-', ''),
          createdAt: stats.mtime.toISOString(),
          metadata,
        });
      }

      backups.sort((a, b) => new Date(b.date) - new Date(a.date));
      return backups;
    } catch (error) {
      logger.error('Failed to list backups:', error);
      return backups;
    }
  }

  async restoreBackup(backupName) {
    const backupDir = path.join(config.paths.backup, backupName);
    logger.info('Restoring backup', { backupDir });

    try {
      if (!await fs.pathExists(backupDir)) {
        throw new Error('Backup not found: ' + backupName);
      }

      const configBackup = path.join(backupDir, 'configuration.json');
      if (!await fs.pathExists(configBackup)) {
        throw new Error('configuration.json not found in backup');
      }

      const currentConfigPath = config.paths.config;
      if (await fs.pathExists(currentConfigPath)) {
        const preRestoreBackup = currentConfigPath + '.pre-restore-' + Date.now();
        await fs.copy(currentConfigPath, preRestoreBackup);
        logger.info('Pre-restore backup created', { path: preRestoreBackup });
      }

      await fs.copy(configBackup, currentConfigPath);
      await this.notifyLocalApp();

      logger.info('Backup restored successfully', { backupDir });
      return { success: true, backupDir, restoredAt: new Date().toISOString() };
    } catch (error) {
      logger.error('Backup restoration failed:', error);
      return { success: false, error: error.message };
    }
  }

  async createManualBackup(label) {
    label = label || 'manual';
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const backupDir = path.join(config.paths.backup, 'config-' + label + '-' + timestamp);

    logger.info('Creating manual backup', { backupDir, label });

    try {
      await fs.ensureDir(backupDir);
      const configPath = config.paths.config;

      if (await fs.pathExists(configPath)) {
        await fs.copy(configPath, path.join(backupDir, 'configuration.json'));
      }

      const metadata = { timestamp: new Date().toISOString(), label, type: 'manual', backupDir };
      await fs.writeFile(path.join(backupDir, 'metadata.json'), JSON.stringify(metadata, null, 2));

      logger.info('Manual backup created', { backupDir });
      return { success: true, backupDir, label };
    } catch (error) {
      logger.error('Manual backup failed:', error);
      return { success: false, error: error.message };
    }
  }

  async notifyLocalApp() {
    try {
      const io = require('socket.io-client');
      const socket = io('http://localhost:3000', { timeout: 5000 });
      socket.emit('config_updated');
      setTimeout(() => socket.close(), 1000);
    } catch (error) {
      logger.warn('Could not notify local app:', error.message);
    }
  }
}

module.exports = new LocalBackupService();
