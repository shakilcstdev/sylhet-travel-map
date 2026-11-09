"use client";
import dynamic from "next/dynamic";

const TravelMap = dynamic(() => import("@/components/TravelMap"), { 
  ssr: false,
  loading: () => <div className="min-h-screen flex items-center justify-center text-lg font-bold text-[#1D9F53]">ম্যাপ লোড হচ্ছে...</div>
});

export default function Home() {
  return (
    <main>
      <TravelMap />
    </main>
  );
}
