'use client';

import React, { createContext, useContext, useEffect, useState } from 'react';
import { 
  User,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signOut,
  onAuthStateChanged,
  updateProfile
} from 'firebase/auth';
import { auth } from '@/lib/firebase';
import { useToast } from '@/hooks/use-toast';

interface AuthContextType {
  user: User | null;
  loading: boolean;
  signIn: (email: string, password: string) => Promise<void>;
  signUp: (email: string, password: string, name: string) => Promise<void>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}

interface AuthProviderProps {
  children: React.ReactNode;
}

export function AuthProvider({ children }: AuthProviderProps) {
  console.log('🔐 [AUTH] AuthProvider renderizado - versão atualizada');
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  useEffect(() => {
    console.log('🔐 [AUTH] Configurando listener de autenticação...');
    console.log('🔐 [AUTH] Auth object:', auth);
    
    try {
      console.log('🔐 [AUTH] Tentando configurar onAuthStateChanged...');
      const unsubscribe = onAuthStateChanged(auth, (user) => {
        console.log('🔐 [AUTH] Estado de autenticação mudou:', user ? 'Usuário logado' : 'Usuário não logado');
        if (user) {
          console.log('🔐 [AUTH] Dados do usuário:', { email: user.email, uid: user.uid });
        }
        setUser(user);
        setLoading(false);
      });
      
      console.log('🔐 [AUTH] Listener configurado com sucesso');
      return () => {
        console.log('🔐 [AUTH] Removendo listener de autenticação');
        unsubscribe();
      };
    } catch (error) {
      console.error('🔐 [AUTH] Erro ao configurar listener:', error);
      console.error('🔐 [AUTH] Stack trace:', error.stack);
      setLoading(false);
    }
  }, []);

  const signIn = async (email: string, password: string) => {
    try {
      setLoading(true);
      await signInWithEmailAndPassword(auth, email, password);
      toast({
        title: "Login realizado com sucesso!",
        description: "Bem-vindo de volta.",
      });
    } catch (error: any) {
      let message = "Erro ao fazer login";
      
      switch (error.code) {
        case 'auth/user-not-found':
          message = "Usuário não encontrado";
          break;
        case 'auth/wrong-password':
          message = "Senha incorreta";
          break;
        case 'auth/invalid-email':
          message = "Email inválido";
          break;
        case 'auth/too-many-requests':
          message = "Muitas tentativas. Tente novamente mais tarde";
          break;
        default:
          message = error.message || "Erro ao fazer login";
      }
      
      toast({
        title: "Erro no login",
        description: message,
        variant: "destructive",
      });
      throw error;
    } finally {
      setLoading(false);
    }
  };

  const signUp = async (email: string, password: string, name: string) => {
    try {
      setLoading(true);
      const { user } = await createUserWithEmailAndPassword(auth, email, password);
      
      // Atualizar o perfil do usuário com o nome
      await updateProfile(user, {
        displayName: name
      });
      
      toast({
        title: "Conta criada com sucesso!",
        description: "Sua conta foi criada e você já está logado.",
      });
    } catch (error: any) {
      let message = "Erro ao criar conta";
      
      switch (error.code) {
        case 'auth/email-already-in-use':
          message = "Este email já está em uso";
          break;
        case 'auth/invalid-email':
          message = "Email inválido";
          break;
        case 'auth/weak-password':
          message = "A senha deve ter pelo menos 6 caracteres";
          break;
        default:
          message = error.message || "Erro ao criar conta";
      }
      
      toast({
        title: "Erro ao criar conta",
        description: message,
        variant: "destructive",
      });
      throw error;
    } finally {
      setLoading(false);
    }
  };

  const logout = async () => {
    try {
      await signOut(auth);
      toast({
        title: "Logout realizado",
        description: "Você foi desconectado com sucesso.",
      });
    } catch (error: any) {
      toast({
        title: "Erro ao fazer logout",
        description: error.message || "Erro inesperado",
        variant: "destructive",
      });
      throw error;
    }
  };

  const value = {
    user,
    loading,
    signIn,
    signUp,
    logout
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
}