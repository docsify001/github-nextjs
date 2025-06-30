import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/drizzle/database';
import { TaskScheduler } from '@/lib/tasks/scheduler';

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    if (!id) {
      return NextResponse.json(
        { success: false, error: 'Task ID is required' },
        { status: 400 }
      );
    }

    const scheduler = new TaskScheduler(db);
    await scheduler.stopTask(id);

    return NextResponse.json({ success: true, message: 'Task stopped successfully' });
  } catch (error) {
    console.error('Error stopping task:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json(
      { success: false, error: errorMessage },
      { status: 500 }
    );
  }
} 