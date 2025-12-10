-- Migration: Ajouter la colonne last_ip à la table sites
-- Cette colonne stocke l'adresse IP du boîtier lors de sa dernière connexion

ALTER TABLE sites ADD COLUMN IF NOT EXISTS last_ip VARCHAR(45);

-- Commentaire sur la colonne
COMMENT ON COLUMN sites.last_ip IS 'Dernière adresse IP connue du boîtier (IPv4 ou IPv6)';
