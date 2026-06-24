"use client";

import { useState, useEffect, useRef } from "react";
import Link from "next/link";
import { ArrowLeft, RefreshCcw, Brain, Sparkles, ChevronRight } from "lucide-react";

// ── 四色分类配色（与 types/page.tsx 保持一致）─────────────────
const COLOR_MAP = {
  紫人: {
    gradientBg: "from-purple-600 via-purple-700 to-indigo-800",
    gradientSoft: "from-purple-50 via-purple-100/60 to-indigo-50 dark:from-purple-950/30 dark:via-purple-900/20 dark:to-indigo-950/30",
    glow: "shadow-purple-500/30",
    ring: "ring-purple-400/50",
    bg: "bg-purple-600",
    bgSoft: "bg-purple-50 dark:bg-purple-950/40",
    border: "border-purple-300 dark:border-purple-700",
    text: "text-purple-700 dark:text-purple-300",
    textLight: "text-purple-600/70 dark:text-purple-400/70",
    badge: "bg-purple-100 dark:bg-purple-900 text-purple-700 dark:text-purple-300",
    accent: "text-purple-400",
    particle: "bg-purple-400",
  },
  黄人: {
    gradientBg: "from-amber-500 via-orange-500 to-rose-600",
    gradientSoft: "from-amber-50 via-amber-100/60 to-orange-50 dark:from-amber-950/30 dark:via-amber-900/20 dark:to-orange-950/30",
    glow: "shadow-amber-500/30",
    ring: "ring-amber-400/50",
    bg: "bg-amber-500",
    bgSoft: "bg-amber-50 dark:bg-amber-950/40",
    border: "border-amber-300 dark:border-amber-700",
    text: "text-amber-700 dark:text-amber-300",
    textLight: "text-amber-600/70 dark:text-amber-400/70",
    badge: "bg-amber-100 dark:bg-amber-900 text-amber-700 dark:text-amber-300",
    accent: "text-amber-400",
    particle: "bg-amber-400",
  },
  绿人: {
    gradientBg: "from-emerald-500 via-teal-500 to-cyan-600",
    gradientSoft: "from-emerald-50 via-emerald-100/60 to-teal-50 dark:from-emerald-950/30 dark:via-emerald-900/20 dark:to-teal-950/30",
    glow: "shadow-emerald-500/30",
    ring: "ring-emerald-400/50",
    bg: "bg-emerald-600",
    bgSoft: "bg-emerald-50 dark:bg-emerald-950/40",
    border: "border-emerald-300 dark:border-emerald-700",
    text: "text-emerald-700 dark:text-emerald-300",
    textLight: "text-emerald-600/70 dark:text-emerald-400/70",
    badge: "bg-emerald-100 dark:bg-emerald-900 text-emerald-700 dark:text-emerald-300",
    accent: "text-emerald-400",
    particle: "bg-emerald-400",
  },
  蓝人: {
    gradientBg: "from-sky-500 via-blue-500 to-indigo-600",
    gradientSoft: "from-sky-50 via-sky-100/60 to-blue-50 dark:from-sky-950/30 dark:via-sky-900/20 dark:to-blue-950/30",
    glow: "shadow-sky-500/30",
    ring: "ring-sky-400/50",
    bg: "bg-sky-600",
    bgSoft: "bg-sky-50 dark:bg-sky-950/40",
    border: "border-sky-300 dark:border-sky-700",
    text: "text-sky-700 dark:text-sky-300",
    textLight: "text-sky-600/70 dark:text-sky-400/70",
    badge: "bg-sky-100 dark:bg-sky-900 text-sky-700 dark:text-sky-300",
    accent: "text-sky-400",
    particle: "bg-sky-400",
  },
} as const;

