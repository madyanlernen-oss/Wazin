import { Zap, Scale, Brain } from 'lucide-react';

export type AiModelMode = 'fast' | 'balanced' | 'deep';

export interface AiModeConfig {
  id: AiModelMode;
  title: string;
  shortTitle: string;
  icon: any;
  color: string;
  bgColor: string;
  badge: string;
  desc: string;
}

export const AI_MODES: AiModeConfig[] = [
  {
    id: 'fast',
    title: 'الوضع السريع ⚡',
    shortTitle: 'سريع ⚡',
    icon: Zap,
    color: '#0284c7',
    bgColor: '#f0f9ff',
    badge: 'استجابة سريعة',
    desc: 'إجابات فورية، مباشرة، وموجزة للأسئلة والحلول السريعة',
  },
  {
    id: 'balanced',
    title: 'الوضع المتوازن ⚖️',
    shortTitle: 'متوازن ⚖️',
    icon: Scale,
    color: '#1b605b',
    bgColor: '#ecfdf5',
    badge: 'موصى به',
    desc: 'توازن ذكي بين سرعة التفاعل وعمق التوجيه الإرشادي',
  },
  {
    id: 'deep',
    title: 'التحليل العميق 🧠',
    shortTitle: 'تفكير عميق 🧠',
    icon: Brain,
    color: '#7c3aed',
    bgColor: '#f5f3ff',
    badge: 'تفكير استراتيجي',
    desc: 'تفكيك جذري للتحديات، تحليل الدوافع النفسية، وخطط استراتيجية شاملة',
  },
];
