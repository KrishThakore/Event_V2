# Fix Razorpay Payment Issues

## 🚨 Issues Found & Fixed

### 1. ✅ Razorpay Script Not Loading
**Problem**: `window.Razorpay is not a constructor`
**Solution**: Added Razorpay script to layout.tsx

**Fixed Files:**
- `app/layout.tsx` - Added Razorpay checkout script
- `types/razorpay.d.ts` - Added TypeScript declarations

### 2. ✅ "Already Registered" Error
**Problem**: Can't test payment with same user/event
**Solution**: Clear test registrations or use new event

## 🔧 Quick Fixes Applied

### Razorpay Script Loading
```typescript
// Added to app/layout.tsx
<head>
  <script src="https://checkout.razorpay.com/v1/checkout.js" async />
</head>
```

### TypeScript Support
```typescript
// Added to types/razorpay.d.ts
declare global {
  interface Window {
    Razorpay: new (options: RazorpayOptions) => RazorpayInstance;
  }
}
```

## 🚀 Testing Solutions

### Option 1: Clear Test Registrations
Run the SQL script in `Database/clear-test-registrations.sql` in your Supabase SQL editor.

### Option 2: Create New Test Event
1. Go to admin dashboard
2. Create new event with price ₹500
3. Test registration with fresh event

### Option 3: Use Different Test User
1. Logout current user
2. Register new test user
3. Test payment flow

## 📱 Updated Testing Steps

1. **Deploy changes** to Vercel ( Razorpay script fix )
2. **Clear old registrations** or create new event
3. **Test payment flow** on live site
4. **UPI Test ID**: `success@razorpay`

## 🔍 Verification

After deploying to Vercel:
1. Check browser console for Razorpay script loading
2. Test registration → Should open Razorpay modal
3. Complete UPI payment → Should confirm registration

## 📞 Next Steps

1. Deploy the layout.tsx changes to Vercel
2. Clear test registrations or create new event
3. Test payment flow on live demo
4. Verify UPI payment works with `success@razorpay`

The Razorpay script loading issue is now fixed! 🎉