// 根据 MBTI 类型码判断颜色分组（正确四色分类）
function getColorGroup(type: string): keyof typeof COLOR_MAP {
  // 紫人 = 分析师（NT）
  if (["INTJ", "INTP", "ENTJ", "ENTP"].includes(type)) return "紫人";
  // 绿人 = 外交官（NF）
  if (["INFJ", "INFP", "ENFJ", "ENFP"].includes(type)) return "绿人";
  // 蓝人 = 守护者（SJ）
  if (["ISTJ", "ISFJ", "ESTJ", "ESFJ"].includes(type)) return "蓝人";
  // 黄人 = 探险家（SP）
  return "黄人";
}

interface Question {
  id: number;
  dimension: "EI" | "SN" | "TF" | "JP";
  text: string;
  options: { text: string; value: [string, number] }[];
}

const QUESTIONS: Question[] = [
  { id: 1, dimension: "EI", text: "周末你更倾向于？", options: [{ text: "约朋友一起出去玩，享受社交时光", value: ["E", 1] }, { text: "独自在家看书、听音乐，享受独处", value: ["I", 1] }] },
  { id: 2, dimension: "EI", text: "参加聚会时，你通常是？", options: [{ text: "主动和陌生人搭话，气氛担当", value: ["E", 1] }, { text: "和认识的人聊天，深度交流", value: ["I", 1] }] },
  { id: 3, dimension: "EI", text: "当你需要恢复精力时，你更倾向于？", options: [{ text: "和朋友一起出去活动", value: ["E", 1] }, { text: "一个人安静地待着", value: ["I", 1] }] },
  { id: 4, dimension: "EI", text: "在小组讨论中，你通常？", options: [{ text: "积极发言，提出新想法", value: ["E", 1] }, { text: "先听别人说，再整理自己的想法", value: ["I", 1] }] },
  { id: 5, dimension: "SN", text: "看小说或电影时，你更在意？", options: [{ text: "故事的实际情节和发展", value: ["S", 1] }, { text: "背后的隐喻、象征和深层含义", value: ["N", 1] }] },
  { id: 6, dimension: "SN", text: "学习新东西时，你更喜欢？", options: [{ text: "一步一步来，按教材和说明操作", value: ["S", 1] }, { text: "先了解整体框架，再探索细节", value: ["N", 1] }] },
  { id: 7, dimension: "SN", text: "你更擅长？", options: [{ text: "处理具体、实际的事情", value: ["S", 1] }, { text: "想象未来的各种可能性", value: ["N", 1] }] },
  { id: 8, dimension: "SN", text: "做计划时，你倾向于？", options: [{ text: "制定详细的步骤和安排", value: ["S", 1] }, { text: "保留弹性，随机应变", value: ["N", 1] }] },
  { id: 9, dimension: "SN", text: "朋友找你倾诉时，你更可能说？", options: [{ text: "我理解你的处境，我们来想想实际怎么解决", value: ["S", 1] }, { text: "我能感受到你的心情，想开点，事情会变好的", value: ["N", 1] }] },
  { id: 10, dimension: "TF", text: "做决定时，你更看重？", options: [{ text: "这件事是否合乎逻辑、公平", value: ["T", 1] }, { text: "这件事是否顾及到他人的感受", value: ["F", 1] }] },
  { id: 11, dimension: "TF", text: "当你指出别人的错误时，你更在意？", options: [{ text: "事实是否准确、依据是否充分", value: ["T", 1] }, { text: "表达方式是否会让对方不舒服", value: ["F", 1] }] },
  { id: 12, dimension: "TF", text: "你觉得「对」意味着？", options: [{ text: "客观、公正、有据可依的", value: ["T", 1] }, { text: "符合自己和他人的价值观的", value: ["F", 1] }] },
  { id: 13, dimension: "TF", text: "当你与他人产生分歧时，你倾向于？", options: [{ text: "用逻辑和证据说服对方", value: ["T", 1] }, { text: "尽量维护关系，寻求妥协", value: ["F", 1] }] },
  { id: 14, dimension: "JP", text: "你更喜欢哪种工作方式？", options: [{ text: "提前计划，按部就班执行", value: ["J", 1] }, { text: "边做边调整，灵活应对", value: ["P", 1] }] },
  { id: 15, dimension: "JP", text: "出门旅行前，你会？", options: [{ text: "提前订好行程、机票、酒店", value: ["J", 1] }, { text: "大致有个方向，到当地再说", value: ["P", 1] }] },
  { id: 16, dimension: "JP", text: "面对最后期限时，你通常？", options: [{ text: "提前完成，留有缓冲时间", value: ["J", 1] }, { text: "在最后时刻效率爆发，踩点完成", value: ["P", 1] }] },
  { id: 17, dimension: "JP", text: "你的工作/生活空间通常是？", options: [{ text: "整洁有序，物品有固定位置", value: ["J", 1] }, { text: "随意自然，随手可取", value: ["P", 1] }] },
];

