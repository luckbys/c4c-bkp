'use client';

import React, { useState, useEffect } from 'react';
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Filter,
  X,
  Calendar,
  Users,
  FolderOpen,
  Tag,
  AlertCircle,
  Clock,
  Search,
  RotateCcw
} from 'lucide-react';
import { EventFilter } from '@/services/agenda-service';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

interface EventFiltersProps {
  filters: EventFilter;
  onFiltersChange: (filters: EventFilter) => void;
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
}

const CATEGORIES = [
  { 
    value: 'meeting', 
    label: 'Reunião', 
    color: 'bg-gradient-to-r from-blue-500 to-blue-600',
    icon: '👥',
    description: 'Reuniões e encontros'
  },
  { 
    value: 'call', 
    label: 'Ligação', 
    color: 'bg-gradient-to-r from-green-500 to-green-600',
    icon: '📞',
    description: 'Chamadas e conferências'
  },
  { 
    value: 'task', 
    label: 'Tarefa', 
    color: 'bg-gradient-to-r from-orange-500 to-orange-600',
    icon: '✅',
    description: 'Tarefas e atividades'
  },
  { 
    value: 'other', 
    label: 'Outro', 
    color: 'bg-gradient-to-r from-slate-500 to-slate-600',
    icon: '📋',
    description: 'Outros eventos'
  }
];

const PRIORITIES = [
  { 
    value: 'low', 
    label: 'Baixa', 
    color: 'text-green-600 bg-green-50 border-green-200',
    icon: '🟢'
  },
  { 
    value: 'medium', 
    label: 'Média', 
    color: 'text-yellow-600 bg-yellow-50 border-yellow-200',
    icon: '🟡'
  },
  { 
    value: 'high', 
    label: 'Alta', 
    color: 'text-red-600 bg-red-50 border-red-200',
    icon: '🔴'
  }
];

const STATUS_OPTIONS = [
  { 
    value: 'scheduled', 
    label: 'Agendado', 
    color: 'text-blue-600 bg-blue-50 border-blue-200',
    icon: '📅'
  },
  { 
    value: 'in-progress', 
    label: 'Em Andamento', 
    color: 'text-orange-600 bg-orange-50 border-orange-200',
    icon: '⏳'
  },
  { 
    value: 'completed', 
    label: 'Concluído', 
    color: 'text-green-600 bg-green-50 border-green-200',
    icon: '✅'
  },
  { 
    value: 'cancelled', 
    label: 'Cancelado', 
    color: 'text-red-600 bg-red-50 border-red-200',
    icon: '❌'
  }
];

// Mock data - In real app, these would come from your CRM data
const MOCK_CONTACTS = [
  { id: '1', name: 'João Silva', email: 'joao@empresa.com' },
  { id: '2', name: 'Maria Santos', email: 'maria@cliente.com' },
  { id: '3', name: 'Pedro Costa', email: 'pedro@fornecedor.com' },
  { id: '4', name: 'Ana Oliveira', email: 'ana@parceiro.com' }
];

const MOCK_PROJECTS = [
  { id: '1', name: 'Projeto Alpha', status: 'active' },
  { id: '2', name: 'Projeto Beta', status: 'active' },
  { id: '3', name: 'Projeto Gamma', status: 'completed' },
  { id: '4', name: 'Projeto Delta', status: 'planning' }
];

