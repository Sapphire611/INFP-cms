import "@testing-library/jest-dom";

// Polyfills for jsdom environment
global.TextEncoder = require("util").TextEncoder;
global.TextDecoder = require("util").TextDecoder;

// Replace jsdom's getter-only crypto with Node's full webcrypto
const nodeCrypto = require("crypto");
Object.defineProperty(globalThis, "crypto", {
  value: nodeCrypto.webcrypto,
  writable: true,
  configurable: true,
});

process.env.JWT_SECRET = "test-jwt-secret-for-testing";
process.env.NEXT_PUBLIC_SUPABASE_URL = "https://test-project.supabase.co";
process.env.SUPABASE_SERVICE_ROLE_KEY = "test-service-role-key";
process.env.NEXT_PUBLIC_PASSWORD_SALT = "test-salt-for-testing";
process.env.NEXTAUTH_URL = "http://localhost:3000";
process.env.NEXTAUTH_SECRET = "test-nextauth-secret";
process.env.DEEPSEEK_API_KEY = "test-deepseek-key";

const originalConsoleError = console.error;
const originalConsoleLog = console.log;
beforeEach(() => {
  console.error = jest.fn();
  console.log = jest.fn();
});
afterEach(() => {
  console.error = originalConsoleError;
  console.log = originalConsoleLog;
});
