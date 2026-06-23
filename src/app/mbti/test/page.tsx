"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Brain, ArrowRight, ArrowLeft, Sparkles, RefreshCcw } from "lucide-react";

interface Question {
  id: number;
  dimension: "EI" | "SN" | "TF" | "JP";
  text: string;
  options: {
    text: string;
    value: [string, number]; // [MBTI letter, score contribution]
  }[];
}

const QUESTIONS: Question[] = [
  // E / I
  {
    id: 1,
    dimension: "EI",
    text: "周末你更倾向于？",
    options: [
      { text: "约朋友一起出去玩，享受社交时光", value: ["E", 1] },
      { text: "独自在家看书、听音乐，享受独处", value: ["I", 1] },
    ],
  },
  {
    id: 2,
    dimension: "EI",
    text: "参加聚会时，你通常是？",
    options: [
      { text: "主动和陌生人搭话，气氛担当", value: ["E", 1] },
      { text: "和认识的人聊天，深度交流", value: ["I", 1] },
    ],
  },
  {
    id: 3,
    dimension: "EI",
    text: "当你需要恢复精力时，你更倾向于？",
    options: [
      { text: "和朋友一起出去活动", value: ["E", 1] },
      { text: "一个人安静地待着", value: ["I", 1] },
    ],
  },
  {
    id: 4,
    dimension: "EI",
    text: "在小组讨论中，你通常？",
    options: [
      { text: "积极发言，提出新想法", value: ["E", 1] },
      { text: "先听别人说，再整理自己的想法", value: ["I", 1] },
    ],
  },
  // S / N
  {
    id: 5,
    dimension: "SN",
    text: "看小说或电影时，你更在意？",
    options: [
      { text: "故事的实际情节和发展", value: ["S", 1] },
      { text: "背后的隐喻、象征和深层含义", value: ["N", 1] },
    ],
  },
  {
    id: 6,
    dimension: "SN",
    text: "学习新东西时，你更喜欢？",
    options: [
      { text: "一步一步来，按教材和说明操作", value: ["S", 1] },
      { text: "先了解整体框架，再探索细节", value: ["N", 1] },
    ],
  },
  {
    id: 7,
    dimension: "SN",
    text: "你更擅长？",
    options: [
      { text: "处理具体、实际的事情", value: ["S", 1] },
      { text: "想象未来的各种可能性", value: ["N", 1] },
    ],
  },
  {
    id: 8,
    dimension: "SN",
    text: "做计划时，你倾向于？",
    options: [
      { text: "制定详细的步骤和安排", value: ["S", 1] },
      { text: "保留弹性，随机应变", value: ["N", 1] },
    ],
  },
  {
    id: 9,
    dimension: "SN",
    text: "朋友找你倾诉时，你更可能说？",
    options: [
      { text: "我理解你的处境，我们来想想实际怎么解决", value: ["S", 1] },
      { text: "我能感受到你的心情，想开点，事情会变好的", value: ["N", 1] },
    ],
  },
  // T / F
  {
    id: 10,
    dimension: "TF",
    text: "做决定时，你更看重？",
    options: [
      { text: "这件事是否合乎逻辑、公平", value: ["T", 1] },
      { text: "这件事是否顾及到他人的感受", value: ["F", 1] },
    ],
  },
  {
    id: 11,
    dimension: "TF",
    text: "当你指出别人的错误时，你更在意？",
    options: [
      { text: "事实是否准确、依据是否充分", value: ["T", 1] },
      { text: "表达方式是否会让对方不舒服", value: ["F", 1] },
    ],
  },
  {
    id: 12,
    dimension: "TF",
    text: "你觉得「对」意味着？",
    options: [
      { text: "客观、公正、有据可依的", value: ["T", 1] },
      { text: "符合自己和他人的价值观的", value: ["F", 1] },
    ],
  },
  {
    id: 13,
    dimension: "TF",
    text: "当你与他人产生分歧时，你倾向于？",
    options: [
      { text: "用逻辑和证据说服对方", value: ["T", 1] },
      { text: "尽量维护关系，寻求妥协", value: ["F", 1] },
    ],
  },
  // J / P
  {
    id: 14,
    dimension: "JP",
    text: "你更喜欢哪种工作方式？",
    options: [
      { text: "提前计划，按部就班执行", value: ["J", 1] },
      { text: "边做边调整，灵活应对", value: ["P", 1] },
    ],
  },
  {
    id: 15,
    dimension: "JP",
    text: "出门旅行前，你会？",
    options: [
      { text: "提前订好行程、机票、酒店", value: ["J", 1] },
      { text: "大致有个方向，到当地再说", value: ["P", 1] },
    ],
  },
  {
    id: 16,
    dimension: "JP",
    text: "面对最后期限时，你通常？",
    options: [
      { text: "提前完成，留有缓冲时间", value: ["J", 1] },
      { text: "在最后时刻效率爆发，踩点完成", value: ["P", 1] },
    ],
  },
  {
    id: 17,
    dimension: "JP",
    text: "你的工作/生活空间通常是？",
    options: [
      { text: "整洁有序，物品有固定位置", value: ["J", 1] },
      { text: "随意自然，随手可取", value: ["P", 1] },
    ],
  },
];