const TYPE_INFO: Record<string, { name: string; group: string; description: string; strengths: string[] }> = {
  INTJ:  { name: "建筑师", group: "紫人 · 分析师", description: "富有想象力和战略性的思想家，一切都在你的计划之中。", strengths: ["战略思维", "独立果断", "高标准", "好奇心强"] },
  INTP:  { name: "逻辑学家", group: "紫人 · 分析师", description: "致力于用创新的方式解决问题，对知识有着无尽的渴望。", strengths: ["分析能力", "开放思维", "客观理性", "创意丰富"] },
  ENTJ:  { name: "指挥官", group: "紫人 · 分析师", description: "大胆、想象力丰富、意志坚定的领导者。", strengths: ["领导力", "战略规划", "自信果断", "效率至上"] },
  ENTP:  { name: "辩论家", group: "紫人 · 分析师", description: "聪明、好奇的思考者，在思想交锋中蓬勃发展。", strengths: ["机智灵活", "知识广博", "思维敏捷", "挑战精神"] },
  INFJ:  { name: "提倡者", group: "绿人 · 外交官", description: "安静而神秘，鼓舞人心的理想主义者。", strengths: ["洞察力", "创意十足", "坚定信念", "帮助他人"] },
  INFP:  { name: "调停者", group: "绿人 · 外交官", description: "富有诗意和善良的利他主义者，始终努力做正确的事。", strengths: ["同理心", "理想主义", "热情真诚", "好奇心"] },
  ENFJ:  { name: "主人公", group: "绿人 · 外交官", description: "富有魅力的领导者，能鼓舞人心。", strengths: ["魅力四射", "利他精神", "天生领袖", "可靠可信"] },
  ENFP:  { name: "竞选者", group: "绿人 · 外交官", description: "热情洋溢、灵感激荡的社交者。", strengths: ["热情洋溢", "创意无限", "社交广泛", "乐观积极"] },
  ISTJ:  { name: "物流师", group: "蓝人 · 守护者", description: "事实和逻辑的安静力量，值得信赖、履行承诺的守护者。", strengths: ["高度负责", "诚实可靠", "严谨细致", "冷静理性"] },
  ISFJ:  { name: "守卫者", group: "蓝人 · 守护者", description: "非常专注、温暖的守护者，随时准备保护所爱之人。", strengths: ["温暖体贴", "责任心强", "耐心细致", "支持他人"] },
  ESTJ:  { name: "总经理", group: "蓝人 · 守护者", description: "出色的管理者，在组织项目方面无与伦比。", strengths: ["组织能力", "执行力强", "传统稳重", "直接坦诚"] },
  ESFJ:  { name: "执政官", group: "蓝人 · 守护者", description: "非常关怀的照顾者，总是乐于助人。", strengths: ["关怀他人", "社交能力强", "忠诚可靠", "实际帮助"] },
  ISTP:  { name: "鉴赏家", group: "黄人 · 探险家", description: "大胆而实际的实验家，具有运用各种工具的天赋。", strengths: ["冷静分析", "实操能力强", "冒险精神", "灵活应变"] },
  ISFP:  { name: "探险家", group: "黄人 · 探险家", description: "灵活的艺术家，渴望用创意的方式呈现世界之美。", strengths: ["艺术天赋", "对美敏感", "好奇心强", "活在当下"] },
  ESTP:  { name: "企业家", group: "黄人 · 探险家", description: "聪明的社交者，喜欢即时行乐。", strengths: ["精力充沛", "务实大胆", "观察敏锐", "社交魅力"] },
  ESFP:  { name: "表演者", group: "黄人 · 探险家", description: "自发的、精力充沛的表演者。", strengths: ["热情开朗", "即兴能力", "关注他人", "活在当下"] },
};

