// Customers usually type a local 8-digit Qatar number, so we add the 974 country code.
// Numbers that already include a country code (10-15 digits) are kept as they are.
// Keep in sync with normalizePhone in public/booking.html.
const QATAR_CODE = "974";

export function normalizePhone(input: string): string | null {
  let digits = input.replace(/\D/g, "");
  if (digits.startsWith("00")) digits = digits.slice(2);
  if (digits.length === 8) digits = QATAR_CODE + digits;
  if (digits.length < 10 || digits.length > 15) return null;
  return `+${digits}`;
}

// Best effort for older bookings saved before numbers were normalized.
export function whatsappNumber(phone: string): string {
  return (normalizePhone(phone) ?? phone).replace(/\D/g, "");
}
