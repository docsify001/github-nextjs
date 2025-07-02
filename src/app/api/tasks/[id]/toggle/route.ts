import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/drizzle/database';
import { CronerScheduler } from '@/lib/tasks/croner-scheduler';
import { verifyApiAuth } from '@/lib/auth/auth-utils';

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  // 验证用户认证
  const authResult = await verifyApiAuth(request);
  if (!authResult.success) {
    return NextResponse.json(
      { success: false, error: authResult.error },
      { status: authResult.status }
    );
  }

  try {
    const { id } = await params;
    const { enabled } = await request.json();

    if (!id) {
      return NextResponse.json(
        { success: false, error: 'Task ID is required' },
        { status: 400 }
      );
    }

    if (typeof enabled !== 'boolean') {
      return NextResponse.json(
        { success: false, error: 'Enabled flag is required and must be boolean' },
        { status: 400 }
      );
    }

    const scheduler = new CronerScheduler(db);
    await scheduler.toggleTask(id, enabled);

    return NextResponse.json({ 
      success: true, 
      message: `Task ${enabled ? 'enabled' : 'disabled'} successfully` 
    });
  } catch (error) {
    console.error('Error toggling task:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json(
      { success: false, error: errorMessage },
      { status: 500 }
    );
  }
} 