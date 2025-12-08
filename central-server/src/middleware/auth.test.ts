import { Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { authenticate, requireRole, generateToken, JwtPayload } from './auth';
import { AuthRequest } from '../types';

// Helper to create mock request
const createMockRequest = (authHeader?: string): AuthRequest => ({
  headers: authHeader ? { authorization: authHeader } : {},
  user: undefined,
} as AuthRequest);

// Helper to create mock response
const createMockResponse = (): Response => {
  const res: Partial<Response> = {
    status: jest.fn().mockReturnThis(),
    json: jest.fn().mockReturnThis(),
  };
  return res as Response;
};

describe('Auth Middleware', () => {
  const testPayload: JwtPayload = {
    id: 'user-123',
    email: 'test@example.com',
    role: 'admin',
  };

  describe('generateToken', () => {
    it('should generate a valid JWT token', () => {
      const token = generateToken(testPayload);

      expect(token).toBeDefined();
      expect(typeof token).toBe('string');
      expect(token.split('.')).toHaveLength(3); // JWT has 3 parts
    });

    it('should contain correct payload in token', () => {
      const token = generateToken(testPayload);
      const decoded = jwt.verify(token, process.env.JWT_SECRET!) as JwtPayload;

      expect(decoded.id).toBe(testPayload.id);
      expect(decoded.email).toBe(testPayload.email);
      expect(decoded.role).toBe(testPayload.role);
    });

    it('should include expiration in token', () => {
      const token = generateToken(testPayload);
      const decoded = jwt.decode(token) as JwtPayload & { exp: number };

      expect(decoded.exp).toBeDefined();
      expect(decoded.exp).toBeGreaterThan(Date.now() / 1000);
    });
  });

  describe('authenticate', () => {
    it('should return 401 if no authorization header', () => {
      const req = createMockRequest();
      const res = createMockResponse();
      const next: NextFunction = jest.fn();

      authenticate(req, res, next);

      expect(res.status).toHaveBeenCalledWith(401);
      expect(res.json).toHaveBeenCalledWith({ error: 'Token manquant' });
      expect(next).not.toHaveBeenCalled();
    });

    it('should return 401 if authorization header does not start with Bearer', () => {
      const req = createMockRequest('Basic some-token');
      const res = createMockResponse();
      const next: NextFunction = jest.fn();

      authenticate(req, res, next);

      expect(res.status).toHaveBeenCalledWith(401);
      expect(res.json).toHaveBeenCalledWith({ error: 'Token manquant' });
      expect(next).not.toHaveBeenCalled();
    });

    it('should return 401 for invalid token', () => {
      const req = createMockRequest('Bearer invalid-token');
      const res = createMockResponse();
      const next: NextFunction = jest.fn();

      authenticate(req, res, next);

      expect(res.status).toHaveBeenCalledWith(401);
      expect(res.json).toHaveBeenCalledWith({ error: 'Token invalide ou expiré' });
      expect(next).not.toHaveBeenCalled();
    });

    it('should call next and set user for valid token', () => {
      const token = generateToken(testPayload);
      const req = createMockRequest(`Bearer ${token}`);
      const res = createMockResponse();
      const next: NextFunction = jest.fn();

      authenticate(req, res, next);

      expect(next).toHaveBeenCalled();
      expect(req.user).toBeDefined();
      expect(req.user?.id).toBe(testPayload.id);
      expect(req.user?.email).toBe(testPayload.email);
      expect(req.user?.role).toBe(testPayload.role);
    });

    it('should return 401 for expired token', () => {
      // Create an expired token
      const expiredToken = jwt.sign(testPayload, process.env.JWT_SECRET!, { expiresIn: '-1h' });
      const req = createMockRequest(`Bearer ${expiredToken}`);
      const res = createMockResponse();
      const next: NextFunction = jest.fn();

      authenticate(req, res, next);

      expect(res.status).toHaveBeenCalledWith(401);
      expect(res.json).toHaveBeenCalledWith({ error: 'Token invalide ou expiré' });
      expect(next).not.toHaveBeenCalled();
    });
  });

  describe('requireRole', () => {
    it('should return 401 if user is not authenticated', () => {
      const req = createMockRequest();
      const res = createMockResponse();
      const next: NextFunction = jest.fn();

      const middleware = requireRole('admin');
      middleware(req, res, next);

      expect(res.status).toHaveBeenCalledWith(401);
      expect(res.json).toHaveBeenCalledWith({ error: 'Non authentifié' });
      expect(next).not.toHaveBeenCalled();
    });

    it('should return 403 if user role is not allowed', () => {
      const req = createMockRequest();
      req.user = { id: '123', email: 'test@example.com', role: 'viewer' };
      const res = createMockResponse();
      const next: NextFunction = jest.fn();

      const middleware = requireRole('admin');
      middleware(req, res, next);

      expect(res.status).toHaveBeenCalledWith(403);
      expect(res.json).toHaveBeenCalledWith({
        error: 'Accès refusé',
        message: 'Rôle requis: admin',
      });
      expect(next).not.toHaveBeenCalled();
    });

    it('should call next if user has allowed role', () => {
      const req = createMockRequest();
      req.user = { id: '123', email: 'test@example.com', role: 'admin' };
      const res = createMockResponse();
      const next: NextFunction = jest.fn();

      const middleware = requireRole('admin');
      middleware(req, res, next);

      expect(next).toHaveBeenCalled();
    });

    it('should accept multiple allowed roles', () => {
      const req = createMockRequest();
      req.user = { id: '123', email: 'test@example.com', role: 'operator' };
      const res = createMockResponse();
      const next: NextFunction = jest.fn();

      const middleware = requireRole('admin', 'operator');
      middleware(req, res, next);

      expect(next).toHaveBeenCalled();
    });

    it('should reject if role not in allowed list', () => {
      const req = createMockRequest();
      req.user = { id: '123', email: 'test@example.com', role: 'viewer' };
      const res = createMockResponse();
      const next: NextFunction = jest.fn();

      const middleware = requireRole('admin', 'operator');
      middleware(req, res, next);

      expect(res.status).toHaveBeenCalledWith(403);
      expect(res.json).toHaveBeenCalledWith({
        error: 'Accès refusé',
        message: 'Rôle requis: admin ou operator',
      });
      expect(next).not.toHaveBeenCalled();
    });
  });
});
