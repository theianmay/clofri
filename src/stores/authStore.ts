import { create } from 'zustand'
import type { User, Session } from '@supabase/supabase-js'
import type { Profile } from '../types/database'
import { supabase } from '../lib/supabase'

interface AuthState {
  user: User | null
  session: Session | null
  profile: Profile | null
  loading: boolean
  initialize: () => Promise<void>
  signInWithGoogle: () => Promise<void>
  signInWithMagicLink: (email: string) => Promise<{ error: string | null }>
  signOut: () => Promise<void>
  updateProfile: (updates: { display_name?: string; avatar_url?: string }) => Promise<void>
}

export const useAuthStore = create<AuthState>((set, get) => ({
  user: null,
  session: null,
  profile: null,
  loading: true,

  initialize: async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession()

      if (session?.user) {
        const profile = await fetchOrCreateProfile(session.user)
        set({ user: session.user, session, profile, loading: false })
      } else {
        set({ loading: false })
      }
    } catch (err) {
      console.error('Auth initialization failed:', err)
      set({ loading: false })
    }

    supabase.auth.onAuthStateChange(async (_event, session) => {
      if (session?.user) {
        const profile = await fetchOrCreateProfile(session.user)
        set({ user: session.user, session, profile })
      } else {
        set({ user: null, session: null, profile: null })
      }
    })
  },

  signInWithGoogle: async () => {
    await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: { redirectTo: window.location.origin },
    })
  },

  signInWithMagicLink: async (email: string) => {
    const { error } = await supabase.auth.signInWithOtp({
      email,
      options: { emailRedirectTo: window.location.origin },
    })
    return { error: error?.message ?? null }
  },

  signOut: async () => {
    await supabase.auth.signOut()
    set({ user: null, session: null, profile: null })
  },

  updateProfile: async (updates) => {
    const { user } = get()
    if (!user) return

    const { data, error } = await supabase
      .from('profiles')
      .update(updates as any)
      .eq('id', user.id)
      .select()
      .single()

    if (!error && data) {
      set({ profile: data as Profile })
    }
  },
}))

async function fetchOrCreateProfile(user: User): Promise<Profile | null> {
  // Try to fetch existing profile
  const { data: existing, error: selectError } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', user.id)
    .single()

  if (existing) return existing as Profile
  if (selectError && selectError.code !== 'PGRST116') console.error('Profile fetch error:', selectError.message)

  // Profile doesn't exist — create it
  const displayName =
    user.user_metadata?.full_name ||
    user.user_metadata?.name ||
    user.email?.split('@')[0] ||
    'Anonymous'

  const { data: created, error: insertError } = await supabase
    .from('profiles')
    .insert({
      id: user.id,
      email: user.email!,
      display_name: displayName,
      avatar_url: user.user_metadata?.avatar_url || null,
    } as any)
    .select()
    .single()

  if (created) return created as Profile

  // INSERT failed — likely race condition (duplicate key). Retry SELECT.
  if (insertError) {
    const { data: retried } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', user.id)
      .single()

    if (retried) return retried as Profile
    console.error('Profile creation failed and retry fetch also failed:', insertError)
  }

  return null
}
