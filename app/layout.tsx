import type { Metadata } from "next";
import { Hind_Siliguri } from "next/font/google";
import "./globals.css";

const hindSiliguri = Hind_Siliguri({ 
  weight: ['300', '400', '500', '600', '700'],
  subsets: ["bengali"] 
});

export const metadata: Metadata = {
  title: "আমার সিলেট ভ্রমণ ম্যাপ",
  description: "সিলেট বিভাগের দর্শনীয় স্থানসমূহের ইন্টারেক্টিভ ম্যাপ",
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="bn">
      <body className={`${hindSiliguri.className} bg-[#f8faf9] text-gray-800`}>{children}</body>
    </html>
  );
}
