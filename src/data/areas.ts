import { BookOpen, Briefcase, Flower2, HandHeart, Heart, HeartPulse, House, Plane, Smile, Sparkles, Users, Wallet, type LucideIcon } from 'lucide-react';
import type { AreaId } from '../types';

/** As 12 áreas oficiais da Mive, na ordem de exibição. */
export const areas: { id: AreaId; name: string; icon: LucideIcon }[] = [
  { id: 'profissional', name: 'Profissional', icon: Briefcase },
  { id: 'financeiro', name: 'Financeiro', icon: Wallet },
  { id: 'saude', name: 'Saúde', icon: HeartPulse },
  { id: 'bem-estar', name: 'Bem-estar & Imagem', icon: Flower2 },
  { id: 'intelectual', name: 'Intelectual', icon: BookOpen },
  { id: 'emocional', name: 'Emocional', icon: Smile },
  { id: 'espiritual', name: 'Espiritual', icon: Sparkles },
  { id: 'conjugal', name: 'Conjugal', icon: Heart },
  { id: 'familia', name: 'Família', icon: House },
  { id: 'social', name: 'Social', icon: Users },
  { id: 'lazer', name: 'Lazer', icon: Plane },
  { id: 'servir', name: 'Servir', icon: HandHeart }
];
export const areaName = (id?: AreaId) => areas.find(area => area.id === id)?.name ?? 'Sem área';
