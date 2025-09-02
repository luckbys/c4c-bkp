
'use server';

import axios from 'axios';
import type { CreateInstanceData } from '@/components/crm/types';


export async function createInstanceAction(data: CreateInstanceData) {
  const { instanceName } = data;
  const evolutionApiUrl = process.env.EVOLUTION_API_URL;
  const apiKey = process.env.EVOLUTION_API_KEY;

  if (!evolutionApiUrl || !apiKey) {
    return { success: false, error: 'A URL ou a Chave da API Evolution não estão configuradas no ambiente.' };
  }

  try {
    // First, create the instance
    const createResponse = await axios.post(
      `${evolutionApiUrl}/instance/create`,
      {
        instanceName: instanceName,
        integration: "WHATSAPP-BAILEYS"
      },
      {
        headers: {
          'Content-Type': 'application/json',
          'apikey': apiKey,
        },
      }
    );

    // If creation is successful (or instance already exists), connect to get the QR code
    if (createResponse.status === 201 || createResponse.status === 200) {
      // Small delay to allow the instance to be ready for connection
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      const connectResponse = await axios.get(`${evolutionApiUrl}/instance/connect/${instanceName}`, {
        headers: { 'apikey': apiKey },
      });
      
      // Debug: Log the actual API response structure
      console.log('Evolution API Connect Response:', JSON.stringify(connectResponse.data, null, 2));
      
      // The connect response itself contains the data we need (like the QR code)
      return { success: true, data: connectResponse.data };

    } else {
       const errorMessage = createResponse.data?.message || 'Erro desconhecido ao criar instância';
       // Handle cases where the instance might already exist and return a specific message
        if (createResponse.data?.error?.message?.includes('already exists')) {
            return { success: false, error: `Instância "${instanceName}" já existe.` };
        }
      return { success: false, error: `Erro ao criar instância: ${errorMessage}` };
    }
  } catch (error: any) {
    console.error('Error creating instance:', error.response?.data || error.message);
    const apiError = error.response?.data;
    let errorMessage = 'Falha ao se comunicar com a API Evolution.';
    if(apiError) {
        if(typeof apiError === 'string') {
            errorMessage = apiError;
        } else if (apiError.message) {
            errorMessage = apiError.message;
        } else if (apiError.error?.message?.includes('already exists')) {
            errorMessage = `Instância "${instanceName}" já existe.`;
        } else if (apiError.error && apiError.data?.message) {
            errorMessage = apiError.data.message;
        } else if (apiError.errors?.[0]?.message) {
             errorMessage = apiError.errors[0].message;
        } else if (apiError.response?.message) {
            errorMessage = apiError.response.message;
        }
    }
    
    return { success: false, error: errorMessage };
  }
}

export async function getInstanceStatusAction(instanceName: string) {
    const evolutionApiUrl = process.env.EVOLUTION_API_URL;
    const apiKey = process.env.EVOLUTION_API_KEY;

    if (!evolutionApiUrl || !apiKey) {
        return { success: false, error: 'A URL ou a Chave da API Evolution não estão configuradas no ambiente.' };
    }

    try {
        // Use the specific connectionState endpoint for more accurate status
        const response = await axios.get(`${evolutionApiUrl}/instance/connectionState/${instanceName}`, {
            headers: { 'apikey': apiKey },
        });
        
        console.log('Instance connection state:', JSON.stringify(response.data, null, 2));
        return { success: true, data: response.data };
    } catch (error: any) {
        console.error(`Error fetching instance status ${instanceName}:`, error.response?.data || error.message);
        
        // Fallback to fetchInstances if connectionState fails
        try {
            const fallbackResponse = await axios.get(`${evolutionApiUrl}/instance/fetchInstances`, {
                headers: { 'apikey': apiKey },
            });
            
            const instances = fallbackResponse.data;
            const instance = instances.find((inst: any) => inst.instance?.instanceName === instanceName);
            
            if (instance) {
                console.log('Instance status (fallback):', JSON.stringify(instance, null, 2));
                return { success: true, data: instance };
            } else {
                return { success: false, error: 'Instância não encontrada.' };
            }
        } catch (fallbackError: any) {
            console.error(`Fallback error for instance ${instanceName}:`, fallbackError.response?.data || fallbackError.message);
            return { success: false, error: 'Falha ao obter status da instância.' };
        }
    }
}

export async function connectInstanceAction(instanceName: string) {
    const evolutionApiUrl = process.env.EVOLUTION_API_URL;
    const apiKey = process.env.EVOLUTION_API_KEY;

    if (!evolutionApiUrl || !apiKey) {
        return { success: false, error: 'A URL ou a Chave da API Evolution não estão configuradas no ambiente.' };
    }

    try {
        const response = await axios.get(`${evolutionApiUrl}/instance/connect/${instanceName}`, {
            headers: { 'apikey': apiKey },
        });
        
        // Debug: Log the actual API response structure
        console.log('Evolution API Connect Response (direct):', JSON.stringify(response.data, null, 2));
        
        return { success: true, data: response.data };
    } catch (error: any) {
        console.error(`Error connecting instance ${instanceName}:`, error.response?.data || error.message);
        const apiError = error.response?.data;
        let errorMessage = 'Falha ao conectar à API Evolution.';
        
        if (apiError) {
             if (typeof apiError === 'string') {
                errorMessage = apiError;
            } else if (apiError.message) {
                errorMessage = apiError.message;
            } else if (apiError.error?.message?.includes('already connected')) {
                errorMessage = 'Esta instância já está conectada.';
            } else if (apiError.error && typeof apiError.error === 'string') {
                errorMessage = apiError.error;
            } else if (apiError.response?.message) {
                errorMessage = apiError.response.message;
            } else if (apiError.error?.message) {
                errorMessage = apiError.error.message;
            }
        }
        
        return { success: false, error: errorMessage };
    }
}



