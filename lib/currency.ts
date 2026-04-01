/**
 * Razorpay minimum amount in paise (1.00 INR)
 */
export const RAZORPAY_MIN_AMOUNT = 100;

/**
 * Helper to reliably parse numeric amounts, even from Prisma Decimal objects
 */
function parseAmount(amount: any): number {
  if (typeof amount === 'number') return amount;
  if (typeof amount === 'string') return parseFloat(amount);
  if (amount !== null && amount !== undefined) {
    return typeof amount.toNumber === 'function' ? amount.toNumber() : Number(amount);
  }
  return NaN;
}

/**
 * Formats a number as Indian Rupee currency
 * @param amount - Amount in numbers, string, or Decimal object
 * @returns Formatted INR string (e.g., "₹1,000", "₹50", "₹12,500")
 */
export function formatINR(amount: any): string {
  const numericAmount = parseAmount(amount);
  
  if (isNaN(numericAmount)) {
    return '₹0';
  }

  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0
  }).format(numericAmount);
}

/**
 * Formats a number as Indian Rupee with decimal places
 * @param amount - Amount in numbers
 * @param decimals - Number of decimal places (default: 2)
 * @returns Formatted INR string with decimals (e.g., "₹1,000.50")
 */
export function formatINRWithDecimals(amount: any, decimals: number = 2): string {
  const numericAmount = parseAmount(amount);
  
  if (isNaN(numericAmount)) {
    return `₹0.${'0'.repeat(decimals)}`;
  }

  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals
  }).format(numericAmount);
}

/**
 * Formats a number as Indian Rupee without currency symbol (for inputs)
 * @param amount - Amount in numbers
 * @returns Formatted number string (e.g., "1,000", "50", "12,500")
 */
export function formatINRPlain(amount: any): string {
  const numericAmount = parseAmount(amount);
  
  if (isNaN(numericAmount)) {
    return '0';
  }

  return new Intl.NumberFormat("en-IN", {
    maximumFractionDigits: 0
  }).format(numericAmount);
}

/**
 * Parses a formatted INR string back to number
 * @param formattedAmount - Formatted INR string (e.g., "₹1,000" or "1,000")
 * @returns Parsed number
 */
export function parseINR(formattedAmount: string): number {
  if (!formattedAmount) return 0;
  
  // Remove currency symbol and commas
  const cleanAmount = formattedAmount.replace(/[₹,]/g, '');
  
  const parsed = parseFloat(cleanAmount);
  return isNaN(parsed) ? 0 : parsed;
}

/**
 * Converts amount to paise (for Razorpay API)
 * Razorpay expects amount in paise (multiply by 100)
 * @param amount - Amount in rupees
 * @returns Amount in paise
 */
export function toPaise(amount: any): number {
  const numericAmount = parseAmount(amount);
  
  if (isNaN(numericAmount)) {
    return 0;
  }
  
  return Math.round(numericAmount * 100);
}

/**
 * Converts paise to rupees (from Razorpay response)
 * @param paise - Amount in paise
 * @returns Amount in rupees
 */
export function fromPaise(paise: any): number {
  const numericAmount = parseAmount(paise);
  
  if (isNaN(numericAmount)) {
    return 0;
  }
  
  return numericAmount / 100;
}

/**
 * Formats a number as US Dollar currency
 * @param amount - Amount in numbers, string, or Decimal object
 * @returns Formatted USD string (e.g., "$50", "$1,000")
 */
export function formatUSD(amount: any): string {
  const numericAmount = parseAmount(amount);
  
  if (isNaN(numericAmount)) {
    return '$0';
  }

  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0
  }).format(numericAmount);
}

/**
 * Universal price formatter that switches between INR and USD
 * @param amount - Amount in numbers, string, or Decimal object
 * @param currency - Currency code: 'INR' or 'USD' (default: 'INR')
 * @returns Formatted price string (e.g., "₹1,000" or "$50")
 */
export function formatPrice(amount: any, currency: string = 'INR'): string {
  if (currency === 'USD') {
    return formatUSD(amount);
  }
  return formatINR(amount);
}

/**
 * Returns the currency symbol for a given currency code
 * @param currency - 'INR' or 'USD'
 * @returns Currency symbol ('₹' or '$')
 */
export function getCurrencySymbol(currency: string = 'INR'): string {
  return currency === 'USD' ? '$' : '₹';
}
