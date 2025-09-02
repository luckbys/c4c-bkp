import { 
  collection, 
  addDoc, 
  query, 
  where, 
  getDocs, 
  getDoc,
  updateDoc, 
  doc, 
  onSnapshot, 
  orderBy, 
  limit as firestoreLimit,
  serverTimestamp,
  type DocumentData,
  type Query,
  type QuerySnapshot,
  type DocumentReference,
  type DocumentSnapshot,
  type Unsubscribe
} from 'firebase/firestore';
import { db } from '../lib/firebase';

// Tipos de erro que podem ser recuperáveis
type RetryableError = 
  | 'unavailable' 
  | 'deadline-exceeded' 
  | 'resource-exhausted'
  | 'aborted'
  | 'cancelled'
  | 'network-error'
  | 'blocked-by-client';

interface RetryConfig {
  maxRetries: number;
  baseDelay: number;
  maxDelay: number;
  backoffMultiplier: number;
}

const DEFAULT_RETRY_CONFIG: RetryConfig = {
  maxRetries: 3,
  baseDelay: 1000, // 1 segundo
  maxDelay: 10000, // 10 segundos
  backoffMultiplier: 2
};

class FirestoreRetryService {
  private config: RetryConfig;
  private isOnline: boolean = true;
  private retryQueue: Array<() => Promise<any>> = [];

  constructor(config: Partial<RetryConfig> = {}) {
    this.config = { ...DEFAULT_RETRY_CONFIG, ...config };
    this.setupNetworkMonitoring();
  }

  private setupNetworkMonitoring() {
    if (typeof window !== 'undefined') {
      window.addEventListener('online', () => {
        console.log('🌐 [FIRESTORE-RETRY] Network back online, processing retry queue');
        this.isOnline = true;
        this.processRetryQueue();
      });

      window.addEventListener('offline', () => {
        console.log('🌐 [FIRESTORE-RETRY] Network offline detected');
        this.isOnline = false;
      });

      this.isOnline = navigator.onLine;
    }
  }

  private async processRetryQueue() {
    while (this.retryQueue.length > 0 && this.isOnline) {
      const operation = this.retryQueue.shift();
      if (operation) {
        try {
          await operation();
        } catch (error) {
          console.error('🔄 [FIRESTORE-RETRY] Failed to process queued operation:', error);
        }
      }
    }
  }

  private isRetryableError(error: any): boolean {
    if (!error) return false;

    const errorCode = error.code || error.name || '';
    const errorMessage = error.message || '';

    // Erros específicos do Firestore
    const retryableCodes: RetryableError[] = [
      'unavailable',
      'deadline-exceeded', 
      'resource-exhausted',
      'aborted',
      'cancelled'
    ];

    if (retryableCodes.includes(errorCode)) {
      return true;
    }

    // Erros de rede
    if (errorMessage.includes('net::ERR_BLOCKED_BY_CLIENT') ||
        errorMessage.includes('net::ERR_NETWORK_CHANGED') ||
        errorMessage.includes('net::ERR_INTERNET_DISCONNECTED') ||
        errorMessage.includes('Failed to fetch') ||
        errorCode === 'network-error') {
      return true;
    }

    return false;
  }

  private calculateDelay(attempt: number): number {
    const delay = this.config.baseDelay * Math.pow(this.config.backoffMultiplier, attempt);
    return Math.min(delay, this.config.maxDelay);
  }

  private async sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  async withRetry<T>(
    operation: () => Promise<T>,
    operationName: string = 'Firestore operation'
  ): Promise<T> {
    let lastError: any;

    for (let attempt = 0; attempt <= this.config.maxRetries; attempt++) {
      try {
        // Se não estamos online, adicionar à fila
        if (!this.isOnline && attempt === 0) {
          console.log(`🔄 [FIRESTORE-RETRY] ${operationName} queued (offline)`);
          return new Promise((resolve, reject) => {
            this.retryQueue.push(async () => {
              try {
                const result = await operation();
                resolve(result);
              } catch (error) {
                reject(error);
              }
            });
          });
        }

        const result = await operation();
        
        if (attempt > 0) {
          console.log(`✅ [FIRESTORE-RETRY] ${operationName} succeeded after ${attempt} retries`);
        }
        
        return result;
      } catch (error: any) {
        lastError = error;
        
        console.error(`❌ [FIRESTORE-RETRY] ${operationName} failed (attempt ${attempt + 1}):`, {
          code: error.code,
          message: error.message,
          name: error.name
        });

        // Se não é um erro recuperável ou já tentamos todas as vezes
        if (!this.isRetryableError(error) || attempt === this.config.maxRetries) {
          break;
        }

        // Aguardar antes da próxima tentativa
        const delay = this.calculateDelay(attempt);
        console.log(`⏳ [FIRESTORE-RETRY] Waiting ${delay}ms before retry ${attempt + 2}`);
        await this.sleep(delay);
      }
    }

    // Se chegou aqui, todas as tentativas falharam
    console.error(`🚫 [FIRESTORE-RETRY] ${operationName} failed after ${this.config.maxRetries + 1} attempts`);
    throw lastError;
  }

