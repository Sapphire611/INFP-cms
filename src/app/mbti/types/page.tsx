import Link from "next/link";
import { Brain, Heart, Shield, Compass, Sparkles, ChevronRight } from "lucide-react";

// ── 四色分类（正确对应关系）─────────────────────────────────
const GROUPS = [
  {
    key: "紫人",
    label: "紫人 · 分析师",
    icon: Brain,
    desc: "理性、战略性的思考者，追求逻辑与效率",
    // 紫人配色
    bg: "bg-purple-600",
    bgLight: "bg-purple-50 dark:bg-purple-950/40",
    border: "border-purple-300 dark:border-purple-700",
    text: "text-purple-700 dark:text-purple-300",
    textLight: "text-purple-600/80 dark:text-purple-400/80",
    badge: "bg-purple-100 dark:bg-purple-900 text-purple-700 dark:text-purple-300",
    gradient: "from-purple-500 to-indigo-600",
    ring: "ring-purple-400/40",
    iconClass: "text-purple-500",
  },
  {
    key: "绿人",
    label: "绿人 · 外交官",
    icon: Heart,
    desc: "富有同理心、理想主义的沟通者，注重和谐与价值",
    // 绿人配色（绿色系）
    bg: "bg-emerald-600",
    bgLight: "bg-emerald-50 dark:bg-emerald-950/40",
    border: "border-emerald-300 dark:border-emerald-700",
    text: "text-emerald-700 dark:text-emerald-300",
    textLight: "text-emerald-600/80 dark:text-emerald-400/80",
    badge: "bg-emerald-100 dark:bg-emerald-900 text-emerald-700 dark:text-emerald-300",
    gradient: "from-emerald-500 to-teal-600",
    ring: "ring-emerald-400/40",
    iconClass: "text-emerald-500",
  },
  {
    key: "蓝人",
    label: "蓝人 · 守护者",
    icon: Shield,
    desc: "务实、可靠的实践者，注重责任、安全与秩序",
    // 蓝人配色（蓝色系）
    bg: "bg-sky-600",
    bgLight: "bg-sky-50 dark:bg-sky-950/40",
    border: "border-sky-300 dark:border-sky-700",
    text: "text-sky-700 dark:text-sky-300",
    textLight: "text-sky-600/80 dark:text-sky-400/80",
    badge: "bg-sky-100 dark:bg-sky-900 text-sky-700 dark:text-sky-300",
    gradient: "from-sky-500 to-blue-600",
    ring: "ring-sky-400/40",
    iconClass: "text-sky-500",
  },
  {
    key: "黄人",
    label: "黄人 · 探险家",
    icon: Compass,
    desc: "灵活、创意的探索者，注重自由、体验与即兴",
    // 黄人配色（琥珀/黄色系）
    bg: "bg-amber-500",
    bgLight: "bg-amber-50 dark:bg-amber-950/40",
    border: "border-amber-300 dark:border-amber-700",
    text: "text-amber-700 dark:text-amber-300",
    textLight: "text-amber-600/80 dark:text-amber-400/80",
    badge: "bg-amber-100 dark:bg-amber-900 text-amber-700 dark:text-amber-300",
    gradient: "from-amber-400 to-orange-500",
    ring: "ring-amber-400/40",
    iconClass: "text-amber-500",
  },
] as const;

