export const query = jest.fn();

// Mock client for transactions
const mockClient = {
  query: jest.fn(),
  release: jest.fn(),
};

export const getClient = jest.fn().mockResolvedValue(mockClient);

export const pool = {
  connect: jest.fn(),
  end: jest.fn(),
};

// Export mockClient for tests that need to configure it
export { mockClient };
