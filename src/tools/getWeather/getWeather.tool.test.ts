/**
 * Unit tests for getWeather tool
 * @jest-environment node
 */

jest.mock("ai");

import { getWeather } from "./getWeather.tool";

const mockWeatherResponse = {
  current_condition: [
    {
      temp_C: "22",
      FeelsLikeC: "20",
      weatherDesc: [{ value: "晴" }],
      humidity: "55",
      windspeedKmph: "15",
      visibility: "10",
      localObsDateTime: "2026-07-20 03:00 PM",
    },
  ],
};

describe("getWeather tool", () => {
  beforeEach(() => {
    global.fetch = jest.fn();
  });

  it("fetches and parses weather data successfully", async () => {
    (global.fetch as jest.Mock).mockResolvedValueOnce(
      new Response(JSON.stringify(mockWeatherResponse), { status: 200 })
    );

    const result = await getWeather.execute!({ city: "Beijing" });
    expect(result.success).toBe(true);
    expect(result.data.city).toBe("Beijing");
    expect(result.data.temperature).toBe("22°C");
    expect(result.data.feelsLike).toBe("20°C");
    expect(result.data.condition).toBe("晴");
    expect(result.data.humidity).toBe("55%");
    expect(result.data.windSpeed).toBe("15 km/h");
    expect(result.data.visibility).toBe("10 km");
  });

  it("returns source and confidence metadata", async () => {
    (global.fetch as jest.Mock).mockResolvedValueOnce(
      new Response(JSON.stringify(mockWeatherResponse), { status: 200 })
    );

    const result = await getWeather.execute!({ city: "Shanghai" });
    expect(result.metadata.source).toBe("wttr.in");
    expect(result.metadata.confidence).toBe(0.92);
  });

  it("returns HTTP_ERROR for non-200 response", async () => {
    (global.fetch as jest.Mock).mockResolvedValueOnce(
      new Response("Not Found", { status: 404 })
    );

    const result = await getWeather.execute!({ city: "NoSuchCity" });
    expect(result.success).toBe(false);
    expect(result.error?.code).toBe("HTTP_ERROR");
  });

  it("retryable=true for 5xx errors", async () => {
    (global.fetch as jest.Mock).mockResolvedValueOnce(
      new Response("Server Error", { status: 500 })
    );

    const result = await getWeather.execute!({ city: "Beijing" });
    expect(result.success).toBe(false);
    expect(result.error?.retryable).toBe(true);
  });

  it("retryable=false for 4xx errors", async () => {
    (global.fetch as jest.Mock).mockResolvedValueOnce(
      new Response("Bad Request", { status: 400 })
    );

    const result = await getWeather.execute!({ city: "Beijing" });
    expect(result.success).toBe(false);
    expect(result.error?.retryable).toBe(false);
  });

  it("returns NOT_FOUND when city data is missing", async () => {
    (global.fetch as jest.Mock).mockResolvedValueOnce(
      new Response(JSON.stringify({ current_condition: [] }), { status: 200 })
    );

    const result = await getWeather.execute!({ city: "Atlantis" });
    expect(result.success).toBe(false);
    expect(result.error?.code).toBe("NOT_FOUND");
    expect(result.error?.message).toContain("未找到");
  });

  it("returns FETCH_ERROR on network failure", async () => {
    (global.fetch as jest.Mock).mockRejectedValueOnce(new Error("Network down"));

    const result = await getWeather.execute!({ city: "London" });
    expect(result.success).toBe(false);
    expect(result.error?.code).toBe("FETCH_ERROR");
    expect(result.error?.retryable).toBe(true);
  });
});
