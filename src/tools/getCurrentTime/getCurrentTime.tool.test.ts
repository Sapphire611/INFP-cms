/**
 * Unit tests for getCurrentTime tool
 */

jest.mock("ai");

import { getCurrentTime } from "./getCurrentTime.tool";

describe("getCurrentTime tool", () => {
  it("returns current time with default timezone", async () => {
    const result = await getCurrentTime.execute!({});
    expect(result.success).toBe(true);
    expect(result.data.timezone).toBe("Asia/Shanghai");
    expect(result.data.datetime).toBeTruthy();
    expect(result.data.iso).toBeTruthy();
    expect(result.data.weekday).toBeTruthy();
    expect(typeof result.data.unixTimestamp).toBe("number");
  });

  it("accepts a custom IANA timezone", async () => {
    const result = await getCurrentTime.execute!({
      timezone: "America/New_York",
    });
    expect(result.success).toBe(true);
    expect(result.data.timezone).toBe("America/New_York");
    expect(result.data.datetime).toBeTruthy();
  });

  it("has high confidence", async () => {
    const result = await getCurrentTime.execute!({});
    expect(result.metadata.confidence).toBe(0.99);
    expect(result.metadata.source).toBe("Intl.DateTimeFormat");
  });

  it("falls back to local time for invalid timezone", async () => {
    const result = await getCurrentTime.execute!({
      timezone: "Mars/Olympus",
    });
    expect(result.success).toBe(false);
    expect(result.error?.code).toBe("INVALID_TIMEZONE");
    expect(result.error?.message).toContain("无效");
    expect(result.error?.fallback).toBeDefined();
  });

  it("iso is a valid ISO 8601 string", async () => {
    const result = await getCurrentTime.execute!({});
    expect(() => new Date(result.data.iso)).not.toThrow();
  });

  it("unixTimestamp is within last 60 seconds", async () => {
    const now = Math.floor(Date.now() / 1000);
    const result = await getCurrentTime.execute!({});
    expect(result.data.unixTimestamp).toBeGreaterThanOrEqual(now - 2);
    expect(result.data.unixTimestamp).toBeLessThanOrEqual(now + 2);
  });

  it("returns different datetime for different timezones", async () => {
    const shanghai = await getCurrentTime.execute!({ timezone: "Asia/Shanghai" });
    const london = await getCurrentTime.execute!({ timezone: "Europe/London" });

    expect(shanghai.success).toBe(true);
    expect(london.success).toBe(true);
    // Different timezones should produce different datetime strings
    expect(shanghai.data.datetime).not.toBe(london.data.datetime);
  });
});
