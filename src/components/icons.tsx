import type { LucideIcon, LucideProps } from 'lucide-react';
import { Brain, BookOpen, Flower2, Plane, Scissors, Hand, ScanFace, Briefcase, Building2, Droplets, Dumbbell, Gem, HandHeart, Heart, HeartPulse, House, Layers, MessagesSquare, Salad, Smile, Sparkles, Sun, TrendingUp, Users, Wallet } from 'lucide-react';

/** Every interface icon comes from lucide-react with the light 1.5 stroke of Mive. */
export function Icon({ as: Component, size = 18, ...props }: LucideProps & { as: LucideIcon }) {
  return <Component size={size} strokeWidth={1.5} aria-hidden="true" {...props} />;
}

/** Icons referenced by name in data (areas, habits, vaults). */
const named: Record<string, LucideIcon> = { briefcase: Briefcase, wallet: Wallet, brain: Brain, users: Users, heart: Heart, house: House, sun: Sun, 'heart-pulse': HeartPulse, smile: Smile, sparkles: Sparkles, 'hand-heart': HandHeart, 'trending-up': TrendingUp, flower: Flower2, plane: Plane, scissors: Scissors, hand: Hand, 'scan-face': ScanFace, dumbbell: Dumbbell, droplets: Droplets, salad: Salad, 'book-open': BookOpen, 'messages-square': MessagesSquare, layers: Layers, gem: Gem, 'building-2': Building2 };
export const iconByName = (name?: string): LucideIcon => (name && named[name]) || Sparkles;
