/**
 * Service de vérification d'expiration des vidéos
 *
 * Vérifie périodiquement les vidéos avec une date d'expiration
 * et les supprime automatiquement quand elles sont expirées.
 * Fonctionne même en mode offline.
 */

const fs = require('fs-extra');
const path = require('path');
const logger = require('../logger');
const { config } = require('../config');

class ExpirationCheckerService {
  constructor() {
    this.checkInterval = null;
    this.isRunning = false;
  }

  /**
   * Démarre la vérification périodique
   * @param {number} intervalMs - Intervalle en millisecondes (défaut: 1 heure)
   */
  start(intervalMs = 60 * 60 * 1000) {
    if (this.checkInterval) {
      logger.warn('Expiration checker already running');
      return;
    }

    logger.info('Starting expiration checker', { intervalMs });

    // Vérification immédiate au démarrage
    this.checkExpiredVideos();

    // Puis vérification périodique
    this.checkInterval = setInterval(() => {
      this.checkExpiredVideos();
    }, intervalMs);
  }

  /**
   * Arrête la vérification périodique
   */
  stop() {
    if (this.checkInterval) {
      clearInterval(this.checkInterval);
      this.checkInterval = null;
      logger.info('Expiration checker stopped');
    }
  }

  /**
   * Vérifie et supprime les vidéos expirées
   * @returns {Promise<Object>} Résultat de la vérification
   */
  async checkExpiredVideos() {
    if (this.isRunning) {
      logger.debug('Expiration check already in progress');
      return { skipped: true };
    }

    this.isRunning = true;
    const results = {
      checked: 0,
      expired: 0,
      removed: [],
      errors: [],
    };

    try {
      const configPath = config.paths.config;

      if (!await fs.pathExists(configPath)) {
        logger.debug('No configuration file found');
        return results;
      }

      const content = await fs.readFile(configPath, 'utf8');
      const configuration = JSON.parse(content);

      if (!configuration.categories) {
        return results;
      }

      const now = new Date();
      let configModified = false;

      for (const category of configuration.categories) {
        // Vérifier les vidéos de la catégorie principale
        if (category.videos && category.videos.length > 0) {
          const result = await this.processVideos(category.videos, category.name, null, now);
          results.checked += result.checked;
          results.expired += result.expired;
          results.removed.push(...result.removed);
          results.errors.push(...result.errors);

          if (result.expired > 0) {
            category.videos = result.remainingVideos;
            configModified = true;
          }
        }

        // Vérifier les sous-catégories
        if (category.subCategories) {
          for (const subcategory of category.subCategories) {
            if (subcategory.videos && subcategory.videos.length > 0) {
              const result = await this.processVideos(
                subcategory.videos,
                category.name,
                subcategory.name,
                now
              );
              results.checked += result.checked;
              results.expired += result.expired;
              results.removed.push(...result.removed);
              results.errors.push(...result.errors);

              if (result.expired > 0) {
                subcategory.videos = result.remainingVideos;
                configModified = true;
              }
            }
          }
        }
      }

      // Sauvegarder la configuration si modifiée
      if (configModified) {
        await fs.writeFile(configPath, JSON.stringify(configuration, null, 2));
        logger.info('Configuration updated after removing expired videos');

        // Notifier l'application locale
        await this.notifyLocalApp();
      }

      if (results.expired > 0) {
        logger.info('Expired videos removed', {
          expired: results.expired,
          removed: results.removed.map(r => r.name),
        });
      } else {
        logger.debug('No expired videos found', { checked: results.checked });
      }

      return results;
    } catch (error) {
      logger.error('Failed to check expired videos:', error);
      results.errors.push({ error: error.message });
      return results;
    } finally {
      this.isRunning = false;
    }
  }

  /**
   * Traite une liste de vidéos pour vérifier l'expiration
   * @param {Array} videos - Liste des vidéos
   * @param {string} categoryName - Nom de la catégorie
   * @param {string|null} subcategoryName - Nom de la sous-catégorie
   * @param {Date} now - Date actuelle
   * @returns {Promise<Object>} Résultat du traitement
   */
  async processVideos(videos, categoryName, subcategoryName, now) {
    const result = {
      checked: 0,
      expired: 0,
      removed: [],
      errors: [],
      remainingVideos: [],
    };

    for (const video of videos) {
      result.checked++;

      if (!video.expires_at) {
        result.remainingVideos.push(video);
        continue;
      }

      const expiresAt = new Date(video.expires_at);

      if (expiresAt < now) {
        // Vidéo expirée
        result.expired++;

        try {
          // Supprimer le fichier vidéo
          const videoPath = path.join(config.paths.root, 'webapp', video.path);

          if (await fs.pathExists(videoPath)) {
            await fs.remove(videoPath);
            logger.info('Expired video file removed', {
              name: video.name,
              path: videoPath,
              expiredAt: video.expires_at,
            });
          }

          result.removed.push({
            name: video.name,
            path: video.path,
            expiredAt: video.expires_at,
            category: categoryName,
            subcategory: subcategoryName,
          });
        } catch (error) {
          logger.error('Failed to remove expired video file:', {
            name: video.name,
            error: error.message,
          });
          result.errors.push({
            video: video.name,
            error: error.message,
          });
          // Garder la vidéo dans la config si on n'a pas pu supprimer le fichier
          result.remainingVideos.push(video);
        }
      } else {
        result.remainingVideos.push(video);
      }
    }

    return result;
  }

  /**
   * Notifie l'application locale d'un changement de configuration
   */
  async notifyLocalApp() {
    try {
      const io = require('socket.io-client');
      const socket = io('http://localhost:3000', { timeout: 5000 });

      socket.emit('config_updated');

      setTimeout(() => socket.close(), 1000);

      logger.debug('Local app notified of configuration change');
    } catch (error) {
      logger.warn('Could not notify local app:', error.message);
    }
  }

  /**
   * Retourne les vidéos qui vont expirer bientôt
   * @param {number} withinHours - Nombre d'heures pour "bientôt" (défaut: 24)
   * @returns {Promise<Array>} Liste des vidéos expirant bientôt
   */
  async getExpiringVideos(withinHours = 24) {
    const expiringSoon = [];

    try {
      const configPath = config.paths.config;

      if (!await fs.pathExists(configPath)) {
        return expiringSoon;
      }

      const content = await fs.readFile(configPath, 'utf8');
      const configuration = JSON.parse(content);

      if (!configuration.categories) {
        return expiringSoon;
      }

      const now = new Date();
      const threshold = new Date(now.getTime() + withinHours * 60 * 60 * 1000);

      const checkVideos = (videos, categoryName, subcategoryName) => {
        for (const video of videos || []) {
          if (video.expires_at) {
            const expiresAt = new Date(video.expires_at);
            if (expiresAt > now && expiresAt <= threshold) {
              expiringSoon.push({
                name: video.name,
                path: video.path,
                expiresAt: video.expires_at,
                category: categoryName,
                subcategory: subcategoryName,
                hoursRemaining: Math.round((expiresAt - now) / (1000 * 60 * 60)),
              });
            }
          }
        }
      };

      for (const category of configuration.categories) {
        checkVideos(category.videos, category.name, null);

        if (category.subCategories) {
          for (const subcategory of category.subCategories) {
            checkVideos(subcategory.videos, category.name, subcategory.name);
          }
        }
      }

      return expiringSoon.sort((a, b) => new Date(a.expiresAt) - new Date(b.expiresAt));
    } catch (error) {
      logger.error('Failed to get expiring videos:', error);
      return expiringSoon;
    }
  }
}

module.exports = new ExpirationCheckerService();
