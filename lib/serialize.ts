/**
 * Serialization utility for Prisma objects in Next.js Server Components.
 * 
 * Next.js Server Components require "plain objects" when passing props to Client Components.
 * Prisma's Decimal type is an object with methods, which triggers a warning/error.
 * Date objects are natively supported by Next.js RSC serialization.
 */

/**
 * Recursively serializes Prisma objects, converting Decimal to number.
 * Preserves Date objects and other primitives.
 */
export function serializePrisma<T>(data: T): T {
  if (data === null || data === undefined) {
    return data;
  }

  // Handle arrays
  if (Array.isArray(data)) {
    return data.map(item => serializePrisma(item)) as unknown as T;
  }

  // Handle Prisma Decimal / Decimal.js
  // 1. Check for .toNumber method (most reliable)
  // 2. Check constructor name for 'Decimal'
  // 3. Check for typical internal properties { d: [], e: 0, s: 0 }
  const isDecimal = 
    typeof (data as any).toNumber === 'function' || 
    (data as any).constructor?.name === 'Decimal' ||
    (data && typeof data === 'object' && 's' in data && 'd' in data && 'e' in data);

  if (isDecimal) {
    // If it has toNumber, use it. Otherwise, look for fallback methods or return as is (but this should be a number).
    if (typeof (data as any).toNumber === 'function') {
      return (data as any).toNumber() as unknown as T;
    }
    // Fallback: manually convert to number if it has the properties but not the method (unlikely in Prisma)
    return Number(data) as unknown as T;
  }

  // Handle Date objects (keep them as is, Next.js handles them)
  if (data instanceof Date) {
    return data as unknown as T;
  }

  // Handle objects recursively
  if (typeof data === 'object') {
    // If it's a Buffer, return it or convert (Prisma sometimes uses them)
    if (Buffer.isBuffer(data)) return data as unknown as T;

    const result: any = {};
    for (const key in data) {
      if (Object.prototype.hasOwnProperty.call(data, key)) {
        result[key] = serializePrisma((data as any)[key]);
      }
    }
    return result as T;
  }

  // Return primitives as is
  return data;
}
