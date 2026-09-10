import React from 'react';
import {
  Activity, Anchor, ArrowDownRight, ArrowLeft, ArrowLeftRight, ArrowRight, ArrowRightCircle, ArrowUpRight,
  Bandage, Binoculars, BookmarkCheck, BookOpen, Box, Building2, Check, ChevronDown, ChevronRight, Circle,
  CircleCheck, CircleCheckBig, CircleDot, CircleHelp, ClipboardCheck, Cloud, Compass, CornerDownLeft,
  CornerDownRight, Cpu, Crosshair, Dices, DoorOpen, Droplet, Eye, EyeOff, Gauge, Hammer, Heart,
  HeartPulse, Hourglass, Info, KeyRound, Layers, Lock, MapPin, MessageCircle, MessageCircleHeart,
  MessageCircleQuestion, MessageSquareQuote, MoonStar, Network, OctagonAlert, Package, PackageCheck,
  PersonStanding, Play, Plus, Radar, Radio, RadioTower, Shield, ShieldAlert, ShieldCheck, Signpost,
  SignpostBig, SlidersHorizontal, Sparkles, Sun, Target, Thermometer, ThermometerSnowflake, TriangleAlert,
  Undo2, Unlock, UserCheck, UserPlus, Users, Volume2, VolumeX, Waves, Wind, Wrench, X, Zap,
} from 'lucide-react';

const ICONS = {
  'bi-anchor': Anchor, 'bi-arrow-down-right-circle': ArrowDownRight, 'bi-arrow-left': ArrowLeft,
  'bi-arrow-left-right': ArrowLeftRight, 'bi-arrow-return-left': Undo2, 'bi-arrow-return-right': CornerDownRight,
  'bi-arrow-right': ArrowRight, 'bi-arrow-right-circle-fill': ArrowRightCircle, 'bi-arrow-up-right': ArrowUpRight,
  'bi-bandaid': Bandage, 'bi-bezier2': Activity, 'bi-binoculars': Binoculars, 'bi-binoculars-fill': Binoculars,
  'bi-bookmark-check': BookmarkCheck, 'bi-box-arrow-down': Box, 'bi-box-seam': Package, 'bi-box-seam-fill': PackageCheck,
  'bi-brightness-high': Sun, 'bi-broadcast': Radio, 'bi-broadcast-pin': RadioTower, 'bi-building': Building2,
  'bi-building-fill-exclamation': Building2, 'bi-buildings': Building2, 'bi-buildings-fill': Building2,
  'bi-bullseye': Target, 'bi-chat-dots': MessageCircle, 'bi-chat-dots-fill': MessageCircle,
  'bi-chat-heart-fill': MessageCircleHeart, 'bi-chat-quote': MessageSquareQuote, 'bi-check-circle': CircleCheck,
  'bi-check-circle-fill': CircleCheckBig, 'bi-check-lg': Check, 'bi-check2-circle': CircleCheck,
  'bi-chevron-down': ChevronDown, 'bi-chevron-right': ChevronRight, 'bi-circle': Circle,
  'bi-clipboard-check': ClipboardCheck, 'bi-cloud': Cloud, 'bi-compass': Compass, 'bi-compass-fill': Compass,
  'bi-cpu': Cpu, 'bi-crosshair': Crosshair, 'bi-cursor-fill': CornerDownLeft, 'bi-diagram-3': Network,
  'bi-diagram-3-fill': Network, 'bi-dice-5-fill': Dices, 'bi-door-open': DoorOpen, 'bi-droplet-fill': Droplet,
  'bi-exclamation-diamond': OctagonAlert, 'bi-exclamation-diamond-fill': OctagonAlert,
  'bi-exclamation-octagon': OctagonAlert, 'bi-exclamation-triangle': TriangleAlert,
  'bi-exclamation-triangle-fill': TriangleAlert, 'bi-eye': Eye, 'bi-eye-fill': Eye,
  'bi-eye-slash': EyeOff, 'bi-eye-slash-fill': EyeOff, 'bi-geo-alt-fill': MapPin, 'bi-hammer': Hammer,
  'bi-heart-fill': Heart, 'bi-heart-pulse': HeartPulse, 'bi-hourglass-split': Hourglass,
  'bi-info-circle': Info, 'bi-journal-text': BookOpen, 'bi-key': KeyRound, 'bi-ladder': Signpost,
  'bi-layers': Layers, 'bi-lightning': Zap, 'bi-lightning-charge': Zap, 'bi-lightning-charge-fill': Zap,
  'bi-lock-fill': Lock, 'bi-moon-stars': MoonStar, 'bi-people': Users, 'bi-people-fill': Users,
  'bi-person-check-fill': UserCheck, 'bi-person-fill': PersonStanding, 'bi-person-plus-fill': UserPlus,
  'bi-person-walking': PersonStanding, 'bi-play-fill': Play, 'bi-plus': Plus, 'bi-plus-lg': Plus,
  'bi-question-circle': CircleHelp, 'bi-question-diamond': MessageCircleQuestion,
  'bi-question-diamond-fill': MessageCircleQuestion, 'bi-radar': Radar, 'bi-reception-1': Radio,
  'bi-record-circle-fill': CircleDot, 'bi-shield': Shield, 'bi-shield-check': ShieldCheck,
  'bi-shield-exclamation': ShieldAlert, 'bi-shield-fill': Shield, 'bi-shield-fill-check': ShieldCheck,
  'bi-shield-fill-exclamation': ShieldAlert, 'bi-sign-turn-right-fill': CornerDownRight,
  'bi-signpost-2-fill': SignpostBig, 'bi-signpost-split': Signpost, 'bi-signpost-split-fill': Signpost,
  'bi-slash-lg': X, 'bi-sliders': SlidersHorizontal, 'bi-speedometer2': Gauge, 'bi-stars': Sparkles,
  'bi-thermometer-half': Thermometer, 'bi-thermometer-snow': ThermometerSnowflake,
  'bi-tools': Wrench, 'bi-transparency': Circle, 'bi-unlock-fill': Unlock, 'bi-volume-mute-fill': VolumeX,
  'bi-volume-up-fill': Volume2, 'bi-water': Waves, 'bi-wind': Wind, 'bi-x': X, 'bi-x-lg': X,
};

export default function BiIcon({ cls, className, ...rest }) {
  const tokens = (cls || '').split(/\s+/).filter(Boolean);
  const iconToken = tokens.find((token) => token.startsWith('bi-'));
  const Icon = ICONS[iconToken] || CircleHelp;
  const extraClasses = tokens.filter((token) => token !== iconToken);
  return <Icon className={[iconToken, ...extraClasses, className].filter(Boolean).join(' ')} aria-hidden="true" {...rest} />;
}
