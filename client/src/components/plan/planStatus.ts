import type { BadgeTone } from '@/components/ui/Badge';

export interface PlanStatus {
  label: 'Boshlanmagan' | 'Jarayonda' | 'Yakunlangan';
  tone: BadgeTone;
}

/** 0% → "Boshlanmagan", 1–99% → "Jarayonda", 100% → "Yakunlangan". */
export function planStatus(percent: number): PlanStatus {
  if (percent >= 100) return { label: 'Yakunlangan', tone: 'success' };
  if (percent > 0) return { label: 'Jarayonda', tone: 'primary' };
  return { label: 'Boshlanmagan', tone: 'neutral' };
}