const TYPE_DESCRIPTIONS: Record<string, { name: string; role: string; description: string }> = {
  INTJ: { name: "建筑师", role: "分析师", description: "富有想象力和战略性的思想家，一切都在你的计划之中。" },
  INTP: { name: "逻辑学家", role: "分析师", description: "致力于用创新的方式解决问题，对知识有着无尽的渴望。" },
  ENTJ: { name: "指挥官", role: "分析师", description: "大胆、想象力丰富、意志坚定的领导者。" },
  ENTP: { name: "辩论家", role: "分析师", description: "聪明、好奇的思考者，在思想交锋中蓬勃发展。" },
  INFJ: { name: "提倡者", role: "外交官", description: "安静而神秘，鼓舞人心的理想主义者。" },
  INFP: { name: "调停者", role: "外交官", description: "富有诗意和善良的利他主义者，始终努力做正确的事。" },
  ENFJ: { name: "主人公", role: "外交官", description: "富有魅力的领导者，能鼓舞人心。" },
  ENFP: { name: "竞选者", role: "外交官", description: "热情洋溢、灵感激荡的社交者。" },
  ISTJ: { name: "物流师", role: "守护者", description: "事实和逻辑的安静力量，值得信赖。" },
  ISFJ: { name: "守卫者", role: "守护者", description: "非常专注、温暖的守护者，随时准备保护所爱之人。" },
  ESTJ: { name: "总经理", role: "守护者", description: "出色的管理者，在组织项目方面无与伦比。" },
  ESFJ: { name: "执政官", role: "守护者", description: "非常关怀的照顾者，总是乐于助人。" },
  ISTP: { name: "鉴赏家", role: "探险家", description: "大胆而实际的实验家，具有运用各种工具的天赋。" },
  ISFP: { name: "探险家", role: "探险家", description: "灵活的艺术家，渴望用创意的方式呈现世界之美。" },
  ESTP: { name: "企业家", role: "探险家", description: "聪明的社交者，喜欢即时行乐，热衷于解决挑战性问题。" },
  ESFP: { name: "表演者", role: "探险家", description: "自发的、精力充沛的表演者，总是能让周围的人感到有趣。" },
};

function calculateType(answers: Map<number, string>): string {
  const scores = { E: 0, I: 0, S: 0, N: 0, T: 0, F: 0, J: 0, P: 0 };
  answers.forEach((optionValue, questionId) => {
    const q = QUESTIONS.find((q) => q.id === questionId);
    if (!q) return;
    const option = q.options.find((o) => o.text === optionValue);
    if (!option) return;
    scores[option.value[0] as keyof typeof scores] += option.value[1];
  });
  let type = "";
  type += scores.E >= scores.I ? "E" : "I";
  type += scores.S >= scores.N ? "S" : "N";
  type += scores.T >= scores.F ? "T" : "F";
  type += scores.J >= scores.P ? "J" : "P";
  return type;
}

