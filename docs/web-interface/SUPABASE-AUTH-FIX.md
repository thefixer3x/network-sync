# Supabase Authentication Issues

## Errors You're Seeing

1. **"User already registered"** - Email exists, can't sign up again
2. **"Invalid login credentials"** - Wrong password or account issues

## Root Causes

### Issue 1: Email Confirmation Pending
If you signed up but didn't verify your email, Supabase blocks login.

### Issue 2: Wrong Credentials
Incorrect password for existing account.

### Issue 3: Supabase Auth Settings
Email confirmation may be required before login.

## Solutions

### Quick Fix: Reset Your Password

1. **Go to Supabase Dashboard:**
   ```
   https://supabase.com/dashboard/project/lanonasis/auth/users
   ```

2. **Find your user** in the users list

3. **Option A - Delete and recreate:**
   - Delete the user
   - Sign up again with same email
   - Check spam for verification email

4. **Option B - Confirm email manually:**
   - Click on the user
   - Look for "Email Confirmed" checkbox
   - Check it manually
   - Try logging in again

### Permanent Fix: Disable Email Confirmation (Development)

For development, you can disable email confirmation:

1. **Go to Supabase Auth Settings:**
   ```
   https://supabase.com/dashboard/project/lanonasis/auth/settings
   ```

2. **Scroll to "Email Auth"**

3. **Disable these for development:**
   - ⬜ Enable email confirmations
   - ⬜ Secure email change

4. **Save changes**

5. **Try signing up again**

### Production Setup: Configure Email Provider

For production, you need proper email delivery:

1. **Go to Supabase Auth Settings**

2. **Configure SMTP under "Email":**
   - Host: smtp.gmail.com
   - Port: 587
   - Username: your-email@gmail.com
   - Password: your-app-password (not regular password)

3. **Or use Supabase's built-in email** (limited sends)

## Testing Authentication

### Test 1: Create New User
```
Email: test@example.com
Password: Test123!
```

If you get "User already registered":
- User exists
- Try logging in instead
- Or use different email

### Test 2: Login
```
Email: existing@email.com
Password: correct-password
```

If you get "Invalid login credentials":
- Password is wrong
- Account not verified
- User doesn't exist

## Debug Steps

### Check Supabase Users Table

1. Go to: https://supabase.com/dashboard/project/lanonasis/auth/users
2. Look for your email
3. Check "Confirmed" column - should be ✓

### Check Console Errors

Open browser DevTools → Console
Look for detailed Supabase error messages

### Check Environment Variables

Ensure production has correct Supabase credentials:
```bash
vercel env ls
```

Look for:
- NEXT_PUBLIC_SUPABASE_URL
- NEXT_PUBLIC_SUPABASE_ANON_KEY
- SUPABASE_SERVICE_ROLE_KEY (server-side only)

## Common Issues

### Issue: "User already registered" when signing up
**Solution:** Email exists. Try logging in instead or use "Forgot password"

### Issue: "Invalid login credentials" 
**Solutions:**
1. Check password is correct
2. Confirm email in Supabase dashboard
3. Reset password using "Forgot password" link
4. Check Supabase URL is correct (lanonasis.supabase.co)

### Issue: No verification email received
**Solutions:**
1. Check spam folder
2. Manually confirm in Supabase dashboard
3. Disable email confirmation for development
4. Configure SMTP for production

## Quick Test Script

Test if Supabase is configured correctly:

```javascript
// Run in browser console on your deployed site
console.log('Supabase URL:', process.env.NEXT_PUBLIC_SUPABASE_URL);
console.log('Supabase Key exists:', !!process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY);

// Test connection
fetch('https://lanonasis.supabase.co/auth/v1/health')
  .then(r => console.log('Supabase health:', r.status === 200 ? 'OK' : 'ERROR'))
  .catch(e => console.error('Supabase unreachable:', e));
```

## Recommended Flow

1. **Disable email confirmation** (development only)
2. **Sign up with new account**
3. **Should login immediately**
4. **Re-enable email confirmation** (production)
5. **Configure SMTP** for production emails

## Need to Reset Everything?

Delete all users and start fresh:
1. Go to Supabase SQL Editor
2. Run: `DELETE FROM auth.users;`
3. Sign up again

⚠️ **Warning:** This deletes ALL users!
