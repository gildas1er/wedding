// Listes imprimables des invités : partagées entre la page d'impression et les paramètres (onglet Export).
import {
  CheckCircle2, Clock, Heart, Briefcase, Landmark, Cross, GlassWater, Sparkles, Layers,
} from 'lucide-react';

const isConfirmed = (g: any) => 
  String(g.status || '').toLowerCase() === 'confirmé' || 
  String(g.status || '').toLowerCase() === 'confirme';

export const PRINT_REPORTS = [
  {
    id: 'confirmed',
    title: '1. Invités Confirmés',
    description: 'Liste de tous les invités ayant confirmé leur présence.',
    icon: CheckCircle2,
    filter: (g: any) => String(g.status || '').toLowerCase() === 'confirmé' || String(g.status || '').toLowerCase() === 'confirme'
  },
  {
    id: 'friends',
    title: '2. Liste des Amis',
    description: 'Tous les proches enregistrés dans la catégorie Amis.',
    icon: Sparkles,
    filter: (g: any) => String(g.category || '').toLowerCase() === 'amis' || String(g.category || '').toLowerCase() === 'ami'
  },
  {
    id: 'colleagues',
    title: '3. Liste des Collègues',
    description: 'Tous les invités professionnels / collègues.',
    icon: Briefcase,
    filter: (g: any) => String(g.category || '').toLowerCase().includes('collègue') || String(g.category || '').toLowerCase().includes('collegue')
  },
  {
    id: 'pending',
    title: '4. Invités en Attente',
    description: 'Liste des personnes n\'ayant pas encore répondu au RSVP.',
    icon: Clock,
    filter: (g: any) => String(g.status || '').toLowerCase().includes('attente')
  },
  {
    id: 'groom_parents',
    title: '5. Parents - Côté Marié',
    description: 'Famille et parents rattachés au marié.',
    icon: Heart,
    filter: (g: any) => String(g.category || '').toLowerCase() === 'parents' && (g.side === 'partenaire_1' || g.side === 'marié' || g.side === 'marim')
  },
  {
    id: 'bride_parents',
    title: '6. Parents - Côté Mariée',
    description: 'Famille et parents rattachés à la mariée.',
    icon: Heart,
    filter: (g: any) => String(g.category || '').toLowerCase() === 'parents' && (g.side === 'partenaire_2' || g.side === 'mariée' || g.side === 'mariee')
  },
  {
    id: 'civil',
    title: '7. Cérémonie Civile (Mairie)',
    description: 'Invités confirmés présents à la Mairie.',
    icon: Landmark,
    filter: (g: any) => isConfirmed(g) && Boolean(g.attending_civil || g.civil)
  },
  {
    id: 'church',
    title: '8. Cérémonie Religieuse',
    description: 'Invités confirmés présents à l\'Église/Lieu de culte.',
    icon: Cross,
    filter: (g: any) => isConfirmed(g) && Boolean(g.attending_church || g.church)
  },
  {
    id: 'dinner',
    title: '9. Dîner / Réception',
    description: 'Invités confirmés présents au Dîner avec leurs catégories.',
    icon: GlassWater,
    filter: (g: any) => isConfirmed(g) && Boolean(g.attending_reception || g.reception || g.dinner)
  },
  {
    id: 'full_presence',
    title: '10. Présents à TOUTES les Cérémonies',
    description: 'Invités confirmés présents à la Mairie, l\'Église ET au Dîner.',
    icon: Layers,
    filter: (g: any) => isConfirmed(g) && Boolean((g.attending_civil || g.civil) && (g.attending_church || g.church) && (g.attending_reception || g.reception || g.dinner))
  }
];

export const DEFAULT_REPORT_ID = PRINT_REPORTS[0].id;
