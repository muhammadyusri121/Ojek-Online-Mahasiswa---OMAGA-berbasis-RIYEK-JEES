import React, { createContext, useContext, useEffect, useState } from 'react'
import { supabase, type User } from '../lib/supabase'

interface AuthContextType {
  user: User | null
  loading: boolean
  signIn: (email: string, password: string) => Promise<{ error?: string }>
  signUp: (name: string, email: string, waNumber: string, password: string) => Promise<{ error?: string }>
  signOut: () => Promise<void>
  updateProfile: (updates: Partial<User>) => Promise<{ error?: string }>
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    getProfile()

    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (session?.user) {
        await getProfile()
      } else {
        setUser(null)
      }
      setLoading(false)
    })

    return () => subscription.unsubscribe()
  }, [])

  async function getProfile() {
    try {
      const { data: { session } } = await supabase.auth.getSession()
      if (session?.user) {
        // Get user data from auth
        const authUser = session.user
        
        // Get profile data from public.users
        const { data, error } = await supabase
          .from('users')
          .select('*')
          .eq('id', authUser.id)
          .single()
        
        if (error) {
          console.error('Error getting profile:', error)
          return
        }

        // Combine auth data with profile data
        const combinedUser: User = {
          id: authUser.id,
          email: authUser.email,
          name: authUser.user_metadata?.name || authUser.user_metadata?.full_name || '',
          wa_number: data.wa_number,
          role: data.role,
          profile_picture_url: data.profile_picture_url,
          created_at: data.created_at,
          updated_at: data.updated_at
        }

        setUser(combinedUser)
      }
    } catch (error) {
      console.error('Error getting profile:', error)
    } finally {
      setLoading(false)
    }
  }

  async function signIn(email: string, password: string) {
    try {
      const { error } = await supabase.auth.signInWithPassword({
        email,
        password
      })
      
      if (error) throw error
      await getProfile()
      return {}
    } catch (error: any) {
      return { error: error.message }
    }
  }

  async function signUp(name: string, email: string, waNumber: string, password: string) {
    try {
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: {
            name,
            full_name: name,
            wa_number: waNumber,
            role: 'pengguna'
          }
        }
      })

      if (error) throw error

      return {}
    } catch (error: any) {
      return { error: error.message }
    }
  }

  async function updateProfile(updates: Partial<User>) {
    try {
      if (!user) throw new Error('No user logged in')

      // Update auth metadata if name is being updated
      if (updates.name) {
        const { error: authError } = await supabase.auth.updateUser({
          data: { name: updates.name, full_name: updates.name }
        })
        if (authError) throw authError
      }

      // Update profile in public.users
      const { error } = await supabase
        .from('users')
        .update({
          wa_number: updates.wa_number,
          role: updates.role,
          profile_picture_url: updates.profile_picture_url
        })
        .eq('id', user.id)

      if (error) throw error
      
      await getProfile()
      return {}
    } catch (error: any) {
      return { error: error.message }
    }
  }

  async function signOut() {
    await supabase.auth.signOut()
    setUser(null)
  }

  return (
    <AuthContext.Provider value={{ user, loading, signIn, signUp, signOut, updateProfile }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const context = useContext(AuthContext)
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider')
  }
  return context
}