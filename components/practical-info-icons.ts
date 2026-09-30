import { Shirt, Phone, BedDouble, Car, Gift, Info, type LucideIcon } from 'lucide-react';
import type { InfoKind } from '../lib/practical-info';

// Icône de chaque type de rubrique (studio et page RSVP)
export const INFO_ICONS: Record<InfoKind, LucideIcon> = {
  dress_code: Shirt,
  contact: Phone,
  accommodation: BedDouble,
  access: Car,
  gifts: Gift,
  custom: Info,
};
