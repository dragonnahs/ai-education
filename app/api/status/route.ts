import { NextResponse } from 'next/server';
import { isSystemReady } from '@/lib/rag';

export async function GET() {
  return NextResponse.json({
    ready: isSystemReady()
  });
}