function calculateType(answers: Map<number, string>): string {
  const scores = { E: 0, I: 0, S: 0, N: 0, T: 0, F: 0, J: 0, P: 0 } as Record<string, number>;
  answers.forEach((optionValue, questionId) => {
    const q = QUESTIONS.find((q) => q.id === questionId);
    if (!q) return;
    const option = q.options.find((o) => o.text === optionValue);
    if (!option) return;
    scores[option.value[0]] = (scores[option.value[0]] || 0) + option.value[1];
  });
  let type = "";
  type += scores.E >= scores.I ? "E" : "I";
  type += scores.S >= scores.N ? "S" : "N";
  type += scores.T >= scores.F ? "T" : "F";
  type += scores.J >= scores.P ? "J" : "P";
  return type;
}

// ── 浮动粒子背景 ────────────────────────────────────────────
function ParticleBg({ color }: { color: string }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    let anim: number;
    const particles: { x: number; y: number; r: number; dx: number; dy: number; o: number }[] = [];
    const resize = () => { canvas.width = window.innerWidth; canvas.height = window.innerHeight; };
    resize();
    window.addEventListener("resize", resize);
    for (let i = 0; i < 30; i++) {
      particles.push({
        x: Math.random() * canvas.width,
        y: Math.random() * canvas.height,
        r: Math.random() * 3 + 1,
        dx: (Math.random() - 0.5) * 0.5,
        dy: (Math.random() - 0.5) * 0.5,
        o: Math.random() * 0.3 + 0.1,
      });
    }
    const draw = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      particles.forEach((p) => {
        p.x += p.dx; p.y += p.dy;
        if (p.x < 0 || p.x > canvas.width) p.dx *= -1;
        if (p.y < 0 || p.y > canvas.height) p.dy *= -1;
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
        ctx.fillStyle = color.startsWith("bg-") ? color.replace("bg-", "") : "#ffffff";
        ctx.globalAlpha = p.o;
        ctx.fill();
      });
      ctx.globalAlpha = 1;
      anim = requestAnimationFrame(draw);
    };
    draw();
    return () => { cancelAnimationFrame(anim); window.removeEventListener("resize", resize); };
  }, [color]);
  return <canvas ref={canvasRef} className="absolute inset-0 pointer-events-none" />;
}

