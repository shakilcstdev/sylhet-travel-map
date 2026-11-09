"use client";

import React, { useState, useRef, useMemo, useEffect } from "react";
import { spotsData, sylhetDistricts } from "@/data/spots";
import { Upload, Download, Search, Share2, Globe, User } from "lucide-react";
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

  const mapRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setIsClient(true);

    const loadMapData = async () => {
      for (const url of geoUrls) {
        try {
          const response = await fetch(url);
          if (!response.ok) continue;

          const data = await response.json();

          if (
            data &&
            data.type === "FeatureCollection" &&
            Array.isArray(data.features)
          ) {
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

  const selectAll = () => {
    setVisitedSpots(spotsData.map((spot) => spot.id));
  };

  const clearAll = () => {
    setVisitedSpots([]);
  };

  const toggleDistrict = (districtSpots: typeof spotsData) => {
    const ids = districtSpots.map((spot) => spot.id);
    const allSelected = ids.every((id) => visitedSpots.includes(id));

    if (allSelected) {
      setVisitedSpots((previous) => previous.filter((id) => !ids.includes(id)));
    } else {
      setVisitedSpots((previous) => Array.from(new Set([...previous, ...ids])));
    }
  };

  const downloadMap = async (format: "png" | "jpg" | "pdf") => {
    if (!mapRef.current) return;

    try {
      if (document.fonts) {
        await document.fonts.ready;
      }

      const dataUrl = await toPng(mapRef.current, {
        cacheBust: true,
        pixelRatio: 2,
        backgroundColor: "#F8F6F0",
        style: { transform: "scale(1)" },
      });

      if (format === "pdf") {
        const pdf = new jsPDF("p", "mm", "a4");
        const imgProps = pdf.getImageProperties(dataUrl);
        const pageWidth = pdf.internal.pageSize.getWidth();
        const pageHeight = pdf.internal.pageSize.getHeight();
        const ratio = Math.min(pageWidth / imgProps.width, pageHeight / imgProps.height);

        const width = imgProps.width * ratio;
        const height = imgProps.height * ratio;

        pdf.addImage(
          dataUrl,
          "PNG",
          (pageWidth - width) / 2,
          5,
          width,
          height
        );

        pdf.save("আমার-সিলেট-ম্যাপ.pdf");
      } else {
        const link = document.createElement("a");
        link.href = dataUrl;
        link.download = `আমার-সিলেট-ম্যাপ.${format}`;
        link.click();
      }
    } catch (error) {
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
    <div className="flex flex-col min-h-screen bg-[#F3F6F4]">
      <header className="w-full max-w-[1400px] mx-auto p-4 flex justify-between items-center">
        <div className="flex items-center gap-2">
          <div className="bg-[#1D9F53] p-2 rounded-lg">
            <Globe className="text-white" size={24} />
          </div>
          <div className="leading-tight">
            <h1 className="font-bold text-lg text-gray-900">আমার</h1>
            <h1 className="font-bold text-lg text-gray-900">সিলেট</h1>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-sm font-bold text-[#1D9F53]">বাংলা</span>
          <button
            className="flex items-center gap-1 px-4 py-2 text-sm font-medium bg-white border border-gray-200 rounded-full hover:bg-gray-50"
            onClick={() => alert("সাইন ইন সুবিধা পরবর্তীতে যুক্ত করা হবে।")}
          >
            <User size={16} /> সাইন ইন
          </button>
        </div>
      </header>

      <div className="w-full max-w-[1300px] mx-auto p-4 flex flex-col lg:flex-row gap-6 mt-2 mb-12">
        <aside className="w-full lg:w-[380px] shrink-0">
          <div className="bg-white p-5 rounded-2xl shadow-sm border border-gray-100 flex flex-col h-[750px]">
            <div className="flex justify-between items-center mb-4">
              <h2 className="font-bold text-gray-800">যেসব জেলায় ঘুরেছি</h2>
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

          <div
            ref={mapRef}
            className="relative bg-[#F8F6F0] w-full min-h-[700px] rounded-2xl shadow-xl overflow-hidden border border-gray-200 p-8 flex flex-col items-center"
          >
            <div className="flex justify-between items-start z-10 w-full mb-4">
              <div>
                <p className="text-xs font-bold text-gray-500 mb-1">
                  বাংলাদেশ ভ্রমণ ম্যাপ
                </p>
                <h1 className="text-4xl md:text-5xl font-black text-[#1A1A1A]">
                  আমার সিলেট
                </h1>
              </div>
              <div className="flex items-end gap-1">
                <span
                  className="text-6xl md:text-7xl font-black leading-none"
                  style={{ color: activeTheme.color }}
                >
                  {visitedSpots.length}
                </span>
                <span className="text-gray-400 font-bold text-2xl mb-1">
                  /{spotsData.length}
                </span>
              </div>
            </div>

            <div className="flex-1 w-full relative flex items-center justify-center mt-4">
              {mapError ? (
                <div className="text-red-500 font-bold text-center">
                  ম্যাপ ফাইল লোড করা যায়নি।
                  <br />
                  <span className="text-sm font-normal">
                    আপনার ইন্টারনেট কানেকশন চেক করুন।
                  </span>
                </div>
              ) : !mapData ? (
                <div className="text-gray-500 font-bold animate-pulse">
                  ম্যাপ ডেটা লোড হচ্ছে...
                </div>
              ) : (
                <ComposableMap
                  projection="geoMercator"
                  projectionConfig={{
                    scale: 26000,
                    center: [91.6, 24.6],
                  }}
                  width={800}
                  height={800}
                  className="w-full h-full max-h-[600px]"
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
                                    fontSize: "18px",
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

            <div className="w-full z-10 pt-6 mt-auto">
              <div
                className="flex justify-between items-center mb-2 text-sm font-bold"
                style={{ color: activeTheme.color }}
              >
                <span>{progress}% সিলেট ঘোরা হয়েছে</span>
                <span className="text-gray-500 font-medium text-xs">
                  মোট ৪ টি জেলা • {spotsData.length} টি স্পট
                </span>
              </div>

              <div className="w-full bg-[#E5E0D5] rounded-full h-2.5 mb-5">
                <div
                  className="h-2.5 rounded-full transition-all duration-500"
                  style={{
                    width: `${progress}%`,
                    backgroundColor: activeTheme.color,
                  }}
                />
              </div>

              <div className="flex justify-between items-end border-t border-gray-200 pt-5">
                <div>
                  <p className="text-xs text-gray-500 mb-1">
                    মানচিত্র তৈরি করেছেন
                  </p>
                  <p className="text-xl font-black text-[#1A1A1A]">
                    ঘুরতে থাকুন{" "}
                    <span className="text-blue-900">গোয়াইন এর সাথে</span>
                  </p>
                </div>
                <div
                  className="w-12 h-12 rounded-xl flex items-center justify-center shadow-lg"
                  style={{ backgroundColor: activeTheme.color }}
                >
                  <Share2 size={20} className="text-white" />
                </div>
              </div>
            </div>

            {userImage && (
              <div className="absolute top-28 left-10 bg-white p-2.5 rounded-xl shadow-2xl -rotate-3 border-4 border-white z-30">
                <img
                  src={userImage}
                  alt="আপনার ছবি"
                  className="w-24 h-24 object-cover rounded-lg"
                />
                {userName && (
                  <p className="text-center text-xs font-bold mt-2 text-gray-800 bg-gray-100 py-1 rounded">
                    {userName}
                  </p>
                )}
              </div>
            )}
          </div>

          <div className="flex flex-col items-center gap-3 mt-2">
            <button
              onClick={() => downloadMap("png")}
              className="w-full md:w-auto px-16 flex items-center justify-center gap-2 py-4 rounded-xl text-md font-bold transition shadow-md text-white hover:opacity-90"
              style={{ backgroundColor: activeTheme.color }}
            >
              <Download size={20} />
              আপনার ম্যাপ ডাউনলোড করুন
            </button>

            <div className="flex gap-3">
              <button onClick={() => downloadMap("png")} className="text-sm font-medium text-gray-500 hover:text-black">PNG</button> • 
              <button onClick={() => downloadMap("jpg")} className="text-sm font-medium text-gray-500 hover:text-black">JPG</button> • 
              <button onClick={() => downloadMap("pdf")} className="text-sm font-medium text-gray-500 hover:text-black">PDF</button>
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}
