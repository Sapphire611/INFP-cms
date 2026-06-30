/**
 * Agent 配置 — 不同 Agent 有独立的系统提示词和工具配置
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
    name: "默认助手",
    description: "通用 AI 助手，日常对话和问题解答",
    icon: "Bot",
    systemPrompt:
      "你是一个乐于助人的 AI 助手。用简洁清晰的中文回答问题。如果问题需要实时信息（如天气、新闻、股票等），请诚实告知你无法获取实时数据。",
    model: "deepseek-chat",
    temperature: 0.7,
    maxTokens: 2000,
    enableWebSearch: false,
  },
  // TODO: MBTI 分析师 — 暂时隐藏，待想好执行方案后再启用
  // {
  //   id: "mbti",
  //   name: "MBTI 分析师",
  //   ...
  // },
  {
    id: "search",
    name: "联网搜索",
    description: "带网络搜索能力的助手，可查询实时信息",
    icon: "Search",
    systemPrompt:
      "你是一个具备网络搜索能力的 AI 助手。当用户询问实时信息（天气、新闻、事件等）时，你会调用搜索工具获取最新数据，然后基于搜索结果给出准确回答。回答时请注明信息来源（链接）。用简洁清晰的中文回答。",
    model: "deepseek-chat",
    temperature: 0.7,
    maxTokens: 2000,
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
