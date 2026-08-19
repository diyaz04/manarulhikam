import { createContext, useContext, useEffect, useState, ReactNode } from "react";
import type { Session, User } from "@supabase/supabase-js";
import { supabase } from "@/lib/supabase";

export interface UserRole {
  id: string;
  lembaga_id: string;
  role: string;
  lembaga: {
    nama: string;
    kode: string;
  };
}

interface AuthContextType {
  session: Session | null;
  user: User | null;
  roles: UserRole[];
  activeRole: UserRole | null;
  setActiveRole: (role: UserRole) => void;
  isLoading: boolean;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [roles, setRoles] = useState<UserRole[]>([]);
  const [activeRole, setActiveRole] = useState<UserRole | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    // Get initial session
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setUser(session?.user ?? null);
      if (session?.user) {
        fetchUserRoles(session.user.id);
      } else {
        setIsLoading(false);
      }
    });

    // Listen for auth changes
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
      setUser(session?.user ?? null);
      
      if (session?.user) {
        fetchUserRoles(session.user.id);
      } else {
        setRoles([]);
        setActiveRole(null);
        setIsLoading(false);
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  const fetchUserRoles = async (userId: string) => {
    try {
      const { data, error } = await supabase
        .from('user_roles')
        .select(`
          id,
          lembaga_id,
          role,
          lembaga (
            nama,
            kode
          )
        `)
        .eq('user_id', userId);

      if (error) throw error;

      // Type assertion since supabase return type for joined tables can be tricky
      const typedData = data as unknown as UserRole[];
      
      setRoles(typedData || []);
      
      // Auto-select first role if none is selected
      if (typedData && typedData.length > 0 && !activeRole) {
        setActiveRole(typedData[0]);
      }
    } catch (error) {
      console.error('Error fetching user roles:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const signOut = async () => {
    await supabase.auth.signOut();
  };

  return (
    <AuthContext.Provider value={{ session, user, roles, activeRole, setActiveRole, isLoading, signOut }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
};
