const authService = require('../../src/services/auth.service');

// Mock dependencies
jest.mock('../../src/models/User.model', () => ({
  findOne: jest.fn(),
  create: jest.fn()
}));

jest.mock('../../src/utils/jwt', () => ({
  generateToken: jest.fn(() => 'mock-token')
}));

jest.mock('../../src/config/logger', () => ({
  info: jest.fn(),
  error: jest.fn()
}));

const User = require('../../src/models/User.model');

describe('Auth Service', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('register', () => {
    it('should create a new user and return token', async () => {
      // Arrange
      const userData = {
        name: 'Test User',
        email: 'test@example.com',
        password: 'Test1234'
      };

      User.findOne.mockResolvedValue(null);
      User.create.mockResolvedValue({
        _id: 'mock-id',
        ...userData,
        getPublicProfile: () => ({ _id: 'mock-id', name: userData.name, email: userData.email })
      });

      // Act
      const result = await authService.register(userData);

      // Assert
      expect(User.findOne).toHaveBeenCalledWith({ email: userData.email });
      expect(User.create).toHaveBeenCalledWith(userData);
      expect(result.token).toBe('mock-token');
      expect(result.user).toBeDefined();
    });

    it('should throw error if email already exists', async () => {
      // Arrange
      const userData = {
        name: 'Test User',
        email: 'test@example.com',
        password: 'Test1234'
      };

      User.findOne.mockResolvedValue({ email: userData.email });

      // Act & Assert
      await expect(authService.register(userData)).rejects.toThrow('Email already registered');
    });
  });

  describe('login', () => {
    it('should return token for valid credentials', async () => {
      // Arrange
      const email = 'test@example.com';
      const password = 'Test1234';

      User.findOne.mockReturnValue({
        select: jest.fn().mockResolvedValue({
          _id: 'mock-id',
          email,
          password: 'hashed-password',
          isActive: true,
          comparePassword: jest.fn().mockResolvedValue(true),
          lastLogin: null,
          save: jest.fn()
        })
      });

      // Act
      const result = await authService.login(email, password);

      // Assert
      expect(result.token).toBe('mock-token');
      expect(result.user).toBeDefined();
    });

    it('should throw error for invalid email', async () => {
      // Arrange
      User.findOne.mockReturnValue({
        select: jest.fn().mockResolvedValue(null)
      });

      // Act & Assert
      await expect(authService.login('invalid@example.com', 'password')).rejects.toThrow('Invalid email or password');
    });
  });
});