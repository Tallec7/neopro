/**
 * Service de queue de commandes offline
 * Stocke les commandes localement quand le Pi est hors ligne
 * et les rejoue automatiquement à la reconnexion.
 */

const fs = require('fs-extra');
const path = require('path');
const { v4: uuidv4 } = require('uuid');
const logger = require('../logger');
const { config } = require('../config');

class OfflineQueueService {
  constructor() {
    this.queuePath = path.join(config.paths.data || '/home/pi/neopro/data', 'offline-queue.json');
    this.maxQueueSize = 100;
    this.maxAge = 7 * 24 * 60 * 60 * 1000; // 7 jours
  }

  /**
   * Charge la queue depuis le fichier
   * @returns {Promise<Array>}
   */
  async loadQueue() {
    try {
      if (await fs.pathExists(this.queuePath)) {
        const content = await fs.readFile(this.queuePath, 'utf-8');
        return JSON.parse(content);
      }
    } catch (error) {
      logger.warn('Failed to load offline queue:', error.message);
    }
    return [];
  }

  /**
   * Sauvegarde la queue sur disque
   * @param {Array} queue
   */
  async saveQueue(queue) {
    try {
      await fs.ensureDir(path.dirname(this.queuePath));
      await fs.writeFile(this.queuePath, JSON.stringify(queue, null, 2));
    } catch (error) {
      logger.error('Failed to save offline queue:', error);
    }
  }

  /**
   * Ajoute une commande à la queue offline
   * @param {string} commandType Type de commande
   * @param {object} commandData Données de la commande
   * @param {object} options Options (priority, expiresAt, etc.)
   * @returns {Promise<string>} ID de l'entrée
   */
  async enqueue(commandType, commandData, options = {}) {
    try {
      const queue = await this.loadQueue();

      const entry = {
        id: uuidv4(),
        type: commandType,
        data: commandData,
        priority: options.priority || 'normal', // high, normal, low
        createdAt: new Date().toISOString(),
        expiresAt: options.expiresAt || new Date(Date.now() + this.maxAge).toISOString(),
        attempts: 0,
        maxAttempts: options.maxAttempts || 3,
        lastError: null,
      };

      // Dédupliquer les commandes du même type avec les mêmes données
      const isDuplicate = queue.some(
        (item) => item.type === commandType && JSON.stringify(item.data) === JSON.stringify(commandData)
      );

      if (isDuplicate) {
        logger.debug('Duplicate command ignored', { type: commandType });
        return null;
      }

      // Ajouter en respectant la priorité
      if (entry.priority === 'high') {
        queue.unshift(entry);
      } else {
        queue.push(entry);
      }

      // Limiter la taille de la queue
      if (queue.length > this.maxQueueSize) {
        // Supprimer les plus anciennes commandes low priority d'abord
        const lowPriorityIndex = queue.findIndex((item) => item.priority === 'low');
        if (lowPriorityIndex !== -1) {
          queue.splice(lowPriorityIndex, 1);
        } else {
          queue.pop(); // Supprimer la dernière
        }
      }

      await this.saveQueue(queue);

      logger.info('Command queued for offline execution', {
        id: entry.id,
        type: commandType,
        priority: entry.priority,
        queueSize: queue.length,
      });

      return entry.id;
    } catch (error) {
      logger.error('Failed to enqueue command:', error);
      return null;
    }
  }

  /**
   * Récupère et supprime la prochaine commande à exécuter
   * @returns {Promise<object|null>}
   */
  async dequeue() {
    try {
      const queue = await this.loadQueue();

      if (queue.length === 0) {
        return null;
      }

      // Filtrer les commandes expirées
      const now = new Date();
      const validQueue = queue.filter((item) => new Date(item.expiresAt) > now);

      if (validQueue.length !== queue.length) {
        const expiredCount = queue.length - validQueue.length;
        logger.info('Expired commands removed from queue', { count: expiredCount });
        await this.saveQueue(validQueue);
      }

      if (validQueue.length === 0) {
        return null;
      }

      // Récupérer la première commande (priorité déjà gérée à l'insertion)
      const entry = validQueue.shift();
      await this.saveQueue(validQueue);

      return entry;
    } catch (error) {
      logger.error('Failed to dequeue command:', error);
      return null;
    }
  }

