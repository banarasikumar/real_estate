"use client";

import React, { useState, useEffect, useRef } from "react";
import {
  Search,
  SlidersHorizontal,
  X,
  ChevronDown,
  RotateCcw,
  IndianRupee,
  Bed,
  Bath,
  Home,
  Building,
  Sparkles,
  Check,
} from "lucide-react";

export interface SearchFiltersState {
  query: string;
  listType: "ALL" | "SALE" | "RENT";
  propType: "ALL" | "APARTMENT" | "HOUSE" | "VILLA" | "COMMERCIAL";
  minPrice?: number;
  maxPrice?: number;
  bedrooms?: number | string; // 'any' | 1 | 2 | 3 | 4 | 5
  bathrooms?: number | string; // 'any' | 1 | 2 | 3 | 4
}

export interface SearchFiltersBarProps {
  filters: SearchFiltersState;
  onChange: (filters: SearchFiltersState) => void;
  onReset?: () => void;
  totalResults?: number;
  className?: string;
}

const PRICE_PRESETS_MIN = [
  { label: "Any Min", value: undefined },
  { label: "₹20 Lacs", value: 2000000 },
  { label: "₹50 Lacs", value: 5000000 },
  { label: "₹1 Crore", value: 10000000 },
  { label: "₹2 Crores", value: 20000000 },
  { label: "₹5 Crores", value: 50000000 },
];

const PRICE_PRESETS_MAX = [
  { label: "Any Max", value: undefined },
  { label: "₹50 Lacs", value: 5000000 },
  { label: "₹1 Crore", value: 10000000 },
  { label: "₹2 Crores", value: 20000000 },
  { label: "₹5 Crores", value: 50000000 },
  { label: "₹10 Crores+", value: 100000000 },
];

const RENT_PRESETS_MIN = [
  { label: "Any Min", value: undefined },
  { label: "₹10,000", value: 10000 },
  { label: "₹25,000", value: 25000 },
  { label: "₹50,000", value: 50000 },
  { label: "₹1 Lac", value: 100000 },
  { label: "₹2 Lacs", value: 200000 },
];

const RENT_PRESETS_MAX = [
  { label: "Any Max", value: undefined },
  { label: "₹30,000", value: 30000 },
  { label: "₹60,000", value: 60000 },
  { label: "₹1 Lac", value: 100000 },
  { label: "₹2 Lacs", value: 200000 },
  { label: "₹5 Lacs+", value: 500000 },
];

const BED_OPTIONS = [
  { label: "Any", value: "any" },
  { label: "1+", value: "1" },
  { label: "2+", value: "2" },
  { label: "3+", value: "3" },
  { label: "4+", value: "4" },
];

const BATH_OPTIONS = [
  { label: "Any", value: "any" },
  { label: "1+", value: "1" },
  { label: "2+", value: "2" },
  { label: "3+", value: "3" },
  { label: "4+", value: "4" },
];

const PROPERTY_TYPES = [
  { label: "All Property Types", value: "ALL" as const, icon: Home },
  { label: "Apartment / Flat", value: "APARTMENT" as const, icon: Building },
  { label: "Independent House", value: "HOUSE" as const, icon: Home },
  { label: "Luxury Villa", value: "VILLA" as const, icon: Sparkles },
  { label: "Commercial Office / Shop", value: "COMMERCIAL" as const, icon: Building },
];

import { formatPriceLabel } from "../utils/formatters";
export { formatPriceLabel };

