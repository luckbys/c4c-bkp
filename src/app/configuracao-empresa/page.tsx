'use client';

import React, { useState, useEffect } from 'react';
import { ArrowLeft, Save, Building2, Users, Globe, Clock, FileText, Info, Plus, X, Phone, Mail, MessageCircle, Instagram, Facebook, Linkedin } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { Separator } from '@/components/ui/separator';
import { useToast } from '@/hooks/use-toast';
import { useRouter } from 'next/navigation';
import { db } from '@/lib/firebase';
import { doc, setDoc, getDoc, serverTimestamp } from 'firebase/firestore';

interface Contact {
  id: string;
  type: 'phone' | 'email' | 'whatsapp';
  value: string;
  label: string;
}

interface SocialMedia {
  id: string;
  platform: 'instagram' | 'facebook' | 'linkedin' | 'whatsapp_business';
  username: string;
  url: string;
}

interface WorkingHours {
  [key: string]: {
    enabled: boolean;
    start: string;
    end: string;
  };
}

const DAYS_OF_WEEK = [
  { key: 'monday', label: 'Segunda-feira' },
  { key: 'tuesday', label: 'Terça-feira' },
  { key: 'wednesday', label: 'Quarta-feira' },
  { key: 'thursday', label: 'Quinta-feira' },
  { key: 'friday', label: 'Sexta-feira' },
  { key: 'saturday', label: 'Sábado' },
  { key: 'sunday', label: 'Domingo' }
];

const SOCIAL_PLATFORMS = [
  { key: 'instagram', label: 'Instagram', icon: Instagram, color: 'bg-gradient-to-r from-purple-500 to-pink-500' },
  { key: 'facebook', label: 'Facebook', icon: Facebook, color: 'bg-blue-600' },
  { key: 'linkedin', label: 'LinkedIn', icon: Linkedin, color: 'bg-blue-700' },
  { key: 'whatsapp_business', label: 'WhatsApp Business', icon: MessageCircle, color: 'bg-green-600' }
];

const BUSINESS_SEGMENTS = [
  'Tecnologia',
  'Varejo',
  'Serviços',
  'Saúde',
  'Educação',
  'Alimentação',
  'Construção',
  'Consultoria',
  'E-commerce',
  'Outros'
];

