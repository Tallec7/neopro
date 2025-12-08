import { Response } from 'express';
import {
  getSites,
  getSite,
  createSite,
  updateSite,
  deleteSite,
  regenerateApiKey,
  getSiteStats,
} from './sites.controller';
import { query } from '../config/database';
import { AuthRequest } from '../types';

// Helper to create mock response
const createMockResponse = (): Response => {
  const res: Partial<Response> = {
    status: jest.fn().mockReturnThis(),
    json: jest.fn().mockReturnThis(),
  };
  return res as Response;
};

// Helper to create authenticated request
const createAuthRequest = (overrides: Partial<AuthRequest> = {}): AuthRequest => ({
  user: { id: 'user-123', email: 'admin@example.com', role: 'admin' },
  params: {},
  query: {},
  body: {},
  ...overrides,
} as AuthRequest);

describe('Sites Controller', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('getSites', () => {
    it('should return all sites without filters', async () => {
      const req = createAuthRequest({ query: {} });
      const res = createMockResponse();

      const mockSites = [
        { id: '1', site_name: 'Site A', status: 'online' },
        { id: '2', site_name: 'Site B', status: 'offline' },
      ];

      (query as jest.Mock).mockResolvedValueOnce({ rows: mockSites });

      await getSites(req, res);

      expect(res.json).toHaveBeenCalledWith({
        total: 2,
        sites: mockSites,
      });
    });

    it('should filter sites by status', async () => {
      const req = createAuthRequest({ query: { status: 'online' } });
      const res = createMockResponse();

      (query as jest.Mock).mockResolvedValueOnce({ rows: [{ id: '1', status: 'online' }] });

      await getSites(req, res);

      expect(query).toHaveBeenCalledWith(
        expect.stringContaining('AND status = $1'),
        ['online']
      );
    });

    it('should filter sites by search term', async () => {
      const req = createAuthRequest({ query: { search: 'test' } });
      const res = createMockResponse();

      (query as jest.Mock).mockResolvedValueOnce({ rows: [] });

      await getSites(req, res);

      expect(query).toHaveBeenCalledWith(
        expect.stringContaining('ILIKE'),
        ['%test%']
      );
    });

    it('should return 500 on database error', async () => {
      const req = createAuthRequest({ query: {} });
      const res = createMockResponse();

      (query as jest.Mock).mockRejectedValueOnce(new Error('DB Error'));

      await getSites(req, res);

      expect(res.status).toHaveBeenCalledWith(500);
      expect(res.json).toHaveBeenCalledWith({
        error: 'Erreur lors de la récupération des sites',
      });
    });
  });

  describe('getSite', () => {
    it('should return site by id', async () => {
      const req = createAuthRequest({ params: { id: 'site-123' } });
      const res = createMockResponse();

      const mockSite = { id: 'site-123', site_name: 'Test Site' };
      (query as jest.Mock).mockResolvedValueOnce({ rows: [mockSite] });

      await getSite(req, res);

      expect(query).toHaveBeenCalledWith('SELECT * FROM sites WHERE id = $1', ['site-123']);
      expect(res.json).toHaveBeenCalledWith(mockSite);
    });

    it('should return 404 if site not found', async () => {
      const req = createAuthRequest({ params: { id: 'nonexistent' } });
      const res = createMockResponse();

      (query as jest.Mock).mockResolvedValueOnce({ rows: [] });

      await getSite(req, res);

      expect(res.status).toHaveBeenCalledWith(404);
      expect(res.json).toHaveBeenCalledWith({ error: 'Site non trouvé' });
    });
  });

  describe('createSite', () => {
    it('should create a new site with generated API key', async () => {
      const req = createAuthRequest({
        body: {
          site_name: 'New Site',
          club_name: 'Test Club',
          location: { city: 'Paris' },
          sports: ['volleyball'],
        },
      });
      const res = createMockResponse();

      // Mock for checking existing sites
      (query as jest.Mock)
        .mockResolvedValueOnce({ rows: [] })
        // Mock for INSERT
        .mockResolvedValueOnce({
          rows: [{
            id: 'new-site-id',
            site_name: 'New Site',
            club_name: 'Test Club',
            status: 'offline',
          }],
        });

      await createSite(req, res);

      expect(res.status).toHaveBeenCalledWith(201);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          site_name: 'New Site',
          api_key: expect.any(String),
        })
      );
    });

    it('should generate unique name if duplicate exists', async () => {
      const req = createAuthRequest({
        body: {
          site_name: 'Existing Site',
          club_name: 'Test Club',
        },
      });
      const res = createMockResponse();

      // Mock for checking existing sites - site exists
      (query as jest.Mock)
        .mockResolvedValueOnce({
          rows: [{ site_name: 'Existing Site' }],
        })
        // Mock for INSERT
        .mockResolvedValueOnce({
          rows: [{
            id: 'new-site-id',
            site_name: 'Existing Site-1',
            club_name: 'Test Club',
          }],
        });

      await createSite(req, res);

      expect(res.status).toHaveBeenCalledWith(201);
      // The site name should have a suffix
      expect(query).toHaveBeenLastCalledWith(
        expect.any(String),
        expect.arrayContaining([expect.stringMatching(/Existing Site-\d+/)])
      );
    });

    it('should return 500 on database error', async () => {
      const req = createAuthRequest({
        body: { site_name: 'Test', club_name: 'Club' },
      });
      const res = createMockResponse();

      (query as jest.Mock).mockRejectedValueOnce(new Error('DB Error'));

      await createSite(req, res);

      expect(res.status).toHaveBeenCalledWith(500);
    });
  });

  describe('updateSite', () => {
    it('should update site fields', async () => {
      const req = createAuthRequest({
        params: { id: 'site-123' },
        body: { site_name: 'Updated Name', status: 'maintenance' },
      });
      const res = createMockResponse();

      const updatedSite = {
        id: 'site-123',
        site_name: 'Updated Name',
        status: 'maintenance',
      };
      (query as jest.Mock).mockResolvedValueOnce({ rows: [updatedSite] });

      await updateSite(req, res);

      expect(res.json).toHaveBeenCalledWith(updatedSite);
    });

    it('should return 400 if no data to update', async () => {
      const req = createAuthRequest({
        params: { id: 'site-123' },
        body: {},
      });
      const res = createMockResponse();

      await updateSite(req, res);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith({ error: 'Aucune donnée à mettre à jour' });
    });

    it('should return 404 if site not found', async () => {
      const req = createAuthRequest({
        params: { id: 'nonexistent' },
        body: { site_name: 'New Name' },
      });
      const res = createMockResponse();

      (query as jest.Mock).mockResolvedValueOnce({ rows: [] });

      await updateSite(req, res);

      expect(res.status).toHaveBeenCalledWith(404);
      expect(res.json).toHaveBeenCalledWith({ error: 'Site non trouvé' });
    });
  });

  describe('deleteSite', () => {
    it('should delete site and return success', async () => {
      const req = createAuthRequest({ params: { id: 'site-123' } });
      const res = createMockResponse();

      (query as jest.Mock).mockResolvedValueOnce({
        rows: [{ site_name: 'Deleted Site' }],
      });

      await deleteSite(req, res);

      expect(query).toHaveBeenCalledWith(
        'DELETE FROM sites WHERE id = $1 RETURNING site_name',
        ['site-123']
      );
      expect(res.json).toHaveBeenCalledWith({ message: 'Site supprimé avec succès' });
    });

    it('should return 404 if site not found', async () => {
      const req = createAuthRequest({ params: { id: 'nonexistent' } });
      const res = createMockResponse();

      (query as jest.Mock).mockResolvedValueOnce({ rows: [] });

      await deleteSite(req, res);

      expect(res.status).toHaveBeenCalledWith(404);
      expect(res.json).toHaveBeenCalledWith({ error: 'Site non trouvé' });
    });
  });

  describe('regenerateApiKey', () => {
    it('should generate new API key', async () => {
      const req = createAuthRequest({ params: { id: 'site-123' } });
      const res = createMockResponse();

      (query as jest.Mock).mockResolvedValueOnce({
        rows: [{
          id: 'site-123',
          site_name: 'Test Site',
          updated_at: new Date(),
        }],
      });

      await regenerateApiKey(req, res);

      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          id: 'site-123',
          api_key: expect.any(String),
        })
      );
      // Verify API key is 64 chars (32 bytes hex)
      const response = (res.json as jest.Mock).mock.calls[0][0];
      expect(response.api_key).toHaveLength(64);
    });

    it('should return 404 if site not found', async () => {
      const req = createAuthRequest({ params: { id: 'nonexistent' } });
      const res = createMockResponse();

      (query as jest.Mock).mockResolvedValueOnce({ rows: [] });

      await regenerateApiKey(req, res);

      expect(res.status).toHaveBeenCalledWith(404);
      expect(res.json).toHaveBeenCalledWith({ error: 'Site non trouvé' });
    });
  });

  describe('getSiteStats', () => {
    it('should return site statistics', async () => {
      const req = createAuthRequest();
      const res = createMockResponse();

      const stats = {
        total_sites: '10',
        online: '7',
        offline: '2',
        maintenance: '1',
        error: '0',
      };
      (query as jest.Mock).mockResolvedValueOnce({ rows: [stats] });

      await getSiteStats(req, res);

      expect(res.json).toHaveBeenCalledWith(stats);
    });

    it('should return 500 on database error', async () => {
      const req = createAuthRequest();
      const res = createMockResponse();

      (query as jest.Mock).mockRejectedValueOnce(new Error('DB Error'));

      await getSiteStats(req, res);

      expect(res.status).toHaveBeenCalledWith(500);
    });
  });
});
