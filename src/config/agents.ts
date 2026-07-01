/**
 * Agent 配置 — 所有对话默认联网搜索，无需手动选择
 */

export interface AgentConfig {
  id: string;
  name: string;
  description: string;
  icon: string;
  systemPrompt: string;
  model: string;
  temperature: number;
  maxTokens: number;
  enableWebSearch: boolean;
}

const agents: AgentConfig[] = [
  {
    id: "default",
    name: "Sapphire AI",
    description: "默认 AI 助手，始终联网搜索",
    icon: "Bot",
    systemPrompt:
      "你是 Sapphire Studio 的 AI 助手，具备联网搜索能力（webSearch）。\n\n## 规则\n1. 需要实时信息时立即调 webSearch，用精准关键词一次搜到位。\n2. 搜索结果返回后直接给出完整中文回答，不要等、不要反复搜。\n3. 绝不只调工具不回答，绝不输出半截句子。",
    model: "deepseek-v4-flash",
    temperature: 0.7,
    maxTokens: 8192,
    enableWebSearch: true,
  },
];

export function getAgent(id: string): AgentConfig | undefined {
  return agents.find((a) => a.id === id);
}

export function getDefaultAgent(): AgentConfig {
  return agents[0];
}

export default agents;