export default function CompanyConfigPage() {
  const { toast } = useToast();
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);
  const [isSaved, setIsSaved] = useState(false);
  const [isLoadingData, setIsLoadingData] = useState(true);
  
  // Estados para dados básicos
  const [companyName, setCompanyName] = useState('');
  const [segment, setSegment] = useState('');
  const [document, setDocument] = useState('');
  const [address, setAddress] = useState({
    street: '',
    number: '',
    complement: '',
    neighborhood: '',
    city: '',
    state: '',
    zipCode: ''
  });
  
  // Estados para contatos
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [newContact, setNewContact] = useState({ type: 'phone' as const, value: '', label: '' });
  const [showAddContact, setShowAddContact] = useState(false);
  
  // Estados para redes sociais
  const [socialMedia, setSocialMedia] = useState<SocialMedia[]>([]);
  const [newSocial, setNewSocial] = useState({ platform: 'instagram' as const, username: '', url: '' });
  const [showAddSocial, setShowAddSocial] = useState(false);
  
  // Estados para horários
  const [workingHours, setWorkingHours] = useState<WorkingHours>(
    DAYS_OF_WEEK.reduce((acc, day) => ({
      ...acc,
      [day.key]: { enabled: false, start: '09:00', end: '18:00' }
    }), {})
  );
  
  // Estados para outros campos
  const [description, setDescription] = useState('');
  const [afterHoursService, setAfterHoursService] = useState(false);
  
  const handleAddContact = () => {
    if (newContact.value && newContact.label) {
      const contact: Contact = {
        id: Date.now().toString(),
        type: newContact.type,
        value: newContact.value,
        label: newContact.label
      };
      setContacts([...contacts, contact]);
      setNewContact({ type: 'phone', value: '', label: '' });
      setShowAddContact(false);
    }
  };
  
  const handleRemoveContact = (id: string) => {
    setContacts(contacts.filter(c => c.id !== id));
  };
  
  const handleAddSocial = () => {
    if (newSocial.username) {
      const social: SocialMedia = {
        id: Date.now().toString(),
        platform: newSocial.platform,
        username: newSocial.username,
        url: newSocial.url || `https://${newSocial.platform}.com/${newSocial.username}`
      };
      setSocialMedia([...socialMedia, social]);
      setNewSocial({ platform: 'instagram', username: '', url: '' });
      setShowAddSocial(false);
    }
  };
  
  const handleRemoveSocial = (id: string) => {
    setSocialMedia(socialMedia.filter(s => s.id !== id));
  };
  
  const handleWorkingHoursChange = (day: string, field: string, value: any) => {
    setWorkingHours(prev => ({
      ...prev,
      [day]: {
        ...prev[day],
        [field]: value
      }
    }));
  };
  
  const copyHoursToAllDays = (sourceDay: string) => {
    const sourceHours = workingHours[sourceDay];
    const newHours = { ...workingHours };
    
    DAYS_OF_WEEK.forEach(day => {
      if (day.key !== sourceDay) {
        newHours[day.key] = { ...sourceHours };
      }
    });
    
    setWorkingHours(newHours);
  };
  
  const loadCompanyData = async () => {
    try {
      const companyRef = doc(db, 'companies', 'main');
      const companySnap = await getDoc(companyRef);
      
      if (companySnap.exists()) {
        const data = companySnap.data();
        
        // Preencher os estados com os dados carregados
        if (data.companyName) setCompanyName(data.companyName);
        if (data.segment) setSegment(data.segment);
        if (data.document) setDocument(data.document);
        if (data.address) setAddress(data.address);
        if (data.contacts) setContacts(data.contacts);
        if (data.socialMedia) setSocialMedia(data.socialMedia);
        if (data.workingHours) setWorkingHours(data.workingHours);
        if (data.description) setDescription(data.description);
        if (data.afterHoursService !== undefined) setAfterHoursService(data.afterHoursService);
        
        console.log('Dados da empresa carregados do Firebase:', data);
      } else {
        console.log('Nenhum dado da empresa encontrado no Firebase');
      }
    } catch (error) {
      console.error('Erro ao carregar dados do Firebase:', error);
      toast({
        title: "Erro ao carregar dados",
        description: "Não foi possível carregar as configurações salvas.",
        variant: "destructive"
      });
    }
  };
   
   // useEffect para carregar dados na inicialização
   useEffect(() => {
     const initializeData = async () => {
       setIsLoadingData(true);
       await loadCompanyData();
       setIsLoadingData(false);
     };
     
     initializeData();
   }, []);
   
   const handleSave = async () => {
    setIsLoading(true);
    
    try {
      // Criar objeto com todos os dados da empresa
      const companyData = {
        companyName,
        segment,
        document,
        address,
        contacts,
        socialMedia,
        workingHours,
        description,
        afterHoursService,
        updatedAt: serverTimestamp()
      };
      
      // Salvar no Firestore (usando ID fixo 'main' ou baseado no usuário)
      const companyRef = doc(db, 'companies', 'main');
      await setDoc(companyRef, companyData, { merge: true });
      
      setIsSaved(true);
      toast({
        title: "Configurações salvas!",
        description: "As configurações da empresa foram atualizadas com sucesso no Firebase.",
        variant: "default"
      });
      
      setTimeout(() => setIsSaved(false), 3000);
    } catch (error) {
      console.error('Erro ao salvar no Firebase:', error);
      toast({
        title: "Erro ao salvar",
        description: "Ocorreu um erro ao salvar as configurações no Firebase. Tente novamente.",
        variant: "destructive"
      });
    } finally {
      setIsLoading(false);
    }
  };
  
  const getContactIcon = (type: string) => {
    switch (type) {
      case 'phone': return Phone;
      case 'email': return Mail;
      case 'whatsapp': return MessageCircle;
      default: return Phone;
    }
  };
  
  return (
    <TooltipProvider>
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-900 dark:to-slate-800">
        {/* Header */}
        <div className="sticky top-0 z-50 bg-white/80 dark:bg-slate-900/80 backdrop-blur-md border-b border-slate-200 dark:border-slate-700">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex items-center justify-between h-16">
              <div className="flex items-center space-x-4">
                <Button 
                  variant="ghost" 
                  size="sm" 
                  className="text-slate-600 hover:text-slate-900"
                  onClick={() => router.back()}
                >
                  <ArrowLeft className="h-4 w-4 mr-2" />
                  Voltar
                </Button>
                <div className="flex items-center space-x-3">
                  <div className="p-2 bg-blue-100 dark:bg-blue-900/30 rounded-lg">
                    <Building2 className="h-5 w-5 text-blue-600 dark:text-blue-400" />
                  </div>
                  <div>
                    <h1 className="text-xl font-semibold text-slate-900 dark:text-slate-100">
                      Configuração da Empresa
                    </h1>
                    <p className="text-sm text-slate-500 dark:text-slate-400">
                      Gerencie as informações e configurações da sua empresa
                    </p>
                  </div>
                </div>
              </div>
              
              <Button 
                onClick={handleSave}
                disabled={isLoading}
                className={`min-w-[120px] transition-all duration-200 ${
                  isSaved 
                    ? 'bg-green-600 hover:bg-green-700 text-white' 
                    : 'bg-blue-600 hover:bg-blue-700 text-white'
                }`}
              >
                {isLoading ? (
                  <div className="flex items-center space-x-2">
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    <span>Salvando...</span>
                  </div>
                ) : isSaved ? (
                  <div className="flex items-center space-x-2">
                    <div className="w-4 h-4 bg-white rounded-full flex items-center justify-center">
                      <div className="w-2 h-1 bg-green-600 rounded-full" />
                    </div>
                    <span>Salvo!</span>
                  </div>
                ) : (
                  <div className="flex items-center space-x-2">
                    <Save className="h-4 w-4" />
                    <span>Salvar</span>
                  </div>
                )}
              </Button>
            </div>
          </div>
        </div>
        
        {/* Main Content */}
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            {/* Coluna Principal */}
            <div className="lg:col-span-2 space-y-8">
              {/* Dados Básicos */}
              <Card className="shadow-sm border-slate-200 dark:border-slate-700">
                <CardHeader className="pb-4">
                  <div className="flex items-center space-x-3">
                    <div className="p-2 bg-blue-100 dark:bg-blue-900/30 rounded-lg">
                      <Building2 className="h-5 w-5 text-blue-600 dark:text-blue-400" />
                    </div>
                    <div>
                      <CardTitle className="text-lg">Dados Básicos</CardTitle>
                      <CardDescription>
                        Informações fundamentais da empresa
                      </CardDescription>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="space-y-6">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="md:col-span-2">
                      <Label htmlFor="company-name" className="text-sm font-medium">
                        Nome da Empresa *
                      </Label>
                      <Input
                        id="company-name"
                        value={companyName}
                        onChange={(e) => setCompanyName(e.target.value)}
                        placeholder="Digite o nome da empresa"
                        className="mt-1"
                      />
                    </div>
                    
                    <div>
                      <Label htmlFor="segment" className="text-sm font-medium">
                        Segmento *
                      </Label>
                      <Select value={segment} onValueChange={setSegment}>
                        <SelectTrigger className="mt-1">
                          <SelectValue placeholder="Selecione o segmento" />
                        </SelectTrigger>
                        <SelectContent>
                          {BUSINESS_SEGMENTS.map(seg => (
                            <SelectItem key={seg} value={seg}>{seg}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    
                    <div>
                      <Label htmlFor="document" className="text-sm font-medium">
                        CNPJ/CPF *
                      </Label>
                      <Input
                        id="document"
                        value={document}
                        onChange={(e) => setDocument(e.target.value)}
                        placeholder="00.000.000/0000-00"
                        className="mt-1"
                      />
                    </div>
                  </div>
                  
                  <Separator />
                  
                  <div>
                    <h4 className="text-sm font-medium mb-4 flex items-center">
                      <span>Endereço Completo</span>
                      <Tooltip>
                        <TooltipTrigger>
                          <Info className="h-4 w-4 ml-2 text-slate-400" />
                        </TooltipTrigger>
                        <TooltipContent>
                          <p>Endereço será usado para localização e contato</p>
                        </TooltipContent>
                      </Tooltip>
                    </h4>
                    
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      <div className="md:col-span-2">
                        <Label htmlFor="street" className="text-sm font-medium">
                          Logradouro
                        </Label>
                        <Input
                          id="street"
                          value={address.street}
                          onChange={(e) => setAddress({...address, street: e.target.value})}
                          placeholder="Rua, Avenida, etc."
                          className="mt-1"
                        />
                      </div>
                      
                      <div>
                        <Label htmlFor="number" className="text-sm font-medium">
                          Número
                        </Label>
                        <Input
                          id="number"
                          value={address.number}
                          onChange={(e) => setAddress({...address, number: e.target.value})}
                          placeholder="123"
                          className="mt-1"
                        />
                      </div>
                      
                      <div>
                        <Label htmlFor="complement" className="text-sm font-medium">
                          Complemento
                        </Label>
                        <Input
                          id="complement"
                          value={address.complement}
                          onChange={(e) => setAddress({...address, complement: e.target.value})}
                          placeholder="Sala, Andar, etc."
                          className="mt-1"
                        />
                      </div>
                      
                      <div>
                        <Label htmlFor="neighborhood" className="text-sm font-medium">
                          Bairro
                        </Label>
                        <Input
                          id="neighborhood"
                          value={address.neighborhood}
                          onChange={(e) => setAddress({...address, neighborhood: e.target.value})}
                          placeholder="Nome do bairro"
                          className="mt-1"
                        />
                      </div>
                      
                      <div>
                        <Label htmlFor="city" className="text-sm font-medium">
                          Cidade
                        </Label>
                        <Input
                          id="city"
                          value={address.city}
                          onChange={(e) => setAddress({...address, city: e.target.value})}
                          placeholder="Nome da cidade"
                          className="mt-1"
                        />
                      </div>
                      
                      <div>
                        <Label htmlFor="state" className="text-sm font-medium">
                          Estado
                        </Label>
                        <Input
                          id="state"
                          value={address.state}
                          onChange={(e) => setAddress({...address, state: e.target.value})}
                          placeholder="SP"
                          className="mt-1"
                        />
                      </div>
                      
                      <div>
                        <Label htmlFor="zipCode" className="text-sm font-medium">
                          CEP
                        </Label>
                        <Input
                          id="zipCode"
                          value={address.zipCode}
                          onChange={(e) => setAddress({...address, zipCode: e.target.value})}
                          placeholder="00000-000"
                          className="mt-1"
                        />
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
              
              {/* Gestão de Contatos */}
              <Card className="shadow-sm border-slate-200 dark:border-slate-700">
                <CardHeader className="pb-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-3">
                      <div className="p-2 bg-green-100 dark:bg-green-900/30 rounded-lg">
                        <Users className="h-5 w-5 text-green-600 dark:text-green-400" />
                      </div>
                      <div>
                        <CardTitle className="text-lg">Contatos</CardTitle>
                        <CardDescription>
                          Gerencie os contatos da empresa
                        </CardDescription>
                      </div>
                    </div>
                    
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setShowAddContact(true)}
                      className="text-green-600 border-green-200 hover:bg-green-50"
                    >
                      <Plus className="h-4 w-4 mr-2" />
                      Adicionar Contato
                    </Button>
                  </div>
                </CardHeader>
                <CardContent>
                  {/* Lista de Contatos */}
                  {contacts.length > 0 && (
                    <div className="space-y-3 mb-6">
                      {contacts.map((contact) => {
                        const IconComponent = getContactIcon(contact.type);
                        return (
                          <div key={contact.id} className="flex items-center justify-between p-3 bg-slate-50 dark:bg-slate-800 rounded-lg">
                            <div className="flex items-center space-x-3">
                              <div className={`p-2 rounded-lg ${
                                contact.type === 'whatsapp' ? 'bg-green-100 dark:bg-green-900/30' :
                                contact.type === 'email' ? 'bg-blue-100 dark:bg-blue-900/30' :
                                'bg-slate-100 dark:bg-slate-700'
                              }`}>
                                <IconComponent className={`h-4 w-4 ${
                                  contact.type === 'whatsapp' ? 'text-green-600 dark:text-green-400' :
                                  contact.type === 'email' ? 'text-blue-600 dark:text-blue-400' :
                                  'text-slate-600 dark:text-slate-400'
                                }`} />
                              </div>
                              <div>
                                <p className="font-medium text-sm">{contact.label}</p>
                                <p className="text-sm text-slate-500">{contact.value}</p>
                              </div>
                            </div>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleRemoveContact(contact.id)}
                              className="text-red-500 hover:text-red-700 hover:bg-red-50"
                            >
                              <X className="h-4 w-4" />
                            </Button>
                          </div>
                        );
                      })}
                    </div>
                  )}
                  
                  {/* Formulário de Adicionar Contato */}
                  {showAddContact && (
                    <div className="p-4 border border-slate-200 dark:border-slate-700 rounded-lg bg-slate-50 dark:bg-slate-800/50">
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <div>
                          <Label className="text-sm font-medium">Tipo</Label>
                          <Select 
                            value={newContact.type} 
                            onValueChange={(value: any) => setNewContact({...newContact, type: value})}
                          >
                            <SelectTrigger className="mt-1">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="phone">Telefone</SelectItem>
                              <SelectItem value="email">E-mail</SelectItem>
                              <SelectItem value="whatsapp">WhatsApp</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                        
                        <div>
                          <Label className="text-sm font-medium">Valor</Label>
                          <Input
                            value={newContact.value}
                            onChange={(e) => setNewContact({...newContact, value: e.target.value})}
                            placeholder={newContact.type === 'email' ? 'email@empresa.com' : '(11) 99999-9999'}
                            className="mt-1"
                          />
                        </div>
                        
                        <div>
                          <Label className="text-sm font-medium">Rótulo</Label>
                          <Input
                            value={newContact.label}
                            onChange={(e) => setNewContact({...newContact, label: e.target.value})}
                            placeholder="Ex: Comercial, Suporte"
                            className="mt-1"
                          />
                        </div>
                      </div>
                      
                      <div className="flex justify-end space-x-2 mt-4">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => setShowAddContact(false)}
                        >
                          Cancelar
                        </Button>
                        <Button
                          size="sm"
                          onClick={handleAddContact}
                          disabled={!newContact.value || !newContact.label}
                        >
                          Adicionar
                        </Button>
                      </div>
                    </div>
                  )}
                  
                  {contacts.length === 0 && !showAddContact && (
                    <div className="text-center py-8 text-slate-500">
                      <Users className="h-12 w-12 mx-auto mb-4 text-slate-300" />
                      <p>Nenhum contato adicionado ainda</p>
                      <p className="text-sm">Clique em "Adicionar Contato" para começar</p>
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>
            
            {/* Coluna Lateral */}
            <div className="space-y-8">
              {/* Redes Sociais */}
              <Card className="shadow-sm border-slate-200 dark:border-slate-700">
                <CardHeader className="pb-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-3">
                      <div className="p-2 bg-purple-100 dark:bg-purple-900/30 rounded-lg">
                        <Globe className="h-5 w-5 text-purple-600 dark:text-purple-400" />
                      </div>
                      <div>
                        <CardTitle className="text-lg">Redes Sociais</CardTitle>
                        <CardDescription>
                          Perfis da empresa
                        </CardDescription>
                      </div>
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  {/* Lista de Redes Sociais */}
                  {socialMedia.length > 0 && (
                    <div className="space-y-3 mb-4">
                      {socialMedia.map((social) => {
                        const platform = SOCIAL_PLATFORMS.find(p => p.key === social.platform);
                        const IconComponent = platform?.icon || Globe;
                        
                        return (
                          <div key={social.id} className="flex items-center justify-between p-3 bg-slate-50 dark:bg-slate-800 rounded-lg">
                            <div className="flex items-center space-x-3">
                              <div className={`p-2 rounded-lg ${platform?.color || 'bg-slate-100'}`}>
                                <IconComponent className="h-4 w-4 text-white" />
                              </div>
                              <div>
                                <p className="font-medium text-sm">{platform?.label}</p>
                                <p className="text-sm text-slate-500">@{social.username}</p>
                              </div>
                            </div>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleRemoveSocial(social.id)}
                              className="text-red-500 hover:text-red-700 hover:bg-red-50"
                            >
                              <X className="h-4 w-4" />
                            </Button>
                          </div>
                        );
                      })}
                    </div>
                  )}
                  
                  {/* Botão Adicionar */}
                  {!showAddSocial && (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setShowAddSocial(true)}
                      className="w-full text-purple-600 border-purple-200 hover:bg-purple-50"
                    >
                      <Plus className="h-4 w-4 mr-2" />
                      Adicionar Rede Social
                    </Button>
                  )}
                  
                  {/* Formulário de Adicionar */}
                  {showAddSocial && (
                    <div className="space-y-4 p-4 border border-slate-200 dark:border-slate-700 rounded-lg bg-slate-50 dark:bg-slate-800/50">
                      <div>
                        <Label className="text-sm font-medium">Plataforma</Label>
                        <Select 
                          value={newSocial.platform} 
                          onValueChange={(value: any) => setNewSocial({...newSocial, platform: value})}
                        >
                          <SelectTrigger className="mt-1">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {SOCIAL_PLATFORMS.map(platform => {
                              const IconComponent = platform.icon;
                              return (
                                <SelectItem key={platform.key} value={platform.key}>
                                  <div className="flex items-center space-x-2">
                                    <IconComponent className="h-4 w-4" />
                                    <span>{platform.label}</span>
                                  </div>
                                </SelectItem>
                              );
                            })}
                          </SelectContent>
                        </Select>
                      </div>
                      
                      <div>
                        <Label className="text-sm font-medium">Username</Label>
                        <Input
                          value={newSocial.username}
                          onChange={(e) => setNewSocial({...newSocial, username: e.target.value})}
                          placeholder="@username"
                          className="mt-1"
                        />
                      </div>
                      
                      <div className="flex justify-end space-x-2">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => setShowAddSocial(false)}
                        >
                          Cancelar
                        </Button>
                        <Button
                          size="sm"
                          onClick={handleAddSocial}
                          disabled={!newSocial.username}
                        >
                          Adicionar
                        </Button>
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>
              
              {/* Configurações Adicionais */}
              <Card className="shadow-sm border-slate-200 dark:border-slate-700">
                <CardHeader className="pb-4">
                  <div className="flex items-center space-x-3">
                    <div className="p-2 bg-orange-100 dark:bg-orange-900/30 rounded-lg">
                      <FileText className="h-5 w-5 text-orange-600 dark:text-orange-400" />
                    </div>
                    <div>
                      <CardTitle className="text-lg">Configurações</CardTitle>
                      <CardDescription>
                        Configurações adicionais
                      </CardDescription>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="space-y-6">
                  {/* Descrição da Empresa */}
                  <div>
                    <Label htmlFor="description" className="text-sm font-medium flex items-center">
                      Descrição da Empresa
                      <Tooltip>
                        <TooltipTrigger>
                          <Info className="h-4 w-4 ml-2 text-slate-400" />
                        </TooltipTrigger>
                        <TooltipContent>
                          <p>Descrição será exibida em perfis públicos</p>
                        </TooltipContent>
                      </Tooltip>
                    </Label>
                    <Textarea
                      id="description"
                      value={description}
                      onChange={(e) => setDescription(e.target.value)}
                      placeholder="Descreva sua empresa, produtos e serviços..."
                      className="mt-1 min-h-[100px] resize-y"
                      maxLength={500}
                    />
                    <div className="flex justify-between items-center mt-2">
                      <span className="text-xs text-slate-500">
                        {description.length}/500 caracteres
                      </span>
                      {description.length > 450 && (
                        <span className="text-xs text-orange-500">
                          Limite quase atingido
                        </span>
                      )}
                    </div>
                  </div>
                  
                  <Separator />
                  
                  {/* Atendimento Fora do Horário */}
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-3">
                      <Label htmlFor="after-hours" className="text-sm font-medium">
                        Atendimento 24h
                      </Label>
                      <Tooltip>
                        <TooltipTrigger>
                          <Info className="h-4 w-4 text-slate-400" />
                        </TooltipTrigger>
                        <TooltipContent>
                          <p>Permite atendimento fora dos horários configurados</p>
                        </TooltipContent>
                      </Tooltip>
                    </div>
                    <Switch
                      id="after-hours"
                      checked={afterHoursService}
                      onCheckedChange={setAfterHoursService}
                    />
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
          
          {/* Horários de Atendimento - Full Width */}
          <Card className="shadow-sm border-slate-200 dark:border-slate-700 mt-8">
            <CardHeader className="pb-4">
              <div className="flex items-center space-x-3">
                <div className="p-2 bg-indigo-100 dark:bg-indigo-900/30 rounded-lg">
                  <Clock className="h-5 w-5 text-indigo-600 dark:text-indigo-400" />
                </div>
                <div>
                  <CardTitle className="text-lg">Horários de Atendimento</CardTitle>
                  <CardDescription>
                    Configure os horários de funcionamento da empresa
                  </CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {DAYS_OF_WEEK.map((day) => {
                  const dayHours = workingHours[day.key];
                  
                  return (
                    <div key={day.key} className="flex items-center justify-between p-4 bg-slate-50 dark:bg-slate-800 rounded-lg">
                      <div className="flex items-center space-x-4">
                        <div className="w-32">
                          <Label className="text-sm font-medium">{day.label}</Label>
                        </div>
                        
                        <Switch
                          checked={dayHours.enabled}
                          onCheckedChange={(checked) => handleWorkingHoursChange(day.key, 'enabled', checked)}
                        />
                      </div>
                      
                      {dayHours.enabled && (
                        <div className="flex items-center space-x-4">
                          <div className="flex items-center space-x-2">
                            <Label className="text-sm">De:</Label>
                            <Input
                              type="time"
                              value={dayHours.start}
                              onChange={(e) => handleWorkingHoursChange(day.key, 'start', e.target.value)}
                              className="w-32"
                            />
                          </div>
                          
                          <div className="flex items-center space-x-2">
                            <Label className="text-sm">Até:</Label>
                            <Input
                              type="time"
                              value={dayHours.end}
                              onChange={(e) => handleWorkingHoursChange(day.key, 'end', e.target.value)}
                              className="w-32"
                            />
                          </div>
                          
                          <Tooltip>
                            <TooltipTrigger>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => copyHoursToAllDays(day.key)}
                                className="text-indigo-600 hover:text-indigo-700 hover:bg-indigo-50"
                              >
                                Copiar para todos
                              </Button>
                            </TooltipTrigger>
                            <TooltipContent>
                              <p>Aplicar este horário para todos os dias</p>
                            </TooltipContent>
                          </Tooltip>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </TooltipProvider>
  );
}