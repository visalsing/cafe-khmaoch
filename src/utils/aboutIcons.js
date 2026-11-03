import { Award, Cake, Clock, Coffee, Flame, Heart, Leaf, MapPin, ShieldCheck, Sparkles, Sprout, Star, Truck, Users, Wheat } from "lucide-react";

// the names are stored in the database; the same list is checked on the server
export const ABOUT_ICONS = {
  coffee: Coffee,
  flame: Flame,
  sprout: Sprout,
  leaf: Leaf,
  heart: Heart,
  users: Users,
  award: Award,
  star: Star,
  clock: Clock,
  "map-pin": MapPin,
  sparkles: Sparkles,
  cake: Cake,
  wheat: Wheat,
  truck: Truck,
  "shield-check": ShieldCheck,
};
export const ABOUT_ICON_KEYS = Object.keys(ABOUT_ICONS);