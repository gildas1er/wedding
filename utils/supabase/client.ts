// Point d'entrée conservé pour les imports existants : un seul client navigateur dans toute l'app.
import { supabase } from '../../app/lib/supabase';

export function createClient() {
  return supabase;
}
