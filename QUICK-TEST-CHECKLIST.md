# Quick UPI Payment Test Checklist

## 🚀 Ready to Test? Follow These Steps:

### 1. Create Test Event (2 minutes)
- Go to: http://localhost:3000/admin
- Login → Create Event → Set price ₹500 → Save

### 2. Test Registration (3 minutes)
- Open incognito window
- Go to your event page
- Click "Register" → Fill form → Submit

### 3. Test UPI Payment (1 minute)
- Select "UPI" in Razorpay modal
- Enter: `success@razorpay`
- Click verify → Payment done!

### 4. Verify Success (1 minute)
- Check if redirected to ticket page
- Registration should show "CONFIRMED"

## 📱 UPI Test Details:
- **UPI ID**: `success@razorpay`
- **Result**: Instant success
- **No real app needed**: Test mode simulation

## 🎯 Expected Result:
✅ Registration confirmed
✅ Payment recorded
✅ Ticket generated
✅ Redirected to ticket page

## 🚨 If it fails:
1. Check console for errors
2. Verify event price > 0
3. Ensure payments enabled in .env.local

Ready to test! 🎉