const TYPES = [
  // 紫人 — 分析师（NT）
  { code: "INTJ", name: "建筑师", colorGroup: "紫人" as const, traits: ["独立", "战略", "理性", "高标准"], description: "富有想象力和战略性的思想家，一切都在计划之中。" },
  { code: "INTP", name: "逻辑学家", colorGroup: "紫人" as const, traits: ["好奇", "逻辑", "分析", "创新"], description: "致力于用创新的方式解决问题，对知识有着无尽的渴望。" },
  { code: "ENTJ", name: "指挥官", colorGroup: "紫人" as const, traits: ["果断", "领导力", "战略", "自信"], description: "大胆、想象力丰富、意志坚定的领导者，将愿景变为现实。" },
  { code: "ENTP", name: "辩论家", colorGroup: "紫人" as const, traits: ["机智", "好奇", "聪明", "精力充沛"], description: "聪明、好奇的思考者，在思想交锋中蓬勃发展。" },

  // 绿人 — 外交官（NF）
  { code: "INFJ", name: "提倡者", colorGroup: "绿人" as const, traits: ["理想主义", "洞察力", "创意", "忠诚"], description: "安静而神秘，鼓舞人心的理想主义者。" },
  { code: "INFP", name: "调停者", colorGroup: "绿人" as const, traits: ["诗意", "善良", "利他", "忠诚"], description: "富有诗意和善良的利他主义者，始终努力做正确的事。" },
  { code: "ENFJ", name: "主人公", colorGroup: "绿人" as const, traits: ["魅力", "感染力", "利他", "领导力"], description: "富有魅力的领导者，能鼓舞人心，团结人们追求共同理想。" },
  { code: "ENFP", name: "竞选者", colorGroup: "绿人" as const, traits: ["热情", "创意", "社交", "乐观"], description: "热情洋溢、灵感激荡的社交者，总是能找到理由感到快乐。" },

  // 蓝人 — 守护者（SJ）
  { code: "ISTJ", name: "物流师", colorGroup: "蓝人" as const, traits: ["务实", "可靠", "诚实", "负责"], description: "事实和逻辑的安静力量，值得信赖、履行承诺的守护者。" },
  { code: "ISFJ", name: "守卫者", colorGroup: "蓝人" as const, traits: ["温暖", "可靠", "细心", "忠诚"], description: "非常专注、温暖的守护者，随时准备保护所爱之人。" },
  { code: "ESTJ", name: "总经理", colorGroup: "蓝人" as const, traits: ["执行", "管理", "诚实", "传统"], description: "出色的管理者，在组织项目方面无与伦比。" },
  { code: "ESFJ", name: "执政官", colorGroup: "蓝人" as const, traits: ["关怀", "社交", "责任", "受欢迎"], description: "非常关怀的照顾者，总是乐于助人，人气很高。" },

  // 黄人 — 探险家（SP）
  { code: "ISTP", name: "鉴赏家", colorGroup: "黄人" as const, traits: ["大胆", "实用", "实验", "手巧"], description: "大胆而实际的实验家，具有运用各种工具的天赋。" },
  { code: "ISFP", name: "探险家", colorGroup: "黄人" as const, traits: ["灵活", "艺术", "适应", "观察"], description: "灵活的艺术家，渴望用创意的方式呈现世界之美。" },
  { code: "ESTP", name: "企业家", colorGroup: "黄人" as const, traits: ["活力", "现实", "大胆", "自发"], description: "聪明的社交者，喜欢即时行乐，热衷于解决挑战性问题。" },
  { code: "ESFP", name: "表演者", colorGroup: "黄人" as const, traits: ["自发性", "魅力", "热情", "娱乐"], description: "自发的、精力充沛的表演者，总是能让周围的人感到有趣。" },
];

