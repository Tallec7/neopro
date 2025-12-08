import { Response } from 'express';
import {
  getClubHealth,
  getClubAvailability,
  getClubAlerts,
  recordVideoPlays,
  manageSession,
  exportClubData,
} from './analytics.controller';
import { query } from '../config/database';
import { AuthRequest } from '../types';

// Helper to create mock response
const createMockResponse = (): Response => {
  const res: Partial<Response> = {
    status: jest.fn().mockReturnThis(),
    json: jest.fn().mockReturnThis(),
    setHeader: jest.fn().mockReturnThis(),
    send: jest.fn().mockReturnThis(),
  };
  return res as Response;
};

// Helper to create authenticated request
const createAuthRequest = (overrides: Partial<AuthRequest> = {}): AuthRequest =>
  ({
    user: { id: 'user-123', email: 'admin@example.com', role: 'admin' },
    params: {},
    query: {},
    body: {},
    ...overrides,
  } as AuthRequest);

describe('Analytics Controller', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('getClubHealth', () => {
    it('should return health data for a site', async () => {
      const req = createAuthRequest({ params: { siteId: 'site-123' } });
      const res = createMockResponse();

      (query as jest.Mock)
        .mockResolvedValueOnce({ rows: [{ id: 'site-123', site_name: 'Test Site', status: 'online', last_seen_at: new Date() }] })
        .mockResolvedValueOnce({ rows: [{ cpu_usage: 45, memory_usage: 60, temperature: 55, disk_usage: 30, uptime: 86400 }] })
        .mockResolvedValueOnce({ rows: [{ heartbeat_count: '1000' }] })
        .mockResolvedValueOnce({ rows: [{ active_alerts: '2', alerts_last_30d: '10' }] })
        .mockResolvedValueOnce({ rows: [{ avg_cpu: 42, avg_memory: 58, avg_temperature: 52, max_temperature: 65 }] });

      await getClubHealth(req, res);

      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          site_id: 'site-123',
          site_name: 'Test Site',
        })
      );
    });

    it('should return 404 if site not found', async () => {
      const req = createAuthRequest({ params: { siteId: 'nonexistent' } });
      const res = createMockResponse();

      (query as jest.Mock).mockResolvedValueOnce({ rows: [] });

      await getClubHealth(req, res);

      expect(res.status).toHaveBeenCalledWith(404);
      expect(res.json).toHaveBeenCalledWith({ error: 'Site non trouvé' });
    });

    it('should return 500 on database error', async () => {
      const req = createAuthRequest({ params: { siteId: 'site-123' } });
      const res = createMockResponse();

      (query as jest.Mock).mockRejectedValueOnce(new Error('DB Error'));

      await getClubHealth(req, res);

      expect(res.status).toHaveBeenCalledWith(500);
    });
  });

  describe('getClubAvailability', () => {
    it('should return availability data', async () => {
      const req = createAuthRequest({
        params: { siteId: 'site-123' },
        query: { days: '7' },
      });
      const res = createMockResponse();

      (query as jest.Mock).mockResolvedValueOnce({
        rows: [
          { date: '2025-12-01', heartbeat_count: '2800', avg_cpu: 45.5, avg_temp: 52.3 },
        ],
      });

      await getClubAvailability(req, res);

      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          site_id: 'site-123',
          period_days: 7,
        })
      );
    });

    it('should limit days to 90 maximum', async () => {
      const req = createAuthRequest({
        params: { siteId: 'site-123' },
        query: { days: '365' },
      });
      const res = createMockResponse();

      (query as jest.Mock).mockResolvedValueOnce({ rows: [] });

      await getClubAvailability(req, res);

      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          period_days: 90,
        })
      );
    });

    it('should return 500 on database error', async () => {
      const req = createAuthRequest({ params: { siteId: 'site-123' } });
      const res = createMockResponse();

      (query as jest.Mock).mockRejectedValueOnce(new Error('DB Error'));

      await getClubAvailability(req, res);

      expect(res.status).toHaveBeenCalledWith(500);
    });
  });

  describe('getClubAlerts', () => {
    it('should return alerts with stats', async () => {
      const req = createAuthRequest({ params: { siteId: 'site-123' } });
      const res = createMockResponse();

      (query as jest.Mock)
        .mockResolvedValueOnce({ rows: [{ id: '1', alert_type: 'temperature', severity: 'warning' }] })
        .mockResolvedValueOnce({ rows: [{ active: '1', acknowledged: '0', resolved: '1', critical: '1', warning: '1', info: '0' }] });

      await getClubAlerts(req, res);

      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          site_id: 'site-123',
          stats: expect.any(Object),
          alerts: expect.any(Array),
        })
      );
    });

    it('should filter by status', async () => {
      const req = createAuthRequest({
        params: { siteId: 'site-123' },
        query: { status: 'active' },
      });
      const res = createMockResponse();

      (query as jest.Mock)
        .mockResolvedValueOnce({ rows: [] })
        .mockResolvedValueOnce({ rows: [{ active: '0', acknowledged: '0', resolved: '0', critical: '0', warning: '0', info: '0' }] });

      await getClubAlerts(req, res);

      expect(query).toHaveBeenCalledWith(
        expect.stringContaining('AND status = $2'),
        expect.arrayContaining(['site-123', 'active'])
      );
    });

    it('should return 500 on database error', async () => {
      const req = createAuthRequest({ params: { siteId: 'site-123' } });
      const res = createMockResponse();

      (query as jest.Mock).mockRejectedValueOnce(new Error('DB Error'));

      await getClubAlerts(req, res);

      expect(res.status).toHaveBeenCalledWith(500);
    });
  });

  describe('recordVideoPlays', () => {
    it('should record video plays', async () => {
      const req = createAuthRequest({
        body: {
          site_id: 'site-123',
          plays: [{ video_filename: 'video1.mp4', category: 'sponsors' }],
        },
      });
      const res = createMockResponse();

      (query as jest.Mock)
        .mockResolvedValueOnce({ rows: [{ id: 'site-123' }] })
        .mockResolvedValue({ rows: [] });

      await recordVideoPlays(req, res);

      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({ success: true })
      );
    });

    it('should return 400 if site_id or plays missing', async () => {
      const req = createAuthRequest({ body: {} });
      const res = createMockResponse();

      await recordVideoPlays(req, res);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith({ error: 'site_id et plays[] requis' });
    });

    it('should return 404 if site not found', async () => {
      const req = createAuthRequest({
        body: { site_id: 'nonexistent', plays: [{ video_filename: 'test.mp4' }] },
      });
      const res = createMockResponse();

      (query as jest.Mock).mockResolvedValueOnce({ rows: [] });

      await recordVideoPlays(req, res);

      expect(res.status).toHaveBeenCalledWith(404);
    });

    it('should return 500 on database error', async () => {
      const req = createAuthRequest({
        body: { site_id: 'site-123', plays: [{ video_filename: 'test.mp4' }] },
      });
      const res = createMockResponse();

      (query as jest.Mock).mockRejectedValueOnce(new Error('DB Error'));

      await recordVideoPlays(req, res);

      expect(res.status).toHaveBeenCalledWith(500);
    });
  });

  describe('manageSession', () => {
    it('should start a new session', async () => {
      const req = createAuthRequest({
        body: { site_id: 'site-123', action: 'start' },
      });
      const res = createMockResponse();

      (query as jest.Mock).mockResolvedValueOnce({
        rows: [{ id: 'session-123', started_at: new Date() }],
      });

      await manageSession(req, res);

      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({ success: true, session_id: 'session-123' })
      );
    });

    it('should end an existing session', async () => {
      const req = createAuthRequest({
        body: { site_id: 'site-123', action: 'end', session_id: 'session-123' },
      });
      const res = createMockResponse();

      (query as jest.Mock).mockResolvedValueOnce({
        rows: [{ id: 'session-123', ended_at: new Date(), duration_seconds: 3600 }],
      });

      await manageSession(req, res);

      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({ success: true })
      );
    });

    it('should return 400 if site_id or action missing', async () => {
      const req = createAuthRequest({ body: {} });
      const res = createMockResponse();

      await manageSession(req, res);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith({ error: 'site_id et action requis' });
    });

    it('should return 400 for invalid action', async () => {
      const req = createAuthRequest({
        body: { site_id: 'site-123', action: 'end' }, // Missing session_id
      });
      const res = createMockResponse();

      await manageSession(req, res);

      expect(res.status).toHaveBeenCalledWith(400);
    });

    it('should return 404 if session not found', async () => {
      const req = createAuthRequest({
        body: { site_id: 'site-123', action: 'end', session_id: 'nonexistent' },
      });
      const res = createMockResponse();

      (query as jest.Mock).mockResolvedValueOnce({ rows: [] });

      await manageSession(req, res);

      expect(res.status).toHaveBeenCalledWith(404);
    });

    it('should return 500 on database error', async () => {
      const req = createAuthRequest({
        body: { site_id: 'site-123', action: 'start' },
      });
      const res = createMockResponse();

      (query as jest.Mock).mockRejectedValueOnce(new Error('DB Error'));

      await manageSession(req, res);

      expect(res.status).toHaveBeenCalledWith(500);
    });
  });

  describe('exportClubData', () => {
    it('should export video_plays as CSV', async () => {
      const req = createAuthRequest({
        params: { siteId: 'site-123' },
        query: { type: 'video_plays' },
      });
      const res = createMockResponse();

      (query as jest.Mock).mockResolvedValueOnce({
        rows: [{ played_at: '2025-12-01', video_filename: 'video1.mp4', category: 'sponsors' }],
      });

      await exportClubData(req, res);

      expect(res.setHeader).toHaveBeenCalledWith('Content-Type', 'text/csv');
      expect(res.send).toHaveBeenCalled();
    });

    it('should export daily_stats as CSV', async () => {
      const req = createAuthRequest({
        params: { siteId: 'site-123' },
        query: { type: 'daily_stats' },
      });
      const res = createMockResponse();

      (query as jest.Mock).mockResolvedValueOnce({
        rows: [{ date: '2025-12-01', videos: '50' }],
      });

      await exportClubData(req, res);

      expect(res.setHeader).toHaveBeenCalledWith('Content-Type', 'text/csv');
    });

    it('should export metrics as CSV', async () => {
      const req = createAuthRequest({
        params: { siteId: 'site-123' },
        query: { type: 'metrics' },
      });
      const res = createMockResponse();

      (query as jest.Mock).mockResolvedValueOnce({
        rows: [{ recorded_at: new Date(), cpu_usage: 45 }],
      });

      await exportClubData(req, res);

      expect(res.setHeader).toHaveBeenCalledWith('Content-Type', 'text/csv');
    });

    it('should return 400 for invalid type', async () => {
      const req = createAuthRequest({
        params: { siteId: 'site-123' },
        query: { type: 'invalid' },
      });
      const res = createMockResponse();

      await exportClubData(req, res);

      expect(res.status).toHaveBeenCalledWith(400);
    });

    it('should return 404 if no data', async () => {
      const req = createAuthRequest({
        params: { siteId: 'site-123' },
        query: { type: 'video_plays' },
      });
      const res = createMockResponse();

      (query as jest.Mock).mockResolvedValueOnce({ rows: [] });

      await exportClubData(req, res);

      expect(res.status).toHaveBeenCalledWith(404);
    });

    it('should return 500 on database error', async () => {
      const req = createAuthRequest({
        params: { siteId: 'site-123' },
        query: { type: 'video_plays' },
      });
      const res = createMockResponse();

      (query as jest.Mock).mockRejectedValueOnce(new Error('DB Error'));

      await exportClubData(req, res);

      expect(res.status).toHaveBeenCalledWith(500);
    });
  });
});