  // Wrapper para addDoc com retry
  async addDocument(
    collectionName: string, 
    data: DocumentData
  ): Promise<string> {
    return this.withRetry(async () => {
      const docRef = await addDoc(collection(db, collectionName), data);
      return docRef.id;
    }, `addDocument(${collectionName})`);
  }

  // Wrapper para getDoc com retry (documento único)
  async getDocument(
    docRef: DocumentReference<DocumentData>
  ): Promise<DocumentSnapshot<DocumentData>> {
    return this.withRetry(async () => {
      return await getDoc(docRef);
    }, 'getDocument');
  }

  // Wrapper para getDocs com retry
  async getDocuments(
    q: Query<DocumentData>
  ): Promise<QuerySnapshot<DocumentData>> {
    return this.withRetry(async () => {
      return await getDocs(q);
    }, 'getDocuments');
  }

  // Wrapper para updateDoc com retry
  async updateDocument(
    collectionName: string,
    docId: string,
    data: Partial<DocumentData>
  ): Promise<void> {
    return this.withRetry(async () => {
      const docRef = doc(db, collectionName, docId);
      await updateDoc(docRef, data);
    }, `updateDocument(${collectionName}/${docId})`);
  }

  // Wrapper para onSnapshot com tratamento de erro
  subscribeToCollection(
    q: Query<DocumentData>,
    callback: (snapshot: QuerySnapshot<DocumentData>) => void,
    errorCallback?: (error: Error) => void
  ): Unsubscribe {
    let retryCount = 0;
    let unsubscribe: Unsubscribe | null = null;

    const setupSubscription = () => {
      try {
        unsubscribe = onSnapshot(
          q,
          (snapshot) => {
            retryCount = 0; // Reset retry count on success
            callback(snapshot);
          },
          (error) => {
            console.error('🔄 [FIRESTORE-RETRY] Subscription error:', error);
            
            if (this.isRetryableError(error) && retryCount < this.config.maxRetries) {
              retryCount++;
              const delay = this.calculateDelay(retryCount - 1);
              
              console.log(`⏳ [FIRESTORE-RETRY] Retrying subscription in ${delay}ms (attempt ${retryCount})`);
              
              setTimeout(() => {
                if (unsubscribe) {
                  unsubscribe();
                }
                setupSubscription();
              }, delay);
            } else {
              if (errorCallback) {
                errorCallback(error);
              }
            }
          }
        );
      } catch (error: any) {
        console.error('🚫 [FIRESTORE-RETRY] Failed to setup subscription:', error);
        if (errorCallback) {
          errorCallback(error);
        }
      }
    };

    setupSubscription();

    // Retornar função de cleanup
    return () => {
      if (unsubscribe) {
        unsubscribe();
      }
    };
  }

  // Método para verificar conectividade
  async checkConnectivity(): Promise<boolean> {
    try {
      // Tentar uma operação simples para verificar conectividade
      const testQuery = query(
        collection(db, 'connectivity-test'),
        firestoreLimit(1)
      );
      
      await this.withRetry(async () => {
        await getDocs(testQuery);
      }, 'connectivity-check');
      
      return true;
    } catch (error) {
      console.error('🌐 [FIRESTORE-RETRY] Connectivity check failed:', error);
      return false;
    }
  }

  // Método para limpar a fila de retry
  clearRetryQueue(): void {
    this.retryQueue = [];
    console.log('🧹 [FIRESTORE-RETRY] Retry queue cleared');
  }

  // Getter para status da fila
  get queueSize(): number {
    return this.retryQueue.length;
  }

  // Getter para status online
  get isNetworkOnline(): boolean {
    return this.isOnline;
  }
}

// Instância singleton
export const firestoreRetry = new FirestoreRetryService();
export { FirestoreRetryService, type RetryConfig };