/**
 * getWeather tool — query current weather via wttr.in (free, no API key)
 */
import { tool } from "ai";
import { z } from "zod";
import { success, failure, type ToolResult } from "../types";

interface WeatherData {
  city: string;
  temperature: string;
  feelsLike: string;
  condition: string;
  humidity: string;
  windSpeed: string;
  visibility: string;
  date: string;
}

export const getWeather = tool({
  description: [
    "查询指定城市当前天气，返回温度、天气状况、湿度、风速等信息。",
    "何时调用：用户询问某地天气、穿什么衣服、是否下雨、出行天气建议等。",
    "城市名必须用英文（如 Beijing, Tokyo, London, New York）。",
  ].join(" "),
  inputSchema: z.object({
    city: z
      .string()
      .describe("城市英文名，如 Beijing, Shanghai, Tokyo, London, New York"),
  }),
  execute: async (input): Promise<ToolResult<WeatherData>> => {
    const { city } = input;
    const start = Date.now();

    try {
      const url = `https://wttr.in/${encodeURIComponent(city)}?format=j1`;
      const res = await fetch(url, { signal: AbortSignal.timeout(8000) });

      if (!res.ok) {
        return failure("HTTP_ERROR", `天气查询失败: HTTP ${res.status}`, {
          retryable: res.status >= 500,
        });
      }

      const data = await res.json();
      const current = data.current_condition?.[0];
      if (!current) {
        return failure("NOT_FOUND", `未找到城市 "${city}" 的天气数据`, {
          retryable: false,
          fallback: { city, suggestion: "请检查城市英文名拼写是否正确" },
        });
      }

      const weatherData: WeatherData = {
        city,
        temperature: `${current.temp_C}°C`,
        feelsLike: `${current.FeelsLikeC}°C`,
        condition: current.weatherDesc?.[0]?.value ?? "未知",
        humidity: `${current.humidity}%`,
        windSpeed: `${current.windspeedKmph} km/h`,
        visibility: `${current.visibility} km`,
        date: current.localObsDateTime,
      };

      return success(weatherData, {
        source: "wttr.in",
        confidence: 0.92,
        latencyMs: Date.now() - start,
      });
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      return failure("FETCH_ERROR", `天气服务不可用: ${msg}`, {
        retryable: true,
      });
    }
  },
});
