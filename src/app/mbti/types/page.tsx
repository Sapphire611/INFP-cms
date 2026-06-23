import Link from "next/link";
import { Brain, Users, Shield, Zap, Heart, Compass, Sparkles, Target } from "lucide-react";

const TYPES = [
  {
    code: "INTJ",
    name: "建筑师",
    role: "分析师",
    color: "bg-blue-100 dark:bg-blue-950 text-blue-700 dark:text-blue-300",
    traits: ["独立", "战略", "理性", "高标准"],
    description: "富有想象力和战略性的思想家，一切都在他们的计划之中。",
  },
  {
    code: "INTP",
    name: "逻辑学家",
    role: "分析师",
    color: "bg-sky-100 dark:bg-sky-950 text-sky-700 dark:text-sky-300",
    traits: ["好奇", "逻辑", "分析", "创新"],
    description: "致力于用创新的方式解决所有问题，对知识有着无尽的渴望。",
  },
  {
    code: "ENTJ",
    name: "指挥官",
    role: "分析师",
    color: "bg-red-100 dark:bg-red-950 text-red-700 dark:text-red-300",
    traits: ["果断", "领导力", "战略", "自信"],
    description: "大胆、想象力丰富、意志坚定的领导者，总能找到办法将愿景变为现实。",
  },
  {
    code: "ENTP",
    name: "辩论家",
    role: "分析师",
    color: "bg-purple-100 dark:bg-purple-950 text-purple-700 dark:text-purple-300",
    traits: ["机智", "好奇", "聪明", "精力充沛"],
    description: "聪明、好奇的思考者，喜欢思想交锋，能在辩论中蓬勃发展。",
  },
  {
    code: "INFJ",
    name: "提倡者",
    role: "外交官",
    color: "bg-violet-100 dark:bg-violet-950 text-violet-700 dark:text-violet-300",
    traits: ["理想主义", "洞察力", "创意", "忠诚"],
    description: "安静而神秘，鼓舞人心、不知疲倦地追求崇高理想。",
  },
  {
    code: "INFP",
    name: "调停者",
    role: "外交官",
    color: "bg-teal-100 dark:bg-teal-950 text-teal-700 dark:text-teal-300",
    traits: ["诗意", "善良", "利他", "忠诚"],
    description: "安静的理想主义者，富有诗意和善良的利他主义者，始终努力做正确的事。",
  },
  {
    code: "ENFJ",
    name: "主人公",
    role: "外交官",
    color: "bg-rose-100 dark:bg-rose-950 text-rose-700 dark:text-rose-300",
    traits: ["魅力", "感染力", "利他", "领导力"],
    description: "富有魅力的领导者，能鼓舞人心，将人们团结在一起追求共同理想。",
  },
  {
    code: "ENFP",
    name: "竞选者",
    role: "外交官",
    color: "bg-amber-100 dark:bg-amber-950 text-amber-700 dark:text-amber-300",
    traits: ["热情", "创意", "社交", "乐观"],
    description: "热情洋溢、灵感激荡的社交者，总是能找到理由感到快乐。",
  },
  {
    code: "ISTJ",
    name: "物流师",
    role: "守护者",
    color: "bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300",
    traits: ["务实", "可靠", "诚实", "负责"],
    description: "事实和逻辑的安静力量，值得信赖、履行承诺的守护者。",
  },
  {
    code: "ISFJ",
    name: "守卫者",
    role: "守护者",
    color: "bg-stone-100 dark:bg-stone-800 text-stone-700 dark:text-stone-300",
    traits: ["温暖", "可靠", "细心", "忠诚"],
    description: "非常专注、温暖的守护者，随时准备保护所爱之人。",
  },
  {
    code: "ESTJ",
    name: "总经理",
    role: "守护者",
    color: "bg-orange-100 dark:bg-orange-950 text-orange-700 dark:text-orange-300",
    traits: ["执行", "管理", "诚实", "传统"],
    description: "出色的管理者，在组织项目方面无与伦比，更喜欢做而不是说。",
  },
  {
    code: "ESFJ",
    name: "执政官",
    role: "守护者",
    color: "bg-pink-100 dark:bg-pink-950 text-pink-700 dark:text-pink-300",
    traits: ["关怀", "社交", "责任", "受欢迎"],
    description: "非常关怀的照顾者，总是乐于助人，人气很高。",
  },
  {
    code: "ISTP",
    name: "鉴赏家",
    role: "探险家",
    color: "bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300",
    traits: ["大胆", "实用", "实验", "手巧"],
    description: "大胆而实际的实验家，具有运用各种工具的天赋。",
  },
  {
    code: "ISFP",
    name: "探险家",
    role: "探险家",
    color: "bg-emerald-100 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300",
    traits: ["灵活", "艺术", "适应", "观察"],
    description: "灵活的艺术家，渴望用创意的方式呈现世界之美。",
  },
  {
    code: "ESTP",
    name: "企业家",
    role: "探险家",
    color: "bg-yellow-100 dark:bg-yellow-950 text-yellow-700 dark:text-yellow-300",
    traits: ["活力", "现实", "大胆", "自发"],
    description: "聪明的社交者，喜欢即时行乐，热衷于解决挑战性问题。",
  },
  {
    code: "ESFP",
    name: "表演者",
    role: "探险家",
    color: "bg-fuchsia-100 dark:bg-fuchsia-950 text-fuchsia-700 dark:text-fuchsia-300",
    traits: ["自发性", "魅力", "热情", "娱乐"],
    description: "自发的、精力充沛的表演者，总是能让周围的人感到有趣和兴奋。",
  },
];

