import type { LucideIcon } from 'lucide-react';
import { Bomb, Grid3X3, Layers3, ScanSearch, Trophy } from 'lucide-react';

export type ArcadeGameId = 'artillery' | 'patience' | 'sweep' | 'relay' | 'match';

export type ArcadeGameDefinition = {
  id: ArcadeGameId;
  name: string;
  rulesName: string;
  description: string;
  duration: string;
  credits: number;
  icon: LucideIcon;
  available: boolean;
};

export const ARCADE_GAMES: ArcadeGameDefinition[] = [
  {
    id: 'artillery',
    name: 'Crater Command',
    rulesName: 'Artillery duel',
    description: 'Range a Xalian battery, reposition under fire, and reshape the battlefield with three tactical payloads.',
    duration: '4–8 min',
    credits: 30,
    icon: Bomb,
    available: true,
  },
  {
    id: 'patience',
    name: 'Archive Patience',
    rulesName: 'Klondike solitaire',
    description: 'Build four suited archives from a familiar seven-column Klondike deal.',
    duration: '5–15 min',
    credits: 35,
    icon: Layers3,
    available: true,
  },
  {
    id: 'sweep',
    name: 'Hazard Sweep',
    rulesName: 'Minesweeper',
    description: 'Reveal a planetary survey grid without disturbing the buried hazards.',
    duration: '2–8 min',
    credits: 20,
    icon: ScanSearch,
    available: true,
  },
  {
    id: 'relay',
    name: 'Relay Merge',
    rulesName: 'Slide-and-merge puzzle',
    description: 'Combine matching signal cells and stabilize a 256-strength relay.',
    duration: '3–8 min',
    credits: 20,
    icon: Grid3X3,
    available: true,
  },
  {
    id: 'match',
    name: 'Xalian Match',
    rulesName: 'Memory matching',
    description: 'Match each Xalian silhouette to its twin before your memory slips.',
    duration: '2–4 min',
    credits: 15,
    icon: Trophy,
    available: true,
  },
];

export const arcadeGame = (id: string | undefined) => ARCADE_GAMES.find((game) => game.id === id);
