#!/bin/bash

# This script helps you set up environment variables for Vercel deployment
# Run this script to add the required environment variables to your Vercel project

echo "Setting up Vercel environment variables..."
echo "You'll need to provide your actual values for the following variables:"
echo ""

# Function to add environment variable
add_env() {
    local key=$1
    local env_type=$2  # production, preview, development
    
    echo ""
    echo "Enter value for $key (or press Enter to skip):"
    read -r value
    
    if [ -n "$value" ]; then
        vercel env add "$key" "$env_type" <<< "$value"
        echo "✓ Added $key to $env_type"
    else
        echo "⚠ Skipped $key"
    fi
}

echo "=== Required Environment Variables ==="
echo ""
echo "1. SUPABASE_URL - Your Supabase project URL"
echo "2. SUPABASE_ANON_KEY - Your Supabase anonymous key"
echo "3. NEXTAUTH_SECRET - A random secret for NextAuth (generate with: openssl rand -base64 32)"
echo "4. NEXTAUTH_URL - Your production URL (e.g., https://your-app.vercel.app)"
echo ""
echo "Would you like to add these now? (y/n)"
read -r answer

if [ "$answer" = "y" ]; then
    # Add Supabase variables
    add_env "SUPABASE_URL" "production"
    add_env "SUPABASE_ANON_KEY" "production"
    add_env "SUPABASE_SERVICE_ROLE_KEY" "production"
    
    # Add NextAuth variables
    add_env "NEXTAUTH_SECRET" "production"
    add_env "NEXTAUTH_URL" "production"
    
    # Optional: Add API keys
    echo ""
    echo "=== Optional API Keys ==="
    echo "Would you like to add optional API keys? (y/n)"
    read -r add_optional
    
    if [ "$add_optional" = "y" ]; then
        add_env "OPENAI_API_KEY" "production"
        add_env "CLAUDE_API_KEY" "production"
        add_env "PERPLEXITY_API_KEY" "production"
        add_env "TWITTER_API_KEY" "production"
        add_env "TWITTER_API_KEY_SECRET" "production"
        add_env "LINKEDIN_API_KEY" "production"
        add_env "GOOGLE_CLIENT_ID" "production"
        add_env "GOOGLE_CLIENT_SECRET" "production"
    fi
    
    echo ""
    echo "✅ Environment variables setup complete!"
    echo "You can now deploy with: vercel --prod"
else
    echo ""
    echo "You can manually add environment variables using:"
    echo "  vercel env add KEY production"
    echo ""
    echo "Or through the Vercel dashboard at:"
    echo "  https://vercel.com/onasis-team/network-sync/settings/environment-variables"
fi