const ROLE_ICONS: Record<string, React.ReactNode> = {
  分析师: <Brain className="h-5 w-5" />,
  外交官: <Heart className="h-5 w-5" />,
  守护者: <Shield className="h-5 w-5" />,
  探险家: <Compass className="h-5 w-5" />,
};

const ROLE_COLORS: Record<string, string> = {
  分析师: "border-blue-300 dark:border-blue-700",
  外交官: "border-rose-300 dark:border-rose-700",
  守护者: "border-amber-300 dark:border-amber-700",
  探险家: "border-green-300 dark:border-green-700",
};

export default function TypesPage() {
  const grouped = TYPES.reduce<Record<string, typeof TYPES>>((acc, type) => {
    if (!acc[type.role]) acc[type.role] = [];
    acc[type.role].push(type);
    return acc;
  }, {});

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b px-6 py-4">
        <div className="max-w-5xl mx-auto flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold tracking-tight">16型人格百科</h1>
            <p className="text-sm text-muted-foreground mt-1">探索每种人格的独特魅力与特质</p>
          </div>
          <Link href="/" className="text-sm text-muted-foreground hover:text-foreground transition-colors">
            ← 返回首页
          </Link>
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-6 py-10 space-y-12">
        {/* Role overview */}
        <section>
          <h2 className="text-lg font-semibold mb-6 flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-primary" />
            四大角色群组
          </h2>
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            {Object.entries(grouped).map(([role, types]) => (
              <div
                key={role}
                className={`rounded-xl border p-4 bg-card ${ROLE_COLORS[role]} border-l-4`}
              >
                <div className="flex items-center gap-2 mb-2">
                  <span className="text-primary">{ROLE_ICONS[role]}</span>
                  <span className="font-semibold">{role}</span>
                </div>
                <p className="text-xs text-muted-foreground">
                  {role === "分析师" && "理性、战略性的思考者，注重逻辑与效率"}
                  {role === "外交官" && "富有同理心、理想主义的沟通者，注重和谐"}
                  {role === "守护者" && "务实、可靠的实践者，注重责任与安全"}
                  {role === "探险家" && "灵活、创意的探索者，注重自由与体验"}
                </p>
                <div className="mt-2 text-xs text-primary font-medium">{types.length} 种类型</div>
              </div>
            ))}
          </div>
        </section>

        {/* All types */}
        {Object.entries(grouped).map(([role, types]) => (
          <section key={role}>
            <h2 className="text-base font-semibold mb-4 flex items-center gap-2">
              {ROLE_ICONS[role]}
              {role} — {types.length} 种类型
            </h2>
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {types.map((type) => (
                <div
                  key={type.code}
                  className="rounded-xl border bg-card p-6 hover:shadow-md transition-shadow cursor-pointer group"
                >
                  <div className="flex items-start justify-between mb-3">
                    <div>
                      <div className={`inline-block rounded-md px-2 py-0.5 text-sm font-bold ${type.color}`}>
                        {type.code}
                      </div>
                      <h3 className="text-lg font-semibold mt-2">{type.name}</h3>
                    </div>
                    <Target className="h-5 w-5 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
                  </div>
                  <p className="text-sm text-muted-foreground leading-relaxed mb-4">
                    {type.description}
                  </p>
                  <div className="flex flex-wrap gap-1.5">
                    {type.traits.map((trait) => (
                      <span
                        key={trait}
                        className="inline-block rounded-full bg-muted px-2 py-0.5 text-xs text-muted-foreground"
                      >
                        {trait}
                      </span>
                    ))}
                  </div>
                  <div className="mt-4 pt-3 border-t">
                    <Link
                      href={`/mbti/test?type=${type.code}`}
                      className="text-sm text-primary font-medium hover:underline"
                    >
                      了解更多 →
                    </Link>
                  </div>
                </div>
              ))}
            </div>
          </section>
        ))}

        {/* CTA */}
        <section className="text-center py-8 border-t">
          <p className="text-muted-foreground mb-4">还没做过测试？三分钟认识真正的自己</p>
          <Link
            href="/mbti/test"
            className="inline-flex items-center gap-2 rounded-xl bg-primary px-8 py-3 text-base font-semibold text-primary-foreground shadow-lg hover:bg-primary/90 transition-all"
          >
            开始免费测试
          </Link>
        </section>
      </main>
    </div>
  );
}