  /**
   * Remet une commande en queue après un échec
   * @param {object} entry L'entrée à remettre en queue
   * @param {string} error Message d'erreur
   */
  async requeue(entry, error) {
    try {
      entry.attempts++;
      entry.lastError = error;

      if (entry.attempts >= entry.maxAttempts) {
        logger.warn('Command exceeded max attempts, discarding', {
          id: entry.id,
          type: entry.type,
          attempts: entry.attempts,
          lastError: error,
        });
        return false;
      }

      const queue = await this.loadQueue();
      queue.push(entry); // Remettre à la fin
      await this.saveQueue(queue);

      logger.info('Command requeued for retry', {
        id: entry.id,
        type: entry.type,
        attempts: entry.attempts,
        maxAttempts: entry.maxAttempts,
      });

      return true;
    } catch (err) {
      logger.error('Failed to requeue command:', err);
      return false;
    }
  }

  /**
   * Exécute toutes les commandes en queue
   * @param {Function} executor Fonction qui exécute une commande
   * @returns {Promise<object>} Statistiques d'exécution
   */
  async processQueue(executor) {
    const stats = {
      processed: 0,
      succeeded: 0,
      failed: 0,
      requeued: 0,
    };

    logger.info('Processing offline queue...');

    let entry;
    while ((entry = await this.dequeue()) !== null) {
      stats.processed++;

      try {
        logger.info('Executing queued command', {
          id: entry.id,
          type: entry.type,
          attempt: entry.attempts + 1,
        });

        await executor(entry.type, entry.data);

        stats.succeeded++;
        logger.info('Queued command succeeded', { id: entry.id, type: entry.type });
      } catch (error) {
        stats.failed++;
        logger.error('Queued command failed', {
          id: entry.id,
          type: entry.type,
          error: error.message,
        });

        // Remettre en queue si les tentatives ne sont pas épuisées
        if (await this.requeue(entry, error.message)) {
          stats.requeued++;
        }
      }
    }

    if (stats.processed > 0) {
      logger.info('Offline queue processing complete', stats);
    }

    return stats;
  }

  /**
   * Retourne le nombre de commandes en attente
   * @returns {Promise<number>}
   */
  async getQueueSize() {
    const queue = await this.loadQueue();
    return queue.length;
  }

  /**
   * Retourne les statistiques de la queue
   * @returns {Promise<object>}
   */
  async getStats() {
    const queue = await this.loadQueue();
    const now = new Date();

    const stats = {
      total: queue.length,
      byPriority: {
        high: 0,
        normal: 0,
        low: 0,
      },
      byType: {},
      expired: 0,
      withErrors: 0,
    };

    for (const item of queue) {
      // Par priorité
      stats.byPriority[item.priority] = (stats.byPriority[item.priority] || 0) + 1;

      // Par type
      stats.byType[item.type] = (stats.byType[item.type] || 0) + 1;

      // Expirées
      if (new Date(item.expiresAt) <= now) {
        stats.expired++;
      }

      // Avec erreurs
      if (item.lastError) {
        stats.withErrors++;
      }
    }

    return stats;
  }

  /**
   * Vide la queue
   * @returns {Promise<number>} Nombre d'entrées supprimées
   */
  async clear() {
    const queue = await this.loadQueue();
    const count = queue.length;

    await this.saveQueue([]);

    logger.info('Offline queue cleared', { count });
    return count;
  }

  /**
   * Nettoie les commandes expirées
   * @returns {Promise<number>} Nombre d'entrées supprimées
   */
  async cleanup() {
    const queue = await this.loadQueue();
    const now = new Date();

    const validQueue = queue.filter((item) => new Date(item.expiresAt) > now);
    const removedCount = queue.length - validQueue.length;

    if (removedCount > 0) {
      await this.saveQueue(validQueue);
      logger.info('Expired commands cleaned up', { removed: removedCount });
    }

    return removedCount;
  }
}

// Singleton
const offlineQueue = new OfflineQueueService();

module.exports = offlineQueue;
