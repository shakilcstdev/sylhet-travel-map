"use client";

import React, { useState, useRef, useMemo, useEffect } from "react";
import { spotsData, sylhetDistricts } from "@/data/spots";
import { Upload, Download, Search, Share2, Globe, User, Menu, MapPin, X } from "lucide-react";
import { toPng } from "html-to-image";
import jsPDF from "jspdf";
import { ComposableMap, Geographies, Geography, Marker } from "react-simple-maps";
import { geoCentroid } from "d3-geo";

const geoUrls = [
  "/bangladesh.geojson",
  "https://raw.githubusercontent.com/fahim-muntasir-niloy/Bangladesh-geojson_project/main/Geo%20Json%20Maps/BD_Districts.json"
];

const themes = [
  { id: "green", color: "#1D9F53" },
  { id: "darkblue", color: "#1E3A8A" },
  { id: "red", color: "#F87171" },
  { id: "lightblue", color: "#60A5FA" },
  { id: "black", color: "#1F2937" },
];

export default function TravelMap() {
  const [isClient, setIsClient] = useState(false);
  const [userImage, setUserImage] = useState<string | null>(null);
  const [userName, setUserName] = useState("");
  const [visitedSpots, setVisitedSpots] = useState<number[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [activeTheme, setActiveTheme] = useState(themes[0]);

  const [mapData, setMapData] = useState<any>(null);
  const [mapError, setMapError] = useState(false);

  const [downloadCount, setDownloadCount] = useState(0);

  // 🌟 Auth States 🌟
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [loggedInUser, setLoggedInUser] = useState("");
  const [showAuthModal, setShowAuthModal] = useState(false);
  const [authName, setAuthName] = useState("");
  const [authEmail, setAuthEmail] = useState("");
  const [authPassword, setAuthPassword] = useState("");

  const mapRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setIsClient(true);

    // 🌟 Check Auth State 🌟
    const savedUser = localStorage.getItem("sylhet_map_user");
    if (savedUser) {
      setIsLoggedIn(true);
      setLoggedInUser(savedUser);
    }

    // 🌟 Load Download Count 🌟
    const storedCount = localStorage.getItem("sylhet_map_download_count");
    if (storedCount) {
      setDownloadCount(parseInt(storedCount, 10));
    } else {
      localStorage.setItem("sylhet_map_download_count", "0");
    }

    const loadMapData = async () => {
      for (const url of geoUrls) {
        try {
          const response = await fetch(url);
          if (!response.ok) continue;
          const data = await response.json();
          if (data && data.type === "FeatureCollection" && Array.isArray(data.features)) {
            setMapData(data);
            setMapError(false);
            return;
          }
        } catch (error) {
          console.log("Map loading failed:", url);
        }
      }
      setMapError(true);
    };

    loadMapData();
  }, []);

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    if (!authName || !authEmail || !authPassword) {
      alert("সব তথ্য পূরণ করুন!");
      return;
    }
    setIsLoggedIn(true);
    setLoggedInUser(authName);
    localStorage.setItem("sylhet_map_user", authName);
    setShowAuthModal(false);
    
    // Clear form
    setAuthName("");
    setAuthEmail("");
    setAuthPassword("");
  };

  const handleLogout = () => {
    setIsLoggedIn(false);
    setLoggedInUser("");
    localStorage.removeItem("sylhet_map_user");
  };

  const filteredSpots = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();
    if (!query) return spotsData;

    return spotsData.filter(
      (spot) =>
        spot.name.toLowerCase().includes(query) ||
        spot.district.toLowerCase().includes(query)
    );
  }, [searchQuery]);

  const handleImageUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith("image/")) {
      alert("অনুগ্রহ করে একটি ছবি নির্বাচন করুন।");
      return;
    }
    const reader = new FileReader();
    reader.onloadend = () => {
      setUserImage(reader.result as string);
    };
    reader.readAsDataURL(file);
  };

  const toggleVisited = (id: number) => {
    setVisitedSpots((previous) =>
      previous.includes(id)
        ? previous.filter((spotId) => spotId !== id)
        : [...previous, id]
    );
  };

  const selectAll = () => setVisitedSpots(spotsData.map((spot) => spot.id));
  const clearAll = () => setVisitedSpots([]);

  const toggleDistrict = (districtSpots: typeof spotsData) => {
    const ids = districtSpots.map((spot) => spot.id);
    const allSelected = ids.every((id) => visitedSpots.includes(id));
    if (allSelected) {
      setVisitedSpots((previous) => previous.filter((id) => !ids.includes(id)));
    } else {
      setVisitedSpots((previous) => Array.from(new Set([...previous, ...ids])));
    }
  };

  const handleShare = async () => {
    if (navigator.share) {
      try {
        await navigator.share({
          title: 'সিলেট ভ্রমণ ম্যাপ',
          text: 'আমার তৈরি করা সিলেট ভ্রমণ ম্যাপটি দেখুন!',
          url: window.location.href,
        });
      } catch (error) {
        console.log('Error sharing:', error);
      }
    } else {
      navigator.clipboard.writeText(window.location.href);
      alert('লিংকটি কপি করা হয়েছে! এখন বন্ধুদের সাথে শেয়ার করুন।');
    }
  };

  const downloadMap = async (format: "png" | "jpg" | "pdf") => {
    if (!mapRef.current) return;
    const originalNode = mapRef.current;

    const clone = originalNode.cloneNode(true) as HTMLElement;
    
    clone.style.width = "800px";
    clone.style.height = "1000px";
    clone.style.maxWidth = "none";
    clone.style.maxHeight = "none";
    clone.style.position = "fixed";
    clone.style.top = "0";
    clone.style.left = "0";
    clone.style.zIndex = "-9999";
    clone.style.backgroundColor = "#F8F6F0";

    const header = clone.querySelector('div.flex.justify-between.items-start') as HTMLElement;
    if (header) {
      header.style.padding = "32px 32px 0 32px";
      const imgContainer = header.querySelector('div.bg-white') as HTMLElement;
      if (imgContainer) {
        imgContainer.style.width = "96px";
        imgContainer.style.padding = "8px";
        const img = imgContainer.querySelector('img') as HTMLElement;
        if (img) {
          img.style.width = "80px";
          img.style.height = "80px";
        }
        const nameP = imgContainer.querySelector('p') as HTMLElement;
        if (nameP) {
          nameP.style.fontSize = "9px";
        }
      }
      const title = header.querySelector('h1') as HTMLElement;
      if (title) title.style.fontSize = "36px";
      
      const subtitle = header.querySelector('p.text-\\[10px\\]') as HTMLElement;
      if (subtitle) subtitle.style.fontSize = "14px";

      const counter = header.querySelector('span.text-3xl') as HTMLElement;
      if (counter) counter.style.fontSize = "60px";
      
      const counterTotal = header.querySelector('span.text-gray-400') as HTMLElement;
      if (counterTotal) counterTotal.style.fontSize = "24px";
    }

    const mapArea = clone.querySelector('.flex-1.min-h-0') as HTMLElement;
    if (mapArea) {
      mapArea.style.flex = "none";
      mapArea.style.height = "680px";
    }

    const footer = clone.querySelector('div.border-t') as HTMLElement;
    if (footer) {
      footer.style.padding = "32px";
      footer.style.paddingTop = "16px";
    }

    document.body.appendChild(clone);

    try {
      if (document.fonts) {
        await document.fonts.ready;
      }
      await new Promise((resolve) => setTimeout(resolve, 500));

      const dataUrl = await toPng(clone, {
        cacheBust: true,
        pixelRatio: 2,
        backgroundColor: "#F8F6F0",
        width: 800,
        height: 1000,
      });

      document.body.removeChild(clone);

      if (format === "pdf") {
        const pdf = new jsPDF("p", "mm", "a4");
        const imgProps = pdf.getImageProperties(dataUrl);
        const pageWidth = pdf.internal.pageSize.getWidth();
        const pageHeight = pdf.internal.pageSize.getHeight();
        const ratio = Math.min(pageWidth / imgProps.width, pageHeight / imgProps.height);

        const width = imgProps.width * ratio;
        const height = imgProps.height * ratio;

        pdf.addImage(dataUrl, "PNG", (pageWidth - width) / 2, 5, width, height);
        pdf.save("সিলেট-ভ্রমণ-ম্যাপ.pdf");
      } else {
        const link = document.createElement("a");
        link.href = dataUrl;
        link.download = `সিলেট-ভ্রমণ-ম্যাপ.${format}`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
      }

      setDownloadCount((prevCount) => {
        const newCount = prevCount + 1;
        localStorage.setItem("sylhet_map_download_count", newCount.toString());
        return newCount;
      });

    } catch (error) {
      if (document.body.contains(clone)) {
        document.body.removeChild(clone);
      }
      console.error("Download failed:", error);
      alert("ম্যাপ ডাউনলোড করা যাচ্ছে না। আবার চেষ্টা করুন।");
    }
  };

  const progress = Math.round((visitedSpots.length / spotsData.length) * 100);

  if (!isClient) {
    return (
      <div className="min-h-screen flex items-center justify-center text-lg font-bold text-[#1D9F53]">
        লোড হচ্ছে...
      </div>
    );
  }

  return (
    <div className="flex flex-col min-h-screen bg-[#F3F6F4] relative">
      
      {/* 🌟 Auth Modal (Pop-up) 🌟 */}
      {showAuthModal && (
        <div className="fixed inset-0 bg-black/60 z-[100] flex items-center justify-center p-4 backdrop-blur-sm">
          <div className="bg-white rounded-2xl p-6 md:p-8 w-full max-w-md relative shadow-2xl animate-in fade-in zoom-in duration-200">
            <button 
              onClick={() => setShowAuthModal(false)}
              className="absolute top-4 right-4 text-gray-400 hover:text-gray-800 bg-gray-100 p-1.5 rounded-full transition"
            >
              <X size={18} />
            </button>
            <h2 className="text-2xl font-bold text-gray-900 mb-2">সাইন ইন করুন</h2>
            <p className="text-sm text-gray-500 mb-6">আপনার ম্যাপ সেভ করতে এবং আরও ফিচার পেতে লগইন করুন।</p>
            
            <form onSubmit={handleLogin} className="space-y-4">
              <div>
                <label className="text-sm font-semibold text-gray-700 block mb-1">আপনার নাম</label>
                <input 
                  type="text" 
                  value={authName}
                  onChange={(e) => setAuthName(e.target.value)}
                  className="w-full border border-gray-200 rounded-lg p-3 text-sm outline-none focus:border-[#1D9F53]" 
                  placeholder="যেমন: শাকিল আহমেদ"
                />
              </div>
              <div>
                <label className="text-sm font-semibold text-gray-700 block mb-1">ইমেইল</label>
                <input 
                  type="email" 
                  value={authEmail}
                  onChange={(e) => setAuthEmail(e.target.value)}
                  className="w-full border border-gray-200 rounded-lg p-3 text-sm outline-none focus:border-[#1D9F53]" 
                  placeholder="hello@example.com"
                />
              </div>
              <div>
                <label className="text-sm font-semibold text-gray-700 block mb-1">পাসওয়ার্ড</label>
                <input 
                  type="password" 
                  value={authPassword}
                  onChange={(e) => setAuthPassword(e.target.value)}
                  className="w-full border border-gray-200 rounded-lg p-3 text-sm outline-none focus:border-[#1D9F53]" 
                  placeholder="********"
                />
              </div>
              <button 
                type="submit" 
                className="w-full bg-[#1D9F53] text-white py-3 rounded-lg font-bold text-sm hover:bg-green-700 transition"
              >
                লগইন করুন
              </button>
            </form>
          </div>
        </div>
      )}

      {/* 🌟 নেভবার 🌟 */}
      <nav className="w-full bg-white border-b border-gray-200 sticky top-0 z-50">
        <div className="max-w-[1300px] mx-auto px-4 py-3 flex justify-between items-center">
          <div className="flex items-center gap-2">
            <div className="bg-[#1D9F53] p-1.5 rounded-lg flex items-center justify-center">
              <MapPin className="text-white" size={20} />
            </div>
            <div className="leading-tight">
              <h1 className="font-bold text-md text-gray-900">আমার</h1>
              <h1 className="font-bold text-md text-gray-900">সিলেট</h1>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button className="text-xs font-bold px-3 py-1.5 rounded-full bg-gray-100 text-gray-800 hover:bg-gray-200 transition">
              EN
            </button>
            
            {/* 🌟 Auth Button Logic in Navbar 🌟 */}
            {isLoggedIn ? (
              <div className="flex items-center gap-3">
                <span className="text-sm font-bold text-gray-800 hidden sm:block">
                  স্বাগতম, {loggedInUser.split(" ")[0]}
                </span>
                <button 
                  onClick={handleLogout}
                  className="p-1.5 rounded-full border border-red-200 text-red-500 hover:bg-red-50 transition text-xs font-bold px-3"
                >
                  লগআউট
                </button>
              </div>
            ) : (
              <button 
                onClick={() => setShowAuthModal(true)}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-full border border-gray-200 text-gray-700 hover:bg-gray-50 transition text-xs font-bold"
              >
                <User size={16} />
                সাইন ইন
              </button>
            )}

            <button className="p-1.5 rounded-full border border-gray-200 text-gray-600 hover:bg-gray-50 transition hidden sm:block">
              <Menu size={18} />
            </button>
          </div>
        </div>
      </nav>

      {/* 🌟 হিরো সেকশন 🌟 */}
      <div className="w-full max-w-[800px] mx-auto text-center px-4 pt-10 pb-4">
        <h1 className="text-3xl md:text-4xl font-black text-gray-900 mb-3">
          <span className="text-[#1D9F53]">সিলেট</span> ভ্রমণ ম্যাপ
        </h1>
        
        <div className="inline-flex items-center gap-2 bg-white px-4 py-2 rounded-full shadow-sm border border-gray-100 mb-4">
          <div className="w-2.5 h-2.5 bg-[#1D9F53] rounded-full animate-pulse"></div>
          <span className="text-xs font-semibold text-gray-600">
            এ পর্যন্ত {downloadCount.toLocaleString("bn-BD")} টি ম্যাপ ডাউনলোড হয়েছে
          </span>
        </div>

        <p className="text-sm md:text-base text-gray-600 max-w-xl mx-auto leading-relaxed">
          যেসব জেলায়/স্পটে ঘুরেছেন বেছে নিন, পছন্দের থিম দিন, আর ডাউনলোড করুন নিজের ভ্রমণ ম্যাপ। একদম ফ্রি।
        </p>
      </div>

      <div className="w-full max-w-[1300px] mx-auto p-4 flex flex-col lg:flex-row gap-6 mb-12">
        <aside className="w-full lg:w-[380px] shrink-0">
          <div className="bg-white p-5 rounded-2xl shadow-sm border border-gray-100 flex flex-col h-[750px]">
            <div className="flex justify-between items-center mb-4">
              <h2 className="font-bold text-gray-800">যেসব জেলায়/স্পটে ঘুরেছেন বেছে নিন</h2>
              <span
                className="text-xs font-bold px-2 py-1 rounded-md"
                style={{
                  color: activeTheme.color,
                  backgroundColor: `${activeTheme.color}20`,
                }}
              >
                {visitedSpots.length} / {spotsData.length}
              </span>
            </div>

            <div className="relative mb-4">
              <Search className="absolute left-3 top-2.5 text-gray-400" size={18} />
              <input
                type="text"
                placeholder="জেলা বা স্পট খুঁজুন..."
                className="w-full bg-gray-50 border border-gray-200 pl-10 p-2.5 rounded-xl text-sm outline-none focus:border-gray-400"
                value={searchQuery}
                onChange={(event) => setSearchQuery(event.target.value)}
              />
            </div>

            <div className="flex gap-4 mb-5 text-sm font-medium text-gray-500 px-1 border-b pb-4">
              <button onClick={selectAll} className="hover:text-gray-800">
                সব বাছাই করুন
              </button>
              <button onClick={clearAll} className="hover:text-red-500">
                সব মুছুন
              </button>
            </div>

            <div className="flex-1 overflow-y-auto pr-2 custom-scrollbar space-y-6">
              {sylhetDistricts.map((district) => {
                const districtSpots = filteredSpots.filter(
                  (spot) => spot.district === district.bn
                );
                if (districtSpots.length === 0) return null;

                const selectedCount = districtSpots.filter((spot) =>
                  visitedSpots.includes(spot.id)
                ).length;
                const isAllSelected = selectedCount === districtSpots.length;

                return (
                  <div key={district.en}>
                    <div className="flex justify-between items-center mb-3">
                      <h3 className="font-bold text-[15px] text-gray-800 flex items-center gap-2">
                        {district.bn} জেলা
                        <span className="text-xs text-gray-400 font-normal">
                          {selectedCount}/{districtSpots.length}
                        </span>
                      </h3>
                      <button
                        onClick={() => toggleDistrict(districtSpots)}
                        className="text-xs text-gray-500 hover:text-gray-800"
                      >
                        {isAllSelected ? "মুছুন" : "সব বাছাই"}
                      </button>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      {districtSpots.map((spot) => {
                        const isSelected = visitedSpots.includes(spot.id);
                        return (
                          <button
                            key={spot.id}
                            onClick={() => toggleVisited(spot.id)}
                            className={`text-xs px-3 py-1.5 rounded-full font-medium transition border ${
                              isSelected
                                ? "text-white border-transparent shadow-sm"
                                : "bg-gray-100 text-gray-600 border-transparent hover:bg-gray-200"
                            }`}
                            style={{
                              backgroundColor: isSelected ? activeTheme.color : undefined,
                            }}
                          >
                            {spot.name}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                );
              })}
              {filteredSpots.length === 0 && (
                <div className="text-center text-gray-400 text-sm py-10">
                  কোনো স্পট পাওয়া যায়নি।
                </div>
              )}
            </div>
          </div>
        </aside>

        <main className="flex-1 min-w-0 flex flex-col gap-4">
          <div className="bg-white p-4 rounded-2xl shadow-sm border border-gray-100 flex flex-col gap-4">
            <div className="flex items-center gap-3">
              <span className="text-sm font-bold text-gray-600">থিম:</span>
              <div className="flex gap-2">
                {themes.map((theme) => (
                  <button
                    key={theme.id}
                    onClick={() => setActiveTheme(theme)}
                    className={`w-8 h-8 rounded-full border-2 transition-all flex items-center justify-center ${
                      activeTheme.id === theme.id
                        ? "border-gray-800 scale-110 shadow-md"
                        : "border-transparent hover:scale-105"
                    }`}
                    style={{ backgroundColor: theme.color }}
                  >
                    {activeTheme.id === theme.id && (
                      <div className="w-2 h-2 bg-white rounded-full" />
                    )}
                  </button>
                ))}
              </div>
            </div>

            <div className="flex items-center gap-4 flex-wrap border-t pt-4 border-gray-100">
              <div className="flex items-center gap-3">
                <label className="relative flex items-center justify-center w-10 h-10 border-2 border-dashed border-gray-300 rounded-full cursor-pointer hover:border-gray-400 overflow-hidden shrink-0 bg-gray-50">
                  {userImage ? (
                    <img src={userImage} alt="আপনার ছবি" className="w-full h-full object-cover" />
                  ) : (
                    <Upload size={16} className="text-gray-400" />
                  )}
                  <input
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={handleImageUpload}
                  />
                </label>
                <span className="text-sm font-medium text-gray-600">
                  আপনার ছবি যোগ করুন
                </span>
              </div>
              <input
                type="text"
                placeholder="আপনার নাম (ঐচ্ছিক)"
                className="border border-gray-200 px-3 py-2 rounded-lg text-sm outline-none focus:border-gray-400 flex-1 min-w-[150px]"
                value={userName}
                onChange={(event) => setUserName(event.target.value)}
              />
            </div>
          </div>

          <div className="flex justify-center w-full">
            <div
              ref={mapRef}
              className="relative bg-[#F8F6F0] w-full max-w-[700px] aspect-[4/5] rounded-2xl shadow-2xl overflow-hidden border-[10px] border-white flex flex-col"
            >
              
              {/* টপ সেকশন */}
              <div className="flex justify-between items-start z-10 w-full p-4 md:p-8 pb-0 shrink-0">
                
                <div className="flex items-start gap-2 md:gap-4">
                  {userImage && (
                    <div className="bg-white p-1.5 md:p-2 rounded-lg shadow-sm -rotate-2 border border-gray-200 w-[64px] md:w-[96px] z-20 shrink-0 flex flex-col items-center">
                      <img
                        src={userImage}
                        alt="আপনার ছবি"
                        className="w-12 h-12 md:w-20 md:h-20 object-cover rounded-md"
                      />
                      {userName && (
                        <p className="text-center text-[7px] md:text-[9px] font-bold mt-1 text-gray-800 bg-gray-100 py-0.5 px-1 rounded w-full break-words leading-tight uppercase">
                          {userName}
                        </p>
                      )}
                    </div>
                  )}

                  <div className="flex flex-col pt-1">
                    <h1 className="text-xl md:text-4xl font-black text-[#1A1A1A] whitespace-nowrap leading-tight">
                      আমার সিলেট
                    </h1>
                    <p className="text-[10px] md:text-sm font-semibold text-gray-600 mt-0.5 md:mt-1 whitespace-nowrap">
                      ভ্রমণ ম্যাপ
                    </p>
                  </div>
                </div>

                <div className="flex items-end gap-0.5 md:gap-1 shrink-0 pt-2">
                  <span
                    className="text-3xl md:text-6xl font-black leading-none"
                    style={{ color: activeTheme.color }}
                  >
                    {visitedSpots.length}
                  </span>
                  <span className="text-gray-400 font-bold text-sm md:text-2xl mb-0.5 md:mb-1">
                    /{spotsData.length}
                  </span>
                </div>
              </div>

              {/* ম্যাপ এরিয়া */}
              <div className="flex-1 min-h-0 w-full relative flex items-center justify-center p-2 md:p-4">
                {mapError ? (
                  <div className="text-red-500 font-bold text-center text-sm md:text-base">
                    ম্যাপ ফাইল লোড করা যায়নি।
                  </div>
                ) : !mapData ? (
                  <div className="text-gray-500 font-bold animate-pulse text-sm md:text-base">
                    ম্যাপ ডেটা লোড হচ্ছে...
                  </div>
                ) : (
                  <ComposableMap
                    projection="geoMercator"
                    projectionConfig={{ scale: 35000, center: [91.6, 24.6] }}
                    width={800}
                    height={1000}
                    style={{ width: "100%", height: "100%" }}
                  >
                    <Geographies geography={mapData}>
                      {({ geographies }) =>
                        geographies
                          .filter((geo) => {
                            const name = (
                              geo.properties?.NAME_2 ||
                              geo.properties?.name ||
                              geo.properties?.ADM2_EN ||
                              ""
                            ).toLowerCase();
                            return (
                              name === "sylhet" ||
                              name === "sunamganj" ||
                              name === "moulvibazar" ||
                              name === "maulvibazar" ||
                              name === "habiganj"
                            );
                          })
                          .map((geo) => {
                            const geoName = (
                              geo.properties?.NAME_2 ||
                              geo.properties?.name ||
                              geo.properties?.ADM2_EN ||
                              ""
                            ).toLowerCase();

                            let districtBn = "";
                            if (geoName === "sylhet") districtBn = "সিলেট";
                            else if (geoName === "sunamganj") districtBn = "সুনামগঞ্জ";
                            else if (geoName === "moulvibazar" || geoName === "maulvibazar")
                              districtBn = "মৌলভীবাজার";
                            else if (geoName === "habiganj") districtBn = "হবিগঞ্জ";

                            const [x, y] = geoCentroid(geo);

                            return (
                              <React.Fragment key={geo.rsmKey}>
                                <Geography
                                  geography={geo}
                                  fill="#E5E0D5"
                                  stroke="#FFFFFF"
                                  strokeWidth={2}
                                  style={{
                                    default: { outline: "none", transition: "fill 300ms" },
                                    hover: { fill: "#d6d0c4", outline: "none" },
                                    pressed: { outline: "none" },
                                  } as any}
                                />

                                <Marker coordinates={[x, y]}>
                                  <text
                                    textAnchor="middle"
                                    y={0}
                                    style={{
                                      fontFamily: "inherit",
                                      fill: "#173D2B",
                                      fontSize: "16px",
                                      fontWeight: "900",
                                      paintOrder: "stroke",
                                    }}
                                    stroke="#FFFFFF"
                                    strokeWidth={3}
                                    className="pointer-events-none drop-shadow-sm"
                                  >
                                    {districtBn}
                                  </text>
                                </Marker>
                              </React.Fragment>
                            );
                          })
                      }
                    </Geographies>

                    {spotsData.map((spot) => {
                      const isSelected = visitedSpots.includes(spot.id);

                      return (
                        <Marker
                          key={spot.id}
                          coordinates={spot.coordinates as [number, number]}
                        >
                          <g
                            className="cursor-pointer group"
                            onClick={() => toggleVisited(spot.id)}
                          >
                            <circle
                              r={isSelected ? 4.5 : 2.5}
                              fill={isSelected ? activeTheme.color : "#D32F2F"}
                              stroke="#FFFFFF"
                              strokeWidth={1.5}
                              className="transition-all duration-200 group-hover:r-5"
                            />
                            
                            {isSelected && (
                              <g transform="translate(0, -12)">
                                <rect
                                  x={-(spot.name.length * 3.5 + 6)}
                                  y={-8}
                                  width={spot.name.length * 7 + 12}
                                  height={14}
                                  rx={7}
                                  fill={activeTheme.color}
                                  className="drop-shadow-md opacity-95"
                                />
                                <text
                                  textAnchor="middle"
                                  y={2}
                                  fontSize={7.5}
                                  fontWeight="bold"
                                  fill="#FFFFFF"
                                  className="pointer-events-none"
                                >
                                  {spot.name}
                                </text>
                              </g>
                            )}
                          </g>
                        </Marker>
                      );
                    })}
                  </ComposableMap>
                )}
              </div>

              {/* বটম সেকশন */}
              <div className="w-full z-10 bg-[#F8F6F0] p-4 md:p-8 pt-3 md:pt-4 border-t border-gray-200 mt-auto shrink-0">
                <div
                  className="flex justify-between items-center mb-1.5 md:mb-2 text-[10px] md:text-sm font-bold"
                  style={{ color: activeTheme.color }}
                >
                  <span>{progress}% সিলেট ঘোরা হয়েছে</span>
                  <span className="text-gray-500 font-medium text-[8px] md:text-xs whitespace-nowrap">
                    মোট ৪ টি জেলা • {spotsData.length} টি স্পট
                  </span>
                </div>

                <div className="w-full bg-[#E5E0D5] rounded-full h-1.5 md:h-2 mb-3 md:mb-4">
                  <div
                    className="h-1.5 md:h-2 rounded-full transition-all duration-500"
                    style={{
                      width: `${progress}%`,
                      backgroundColor: activeTheme.color,
                    }}
                  />
                </div>

                <div className="flex justify-between items-end mt-2 md:mt-4">
                  <div className="flex-1 pr-1 md:pr-2">
                    <div className="flex items-center gap-1.5 md:gap-2 mb-0.5 md:mb-1">
                      <span className="text-[8px] md:text-xs font-medium text-gray-500 whitespace-nowrap">মানচিত্র তৈরি করেছেন:</span>
                      
                      <img 
                        src="/profile.png" 
                        alt="Creator" 
                        className="w-4 h-4 md:w-6 md:h-6 rounded-full object-cover border border-gray-300 shrink-0" 
                      />
                      
                      <span className="font-bold text-gray-800 text-[8px] md:text-xs uppercase whitespace-nowrap">MD SHAKIL AHAMED</span>
                    </div>
                    
                    <p className="text-sm md:text-2xl font-black text-[#1A1A1A] whitespace-nowrap">
                      ঘুরে দেখুন{" "}
                      <span className="text-blue-900">পূর্ণ সিলেট বিভাগ</span>
                    </p>
                  </div>
                  <button
                    onClick={handleShare}
                    className="w-8 h-8 md:w-12 md:h-12 rounded-lg md:rounded-xl flex items-center justify-center shadow-md hover:opacity-80 transition cursor-pointer shrink-0"
                    style={{ backgroundColor: activeTheme.color }}
                  >
                    <Share2 size={16} className="md:w-5 md:h-5 text-white" />
                  </button>
                </div>
              </div>
            </div>
          </div>

          {/* ডাউনলোড বাটন */}
          <div className="flex flex-col items-center gap-2 mt-2 w-full max-w-[400px] mx-auto px-4">
            <button
              onClick={() => downloadMap("png")}
              className="w-full flex items-center justify-center gap-2 py-3 rounded-xl text-sm md:text-base font-bold transition shadow-md text-white hover:opacity-90"
              style={{ backgroundColor: activeTheme.color }}
            >
              <Download size={18} />
              আপনার ম্যাপ ডাউনলোড করুন
            </button>

            <div className="flex justify-center gap-4 text-xs md:text-sm font-medium text-gray-500">
              <button onClick={() => downloadMap("png")} className="hover:text-black">PNG</button> • 
              <button onClick={() => downloadMap("jpg")} className="hover:text-black">JPG</button> • 
              <button onClick={() => downloadMap("pdf")} className="hover:text-black">PDF</button>
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}