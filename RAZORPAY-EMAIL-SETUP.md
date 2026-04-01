# 📧 RAZORPAY EMAIL NOTIFICATIONS SETUP

## 🎯 **Objective**
Configure email notifications for Razorpay payment events:
- ✅ Successful payments
- ❌ Failed payments
- 🔄 Payment attempts

## 🔧 **Setup Options**

### **Option 1: Razorpay Built-in Emails (Recommended)**

#### **Step 1: Enable Razorpay Emails**
1. **Login to Razorpay Dashboard**
   - Go to: https://dashboard.razorpay.com
   - Use your test account credentials

2. **Navigate to Settings**
   - Click on **Settings** (gear icon ⚙️)
   - Go to **Emails** section

3. **Configure Email Templates**
   - **Payment Success**: Enable customer email notifications
   - **Payment Failure**: Enable failure notifications
   - **Payment Initiated**: Optional - for payment attempts

4. **Customize Email Content**
   - Add your event branding
   - Include event details
   - Add support contact info

#### **Step 2: Test Email Configuration**
```
Test Payment Flow:
1. Complete a test payment
2. Check customer email for success notification
3. Test a failed payment scenario
4. Verify failure email is received
```

### **Option 2: Custom Email System (Backup)**

#### **Step 1: Add Email Service**
We'll use Resend (recommended) or SendGrid for custom emails:

**Environment Variables:**
```env
# Add to .env.local and Vercel
RESEND_API_KEY=your_resend_api_key
FROM_EMAIL=noreply@yourdomain.com
SUPPORT_EMAIL=support@yourdomain.com
```

#### **Step 2: Create Email Templates**
- Payment success template
- Payment failure template
- Admin notification template

#### **Step 3: Integrate with Webhook**
- Send emails when webhook is called
- Include payment details
- Brand with your event system

## 🚀 **Implementation Plan**

### **Phase 1: Razorpay Built-in Emails (Quick Setup)**
1. ✅ Configure Razorpay dashboard
2. ✅ Test payment flow
3. ✅ Verify email delivery

### **Phase 2: Custom Email System (Enhanced)**
1. ✅ Add email service integration
2. ✅ Create branded email templates
3. ✅ Implement webhook email sending
4. ✅ Add admin notifications

## 📧 **Email Content Templates**

### **Success Email Content:**
```
Subject: Payment Confirmed - Your Registration for [Event Name]

Dear [User Name],

Great news! Your payment for [Event Name] has been successfully processed.

Payment Details:
- Event: [Event Name]
- Amount: ₹[Amount]
- Payment ID: [Payment ID]
- Transaction Date: [Date]

Your registration is now confirmed. You will receive:
- Event ticket with QR code
- Event details and schedule
- Important updates

Need help? Reply to this email or contact support.

Best regards,
University Events Team
```

### **Failure Email Content:**
```
Subject: Payment Failed - [Event Name]

Dear [User Name],

We encountered an issue processing your payment for [Event Name].

Payment Details:
- Event: [Event Name]
- Amount: ₹[Amount]
- Payment ID: [Payment ID]
- Status: Failed

What to do:
1. Check your payment method
2. Ensure sufficient funds
3. Try again with a different payment method
4. Contact support if issues persist

Your registration attempt has been saved. You can retry payment anytime.

Need help? Reply to this email or contact support.

Best regards,
University Events Team
```

## 🔍 **Testing Checklist**

### **Razorpay Email Testing:**
- [ ] Login to Razorpay dashboard
- [ ] Enable email notifications
- [ ] Configure email templates
- [ ] Test successful payment email
- [ ] Test failed payment email
- [ ] Verify email content and branding

### **Custom Email Testing:**
- [ ] Set up email service (Resend/SendGrid)
- [ ] Add environment variables
- [ ] Test email templates
- [ ] Integrate with payment flow
- [ ] Verify webhook email sending

## 🎯 **Next Steps**

### **Option 1: Quick Setup (Razorpay Built-in)**
1. Configure Razorpay dashboard emails
2. Test payment flow
3. Verify email delivery

### **Option 2: Enhanced Setup (Custom)**
1. Choose email service (Resend recommended)
2. Set up API keys and environment
3. Implement custom email system
4. Test complete flow

**Which option would you like to implement?**
- **Option 1**: Quick setup with Razorpay built-in emails
- **Option 2**: Custom branded email system

Let me know and I'll set it up! 🚀
