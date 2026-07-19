/**
 * Tool barrel export — one import gives all tools for streamText().
 *
 * Usage:
 *   import { tools } from "@/tools";
 *   streamText({ tools, ... })
 *
 * Each tool lives in its own folder under src/tools/.
 * Adding a new tool:
 *   1. Create src/tools/myTool/myTool.tool.ts
 *   2. Export a `tool()` definition named `myTool`
 *   3. Add it to the `tools` object below
 *   4. Update agent system prompts in src/config/agents.ts if needed
 */
export { webSearch } from "./webSearch/webSearch.tool";
export { getWeather } from "./getWeather/getWeather.tool";
export { getCurrentTime } from "./getCurrentTime/getCurrentTime.tool";
export { calculate } from "./calculate/calculate.tool";
export { fetchWebPage } from "./fetchWebPage/fetchWebPage.tool";

import { webSearch } from "./webSearch/webSearch.tool";
import { getWeather } from "./getWeather/getWeather.tool";
import { getCurrentTime } from "./getCurrentTime/getCurrentTime.tool";
import { calculate } from "./calculate/calculate.tool";
import { fetchWebPage } from "./fetchWebPage/fetchWebPage.tool";

export const tools = {
  webSearch,
  getWeather,
  getCurrentTime,
  calculate,
  fetchWebPage,
} as const;
