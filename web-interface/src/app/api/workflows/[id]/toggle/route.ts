import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseClient } from '@/lib/supabase';

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const supabase = getSupabaseClient();
    const workflowId = params.id;

    // Get current workflow
    const { data: workflow, error: fetchError } = await supabase
      .from('workflows')
      .select('*')
      .eq('id', workflowId)
      .single();

    if (fetchError || !workflow) {
      return NextResponse.json(
        { error: 'Workflow not found' },
        { status: 404 }
      );
    }

    // Toggle status
    const newStatus = workflow.status === 'active' ? 'paused' : 'active';

    // Update workflow status
    const { data, error } = await supabase
      .from('workflows')
      .update({ 
        status: newStatus,
        updated_at: new Date().toISOString(),
      })
      .eq('id', workflowId)
      .select()
      .single();

    if (error) {
      console.error('Database error:', error);
      return NextResponse.json(
        { error: 'Failed to update workflow' },
        { status: 500 }
      );
    }

    // If activating, you might want to trigger the workflow scheduler here
    if (newStatus === 'active') {
      // Trigger workflow activation logic
      console.log(`Workflow ${workflowId} activated`);
    }

    return NextResponse.json({ 
      success: true,
      workflow: data,
      message: `Workflow ${newStatus === 'active' ? 'activated' : 'paused'} successfully`
    });

  } catch (error) {
    console.error('Toggle workflow error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}