export default function SearchFiltersBar({
  filters,
  onChange,
  onReset,
  totalResults,
  className = "",
}: SearchFiltersBarProps) {
  const [searchInput, setSearchInput] = useState(filters.query || "");
  const [openPopover, setOpenPopover] = useState<"price" | "beds" | "type" | "more" | null>(null);

  // Temporary state inside popovers before user clicks apply
  const [tempMinPrice, setTempMinPrice] = useState<number | undefined>(filters.minPrice);
  const [tempMaxPrice, setTempMaxPrice] = useState<number | undefined>(filters.maxPrice);
  const [tempBeds, setTempBeds] = useState<number | string>(filters.bedrooms || "any");
  const [tempBaths, setTempBaths] = useState<number | string>(filters.bathrooms || "any");

  const popoverRef = useRef<HTMLDivElement>(null);

  // Keep search input in sync if parent updates it
  useEffect(() => {
    setSearchInput(filters.query || "");
  }, [filters.query]);

  // Close popovers on click outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (popoverRef.current && !popoverRef.current.contains(event.target as Node)) {
        setOpenPopover(null);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onChange({
      ...filters,
      query: searchInput.trim(),
    });
  };

  const handleClearSearch = () => {
    setSearchInput("");
    onChange({
      ...filters,
      query: "",
    });
  };

  const handleListTypeChange = (type: "ALL" | "SALE" | "RENT") => {
    onChange({
      ...filters,
      listType: type,
    });
  };

  const handlePropTypeSelect = (type: "ALL" | "APARTMENT" | "HOUSE" | "VILLA" | "COMMERCIAL") => {
    onChange({
      ...filters,
      propType: type,
    });
    setOpenPopover(null);
  };

  const handleApplyPrice = () => {
    onChange({
      ...filters,
      minPrice: tempMinPrice,
      maxPrice: tempMaxPrice,
    });
    setOpenPopover(null);
  };

  const handleClearPrice = () => {
    setTempMinPrice(undefined);
    setTempMaxPrice(undefined);
    onChange({
      ...filters,
      minPrice: undefined,
      maxPrice: undefined,
    });
    setOpenPopover(null);
  };

  const handleApplyBedsBaths = () => {
    onChange({
      ...filters,
      bedrooms: tempBeds === "any" ? undefined : tempBeds,
      bathrooms: tempBaths === "any" ? undefined : tempBaths,
    });
    setOpenPopover(null);
  };

  const handleClearBedsBaths = () => {
    setTempBeds("any");
    setTempBaths("any");
    onChange({
      ...filters,
      bedrooms: undefined,
      bathrooms: undefined,
    });
    setOpenPopover(null);
  };

  const hasActiveFilters = Boolean(
    filters.query ||
    filters.listType !== "ALL" ||
    filters.propType !== "ALL" ||
    filters.minPrice ||
    filters.maxPrice ||
    (filters.bedrooms && filters.bedrooms !== "any") ||
    (filters.bathrooms && filters.bathrooms !== "any")
  );

  const handleResetAll = () => {
    setSearchInput("");
    setTempMinPrice(undefined);
    setTempMaxPrice(undefined);
    setTempBeds("any");
    setTempBaths("any");
    setOpenPopover(null);

    if (onReset) {
      onReset();
    } else {
      onChange({
        query: "",
        listType: "ALL",
        propType: "ALL",
        minPrice: undefined,
        maxPrice: undefined,
        bedrooms: undefined,
        bathrooms: undefined,
      });
    }
  };

  // Label computations for filter buttons
  const isPriceActive = Boolean(filters.minPrice || filters.maxPrice);
  const priceButtonText = () => {
    if (filters.minPrice && filters.maxPrice) {
      return `${formatPriceLabel(filters.minPrice)} - ${formatPriceLabel(filters.maxPrice)}`;
    }
    if (filters.minPrice) return `From ${formatPriceLabel(filters.minPrice)}`;
    if (filters.maxPrice) return `Up to ${formatPriceLabel(filters.maxPrice)}`;
    return "Price";
  };

  const isBedsActive = Boolean(
    (filters.bedrooms && filters.bedrooms !== "any") ||
    (filters.bathrooms && filters.bathrooms !== "any")
  );
  const bedsButtonText = () => {
    const parts: string[] = [];
    if (filters.bedrooms && filters.bedrooms !== "any") {
      parts.push(`${filters.bedrooms}+ Beds`);
    }
    if (filters.bathrooms && filters.bathrooms !== "any") {
      parts.push(`${filters.bathrooms}+ Baths`);
    }
    return parts.length > 0 ? parts.join(", ") : "Beds & Baths";
  };

  const selectedPropTypeObj = PROPERTY_TYPES.find((t) => t.value === filters.propType);
  const isTypeActive = filters.propType !== "ALL";

  const minPresets = filters.listType === "RENT" ? RENT_PRESETS_MIN : PRICE_PRESETS_MIN;
  const maxPresets = filters.listType === "RENT" ? RENT_PRESETS_MAX : PRICE_PRESETS_MAX;

  return (
    <div ref={popoverRef} className={`w-full bg-white relative ${className}`}>
      {/* Top Main Filter Row */}
      <div className="flex flex-wrap items-center gap-2.5 pb-2">
        {/* Search Input Box */}
        <form
          onSubmit={handleSearchSubmit}
          className="relative flex-1 min-w-[220px] max-w-full sm:max-w-xs md:max-w-sm"
        >
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400 pointer-events-none" />
          <input
            type="text"
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
            placeholder="City, locality, project or keyword..."
            className="w-full pl-9 pr-8 py-2 bg-slate-50 hover:bg-slate-100/80 focus:bg-white text-sm font-medium text-slate-900 placeholder:text-slate-400 rounded-full border border-slate-200 focus:border-rose-500 focus:ring-2 focus:ring-rose-500/20 outline-none transition-all"
          />
          {searchInput && (
            <button
              type="button"
              onClick={handleClearSearch}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 p-1 text-slate-400 hover:text-slate-600 rounded-full hover:bg-slate-200 transition-colors"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </form>

        {/* Buy / Rent Switch Toggle */}
        <div className="inline-flex p-1 bg-slate-100 rounded-full border border-slate-200/80 select-none">
          <button
            type="button"
            onClick={() => handleListTypeChange("ALL")}
            className={`px-3 py-1 text-xs font-semibold rounded-full transition-all ${
              filters.listType === "ALL"
                ? "bg-white text-slate-900 shadow-sm"
                : "text-slate-600 hover:text-slate-900"
            }`}
          >
            All
          </button>
          <button
            type="button"
            onClick={() => handleListTypeChange("SALE")}
            className={`px-3 py-1 text-xs font-semibold rounded-full transition-all ${
              filters.listType === "SALE"
                ? "bg-rose-600 text-white shadow-sm"
                : "text-slate-600 hover:text-slate-900"
            }`}
          >
            Buy
          </button>
          <button
            type="button"
            onClick={() => handleListTypeChange("RENT")}
            className={`px-3 py-1 text-xs font-semibold rounded-full transition-all ${
              filters.listType === "RENT"
                ? "bg-rose-600 text-white shadow-sm"
                : "text-slate-600 hover:text-slate-900"
            }`}
          >
            Rent
          </button>
        </div>

        {/* Divider */}
        <div className="h-6 w-px bg-slate-200 hidden sm:block" />

        {/* Filter Buttons */}
        <div className="flex items-center gap-2 overflow-x-auto no-scrollbar py-0.5">
          {/* Price Range Button */}
          <div className="relative">
            <button
              type="button"
              onClick={() => {
                setTempMinPrice(filters.minPrice);
                setTempMaxPrice(filters.maxPrice);
                setOpenPopover(openPopover === "price" ? null : "price");
              }}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium border transition-all whitespace-nowrap ${
                isPriceActive
                  ? "bg-rose-50 text-rose-700 border-rose-300 font-semibold ring-1 ring-rose-300"
                  : "bg-white text-slate-700 border-slate-200 hover:border-slate-300 hover:bg-slate-50"
              }`}
            >
              <IndianRupee className="w-3.5 h-3.5" />
              <span>{priceButtonText()}</span>
              <ChevronDown
                className={`w-3.5 h-3.5 text-slate-400 transition-transform ${
                  openPopover === "price" ? "rotate-180" : ""
                }`}
              />
            </button>

            {/* Price Popover */}
            {openPopover === "price" && (
              <div className="absolute left-0 top-full mt-2 w-80 bg-white rounded-2xl border border-slate-200 shadow-2xl p-4 z-50 animate-in fade-in zoom-in-95 duration-150">
                <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                  <h4 className="text-sm font-bold text-slate-900">Price Range</h4>
                  <button
                    type="button"
                    onClick={() => setOpenPopover(null)}
                    className="p-1 text-slate-400 hover:text-slate-600 rounded-full"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>

                <div className="grid grid-cols-2 gap-3 my-4">
                  <div>
                    <label className="block text-xs font-medium text-slate-600 mb-1">
                      Minimum Price
                    </label>
                    <input
                      type="number"
                      placeholder="Min ₹"
                      value={tempMinPrice ?? ""}
                      onChange={(e) =>
                        setTempMinPrice(e.target.value ? Number(e.target.value) : undefined)
                      }
                      className="w-full px-3 py-2 text-xs border border-slate-200 rounded-xl focus:border-rose-500 focus:ring-1 focus:ring-rose-500 outline-none"
                    />
                    <div className="mt-2 flex flex-wrap gap-1 max-h-24 overflow-y-auto no-scrollbar">
                      {minPresets.map((preset) => (
                        <button
                          key={preset.label}
                          type="button"
                          onClick={() => setTempMinPrice(preset.value)}
                          className={`text-[11px] px-2 py-0.5 rounded-md border transition-colors ${
                            tempMinPrice === preset.value
                              ? "bg-rose-100 text-rose-800 border-rose-300 font-medium"
                              : "bg-slate-50 text-slate-600 border-slate-200 hover:bg-slate-100"
                          }`}
                        >
                          {preset.label}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-medium text-slate-600 mb-1">
                      Maximum Price
                    </label>
                    <input
                      type="number"
                      placeholder="Max ₹"
                      value={tempMaxPrice ?? ""}
                      onChange={(e) =>
                        setTempMaxPrice(e.target.value ? Number(e.target.value) : undefined)
                      }
                      className="w-full px-3 py-2 text-xs border border-slate-200 rounded-xl focus:border-rose-500 focus:ring-1 focus:ring-rose-500 outline-none"
                    />
                    <div className="mt-2 flex flex-wrap gap-1 max-h-24 overflow-y-auto no-scrollbar">
                      {maxPresets.map((preset) => (
                        <button
                          key={preset.label}
                          type="button"
                          onClick={() => setTempMaxPrice(preset.value)}
                          className={`text-[11px] px-2 py-0.5 rounded-md border transition-colors ${
                            tempMaxPrice === preset.value
                              ? "bg-rose-100 text-rose-800 border-rose-300 font-medium"
                              : "bg-slate-50 text-slate-600 border-slate-200 hover:bg-slate-100"
                          }`}
                        >
                          {preset.label}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>

                <div className="flex items-center justify-between pt-3 border-t border-slate-100">
                  <button
                    type="button"
                    onClick={handleClearPrice}
                    className="text-xs font-medium text-slate-600 hover:text-slate-900 px-2 py-1"
                  >
                    Clear
                  </button>
                  <button
                    type="button"
                    onClick={handleApplyPrice}
                    className="px-4 py-1.5 bg-rose-600 hover:bg-rose-700 text-white text-xs font-semibold rounded-lg shadow-sm transition-colors"
                  >
                    Apply Price
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* Beds & Baths Button */}
          <div className="relative">
            <button
              type="button"
              onClick={() => {
                setTempBeds(filters.bedrooms || "any");
                setTempBaths(filters.bathrooms || "any");
                setOpenPopover(openPopover === "beds" ? null : "beds");
              }}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium border transition-all whitespace-nowrap ${
                isBedsActive
                  ? "bg-rose-50 text-rose-700 border-rose-300 font-semibold ring-1 ring-rose-300"
                  : "bg-white text-slate-700 border-slate-200 hover:border-slate-300 hover:bg-slate-50"
              }`}
            >
              <Bed className="w-3.5 h-3.5" />
              <span>{bedsButtonText()}</span>
              <ChevronDown
                className={`w-3.5 h-3.5 text-slate-400 transition-transform ${
                  openPopover === "beds" ? "rotate-180" : ""
                }`}
              />
            </button>

            {/* Beds & Baths Popover */}
            {openPopover === "beds" && (
              <div className="absolute left-0 top-full mt-2 w-72 bg-white rounded-2xl border border-slate-200 shadow-2xl p-4 z-50 animate-in fade-in zoom-in-95 duration-150">
                <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                  <h4 className="text-sm font-bold text-slate-900">Beds & Bathrooms</h4>
                  <button
                    type="button"
                    onClick={() => setOpenPopover(null)}
                    className="p-1 text-slate-400 hover:text-slate-600 rounded-full"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>

                <div className="my-4 space-y-4">
                  <div>
                    <span className="block text-xs font-semibold text-slate-700 mb-2">Bedrooms</span>
                    <div className="grid grid-cols-5 gap-1.5">
                      {BED_OPTIONS.map((opt) => (
                        <button
                          key={opt.value}
                          type="button"
                          onClick={() => setTempBeds(opt.value)}
                          className={`py-1.5 text-xs font-medium rounded-lg border transition-all text-center ${
                            String(tempBeds) === String(opt.value)
                              ? "bg-rose-600 text-white border-rose-600 shadow-sm"
                              : "bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100"
                          }`}
                        >
                          {opt.label}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div>
                    <span className="block text-xs font-semibold text-slate-700 mb-2">Bathrooms</span>
                    <div className="grid grid-cols-5 gap-1.5">
                      {BATH_OPTIONS.map((opt) => (
                        <button
                          key={opt.value}
                          type="button"
                          onClick={() => setTempBaths(opt.value)}
                          className={`py-1.5 text-xs font-medium rounded-lg border transition-all text-center ${
                            String(tempBaths) === String(opt.value)
                              ? "bg-rose-600 text-white border-rose-600 shadow-sm"
                              : "bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100"
                          }`}
                        >
                          {opt.label}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>

                <div className="flex items-center justify-between pt-3 border-t border-slate-100">
                  <button
                    type="button"
                    onClick={handleClearBedsBaths}
                    className="text-xs font-medium text-slate-600 hover:text-slate-900 px-2 py-1"
                  >
                    Clear
                  </button>
                  <button
                    type="button"
                    onClick={handleApplyBedsBaths}
                    className="px-4 py-1.5 bg-rose-600 hover:bg-rose-700 text-white text-xs font-semibold rounded-lg shadow-sm transition-colors"
                  >
                    Apply
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* Property Type Dropdown */}
          <div className="relative">
            <button
              type="button"
              onClick={() => setOpenPopover(openPopover === "type" ? null : "type")}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium border transition-all whitespace-nowrap ${
                isTypeActive
                  ? "bg-rose-50 text-rose-700 border-rose-300 font-semibold ring-1 ring-rose-300"
                  : "bg-white text-slate-700 border-slate-200 hover:border-slate-300 hover:bg-slate-50"
              }`}
            >
              <Home className="w-3.5 h-3.5" />
              <span>{selectedPropTypeObj ? selectedPropTypeObj.label.split(" ")[0] : "Property Type"}</span>
              <ChevronDown
                className={`w-3.5 h-3.5 text-slate-400 transition-transform ${
                  openPopover === "type" ? "rotate-180" : ""
                }`}
              />
            </button>

            {/* Property Type Dropdown Menu */}
            {openPopover === "type" && (
              <div className="absolute left-0 top-full mt-2 w-64 bg-white rounded-2xl border border-slate-200 shadow-2xl p-2 z-50 animate-in fade-in zoom-in-95 duration-150">
                <div className="px-3 py-2 text-xs font-bold text-slate-500 uppercase tracking-wider">
                  Select Property Type
                </div>
                <div className="space-y-1">
                  {PROPERTY_TYPES.map((type) => {
                    const IconComp = type.icon;
                    const isSelected = filters.propType === type.value;
                    return (
                      <button
                        key={type.value}
                        type="button"
                        onClick={() => handlePropTypeSelect(type.value)}
                        className={`w-full flex items-center justify-between px-3 py-2 rounded-xl text-xs font-medium transition-colors text-left ${
                          isSelected
                            ? "bg-rose-50 text-rose-700 font-semibold"
                            : "text-slate-700 hover:bg-slate-50 hover:text-slate-900"
                        }`}
                      >
                        <div className="flex items-center gap-2.5">
                          <IconComp className={`w-4 h-4 ${isSelected ? "text-rose-600" : "text-slate-400"}`} />
                          <span>{type.label}</span>
                        </div>
                        {isSelected && <Check className="w-4 h-4 text-rose-600" />}
                      </button>
                    );
                  })}
                </div>
              </div>
            )}
          </div>

          {/* Reset Filters Button */}
          {hasActiveFilters && (
            <button
              type="button"
              onClick={handleResetAll}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold text-rose-600 bg-rose-50 hover:bg-rose-100 border border-rose-200 transition-all shadow-xs"
              title="Reset all active filters"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>Reset</span>
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
