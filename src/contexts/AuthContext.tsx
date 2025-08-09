// src/contexts/AuthContext.tsx

import React, { createContext, useContext, useEffect, useState } from "react";
import { supabase, type User } from "../lib/supabase";
import { Session } from "@supabase/supabase-js";

interface AuthContextType {
  user: User | null;
  loading: boolean;
  signIn: (email: string, password: string) => Promise<{ error?: string }>;
  signUp: (
    name: string,
    email: string,
    waNumber: string,
    password: string
  ) => Promise<{ error?: string }>;
  signOut: () => Promise<void>;
  updateProfile: (updates: Partial<User>) => Promise<{ error?: string }>;
  updatePassword: (newPassword: string) => Promise<{ error?: string }>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  const checkUserSession = async () => {
    const {
      data: { session },
    } = await supabase.auth.getSession();

    if (session?.user) {
      const { data: profile, error } = await supabase
        .from("users")
        .select("*")
        .eq("id", session.user.id)
        .single();

      if (error || !profile) {
        console.warn("Sesi lokal tidak valid, melakukan logout paksa.", error);
        await supabase.auth.signOut();
        setUser(null);
      } else {
        const combinedUser: User = {
          id: session.user.id,
          email: session.user.email,
          name: session.user.user_metadata?.name || profile.name,
          wa_number: profile.wa_number,
          role: profile.role,
          profile_picture_url: profile.profile_picture_url,
          created_at: profile.created_at,
          updated_at: profile.updated_at,
        };
        setUser(combinedUser);
      }
    } else {
      setUser(null);
    }
    setLoading(false);
  };

  useEffect(() => {
    checkUserSession();
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      if (_event === "SIGNED_IN" && session) {
        checkUserSession();
      } else if (_event === "SIGNED_OUT") {
        setUser(null);
      }
    });
    return () => {
      subscription.unsubscribe();
    };
  }, []);

  async function signIn(email: string, password: string) {
    try {
      const { error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });
      if (error) throw error;
      return {};
    } catch (error: any) {
      if (error.message === "Invalid login credentials") {
        return { error: "Email atau password yang Anda masukkan salah." };
      }
      return { error: error.message };
    }
  }

  async function signUp(
    name: string,
    email: string,
    waNumber: string,
    password: string
  ) {
    try {
      const { error } = await supabase.auth.signUp({
        email,
        password,
        options: { data: { full_name: name, wa_number: waNumber } },
      });
      if (error) throw error;
      return {};
    } catch (error: any) {
      return { error: error.message };
    }
  }

  async function updateProfile(updates: Partial<User>) {
    if (!user) throw new Error("Pengguna tidak login");

    if (updates.name) {
      const { error: authError } = await supabase.auth.updateUser({
        data: { name: updates.name, full_name: updates.name },
      });
      if (authError) return { error: authError.message };
    }

    const profileUpdates: { wa_number?: string; profile_picture_url?: string } =
      {};
    if (updates.wa_number) profileUpdates.wa_number = updates.wa_number;
    if (updates.profile_picture_url)
      profileUpdates.profile_picture_url = updates.profile_picture_url;

    if (Object.keys(profileUpdates).length > 0) {
      const { error: profileError } = await supabase
        .from("users")
        .update(profileUpdates)
        .eq("id", user.id);
      if (profileError) return { error: profileError.message };
    }

    await checkUserSession();
    return {};
  }

  async function updatePassword(newPassword: string) {
    try {
      const { error } = await supabase.auth.updateUser({
        password: newPassword,
      });
      if (error) throw error;
      return {};
    } catch (error: any) {
      console.error("Update Password Error:", error.message);
      return { error: error.message };
    }
  }

  async function signOut() {
    await supabase.auth.signOut();
    setUser(null);
  }

  return (
    <AuthContext.Provider
      value={{
        user,
        loading,
        signIn,
        signUp,
        signOut,
        updateProfile,
        updatePassword,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}
