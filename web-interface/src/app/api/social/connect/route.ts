import { NextRequest, NextResponse } from 'next/server';
import { createServiceSupabaseClient, extractUserId } from '../../_lib/supabase';

export async function POST(request: NextRequest) {
  try {
    const supabase = createServiceSupabaseClient();
    const userId = await extractUserId(request, supabase);
    if (!userId) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }
    const { platform, credentials } = await request.json();

    // Validate the incoming data
    if (!platform || !credentials) {
      return NextResponse.json(
        { error: 'Platform and credentials are required' },
        { status: 400 }
      );
    }

    // Here you would typically:
    // 1. Validate the credentials with the social media platform
    // 2. Store the encrypted credentials in your database
    // 3. Fetch initial account information

    // For now, we'll simulate the process
    const now = new Date().toISOString();
    const accountData = {
      id: crypto.randomUUID(),
      platform,
      username: `user_${Date.now()}`,
      display_name: `User on ${platform}`,
      profile_image: 'https://via.placeholder.com/150',
      status: 'connected',
      followers: Math.floor(Math.random() * 10000),
      last_sync: now,
      is_active: true,
      credentials: { ...(credentials || {}), user_id: userId }, // In production, encrypt this!
      created_at: now,
      updated_at: now,
    };

    // Store in database
    const { data, error } = await supabase
      .from('social_accounts')
      .insert([accountData])
      .select()
      .single();

    if (error) {
      console.error('Database error:', error);
      return NextResponse.json(
        { error: 'Failed to save account' },
        { status: 500 }
      );
    }

    // Return success response without sensitive data
    const { credentials: storedCredentials, ...safeAccountData } = data;
    void storedCredentials;
    
    return NextResponse.json({
      success: true,
      account: safeAccountData,
    });

  } catch (error) {
    console.error('Connect account error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
