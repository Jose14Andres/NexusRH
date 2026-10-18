import { Request, Response, NextFunction } from 'express';
import { verifyJWT } from './auth';
import { verifyAccessToken } from '../lib/jwt';

// Mock the jwt module
jest.mock('../lib/jwt');
const mockedVerifyAccessToken = jest.mocked(verifyAccessToken);

describe('verifyJWT middleware', () => {
  let mockRequest: Partial<Request>;
  let mockResponse: Partial<Response>;
  let nextFunction: NextFunction;

  beforeEach(() => {
    mockRequest = {
      headers: {},
    };
    mockResponse = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn(),
    };
    nextFunction = jest.fn();
    jest.clearAllMocks();
  });

  it('should return 401 if authorization header is missing', () => {
    verifyJWT(mockRequest as Request, mockResponse as Response, nextFunction);

    expect(mockResponse.status).toHaveBeenCalledWith(401);
    expect(mockResponse.json).toHaveBeenCalledWith({ error: 'Token de autenticación requerido' });
    expect(nextFunction).not.toHaveBeenCalled();
  });

  it('should return 401 if authorization header does not start with Bearer', () => {
    mockRequest.headers = { authorization: 'Basic some-token' };

    verifyJWT(mockRequest as Request, mockResponse as Response, nextFunction);

    expect(mockResponse.status).toHaveBeenCalledWith(401);
    expect(mockResponse.json).toHaveBeenCalledWith({ error: 'Token de autenticación requerido' });
    expect(nextFunction).not.toHaveBeenCalled();
  });

  it('should return 401 if token is invalid or expired', () => {
    mockRequest.headers = { authorization: 'Bearer invalid-token' };
    mockedVerifyAccessToken.mockImplementation(() => {
      throw new Error('Invalid token');
    });

    verifyJWT(mockRequest as Request, mockResponse as Response, nextFunction);

    expect(mockedVerifyAccessToken).toHaveBeenCalledWith('invalid-token');
    expect(mockResponse.status).toHaveBeenCalledWith(401);
    expect(mockResponse.json).toHaveBeenCalledWith({ error: 'Token inválido o expirado' });
    expect(nextFunction).not.toHaveBeenCalled();
  });

  it('should call next and set req.user if token is valid', () => {
    mockRequest.headers = { authorization: 'Bearer valid-token' };
    const mockPayload = { sub: '123', username: 'testuser', roles: ['USER'], permisos: [] };
    mockedVerifyAccessToken.mockReturnValue(mockPayload);

    verifyJWT(mockRequest as Request, mockResponse as Response, nextFunction);

    expect(mockedVerifyAccessToken).toHaveBeenCalledWith('valid-token');
    expect((mockRequest as Request).user).toEqual(mockPayload);
    expect(nextFunction).toHaveBeenCalledTimes(1);
    expect(mockResponse.status).not.toHaveBeenCalled();
    expect(mockResponse.json).not.toHaveBeenCalled();
  });
});
