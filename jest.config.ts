import type { Config } from "jest";
import nextJest from "next/jest";

const createJestConfig = nextJest({ dir: "./" });

const customJestConfig: Config = {
  clearMocks: true,

  collectCoverage: true,
  coverageDirectory: "coverage",
  coverageProvider: "v8",
  coverageReporters: ["text", "lcov", "clover"],
  collectCoverageFrom: [
    "src/**/*.{ts,tsx}",
    "!src/**/*.d.ts",
    "!src/components/ui/**",
    "!src/types/**",
    "!src/scripts/**",
  ],

  testMatch: [
    "**/__tests__/**/*.test.{ts,tsx}",
    "**/*.test.{ts,tsx}",
  ],

  setupFilesAfterEnv: ["<rootDir>/jest.setup.ts"],

  testEnvironment: "jsdom",
};

export default createJestConfig(customJestConfig);