export async function fetchAllInstancesAction() {
    const evolutionApiUrl = process.env.EVOLUTION_API_URL;
    const apiKey = process.env.EVOLUTION_API_KEY;

    if (!evolutionApiUrl || !apiKey) {
        return { success: false, error: 'A URL ou a Chave da API Evolution não estão configuradas no ambiente.' };
    }

    try {
        const response = await axios.get(`${evolutionApiUrl}/instance/fetchInstances`, {
            headers: { 'apikey': apiKey },
        });
        
        // Transform the API response to match our Instance interface
        const instances = response.data.map((inst: any, index: number) => {
            let status = 'pending';
            
            // Check various possible status fields - prioritize connectionStatus
            if (inst.instance?.connectionStatus === 'open' || inst.connectionStatus === 'open' ||
                inst.instance?.state === 'open' || inst.state === 'open') {
                status = 'connected';
            } else if (inst.instance?.connectionStatus === 'close' || inst.connectionStatus === 'close' ||
                      inst.instance?.state === 'close' || inst.state === 'close' || 
                      inst.instance?.status === 'disconnected' || inst.status === 'disconnected') {
                status = 'disconnected';
            }
            
            // Get the instance name - use the name from the nested instance object, not the root level
            // The actual instance name is in inst.instance.name, not inst.name
            const instanceName = inst.instance?.name || inst.instance?.instanceName || inst.name || `instance-${index}`;
            
            return {
                id: inst.instance?.id || instanceName,
                name: instanceName,
                apiKey: '**********',
                status: status,
                instance: inst
            };
        });
        
        console.log('Fetched instances:', JSON.stringify(instances, null, 2));
        return { success: true, data: instances };
    } catch (error: any) {
        console.error('Error fetching all instances:', error.response?.data || error.message);
        return { success: false, error: 'Falha ao buscar instâncias da API Evolution.' };
    }
}

export async function deleteInstanceAction(instanceName: string) {
    const evolutionApiUrl = process.env.EVOLUTION_API_URL;
    const apiKey = process.env.EVOLUTION_API_KEY;

    if (!evolutionApiUrl || !apiKey) {
        return { success: false, error: 'A URL ou a Chave da API Evolution não estão configuradas no ambiente.' };
    }

    try {
        const response = await axios.delete(`${evolutionApiUrl}/instance/delete/${instanceName}`, {
            headers: { 'apikey': apiKey },
        });
        
        console.log('Instance deleted:', JSON.stringify(response.data, null, 2));
        return { success: true, data: response.data };
    } catch (error: any) {
        console.error(`Error deleting instance ${instanceName}:`, error.response?.data || error.message);
        const apiError = error.response?.data;
        let errorMessage = 'Falha ao deletar instância da API Evolution.';
        
        if (apiError) {
            if (typeof apiError === 'string') {
                errorMessage = apiError;
            } else if (apiError.message) {
                errorMessage = apiError.message;
            } else if (apiError.error?.message) {
                errorMessage = apiError.error.message;
            } else if (apiError.response?.message) {
                errorMessage = apiError.response.message;
            }
        }
        
        return { success: false, error: errorMessage };
    }
}

export async function logoutInstanceAction(instanceName: string) {
    const evolutionApiUrl = process.env.EVOLUTION_API_URL;
    const apiKey = process.env.EVOLUTION_API_KEY;

    if (!evolutionApiUrl || !apiKey) {
        return { success: false, error: 'A URL ou a Chave da API Evolution não estão configuradas no ambiente.' };
    }

    try {
        const response = await axios.delete(`${evolutionApiUrl}/instance/logout/${instanceName}`, {
            headers: { 'apikey': apiKey },
        });
        
        console.log('Instance logged out:', JSON.stringify(response.data, null, 2));
        return { success: true, data: response.data };
    } catch (error: any) {
        console.error(`Error logging out instance ${instanceName}:`, error.response?.data || error.message);
        const apiError = error.response?.data;
        let errorMessage = 'Falha ao desconectar instância da API Evolution.';
        
        if (apiError) {
            if (typeof apiError === 'string') {
                errorMessage = apiError;
            } else if (apiError.message) {
                errorMessage = apiError.message;
            } else if (apiError.error?.message) {
                errorMessage = apiError.error.message;
            } else if (apiError.response?.message) {
                errorMessage = apiError.response.message;
            }
        }
        
        return { success: false, error: errorMessage };
    }
}

export async function restartInstanceAction(instanceName: string) {
    const evolutionApiUrl = process.env.EVOLUTION_API_URL;
    const apiKey = process.env.EVOLUTION_API_KEY;

    if (!evolutionApiUrl || !apiKey) {
        return { success: false, error: 'A URL ou a Chave da API Evolution não estão configuradas no ambiente.' };
    }

    try {
        const response = await axios.put(`${evolutionApiUrl}/instance/restart/${instanceName}`, {}, {
            headers: { 'apikey': apiKey },
        });
        
        console.log('Instance restarted:', JSON.stringify(response.data, null, 2));
        return { success: true, data: response.data };
    } catch (error: any) {
        console.error(`Error restarting instance ${instanceName}:`, error.response?.data || error.message);
        const apiError = error.response?.data;
        let errorMessage = 'Falha ao reiniciar instância da API Evolution.';
        
        if (apiError) {
            if (typeof apiError === 'string') {
                errorMessage = apiError;
            } else if (apiError.message) {
                errorMessage = apiError.message;
            } else if (apiError.error?.message) {
                errorMessage = apiError.error.message;
            } else if (apiError.response?.message) {
                errorMessage = apiError.response.message;
            }
        }
        
        return { success: false, error: errorMessage };
    }
}
