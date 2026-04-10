import { createServerClient, type CookieOptions } from '@supabase/ssr'
import { cookies } from 'next/headers'

export function createClient() {
  // On ne peut pas mettre "await" ici car createClient n'est pas asynchrone,
  // donc on passe une fonction asynchrone à Supabase pour chaque action.
  
  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        async get(name: string) {
          const cookieStore = await cookies() // On attend la promesse ici
          return cookieStore.get(name)?.value
        },
        async set(name: string, value: string, options: CookieOptions) {
          const cookieStore = await cookies() // On attend la promesse ici
          try {
            cookieStore.set({ name, value, ...options })
          } catch (error) {
            // Le middleware peut lever une erreur si on tente de set 
            // des cookies pendant une redirection.
          }
        },
        async remove(name: string, options: CookieOptions) {
          const cookieStore = await cookies() // On attend la promesse ici
          try {
            cookieStore.set({ name, value: '', ...options })
          } catch (error) {
            // Idem ici
          }
        },
      },
    }
  )
}