export function EventFilters({ filters, onFiltersChange, isOpen, onOpenChange }: EventFiltersProps) {
  const [localFilters, setLocalFilters] = useState<EventFilter>(filters);
  const [contactSearch, setContactSearch] = useState('');
  const [projectSearch, setProjectSearch] = useState('');

  useEffect(() => {
    setLocalFilters(filters);
  }, [filters]);

  const handleFilterChange = (key: keyof EventFilter, value: any) => {
    const newFilters = { ...localFilters, [key]: value };
    setLocalFilters(newFilters);
  };

  const handleArrayFilterToggle = (key: keyof EventFilter, value: string) => {
    const currentArray = (localFilters[key] as string[] | undefined) || [];
    const newArray = currentArray.includes(value)
      ? currentArray.filter(item => item !== value)
      : [...currentArray, value];
    
    handleFilterChange(key, newArray);
  };

  const applyFilters = () => {
    onFiltersChange(localFilters);
    onOpenChange(false);
  };

  const resetFilters = () => {
    const emptyFilters: EventFilter = {
      categories: [],
      priorities: [],
      statuses: [],
      contactIds: [],
      projectIds: [],
      startDate: undefined,
      endDate: undefined,
      searchTerm: ''
    };
    setLocalFilters(emptyFilters);
    onFiltersChange(emptyFilters);
  };

  const getActiveFiltersCount = () => {
    let count = 0;
    if (localFilters.categories?.length) count++;
    if (localFilters.priorities?.length) count++;
    if (localFilters.statuses?.length) count++;
    if (localFilters.contactIds?.length) count++;
    if (localFilters.projectIds?.length) count++;
    if (localFilters.startDate) count++;
    if (localFilters.endDate) count++;
    if (localFilters.searchTerm) count++;
    return count;
  };

  const filteredContacts = MOCK_CONTACTS.filter(contact =>
    contact.name.toLowerCase().includes(contactSearch.toLowerCase()) ||
    contact.email.toLowerCase().includes(contactSearch.toLowerCase())
  );

  const filteredProjects = MOCK_PROJECTS.filter(project =>
    project.name.toLowerCase().includes(projectSearch.toLowerCase())
  );

  return (
    <Sheet open={isOpen} onOpenChange={onOpenChange}>
      <SheetTrigger asChild>
        <Button variant="outline" className="relative">
          <Filter className="h-4 w-4 mr-2" />
          Filtros
          {getActiveFiltersCount() > 0 && (
            <Badge className="ml-2 h-5 w-5 p-0 flex items-center justify-center text-xs">
              {getActiveFiltersCount()}
            </Badge>
          )}
        </Button>
      </SheetTrigger>
      <SheetContent className="w-[400px] sm:w-[540px] overflow-y-auto">
        <SheetHeader>
          <SheetTitle className="flex items-center space-x-2">
            <Filter className="h-5 w-5" />
            <span>Filtros da Agenda</span>
          </SheetTitle>
          <SheetDescription>
            Configure os filtros para personalizar a visualização dos eventos
          </SheetDescription>
        </SheetHeader>

        <div className="space-y-6 mt-6">
          {/* Search */}
          <Card className="bg-gradient-to-br from-blue-50 to-indigo-50/50 dark:from-blue-950/30 dark:to-indigo-950/20 border-blue-200/50 dark:border-blue-800/30 shadow-lg hover:shadow-xl transition-all duration-300">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm flex items-center space-x-2 text-blue-700 dark:text-blue-300">
                <Search className="h-4 w-4" />
                <span>Busca por Texto</span>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <Input
                placeholder="Buscar por título, descrição ou local..."
                value={localFilters.searchTerm || ''}
                onChange={(e) => handleFilterChange('searchTerm', e.target.value)}
                className="border-blue-200 dark:border-blue-800 focus:border-blue-500 dark:focus:border-blue-400"
              />
            </CardContent>
          </Card>

          {/* Date Range */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm flex items-center space-x-2">
                <Calendar className="h-4 w-4" />
                <span>Período</span>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div>
                <Label htmlFor="startDate">Data Inicial</Label>
                <Input
                  id="startDate"
                  type="date"
                  value={localFilters.startDate ? format(localFilters.startDate, 'yyyy-MM-dd') : ''}
                  onChange={(e) => handleFilterChange('startDate', e.target.value ? new Date(e.target.value) : undefined)}
                />
              </div>
              <div>
                <Label htmlFor="endDate">Data Final</Label>
                <Input
                  id="endDate"
                  type="date"
                  value={localFilters.endDate ? format(localFilters.endDate, 'yyyy-MM-dd') : ''}
                  onChange={(e) => handleFilterChange('endDate', e.target.value ? new Date(e.target.value) : undefined)}
                />
              </div>
            </CardContent>
          </Card>

          {/* Categories */}
          <Card className="bg-gradient-to-br from-purple-50 to-pink-50/50 dark:from-purple-950/30 dark:to-pink-950/20 border-purple-200/50 dark:border-purple-800/30 shadow-lg hover:shadow-xl transition-all duration-300">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm flex items-center space-x-2 text-purple-700 dark:text-purple-300">
                <Tag className="h-4 w-4" />
                <span>Categorias</span>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {CATEGORIES.map(category => (
                  <div key={category.value} className="flex items-center space-x-3 p-2 rounded-lg hover:bg-white/50 dark:hover:bg-slate-800/50 transition-colors duration-200">
                    <Checkbox
                      id={`category-${category.value}`}
                      checked={(localFilters.categories || []).includes(category.value)}
                      onCheckedChange={() => handleArrayFilterToggle('categories', category.value)}
                    />
                    <Label htmlFor={`category-${category.value}`} className="flex items-center space-x-3 cursor-pointer flex-1">
                      <span className="text-lg">{category.icon}</span>
                      <div className={`w-3 h-3 rounded-full ${category.color}`} />
                      <div>
                        <div className="font-medium">{category.label}</div>
                        <div className="text-xs text-slate-500">{category.description}</div>
                      </div>
                    </Label>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Priorities */}
          <Card className="bg-gradient-to-br from-amber-50 to-orange-50/50 dark:from-amber-950/30 dark:to-orange-950/20 border-amber-200/50 dark:border-amber-800/30 shadow-lg hover:shadow-xl transition-all duration-300">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm flex items-center space-x-2 text-amber-700 dark:text-amber-300">
                <AlertCircle className="h-4 w-4" />
                <span>Prioridades</span>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {PRIORITIES.map(priority => (
                  <div key={priority.value} className="flex items-center space-x-3 p-2 rounded-lg hover:bg-white/50 dark:hover:bg-slate-800/50 transition-colors duration-200">
                    <Checkbox
                      id={`priority-${priority.value}`}
                      checked={(localFilters.priorities || []).includes(priority.value)}
                      onCheckedChange={() => handleArrayFilterToggle('priorities', priority.value)}
                    />
                    <Label htmlFor={`priority-${priority.value}`} className="cursor-pointer flex items-center space-x-3 flex-1">
                      <span className="text-lg">{priority.icon}</span>
                      <Badge className={`${priority.color} border font-medium`}>
                        {priority.label}
                      </Badge>
                    </Label>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Status */}
          <Card className="bg-gradient-to-br from-emerald-50 to-teal-50/50 dark:from-emerald-950/30 dark:to-teal-950/20 border-emerald-200/50 dark:border-emerald-800/30 shadow-lg hover:shadow-xl transition-all duration-300">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm flex items-center space-x-2 text-emerald-700 dark:text-emerald-300">
                <Clock className="h-4 w-4" />
                <span>Status</span>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {STATUS_OPTIONS.map(status => (
                  <div key={status.value} className="flex items-center space-x-3 p-2 rounded-lg hover:bg-white/50 dark:hover:bg-slate-800/50 transition-colors duration-200">
                    <Checkbox
                      id={`status-${status.value}`}
                      checked={(localFilters.statuses || []).includes(status.value)}
                      onCheckedChange={() => handleArrayFilterToggle('statuses', status.value)}
                    />
                    <Label htmlFor={`status-${status.value}`} className="cursor-pointer flex items-center space-x-3 flex-1">
                      <span className="text-lg">{status.icon}</span>
                      <Badge className={`${status.color} border font-medium`}>
                        {status.label}
                      </Badge>
                    </Label>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Contacts */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm flex items-center space-x-2">
                <Users className="h-4 w-4" />
                <span>Contatos</span>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <Input
                placeholder="Buscar contatos..."
                value={contactSearch}
                onChange={(e) => setContactSearch(e.target.value)}
              />
              <div className="max-h-32 overflow-y-auto space-y-2">
                {filteredContacts.map(contact => (
                  <div key={contact.id} className="flex items-center space-x-2">
                    <Checkbox
                      id={`contact-${contact.id}`}
                      checked={(localFilters.contactIds || []).includes(contact.id)}
                      onCheckedChange={() => handleArrayFilterToggle('contactIds', contact.id)}
                    />
                    <Label htmlFor={`contact-${contact.id}`} className="cursor-pointer text-sm">
                      <div>
                        <div className="font-medium">{contact.name}</div>
                        <div className="text-xs text-slate-500">{contact.email}</div>
                      </div>
                    </Label>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Projects */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm flex items-center space-x-2">
                <FolderOpen className="h-4 w-4" />
                <span>Projetos</span>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <Input
                placeholder="Buscar projetos..."
                value={projectSearch}
                onChange={(e) => setProjectSearch(e.target.value)}
              />
              <div className="max-h-32 overflow-y-auto space-y-2">
                {filteredProjects.map(project => (
                  <div key={project.id} className="flex items-center space-x-2">
                    <Checkbox
                      id={`project-${project.id}`}
                      checked={(localFilters.projectIds || []).includes(project.id)}
                      onCheckedChange={() => handleArrayFilterToggle('projectIds', project.id)}
                    />
                    <Label htmlFor={`project-${project.id}`} className="cursor-pointer text-sm">
                      <div>
                        <div className="font-medium">{project.name}</div>
                        <div className="text-xs text-slate-500 capitalize">{project.status}</div>
                      </div>
                    </Label>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          <Separator />

          {/* Action Buttons */}
          <div className="flex space-x-3">
            <Button 
              onClick={resetFilters} 
              variant="outline" 
              className="flex-1 h-12 bg-gradient-to-r from-slate-50 to-gray-50 hover:from-slate-100 hover:to-gray-100 border-slate-300 text-slate-700 shadow-lg hover:shadow-xl transition-all duration-300 hover:scale-105 hover:-translate-y-1 active:scale-95 group"
            >
              <RotateCcw className="h-5 w-5 mr-2 transition-transform duration-200 group-hover:rotate-180" />
              Limpar
            </Button>
            <Button 
              onClick={applyFilters} 
              className="flex-1 h-12 bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white shadow-lg hover:shadow-xl transition-all duration-300 hover:scale-105 hover:-translate-y-1 active:scale-95 font-medium"
            >
              Aplicar Filtros
            </Button>
          </div>

          {/* Active Filters Summary */}
          {getActiveFiltersCount() > 0 && (
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm">Filtros Ativos</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex flex-wrap gap-2">
                  {(localFilters.categories || []).map(cat => {
                    const category = CATEGORIES.find(c => c.value === cat);
                    return category ? (
                      <Badge key={cat} variant="secondary" className="flex items-center space-x-1">
                        <div className={`w-2 h-2 rounded-full ${category.color}`} />
                        <span>{category.label}</span>
                        <button
                          onClick={() => handleArrayFilterToggle('categories', cat)}
                          className="ml-1 hover:text-red-500"
                        >
                          <X className="h-3 w-3" />
                        </button>
                      </Badge>
                    ) : null;
                  })}
                  {(localFilters.priorities || []).map(priority => {
                    const priorityObj = PRIORITIES.find(p => p.value === priority);
                    return priorityObj ? (
                      <Badge key={priority} variant="secondary" className="flex items-center space-x-1">
                        <span>{priorityObj.label}</span>
                        <button
                          onClick={() => handleArrayFilterToggle('priorities', priority)}
                          className="ml-1 hover:text-red-500"
                        >
                          <X className="h-3 w-3" />
                        </button>
                      </Badge>
                    ) : null;
                  })}
                  {(localFilters.statuses || []).map(status => {
                    const statusObj = STATUS_OPTIONS.find(s => s.value === status);
                    return statusObj ? (
                      <Badge key={status} variant="secondary" className="flex items-center space-x-1">
                        <span>{statusObj.label}</span>
                        <button
                          onClick={() => handleArrayFilterToggle('statuses', status)}
                          className="ml-1 hover:text-red-500"
                        >
                          <X className="h-3 w-3" />
                        </button>
                      </Badge>
                    ) : null;
                  })}
                  {localFilters.searchTerm && (
                    <Badge variant="secondary" className="flex items-center space-x-1">
                      <span>Busca: {localFilters.searchTerm}</span>
                      <button
                        onClick={() => handleFilterChange('searchTerm', '')}
                        className="ml-1 hover:text-red-500"
                      >
                        <X className="h-3 w-3" />
                      </button>
                    </Badge>
                  )}
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      </SheetContent>
    </Sheet>
  );
}