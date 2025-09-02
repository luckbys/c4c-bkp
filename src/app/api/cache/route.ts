import { NextRequest, NextResponse } from 'next/server';
import { redisService } from '@/services/redis-service';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const key = searchParams.get('key');
    
    if (!key) {
      return NextResponse.json({ error: 'Key parameter is required' }, { status: 400 });
    }
    
    const value = await redisService.get(key);
    return NextResponse.json({ value });
  } catch (error) {
    console.error('Error getting cache:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const { key, value, ttl } = await request.json();
    
    if (!key || value === undefined) {
      return NextResponse.json({ error: 'Key and value are required' }, { status: 400 });
    }
    
    const success = await redisService.set(key, value, ttl);
    return NextResponse.json({ success });
  } catch (error) {
    console.error('Error setting cache:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const key = searchParams.get('key');
    
    if (!key) {
      return NextResponse.json({ error: 'Key parameter is required' }, { status: 400 });
    }
    
    const success = await redisService.delete(key);
    return NextResponse.json({ success });
  } catch (error) {
    console.error('Error deleting cache:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}