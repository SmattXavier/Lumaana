import { DM_Sans, DM_Serif_Display } from "next/font/google";

// "Night Luxe": DM Serif Display headings, DM Sans body (public site + guest app).
export const serif = DM_Serif_Display({ subsets: ["latin"], weight: "400", variable: "--font-luxe-serif" });
export const sans = DM_Sans({ subsets: ["latin"], variable: "--font-luxe-sans" });
