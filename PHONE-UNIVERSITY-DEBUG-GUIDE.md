# Phone Number and University Fields Debug Guide

## Issue: Phone number and university not being stored

## Step 1: Verify Database Migration Applied

Run this SQL in Supabase SQL Editor to check if columns exist:

```sql
SELECT column_name, data_type, is_nullable 
FROM information_schema.columns 
WHERE table_name = 'profiles' 
AND column_name IN ('phone_number', 'university')
ORDER BY column_name;
```

**Expected Result:**
```
column_name   | data_type | is_nullable
--------------+-----------+------------
phone_number  | text      | YES
university    | text      | YES
```

**If no results:** The migration hasn't been applied. Apply it manually:

```sql
ALTER TABLE profiles
ADD COLUMN phone_number text,
ADD COLUMN university text;

COMMENT ON COLUMN profiles.phone_number IS 'User phone number collected during signup';
COMMENT ON COLUMN profiles.university IS 'User university collected during signup';
```

## Step 2: Check Recent Signups

```sql
SELECT 
    id, 
    full_name, 
    email, 
    phone_number, 
    university, 
    role, 
    created_at
FROM profiles 
ORDER BY created_at DESC 
LIMIT 10;
```

## Step 3: Test with Debug Logs

1. Open browser developer console
2. Try signing up a new user
3. Look for console logs:
   - "University type changed to: ..."
   - "Ganpat institute changed to: ..."
   - "Setting university to: ..."
   - "Inserting profile with data: ..."
   - "Profile inserted successfully" OR error details

## Step 4: Check RLS Policies

```sql
SELECT 
    schemaname,
    tablename,
    policyname,
    permissive,
    roles,
    cmd,
    qual,
    with_check
FROM pg_policies 
WHERE tablename = 'profiles';
```

## Step 5: Manual Test Insert

```sql
INSERT INTO profiles (
    id, 
    full_name, 
    email, 
    phone_number, 
    university, 
    role, 
    created_at
) VALUES (
    'test-profile-' || EXTRACT(EPOCH FROM NOW())::text,
    'Test User',
    'test@example.com',
    '9876543210',
    'Ganpat University - U. V. Patel College of Engineering',
    'student',
    NOW()
) ON CONFLICT (id) DO NOTHING;
```

## Common Issues & Solutions

### Issue 1: Migration not applied
**Solution:** Run the ALTER TABLE commands manually in Supabase SQL Editor

### Issue 2: University state not updating
**Check:** Console logs for university changes
**Solution:** Verify dropdown onChange handlers are working

### Issue 3: RLS policy blocking insert
**Solution:** Update RLS policies to allow phone_number and university columns

### Issue 4: Form validation preventing submission
**Check:** All required fields are filled and valid
**Solution:** Look for inline error messages

## Files to Check

1. **Database Migration:** `supabase/migrations/20260120210000_add_phone_university_to_profiles.sql`
2. **Signup Form:** `app/(auth)/signup/page.tsx`
3. **Admin Form:** `app/(dashboard)/admin-dashboard/manual-fixes/page.tsx`

## Next Steps

1. Apply migration if needed
2. Test signup with debug logs enabled
3. Verify data in database
4. Remove debug logs once working
