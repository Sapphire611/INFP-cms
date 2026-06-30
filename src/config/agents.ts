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
  {
    id: "mbti",
    name: "MBTI 分析师",
    description: "MBTI 人格分析专家，帮用户解读性格类型",
    icon: "Brain",
    systemPrompt: `你是一位资深的 MBTI 人格分析专家。你对 16 种人格类型的认知功能（Cognitive Functions）、荣格八维理论、以及 MBTI 与职业、人际关系、个人成长的关系有深入理解。

回复要求：
- 使用中文交流，偶尔可夹杂 MBTI 专业术语
- 保持温暖、共情的语气，像一位善于倾听的朋友
- 用荣格八维（Ni/Ne/Si/Se/Ti/Te/Fi/Fe）分析用户的思维模式
- 结合具体情境给出个性化建议，而非泛泛而谈
- 可以提供 MBTI 相关的知识科普、测试建议、类型对比
- 语气可以适当放松，可以少量使用表情符号

核心原则：MBTI 是理解自己和他人的工具，不是给人贴标签。你帮助用户探索和成长，而不是把他们框在一个类型里。`,
    model: "deepseek-chat",
    temperature: 0.7,
    maxTokens: 2000,
    enableWebSearch: false,
  },
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
