import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseClient } from '@/lib/supabase';

export async function GET(request: NextRequest) {
  try {
    const supabase = getSupabaseClient();
    const { data, error } = await supabase
      .from('social_accounts')
      .select(`
        id,
        platform,
        username,
        display_name,
        profile_image,
        status,
        followers,
        last_sync,
        is_active,
        created_at
      `)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Database error:', error);
      return NextResponse.json(
        { error: 'Failed to fetch accounts' },
        { status: 500 }
      );
    }

    // Transform the data to match our frontend interface
    const accounts = data?.map(account => ({
      id: account.id,
      platform: account.platform,
      username: account.username,
      displayName: account.display_name,
      profileImage: account.profile_image,
      status: account.status,
      followers: account.followers,
      lastSync: new Date(account.last_sync),
      isActive: account.is_active,
    })) || [];

    return NextResponse.json({ accounts });

  } catch (error) {
    console.error('Get accounts error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const supabase = getSupabaseClient();
    const accountData = await request.json();

    const { data, error } = await supabase
      .from('social_accounts')
      .insert([{
        ...accountData,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      }])
      .select()
      .single();

    if (error) {
      console.error('Database error:', error);
      return NextResponse.json(
        { error: 'Failed to create account' },
        { status: 500 }
      );
    }

    return NextResponse.json({ account: data });

  } catch (error) {
    console.error('Create account error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}