export default function TestPage() {
  const [current, setCurrent] = useState(0);
  const [answers, setAnswers] = useState<Map<number, string>>(new Map());
  const [result, setResult] = useState<string | null>(null);
  const [showResult, setShowResult] = useState(false);

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
      setTimeout(() => setShowResult(true), 100);
    }
  };

  const handleRestart = () => {
    setCurrent(0);
    setAnswers(new Map());
    setResult(null);
    setShowResult(false);
  };

  // ── 结果页 ──────────────────────────────────────────────
  if (result) {
    const info = TYPE_INFO[result];
    const group = getColorGroup(result);
    const c = COLOR_MAP[group];

    return (
      <div className={`min-h-screen bg-gradient-to-br ${c.gradientBg} relative overflow-hidden`}>
        {/* 粒子背景 */}
        <div className="absolute inset-0 opacity-20">
          <ParticleBg color={c.particle} />
        </div>

        {/* 光晕装饰 */}
        <div className={`absolute -top-32 left-1/2 -translate-x-1/2 h-96 w-96 rounded-full ${c.bg} blur-3xl opacity-30`} />
        <div className={`absolute bottom-0 right-0 h-64 w-64 rounded-full ${c.bg} blur-2xl opacity-20`} />

        <div className="relative z-10 flex min-h-screen items-center justify-center px-6 py-12">
          <div className={`w-full max-w-lg space-y-8 ${showResult ? "opacity-100 translate-y-0" : "opacity-0 translate-y-4"} transition-all duration-700`}>
            {/* 顶部标签 */}
            <div className="text-center space-y-2">
              <div className="inline-flex items-center gap-2 rounded-full bg-white/15 backdrop-blur-sm px-4 py-1.5 text-sm text-white/80">
                <Sparkles className="h-4 w-4" />
                测试完成 · 你的 MBTI 类型是
              </div>
            </div>

            {/* 类型码 — 大号展示 */}
            <div className="text-center">
              <div className={`inline-flex items-center justify-center rounded-3xl bg-white/10 backdrop-blur-md ring-1 ring-white/20 px-8 py-6 shadow-2xl ${c.glow}`}>
                <span className="text-6xl font-black tracking-[0.15em] text-white drop-shadow-lg">
                  {result}
                </span>
              </div>
              <h2 className="mt-5 text-3xl font-bold text-white">{info?.name}</h2>
              <div className={`inline-block mt-2 rounded-full ${c.badge} bg-white/20 backdrop-blur-sm px-4 py-1 text-sm font-medium text-white/90`}>
                {info?.group}
              </div>
            </div>

            {/* 简介 */}
            <div className="rounded-2xl bg-white/10 backdrop-blur-sm ring-1 ring-white/10 p-5 text-center">
              <p className="text-white/90 leading-relaxed text-sm">{info?.description}</p>
            </div>

            {/* 核心优势 */}
            <div>
              <p className="text-white/60 text-xs font-medium mb-3 text-center">核心优势</p>
              <div className="flex flex-wrap justify-center gap-2">
                {info?.strengths.map((s) => (
                  <span
                    key={s}
                    className="inline-block rounded-full bg-white/15 backdrop-blur-sm ring-1 ring-white/15 px-3 py-1.5 text-xs font-medium text-white/90"
                  >
                    {s}
                  </span>
                ))}
              </div>
            </div>

            {/* 操作按钮 */}
            <div className="space-y-3 pt-2">
              <Link
                href="/mbti/types"
                className="flex items-center justify-center gap-2 w-full rounded-xl bg-white px-6 py-3.5 text-base font-semibold text-gray-900 shadow-lg hover:bg-white/95 transition-all"
              >
                <Brain className="h-5 w-5" />
                查看完整类型百科
                <ChevronRight className="h-4 w-4" />
              </Link>
              <button
                onClick={handleRestart}
                className="flex items-center justify-center gap-2 w-full rounded-xl bg-white/10 backdrop-blur-sm ring-1 ring-white/15 py-3 text-sm font-medium text-white/80 hover:bg-white/20 transition-all"
              >
                <RefreshCcw className="h-4 w-4" />
                重新测试
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // ── 答题页 ──────────────────────────────────────────────
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
                      ? "border-primary bg-primary/10 text-primary shadow-sm"
                      : "border-border bg-card hover:border-primary/50 hover:bg-accent"
                    }
                  `}
                >
                  <div className="flex items-center gap-3">
                    <div
                      className={`h-5 w-5 rounded-full border-2 flex-shrink-0 flex items-center justify-center transition-all
                        ${selected ? "border-primary bg-primary" : "border-muted-foreground/40"}`}
                    >
                      {selected && <div className="h-2 w-2 rounded-full bg-primary-foreground" />}
                    </div>
                    <span>{option.text}</span>
                  </div>
                </button>
              );
            })}
          </div>

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
