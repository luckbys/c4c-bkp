'use client';

import React, { useState, useEffect } from 'react';
import Image from 'next/image';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Icons } from '@/components/ui/icons';
import { Eye, EyeOff, Mail, Lock, User, Shield, Sparkles } from 'lucide-react';
import { cn } from '@/lib/utils';

interface LoginFormProps {
  className?: string;
}

export function LoginForm({ className }: LoginFormProps) {
  const { signIn, signUp, loading } = useAuth();
  const [showPassword, setShowPassword] = useState(false);
  const [isVisible, setIsVisible] = useState(false);
  const [activeTab, setActiveTab] = useState('signin');
  const [formData, setFormData] = useState({
    email: '',
    password: '',
    name: '',
    confirmPassword: ''
  });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [success, setSuccess] = useState('');

  useEffect(() => {
    setIsVisible(true);
  }, []);

  const validateForm = (isSignUp: boolean = false) => {
    const newErrors: Record<string, string> = {};

    if (!formData.email) {
      newErrors.email = 'Email é obrigatório';
    } else if (!/\S+@\S+\.\S+/.test(formData.email)) {
      newErrors.email = 'Email inválido';
    }

    if (!formData.password) {
      newErrors.password = 'Senha é obrigatória';
    } else if (formData.password.length < 6) {
      newErrors.password = 'Senha deve ter pelo menos 6 caracteres';
    }

    if (isSignUp) {
      if (!formData.name) {
        newErrors.name = 'Nome é obrigatório';
      }

      if (!formData.confirmPassword) {
        newErrors.confirmPassword = 'Confirmação de senha é obrigatória';
      } else if (formData.password !== formData.confirmPassword) {
        newErrors.confirmPassword = 'Senhas não coincidem';
      }
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validateForm()) return;

    try {
      await signIn(formData.email, formData.password);
    } catch (error) {
      // Error is handled in the context
    }
  };

  const handleSignUp = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validateForm(true)) return;

    try {
      await signUp(formData.email, formData.password, formData.name);
    } catch (error) {
      // Error is handled in the context
    }
  };

  const handleInputChange = (field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: '' }));
    }
  };

  return (
    <div className={cn(
      "min-h-screen flex items-center justify-center p-4 relative overflow-hidden",
      "bg-gradient-to-br from-gray-900 via-slate-800 to-black",
      className
    )}>
      {/* Animated background elements */}
      <div className="absolute inset-0 overflow-hidden">
        <div className="absolute -inset-10 opacity-30">
          <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-gradient-to-r from-orange-500 to-yellow-500 rounded-full mix-blend-multiply filter blur-3xl animate-pulse"></div>
          <div className="absolute top-1/3 right-1/4 w-80 h-80 bg-gradient-to-r from-blue-600 to-cyan-500 rounded-full mix-blend-multiply filter blur-3xl animate-pulse animation-delay-2000"></div>
          <div className="absolute bottom-1/4 left-1/3 w-72 h-72 bg-gradient-to-r from-slate-600 to-gray-500 rounded-full mix-blend-multiply filter blur-3xl animate-pulse animation-delay-4000"></div>
        </div>

      </div>
      
      {/* Floating particles */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        {[...Array(20)].map((_, i) => (
          <div
            key={i}
            className="absolute w-1 h-1 bg-white rounded-full opacity-20 animate-float"
            style={{
              left: `${Math.random() * 100}%`,
              top: `${Math.random() * 100}%`,
              animationDelay: `${Math.random() * 3}s`,
              animationDuration: `${3 + Math.random() * 2}s`
            }}
          />
        ))}
      </div>

      <Card className={cn(
        "w-full max-w-lg backdrop-blur-2xl bg-black/40 border border-gray-700/50 shadow-2xl transition-all duration-1000 transform relative",
        "before:absolute before:inset-0 before:bg-gradient-to-br before:from-orange-500/10 before:to-blue-500/10 before:rounded-lg before:-z-10",
        isVisible ? "translate-y-0 opacity-100 scale-100" : "translate-y-10 opacity-0 scale-95"
      )}>
        <CardHeader className="space-y-1 text-center relative">
          <div className="flex justify-center mb-6">
            <div className="relative">
              <div className="w-20 h-20 bg-black/60 backdrop-blur-sm rounded-2xl flex items-center justify-center shadow-lg transform transition-transform hover:scale-110 p-2 border border-orange-500/30">
                <Image 
                  src="/img/logo.png" 
                  alt="Logo" 
                  width={64} 
                  height={64} 
                  className="w-full h-full object-contain"
                />
              </div>
              <div className="absolute -top-1 -right-1 w-6 h-6 bg-gradient-to-r from-yellow-400 to-orange-500 rounded-full flex items-center justify-center">
                <Sparkles className="w-3 h-3 text-white" />
              </div>
            </div>
          </div>
          <CardTitle className="text-3xl font-bold bg-gradient-to-r from-orange-400 via-yellow-300 to-orange-500 bg-clip-text text-transparent">
            CRM-C4
          </CardTitle>
          <CardDescription className="text-gray-400 font-medium">
            Sistema Inteligente de Gestão de Relacionamento
          </CardDescription>
        </CardHeader>
        
        <CardContent className="relative">
          {success && (
            <div className="mb-4 p-3 bg-green-500/20 border border-green-500/30 rounded-lg text-green-300 text-sm text-center animate-in slide-in-from-top-2">
              {success}
            </div>
          )}
          
          <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
            <TabsList className="grid w-full grid-cols-2 bg-black/30 border border-gray-700/50">
              <TabsTrigger 
                value="signin" 
                className="data-[state=active]:bg-gradient-to-r data-[state=active]:from-orange-500/20 data-[state=active]:to-yellow-500/20 data-[state=active]:text-orange-300 data-[state=active]:border-orange-500/30 text-gray-400 transition-all duration-300 border border-transparent"
              >
                <Shield className="w-4 h-4 mr-2" />
                Entrar
              </TabsTrigger>
              <TabsTrigger 
                value="signup" 
                className="data-[state=active]:bg-gradient-to-r data-[state=active]:from-blue-500/20 data-[state=active]:to-cyan-500/20 data-[state=active]:text-blue-300 data-[state=active]:border-blue-500/30 text-gray-400 transition-all duration-300 border border-transparent"
              >
                <User className="w-4 h-4 mr-2" />
                Criar Conta
              </TabsTrigger>
            </TabsList>
            
            <TabsContent value="signin" className="space-y-6 mt-6">
              <form onSubmit={handleSignIn} className="space-y-6">
                <div className="space-y-2">
                  <Label htmlFor="signin-email" className="text-gray-200 font-medium">Email</Label>
                  <div className="relative group">
                    <Mail className="absolute left-3 top-3 h-4 w-4 text-gray-400 group-focus-within:text-purple-400 transition-colors" />
                    <Input
                      id="signin-email"
                      type="email"
                      placeholder="seu@email.com"
                      value={formData.email}
                      onChange={(e) => handleInputChange('email', e.target.value)}
                      className={cn(
                        "pl-10 bg-white/10 border-white/20 text-white placeholder:text-gray-400",
                        "focus:border-purple-400 focus:ring-purple-400/20 transition-all duration-300",
                        "hover:bg-white/15",
                        errors.email && "border-red-400 focus:border-red-400 focus:ring-red-400/20"
                      )}
                      disabled={loading}
                    />
                  </div>
                  {errors.email && (
                    <p className="text-sm text-red-400 animate-in slide-in-from-left-2">{errors.email}</p>
                  )}
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="signin-password" className="text-gray-200 font-medium">Senha</Label>
                  <div className="relative group">
                    <Lock className="absolute left-3 top-3 h-4 w-4 text-gray-400 group-focus-within:text-purple-400 transition-colors" />
                    <Input
                      id="signin-password"
                      type={showPassword ? "text" : "password"}
                      placeholder="Sua senha"
                      value={formData.password}
                      onChange={(e) => handleInputChange('password', e.target.value)}
                      className={cn(
                        "pl-10 pr-10 bg-white/10 border-white/20 text-white placeholder:text-gray-400",
                        "focus:border-purple-400 focus:ring-purple-400/20 transition-all duration-300",
                        "hover:bg-white/15",
                        errors.password && "border-red-400 focus:border-red-400 focus:ring-red-400/20"
                      )}
                      disabled={loading}
                    />
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-white/10 text-gray-400 hover:text-purple-400 transition-colors"
                      onClick={() => setShowPassword(!showPassword)}
                      disabled={loading}
                    >
                      {showPassword ? (
                        <EyeOff className="h-4 w-4" />
                      ) : (
                        <Eye className="h-4 w-4" />
                      )}
                    </Button>
                  </div>
                  {errors.password && (
                    <p className="text-sm text-red-400 animate-in slide-in-from-left-2">{errors.password}</p>
                  )}
                </div>
                
                <Button 
                  type="submit" 
                  className={cn(
                    "w-full bg-gradient-to-r from-purple-500 to-blue-500 hover:from-purple-600 hover:to-blue-600",
                    "text-white font-semibold py-3 rounded-lg transition-all duration-300 transform",
                    "hover:scale-105 hover:shadow-lg hover:shadow-purple-500/25",
                    "disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none"
                  )}
                  disabled={loading}
                >
                  {loading ? (
                    <>
                      <Icons.spinner className="mr-2 h-4 w-4 animate-spin" />
                      Entrando...
                    </>
                  ) : (
                    <>
                      <Shield className="mr-2 h-4 w-4" />
                      Entrar
                    </>
                  )}
                </Button>
              </form>
            </TabsContent>
            
            <TabsContent value="signup" className="space-y-6 mt-6">
              <form onSubmit={handleSignUp} className="space-y-6">
                <div className="space-y-2">
                  <Label htmlFor="signup-name" className="text-gray-200 font-medium">Nome Completo</Label>
                  <div className="relative group">
                    <User className="absolute left-3 top-3 h-4 w-4 text-gray-400 group-focus-within:text-purple-400 transition-colors" />
                    <Input
                      id="signup-name"
                      type="text"
                      placeholder="Seu nome completo"
                      value={formData.name}
                      onChange={(e) => handleInputChange('name', e.target.value)}
                      className={cn(
                        "pl-10 bg-white/10 border-white/20 text-white placeholder:text-gray-400",
                        "focus:border-purple-400 focus:ring-purple-400/20 transition-all duration-300",
                        "hover:bg-white/15",
                        errors.name && "border-red-400 focus:border-red-400 focus:ring-red-400/20"
                      )}
                      disabled={loading}
                    />
                  </div>
                  {errors.name && (
                    <p className="text-sm text-red-400 animate-in slide-in-from-left-2">{errors.name}</p>
                  )}
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="signup-email" className="text-gray-200 font-medium">Email</Label>
                  <div className="relative group">
                    <Mail className="absolute left-3 top-3 h-4 w-4 text-gray-400 group-focus-within:text-purple-400 transition-colors" />
                    <Input
                      id="signup-email"
                      type="email"
                      placeholder="seu@email.com"
                      value={formData.email}
                      onChange={(e) => handleInputChange('email', e.target.value)}
                      className={cn(
                        "pl-10 bg-white/10 border-white/20 text-white placeholder:text-gray-400",
                        "focus:border-purple-400 focus:ring-purple-400/20 transition-all duration-300",
                        "hover:bg-white/15",
                        errors.email && "border-red-400 focus:border-red-400 focus:ring-red-400/20"
                      )}
                      disabled={loading}
                    />
                  </div>
                  {errors.email && (
                    <p className="text-sm text-red-400 animate-in slide-in-from-left-2">{errors.email}</p>
                  )}
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="signup-password" className="text-gray-200 font-medium">Senha</Label>
                  <div className="relative group">
                    <Lock className="absolute left-3 top-3 h-4 w-4 text-gray-400 group-focus-within:text-purple-400 transition-colors" />
                    <Input
                      id="signup-password"
                      type={showPassword ? "text" : "password"}
                      placeholder="Mínimo 6 caracteres"
                      value={formData.password}
                      onChange={(e) => handleInputChange('password', e.target.value)}
                      className={cn(
                        "pl-10 pr-10 bg-white/10 border-white/20 text-white placeholder:text-gray-400",
                        "focus:border-purple-400 focus:ring-purple-400/20 transition-all duration-300",
                        "hover:bg-white/15",
                        errors.password && "border-red-400 focus:border-red-400 focus:ring-red-400/20"
                      )}
                      disabled={loading}
                    />
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-white/10 text-gray-400 hover:text-purple-400 transition-colors"
                      onClick={() => setShowPassword(!showPassword)}
                      disabled={loading}
                    >
                      {showPassword ? (
                        <EyeOff className="h-4 w-4" />
                      ) : (
                        <Eye className="h-4 w-4" />
                      )}
                    </Button>
                  </div>
                  {errors.password && (
                    <p className="text-sm text-red-400 animate-in slide-in-from-left-2">{errors.password}</p>
                  )}
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="signup-confirm-password" className="text-gray-200 font-medium">Confirmar Senha</Label>
                  <div className="relative group">
                    <Lock className="absolute left-3 top-3 h-4 w-4 text-gray-400 group-focus-within:text-purple-400 transition-colors" />
                    <Input
                      id="signup-confirm-password"
                      type="password"
                      placeholder="Confirme sua senha"
                      value={formData.confirmPassword}
                      onChange={(e) => handleInputChange('confirmPassword', e.target.value)}
                      className={cn(
                        "pl-10 bg-white/10 border-white/20 text-white placeholder:text-gray-400",
                        "focus:border-purple-400 focus:ring-purple-400/20 transition-all duration-300",
                        "hover:bg-white/15",
                        errors.confirmPassword && "border-red-400 focus:border-red-400 focus:ring-red-400/20"
                      )}
                      disabled={loading}
                    />
                  </div>
                  {errors.confirmPassword && (
                    <p className="text-sm text-red-400 animate-in slide-in-from-left-2">{errors.confirmPassword}</p>
                  )}
                </div>
                
                <Button 
                  type="submit" 
                  className={cn(
                    "w-full bg-gradient-to-r from-purple-500 to-blue-500 hover:from-purple-600 hover:to-blue-600",
                    "text-white font-semibold py-3 rounded-lg transition-all duration-300 transform",
                    "hover:scale-105 hover:shadow-lg hover:shadow-purple-500/25",
                    "disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none"
                  )}
                  disabled={loading}
                >
                  {loading ? (
                    <>
                      <Icons.spinner className="mr-2 h-4 w-4 animate-spin" />
                      Criando conta...
                    </>
                  ) : (
                    <>
                      <Sparkles className="mr-2 h-4 w-4" />
                      Criar Conta
                    </>
                  )}
                </Button>
              </form>
            </TabsContent>
          </Tabs>
        </CardContent>
        
        <CardFooter className="text-center">
          <div className="flex items-center justify-center space-x-2 text-sm text-gray-300">
            <Shield className="w-4 h-4" />
            <span>Protegido por Firebase Authentication</span>
          </div>
        </CardFooter>
      </Card>
    </div>
  );
}