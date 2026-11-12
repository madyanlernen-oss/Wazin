import React from 'react';
import {
  Compass,
  Sparkles,
  HelpCircle,
  TrendingUp,
  Heart,
  Briefcase,
  DollarSign,
  UserCheck,
  BookOpen,
  Home,
  Users,
  Activity,
  CheckCircle2,
  ArrowDown,
  Scale,
} from 'lucide-react';
import wheelImage from '../assets/images/wheel_of_life_dimensions_1794404528259.jpg';
import scaleImage from '../assets/images/balance_scale_guide_1794404547579.jpg';

export const LifeDimensionsGuide: React.FC = () => {
  const dimensions = [
    {
      name: 'الجانب الروحي (Spiritual)',
      icon: '🕌',
      color: '#10b981',
      bgColor: 'rgba(16, 185, 129, 0.1)',
      borderColor: 'rgba(16, 185, 129, 0.3)',
      desc: 'السلام الداخلي، الصلة بالخالق، استشعار المعنى والرسالة في الحياة، والصفاء القلبي والتسامح.',
    },
    {
      name: 'الجانب المالي (Financial)',
      icon: '💎',
      color: '#f59e0b',
      bgColor: 'rgba(245, 158, 11, 0.1)',
      borderColor: 'rgba(245, 158, 11, 0.3)',
      desc: 'الأمان المالي، التحرر من الديون، بناء صندوق الطوارئ، التخطيط الاستثماري، والإنفاق الواعي.',
    },
    {
      name: 'الجانب المهني (Career)',
      icon: '💼',
      color: '#6366f1',
      bgColor: 'rgba(99, 102, 241, 0.1)',
      borderColor: 'rgba(99, 102, 241, 0.3)',
      desc: 'الشغف بالعمل، التطور القيادي، وضوح المسار الوظيفي والريادي، وصناعة أثر حقيقي وملموس.',
    },
    {
      name: 'الجانب الشخصي (Personal)',
      icon: '✨',
      color: '#8b5cf6',
      bgColor: 'rgba(139, 92, 246, 0.1)',
      borderColor: 'rgba(139, 92, 246, 0.3)',
      desc: 'الوعي الذاتي، تقدير الذات، وضع حدود صحية، الانضباط، وتخصيص وقت للاسترخاء والهوايات المغذية.',
    },
    {
      name: 'الجانب التعليمي (Learning)',
      icon: '📚',
      color: '#06b6d4',
      bgColor: 'rgba(6, 182, 212, 0.1)',
      borderColor: 'rgba(6, 182, 212, 0.3)',
      desc: 'التعلم المستمر، الفضول الفكري، قراءة الكتب، اكتساب مهارات المستقبل، والتفكير النقدي.',
    },
    {
      name: 'الجانب الأسري (Family)',
      icon: '🏡',
      color: '#f43f5e',
      bgColor: 'rgba(244, 63, 94, 0.1)',
      borderColor: 'rgba(244, 63, 94, 0.3)',
      desc: 'دفء المنزل، جودة الوقت مع العائلة بدون ملهيات، بر الوالدين، ولغة الحوار الواعي لحل الخلافات.',
    },
    {
      name: 'الجانب الاجتماعي (Social)',
      icon: '🤝',
      color: '#14b8a6',
      bgColor: 'rgba(20, 184, 166, 0.1)',
      borderColor: 'rgba(20, 184, 166, 0.3)',
      desc: 'بناء صداقات داعمة وملهمة، تجنب العلاقات المستنزفة، المشاركة التطوعية، والأثر الإيجابي.',
    },
    {
      name: 'الجانب الصحي (Health)',
      icon: '🌿',
      color: '#22c55e',
      bgColor: 'rgba(34, 197, 94, 0.1)',
      borderColor: 'rgba(34, 197, 94, 0.3)',
      desc: 'حيوية الجسد، النوم العميق الكافي، الرياضة والحركة المنتظمة، التغذية السليمة، والوقاية الطبية.',
    },
  ];

  return (
    <section className="mt-14 pt-12 border-t border-[#eae3d5] max-w-5xl mx-auto space-y-12 text-right">
      {/* 1. Header & Main Concept */}
      <div className="space-y-4">
        <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-white border border-[#eae3d5] text-xs font-bold text-[#1b605b] shadow-xs">
          <Scale className="w-4 h-4 text-[#bd9240]" />
          <span>الدليل المعرفي لنموذج التوازن</span>
        </div>

        <h2 className="text-2xl sm:text-3xl font-black text-[#1d2e2b] leading-tight">
          ماهية نموذج أبعاد الحياة الثمانية{' '}
          <span className="text-[#1b605b] font-bold text-lg sm:text-2xl block sm:inline">
            (The Eight Dimensions of Life)
          </span>
        </h2>

        {/* The Exact User Requested Paragraph */}
        <div className="bg-white border border-[#eae3d5] rounded-3xl p-6 sm:p-8 shadow-sm space-y-4">
          <p className="text-sm sm:text-base text-[#2c3d39] leading-relaxed">
            هو إطار للتقييم الذاتي والتطوير الشخصي، يقوم على تقسيم حياة الإنسان إلى ثمانية مجالات رئيسية مترابطة، بهدف قياس مستوى الرضا والتوازن والتقدم في كل مجال، واكتشاف جوانب القوة والضعف، ثم وضع أهداف وخطط لتحسين جودة الحياة بصورة متكاملة.
          </p>

          <div className="p-4 rounded-2xl bg-[#faf7f2] border border-[#ded7c8] text-[#1d2e2b] text-sm font-semibold flex items-start gap-3">
            <Sparkles className="w-5 h-5 text-[#bd9240] flex-shrink-0 mt-0.5" />
            <p className="leading-relaxed">
              <strong className="text-[#1b605b] block mb-1">الفكرة الأساسية:</strong>
              إن نجاح الإنسان لا يُقاس بالنجاح المهني أو المالي وحده، بل بمدى التوازن بين مختلف جوانب حياته. فلا قيمة لثروة طائلة إن فقدت صحتك أو تلاشت سكينتك الأسرية والروحية.
            </p>
          </div>
        </div>
      </div>

      {/* 2. Visual Conceptual Illustration */}
      <div className="relative rounded-3xl overflow-hidden border border-[#eae3d5] shadow-md bg-white group">
        <img
          src={wheelImage}
          alt="The 8 Dimensions of Life Wheel Diagram"
          className="w-full h-auto max-h-[460px] object-cover transition-transform duration-700 group-hover:scale-[1.02]"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-[#1d2e2b]/80 via-transparent to-transparent" />
        <div className="absolute bottom-4 right-4 left-4 p-4 rounded-2xl bg-white/95 backdrop-blur-md border border-[#eae3d5] flex flex-col sm:flex-row sm:items-center justify-between gap-2 shadow-sm">
          <div>
            <h3 className="text-sm font-black text-[#1d2e2b]">
              عجلة الحياة المتكاملة (Life Wheel Holistic Balance)
            </h3>
            <p className="text-xs text-[#536561]">
              تناغم الأبعاد الثمانية يصنع عجلة تدور بسلاسة وأمان نحو أهدافك
            </p>
          </div>
          <span className="text-[11px] font-bold px-3 py-1 rounded-full bg-[#1b605b]/10 text-[#1b605b] border border-[#1b605b]/20 self-start sm:self-center">
            8 أبعاد مترابطة
          </span>
        </div>
      </div>

      {/* 3. The 8 Dimensions Breakdown */}
      <div className="space-y-6">
        <div>
          <h3 className="text-xl font-black text-[#1d2e2b]">
            مجالات الحياة الثمانية بالتفصيل البسيط:
          </h3>
          <p className="text-xs text-[#536561] mt-1">
            نظرة شاملة ومبسطة على كل بُعد من أبعاد النموذج وكيف يؤثر في جودة معيشتك
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {dimensions.map((dim, idx) => (
            <div
              key={idx}
              className="bg-white border rounded-2xl p-4.5 space-y-2.5 transition-all duration-300 hover:-translate-y-1 shadow-xs hover:shadow-md"
              style={{
                borderColor: dim.borderColor,
                backgroundColor: '#ffffff',
              }}
            >
              <div className="flex items-center justify-between">
                <span className="text-2xl">{dim.icon}</span>
                <span
                  className="text-[10px] font-bold px-2 py-0.5 rounded-full"
                  style={{ color: dim.color, backgroundColor: `${dim.color}15` }}
                >
                  البُعد {idx + 1}
                </span>
              </div>
              <h4 className="font-extrabold text-sm text-[#1d2e2b]">{dim.name}</h4>
              <p className="text-xs text-[#536561] leading-relaxed">{dim.desc}</p>
            </div>
          ))}
        </div>
      </div>

      {/* 4. How the Model Works & Rating Scale (1-10) */}
      <div className="bg-white border border-[#eae3d5] rounded-3xl p-6 sm:p-8 shadow-sm space-y-6">
        <div>
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#1b605b]/10 border border-[#1b605b]/20 text-[#1b605b] text-xs font-bold mb-2">
            <HelpCircle className="w-3.5 h-3.5" />
            <span>آلية القياس والتقييم</span>
          </div>
          <h3 className="text-xl font-black text-[#1d2e2b]">كيف يعمل النموذج؟</h3>
          <p className="text-xs text-[#536561] mt-1">
            يُقيّم الإنسان كل مجال من 1 إلى 10 بحسب مستوى رضاه الحالي وواقع تجربته:
          </p>
        </div>

        {/* 1 - 5 - 10 Visual Scale Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="bg-[#FAF7F2] border border-rose-200 rounded-2xl p-5 space-y-2 relative overflow-hidden shadow-xs">
            <div className="absolute top-0 right-0 left-0 h-1 bg-rose-500" />
            <div className="flex items-center justify-between">
              <span className="text-2xl font-black text-rose-600">1</span>
              <span className="text-xl">⚠️</span>
            </div>
            <h4 className="font-extrabold text-sm text-[#1d2e2b]">عدم الرضا الشديد</h4>
            <p className="text-xs text-[#536561] leading-relaxed">
              شعور بالعجز أو الاستنزاف، وضغط خانق في هذا الجانب يعطل تقدمك ويستوجب تدخلاً عاجلاً.
            </p>
          </div>

          <div className="bg-[#FAF7F2] border border-amber-200 rounded-2xl p-5 space-y-2 relative overflow-hidden shadow-xs">
            <div className="absolute top-0 right-0 left-0 h-1 bg-amber-500" />
            <div className="flex items-center justify-between">
              <span className="text-2xl font-black text-amber-700">5</span>
              <span className="text-xl">⚖️</span>
            </div>
            <h4 className="font-extrabold text-sm text-[#1d2e2b]">مستوى متوسط يحتاج إلى تحسين</h4>
            <p className="text-xs text-[#536561] leading-relaxed">
              وضع مقبول لكنه روتيني أو متذبذب، لا يحقق طموحك الحقيقي ويحتاج عادات جديدة ومنتظمة.
            </p>
          </div>

          <div className="bg-[#FAF7F2] border border-emerald-200 rounded-2xl p-5 space-y-2 relative overflow-hidden shadow-xs">
            <div className="absolute top-0 right-0 left-0 h-1 bg-emerald-600" />
            <div className="flex items-center justify-between">
              <span className="text-2xl font-black text-emerald-700">10</span>
              <span className="text-xl">🌟</span>
            </div>
            <h4 className="font-extrabold text-sm text-[#1d2e2b]">رضا مرتفع جداً</h4>
            <p className="text-xs text-[#536561] leading-relaxed">
              ازدهار ووفرة واستقرار مبهج، يمنحك طاقة إيجابية فائقة تعزز وتدعم بقية أركان حياتك.
            </p>
          </div>
        </div>

        {/* Visual Scale Infographic Image */}
        <div className="rounded-2xl overflow-hidden border border-[#eae3d5] shadow-sm bg-[#faf7f2]">
          <img
            src={scaleImage}
            alt="Life Satisfaction Rating Scale 1 to 10 Infographic Guide"
            className="w-full h-auto object-cover max-h-[380px]"
          />
        </div>

        {/* Summary Takeaway */}
        <div className="p-4 rounded-2xl bg-[#FAF7F2] border border-[#eae3d5] text-xs text-[#2c3d39] flex items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-[#1b605b] flex-shrink-0" />
            <span>
              في منصة <strong className="text-[#1b605b]">تدبير</strong>، يتم تقييم كل مجال لحساب مستوى توازنك بدقة ورسم عجلتك التفاعلية وتقديم خطة موجهة لتحسين جودة حياتك.
            </span>
          </div>
        </div>
      </div>
    </section>
  );
};
