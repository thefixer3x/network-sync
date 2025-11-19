import { NextRequest, NextResponse } from 'next/server';
import { createServiceSupabaseClient, extractUserId } from '../_lib/supabase';
// import { SocialGrowthEngine } from '@/../src/orchestrator/SocialGrowthEngine';

const supabase = createServiceSupabaseClient();

export async function GET(request: NextRequest) {
  try {
    const userId = await extractUserId(request, supabase);
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { data, error } = await supabase
      .from('workflows')
      .select('*')
      .eq('config->>user_id', userId)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Database error:', error);
      return NextResponse.json(
        { error: 'Failed to fetch workflows' },
        { status: 500 }
      );
    }

    // Transform the data to match our frontend interface
    const workflows = data?.map(workflow => ({
      id: workflow.id,
      name: workflow.name,
      description: workflow.description,
      status: workflow.status,
      type: workflow.type,
      schedule: workflow.schedule,
      platforms: workflow.platforms,
      lastRun: workflow.last_run ? new Date(workflow.last_run) : null,
      nextRun: workflow.next_run ? new Date(workflow.next_run) : null,
      totalRuns: workflow.total_runs || 0,
      successRate: workflow.success_rate || 0,
      createdAt: new Date(workflow.created_at),
      config: workflow.config || {},
    })) || [];

    return NextResponse.json({ workflows });

  } catch (error) {
    console.error('Get workflows error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const userId = await extractUserId(request, supabase);
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const workflowData = await request.json();

    // Calculate next run time based on schedule
    const nextRun = workflowData.schedule?.time
      ? calculateNextRun(workflowData.schedule)
      : new Date();

    const { data, error } = await supabase
      .from('workflows')
      .insert([{
        ...workflowData,
        config: { ...(workflowData.config || {}), user_id: userId },
        id: crypto.randomUUID(),
        status: 'paused', // Start paused by default
        total_runs: 0,
        success_rate: 0,
        next_run: nextRun.toISOString(),
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      }])
      .select()
      .single();

    if (error) {
      console.error('Database error:', error);
      return NextResponse.json(
        { error: 'Failed to create workflow' },
        { status: 500 }
      );
    }

    return NextResponse.json({ workflow: data });

  } catch (error) {
    console.error('Create workflow error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

function calculateNextRun(schedule: any): Date {
  if (!schedule?.time) {
    return new Date();
  }

  const now = new Date();
  const [hours, minutes] = schedule.time.split(':').map(Number);
  
  const nextRun = new Date(now);
  nextRun.setHours(hours, minutes, 0, 0);
  
  // If the time has already passed today, schedule for tomorrow
  if (nextRun <= now) {
    nextRun.setDate(nextRun.getDate() + 1);
  }
  
  return nextRun;
}
