import React, { createContext, useContext, useEffect, useState } from 'react'
import { supabase, type User } from '../lib/supabase'

interface AuthContextType {
  user: User | null
  loading: boolean
  signIn: (phone: string, password: string) => Promise<{ error?: string }>
  signUp: (name: string, phone: string, waNumber: string, password: string) => Promise<{ error?: string }>
  signOut: () => Promise<void>
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    // Get initial session
    getProfile()

    // Listen for auth changes
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
        const { data, error } = await supabase
          .from('users')
          .select('*')
          .eq('id', session.user.id)
          .single()
        
        if (error) throw error
        setUser(data)
      }
    } catch (error) {
      console.error('Error getting profile:', error)
    } finally {
      setLoading(false)
    }
  }

  async function signIn(phone: string, password: string) {
    try {
      const { error } = await supabase.auth.signInWithPassword({
        email: `${phone}@omaga.local`,
        password
      })
      
      if (error) throw error
      await getProfile()
      return {}
    } catch (error: any) {
      return { error: error.message }
    }
  }

  async function signUp(name: string, phone: string, waNumber: string, password: string) {
    try {
      const { data, error } = await supabase.auth.signUp({
        email: `${phone}@omaga.local`,
        password,
        options: {
          data: {
            name,
            phone,
            wa_number: waNumber
          }
        }
      })

      if (error) throw error

      if (data.user) {
        const { error: profileError } = await supabase.from('users').insert({
          id: data.user.id,
          name,
          phone,
          wa_number: waNumber,
          role: 'pengguna'
        })

        if (profileError) throw profileError
      }

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
    <AuthContext.Provider value={{ user, loading, signIn, signUp, signOut }}>
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