export default function TestPage() {
  const router = useRouter();
  const [current, setCurrent] = useState(0);
  const [answers, setAnswers] = useState<Map<number, string>>(new Map());
  const [result, setResult] = useState<string | null>(null);

  const question = QUESTIONS[current];
  const total = QUESTIONS.length;
  const progress = ((current + 1) / total) * 100;

  const handleAnswer = (optionText: string) => {
    const next = new Map(answers);
    next.set(question.id, optionText);
    setAnswers(next);

    if (current < total - 1) {
      setTimeout(() => setCurrent(current + 1), 200);
    } else {
      const type = calculateType(next);
      setResult(type);
    }
  };

  const handleRestart = () => {
    setCurrent(0);
    setAnswers(new Map());
    setResult(null);
  };

  // Result screen
  if (result) {
    const info = TYPE_DESCRIPTIONS[result];
    return (
      <div className="min-h-screen bg-background flex items-center justify-center px-6">
        <div className="max-w-lg w-full text-center space-y-6">
          <div className="space-y-2">
            <Sparkles className="h-10 w-10 text-primary mx-auto" />
            <p className="text-sm text-muted-foreground">测试完成</p>
          </div>
          <div>
            <div className="inline-block rounded-2xl bg-primary px-6 py-3 mb-4">
              <span className="text-4xl font-black text-primary-foreground tracking-widest">
                {result}
              </span>
            </div>
            <h2 className="text-2xl font-bold">{info?.name}</h2>
            <p className="text-sm text-primary font-medium mt-1">{info?.role}</p>
          </div>
          <p className="text-muted-foreground leading-relaxed">
            {info?.description}
          </p>
          <div className="border-t pt-6 space-y-3">
            <p className="text-sm text-muted-foreground">完整的人格报告正在生成中...</p>
            <Link
              href="/mbti/types"
              className="inline-flex items-center gap-2 rounded-xl bg-primary px-6 py-3 text-base font-semibold text-primary-foreground shadow-lg hover:bg-primary/90 transition-all"
            >
              <Brain className="h-5 w-5" />
              查看完整类型百科
            </Link>
            <button
              onClick={handleRestart}
              className="flex items-center gap-2 mx-auto text-sm text-muted-foreground hover:text-foreground transition-colors"
            >
              <RefreshCcw className="h-4 w-4" />
              重新测试
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background flex flex-col">
      {/* Header */}
      <header className="border-b px-6 py-4">
        <div className="max-w-xl mx-auto flex items-center justify-between">
          <div>
            <h1 className="text-xl font-bold tracking-tight">MBTI 人格测试</h1>
            <p className="text-xs text-muted-foreground">根据你的直觉作答，没有标准答案</p>
          </div>
          <Link href="/" className="text-sm text-muted-foreground hover:text-foreground transition-colors">
            ← 返回
          </Link>
        </div>
      </header>

      {/* Progress */}
      <div className="px-6 py-3">
        <div className="max-w-xl mx-auto">
          <div className="flex items-center justify-between text-xs text-muted-foreground mb-1">
            <span>问题 {current + 1} / {total}</span>
            <span>{Math.round(progress)}%</span>
          </div>
          <div className="h-1.5 bg-muted rounded-full overflow-hidden">
            <div
              className="h-full bg-primary rounded-full transition-all duration-300"
              style={{ width: `${progress}%` }}
            />
          </div>
        </div>
      </div>

      {/* Question */}
      <div className="flex-1 flex items-center justify-center px-6 py-8">
        <div className="max-w-xl w-full space-y-8">
          <h2 className="text-xl font-semibold text-center leading-relaxed">
            {question.text}
          </h2>

          <div className="space-y-3">
            {question.options.map((option) => {
              const selected = answers.get(question.id) === option.text;
              return (
                <button
                  key={option.text}
                  onClick={() => handleAnswer(option.text)}
                  className={`w-full text-left rounded-xl border px-5 py-4 transition-all text-sm font-medium
                    ${selected
                      ? "border-primary bg-primary/10 text-primary"
                      : "border-border bg-card hover:border-primary/50 hover:bg-accent"
                    }
                  `}
                >
                  <div className="flex items-center gap-3">
                    <div
                      className={`h-5 w-5 rounded-full border-2 flex-shrink-0 flex items-center justify-center transition-all
                        ${selected ? "border-primary bg-primary" : "border-muted-foreground"}`}
                    >
                      {selected && (
                        <div className="h-2 w-2 rounded-full bg-primary-foreground" />
                      )}
                    </div>
                    <span>{option.text}</span>
                  </div>
                </button>
              );
            })}
          </div>

          {/* Navigation hint */}
          <div className="flex items-center justify-center gap-2 text-xs text-muted-foreground">
            {current > 0 && (
              <button
                onClick={() => setCurrent(current - 1)}
                className="flex items-center gap-1 hover:text-foreground transition-colors"
              >
                <ArrowLeft className="h-3 w-3" />
                上一题
              </button>
            )}
            <span className="px-4">|</span>
            <span>选择答案自动进入下一题</span>
          </div>
        </div>
      </div>
    </div>
  );
}
