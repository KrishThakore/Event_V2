# Razorpay Payment Testing Guide

## 🎯 Test Setup Complete

✅ **Environment Variables Configured**
- Razorpay Test Keys: `rzp_test_RzjcsZOvCgVRla`
- Payments Enabled: `true`
- API Connection: ✅ Working

## 🚀 Testing Steps

### 1. Create a Test Event with Payment

1. Navigate to **Admin Dashboard** → **Create Event**
2. Set event details:
   - **Title**: "Razorpay Test Event"
   - **Price**: ₹500 (or any amount > 0)
   - **Status**: "Approved/Published"
   - **Registration Form**: Add basic fields (Name, Email)
3. Save the event

### 2. Test User Registration

1. Open a new browser window (incognito recommended)
2. Navigate to the test event page
3. Click **"Register"**
4. Fill out the registration form
5. Click **"Register"** button

### 3. Razorpay Payment Test

When the Razorpay modal opens, you can choose from multiple payment methods:

#### 🎯 OPTION 1: CREDIT/DEBIT CARD
**Test Card Details:**
- **Card Number**: `4111 1111 1111 1111`
- **Expiry**: Any future date (e.g., 12/25)
- **CVV**: Any 3 digits (e.g., 123)
- **Name**: Test User
- **OTP**: `111111`

#### 📱 OPTION 2: UPI PAYMENTS (Recommended for Indian Users)
**Test UPI Details:**
- **UPI ID**: `success@razorpay` (for successful payments)
- **UPI ID**: `failure@razorpay` (for testing failed payments)
- **UPI App**: Any UPI app (PhonePe, Google Pay, Paytm, etc.)
- **Virtual Payment Address**: `test@upi`

**UPI Flow:**
1. Select "UPI" payment method
2. Enter UPI ID: `success@razorpay`
3. Click "Verify"
4. Razorpay will simulate UPI payment
5. Payment completes instantly (no real UPI app needed in test mode)

#### 🌐 OPTION 3: NET BANKING
**Test Net Banking:**
- **Bank**: Any bank from the dropdown list
- **User ID**: `test`
- **Password**: `test`
- **OTP**: `111111`

#### 💵 OPTION 4: WALLET
**Test Wallet:**
- **Wallet**: Any wallet from the list (PhonePe, Paytm, etc.)
- **Mobile Number**: `9876543210`
- **OTP**: `111111`

**Payment Flow (for any method):**
1. Select payment method → Enter details
2. Click "Pay" → Enter OTP if required
3. Payment succeeds → Modal closes
4. Registration confirmed → Redirect to ticket page

### 4. Verify Payment Processing

**Database Checks:**
```sql
-- Check registration status
SELECT * FROM registrations WHERE event_id = 'your_event_id';

-- Check payment record
SELECT * FROM payments WHERE registration_id = 'registration_id';

-- Check registration responses
SELECT * FROM registration_responses WHERE registration_id = 'registration_id';
```

**Expected Results:**
- `registrations.status`: 'CONFIRMED'
- `payments.status`: 'SUCCESS'
- `payments.razorpay_payment_id`: populated
- `registration_responses`: form answers saved

## 🔧 Debugging Tools

### Test Payment API Directly
```bash
# Test Razorpay order creation
curl -X POST https://api.razorpay.com/v1/orders \
  -u rzp_test_RzjcsZOvCgVRla:9wFflAYtmO6zo7CIAOsdWdRH \
  -H "Content-Type: application/json" \
  -d '{
    "amount": 50000,
    "currency": "INR",
    "receipt": "test_receipt",
    "notes": {"test": true}
  }'
```

### Check Webhook Handling
The webhook endpoint processes payment confirmations:
- **URL**: `/api/razorpay/webhook`
- **Method**: POST
- **Security**: HMAC signature verification
- **Actions**: 
  - Inserts payment record
  - Confirms registration
  - Updates status

## 🚨 Common Issues & Solutions

### Issue: "Payments are disabled"
**Solution**: Ensure `NEXT_PUBLIC_PAYMENTS_ENABLED=true` in `.env.local`

### Issue: "Razorpay key not found"
**Solution**: Check that `RAZORPAY_KEY_ID` and `RAZORPAY_KEY_SECRET` are set correctly

### Issue: "Payment not confirmed"
**Solution**: 
1. Check webhook endpoint is accessible
2. Verify Razorpay webhook configuration in dashboard
3. Check database for payment records

### Issue: "Registration stuck in PENDING"
**Solution**:
1. Check if webhook was called
2. Verify payment status in Razorpay dashboard
3. Manually confirm registration if needed

## 📊 Test Results Expected

✅ **Successful Flow:**
1. User registers → Creates PENDING registration
2. Razorpay order created → Payment modal opens
3. Test payment completed → Webhook called
4. Payment recorded → Registration CONFIRMED
5. User redirected to ticket page

✅ **Database State:**
- `registrations`: 1 record with status 'CONFIRMED'
- `payments`: 1 record with status 'SUCCESS'
- `registration_responses`: Form answers saved

## 🎉 Testing Complete!

Once you complete these steps successfully, the Razorpay payment system is fully tested and ready for production use with real events.

## 📞 Razorpay Test Dashboard

Access the Razorpay test dashboard to view:
- Test transactions
- Payment details
- Webhook calls
- Account balance (test mode)

URL: https://dashboard.razorpay.com/app/payments
