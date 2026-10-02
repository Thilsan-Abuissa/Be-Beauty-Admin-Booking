// Prices and durations live on the server so a customer can't change them in the browser.
// Keep in sync with the service list in public/booking.html.
export const SERVICES: Record<string, { price: number; minutes: number }> = {
  "Classic Haircut & Style": { price: 180, minutes: 45 },
  "Full Colour": { price: 380, minutes: 120 },
  "Keratin Smoothing": { price: 650, minutes: 180 },
  "Bridal Hair Styling": { price: 450, minutes: 90 },
  "Classic Lash Extensions": { price: 250, minutes: 120 },
  "Volume Lash Extensions": { price: 350, minutes: 120 },
  "Lash Refill (within 3 weeks)": { price: 150, minutes: 60 },
  "Brow Lamination & Tint": { price: 140, minutes: 45 },
  "Gel Manicure": { price: 95, minutes: 45 },
  "Gel Pedicure": { price: 120, minutes: 60 },
  "Hand-painted Nail Art (add-on)": { price: 40, minutes: 20 },
  HydraFacial: { price: 280, minutes: 60 },
  "LED Light Therapy Facial": { price: 220, minutes: 45 },
  "Deep Cleanse Facial": { price: 180, minutes: 60 },
};

export const STYLISTS = ["No preference", "Amal", "Fathima", "Reem"];

// 24h times matching the time chips on the booking page.
export const TIME_SLOTS = ["10:00", "12:30", "15:00", "17:30", "19:00"];

export const BOOKING_WINDOW_DAYS = 30;

// Same grouping as the tabs on public/booking.html.
export const CATEGORIES: { name: string; services: string[] }[] = [
  { name: "Hair", services: ["Classic Haircut & Style", "Full Colour", "Keratin Smoothing", "Bridal Hair Styling"] },
  {
    name: "Lashes & Brows",
    services: ["Classic Lash Extensions", "Volume Lash Extensions", "Lash Refill (within 3 weeks)", "Brow Lamination & Tint"],
  },
  { name: "Nails", services: ["Gel Manicure", "Gel Pedicure", "Hand-painted Nail Art (add-on)"] },
  { name: "Facials & Skin", services: ["HydraFacial", "LED Light Therapy Facial", "Deep Cleanse Facial"] },
];
