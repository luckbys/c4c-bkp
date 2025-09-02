import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
  try {
    console.log('🧪 [TEST] Testing funil instances endpoint...');
    
    // Simular o mesmo processo que o funil usa
    const apiResponse = await fetch(`${request.nextUrl.origin}/api/instancias`);
    
    if (!apiResponse.ok) {
      throw new Error('Falha ao buscar instâncias da API');
    }
    
    const apiData = await apiResponse.json();
    const apiInstances = apiData.instances || [];
    
    console.log('🧪 [TEST] API instances found:', apiInstances.map((i: any) => ({ name: i.name, status: i.status })));
    
    // Filtrar apenas instâncias conectadas
    const connectedInstances = apiInstances
      .filter((instance: any) => instance.status === 'connected')
      .map((instance: any) => instance.name);
    
    console.log('🧪 [TEST] Connected instances:', connectedInstances);
    
    // Adicionar instância de teste
    if (!connectedInstances.includes('test-instance')) {
      connectedInstances.push('test-instance');
    }
    
    const uniqueInstances = [...new Set(connectedInstances)];
    
    return NextResponse.json({
      success: true,
      message: 'Funil instances test completed',
      data: {
        totalApiInstances: apiInstances.length,
        connectedInstances: connectedInstances.length,
        finalInstances: uniqueInstances,
        details: {
          apiInstances: apiInstances.map((i: any) => ({ name: i.name, status: i.status })),
          connectedOnly: connectedInstances,
          withTestInstance: uniqueInstances
        }
      }
    });
  } catch (error) {
    console.error('🧪 [TEST] Error testing funil instances:', error);
    return NextResponse.json(
      { 
        success: false, 
        error: error instanceof Error ? error.message : 'Unknown error',
        message: 'Failed to test funil instances'
      },
      { status: 500 }
    );
  }
}