export default function TypesPage() {
  return (
    <div className="min-h-screen bg-background">
      {/* ── Header ─────────────────────────────────────── */}
      <header className="border-b px-6 py-4">
        <div className="max-w-6xl mx-auto flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold tracking-tight">16 型人格百科</h1>
            <p className="text-sm text-muted-foreground mt-1">按四色分类探索每种人格的独特魅力</p>
          </div>
          <Link href="/" className="text-sm text-muted-foreground hover:text-foreground transition-colors">
            ← 返回首页
          </Link>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-6 py-10 space-y-14">
        {/* ── 四色介绍卡片 ─────────────────────────────── */}
        <section>
          <h2 className="text-lg font-semibold mb-6 flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-primary" />
            MBTI 四色人格分类
          </h2>
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            {GROUPS.map((g) => {
              const Icon = g.icon;
              return (
                <div
                  key={g.key}
                  className={`rounded-2xl border ${g.border} ${g.bgLight} p-5 relative overflow-hidden group cursor-pointer`}
                >
                  {/* 装饰色块 */}
                  <div className={`absolute -right-6 -top-6 h-20 w-20 rounded-full ${g.bg} opacity-10 group-hover:opacity-20 transition-opacity`} />
                  <div className="relative">
                    <div className={`inline-flex h-10 w-10 items-center justify-center rounded-xl ${g.bg} text-white mb-3 shadow-sm`}>
                      <Icon className="h-5 w-5" />
                    </div>
                    <h3 className="font-bold text-base">{g.label}</h3>
                    <p className="text-xs text-muted-foreground mt-1.5 leading-relaxed">{g.desc}</p>
                    <div className={`mt-3 text-xs font-semibold ${g.text}`}>4 种类型</div>
                  </div>
                </div>
              );
            })}
          </div>
        </section>

        {/* ── 按颜色分组展示 ───────────────────────────── */}
        {GROUPS.map((g) => {
          const groupTypes = TYPES.filter((t) => t.colorGroup === g.key);
          const Icon = g.icon;
          return (
            <section key={g.key}>
              {/* 分组标题 */}
              <div className="flex items-center gap-3 mb-5">
                <div className={`inline-flex h-8 w-8 items-center justify-center rounded-lg ${g.bg} text-white shadow-sm`}>
                  <Icon className="h-4 w-4" />
                </div>
                <h2 className="text-base font-bold">{g.label}</h2>
                <div className="flex-1 border-b border-dashed border-muted-foreground/30" />
                <span className={`text-xs font-medium ${g.textLight}`}>{groupTypes.length} 种</span>
              </div>

              {/* 类型卡片 */}
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                {groupTypes.map((type) => (
                  <div
                    key={type.code}
                    className={`group relative rounded-2xl border ${g.border} ${g.bgLight} p-5 transition-all hover:shadow-lg hover:-translate-y-0.5 cursor-pointer`}
                  >
                    {/* 顶部色条 */}
                    <div className={`absolute left-5 right-5 top-0 h-0.5 rounded-b ${g.bg} opacity-60`} />

                    <div className="space-y-3">
                      {/* 类型码 + 名称 */}
                      <div>
                        <span className={`inline-block rounded-md px-2 py-0.5 text-xs font-black tracking-widest ${g.badge}`}>
                          {type.code}
                        </span>
                        <h3 className="text-base font-bold mt-2">{type.name}</h3>
                      </div>

                      {/* 简介 */}
                      <p className="text-xs text-muted-foreground leading-relaxed">
                        {type.description}
                      </p>

                      {/* 标签 */}
                      <div className="flex flex-wrap gap-1">
                        {type.traits.map((trait) => (
                          <span
                            key={trait}
                            className={`inline-block rounded-full px-2 py-0.5 text-[11px] font-medium ${g.bgLight} ${g.text} border ${g.border}`}
                          >
                            {trait}
                          </span>
                        ))}
                      </div>

                      {/* 了解更多 */}
                      <div className={`pt-2 border-t flex items-center justify-between ${g.border}`}>
                        <span className={`text-xs font-medium ${g.text}`}>了解更多</span>
                        <ChevronRight className={`h-3.5 w-3.5 ${g.iconClass} opacity-0 group-hover:opacity-100 -translate-x-1 group-hover:translate-x-0 transition-all`} />
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </section>
          );
        })}

        {/* ── CTA ──────────────────────────────────────── */}
        <section className="text-center py-8 border-t">
          <p className="text-muted-foreground mb-4">还没做过测试？三分钟认识真正的自己</p>
          <Link
            href="/mbti/test"
            className="inline-flex items-center gap-2 rounded-xl bg-primary px-8 py-3 text-base font-semibold text-primary-foreground shadow-lg hover:bg-primary/90 transition-all"
          >
            开始免费测试
            <Sparkles className="h-4 w-4" />
          </Link>
        </section>
      </main>
    </div>
  );
}
