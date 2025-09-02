// Serviço de cache para o lado do cliente que usa API routes
class ClientCacheService {
  private static instance: ClientCacheService;
  
  static getInstance(): ClientCacheService {
    if (!ClientCacheService.instance) {
      ClientCacheService.instance = new ClientCacheService();
    }
    return ClientCacheService.instance;
  }

  async get<T>(key: string): Promise<T | null> {
    try {
      const response = await fetch(`/api/cache?key=${encodeURIComponent(key)}`);
      if (!response.ok) {
        return null;
      }
      const data = await response.json();
      return data.value;
    } catch (error) {
      console.error('Error getting cache:', error);
      return null;
    }
  }

  async set(key: string, value: any, ttlSeconds?: number): Promise<boolean> {
    try {
      const response = await fetch('/api/cache', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ key, value, ttl: ttlSeconds }),
      });
      
      if (!response.ok) {
        return false;
      }
      
      const data = await response.json();
      return data.success;
    } catch (error) {
      console.error('Error setting cache:', error);
      return false;
    }
  }

  async delete(key: string): Promise<boolean> {
    try {
      const response = await fetch(`/api/cache?key=${encodeURIComponent(key)}`, {
        method: 'DELETE',
      });
      
      if (!response.ok) {
        return false;
      }
      
      const data = await response.json();
      return data.success;
    } catch (error) {
      console.error('Error deleting cache:', error);
      return false;
    }
  }

  async exists(key: string): Promise<boolean> {
    const value = await this.get(key);
    return value !== null;
  }

  async invalidatePattern(pattern: string): Promise<number> {
    // Para simplicidade, não implementamos invalidação por padrão no lado do cliente
    // Isso seria feito através de uma API route específica se necessário
    console.warn('Pattern invalidation not implemented in client cache service');
    return 0;
  }
}

export const clientCacheService = ClientCacheService.getInstance();