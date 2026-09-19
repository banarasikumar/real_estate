'use client';

import React, { useState, useMemo, useEffect } from 'react';
import {
  Home,
  Building2,
  Percent,
  Minus,
  Plus,
  ShieldCheck,
  Zap,
  Droplets,
  Wifi,
  Sparkles,
  TrendingDown,
  Calendar,
  Layers,
  ArrowRight,
  Info,
  HelpCircle,
  RotateCcw,
  Check
} from 'lucide-react';

export interface InteractiveMortgageCalculatorProps {
  price?: number | string;
  listingType?: 'SALE' | 'RENT';
  propertyTaxRate?: number;
  hoaMonthly?: number;
}

type LoanTermType = '30_YEAR' | '15_YEAR' | '5_1_ARM';

interface SliceData {
  id: string;
  label: string;
  amount: number;
  color: string;
  percentage: number;
}

/**
 * Intelligent parser to handle Indian Crore / Lakhs, formatted currency strings, or raw numbers.
 * Always returns symbol: '₹' and defaults to 150000 (rent) or 35000000 (sale).
 */
export function getDefaultPriceAndSymbol(
  price?: number | string,
  isRent: boolean = false
): { amount: number; symbol: string } {
  const defaultPrice = isRent ? 150000 : 35000000;
  if (typeof price === 'number' && !isNaN(price)) {
    return {
      amount: price > 0 ? price : defaultPrice,
      symbol: '₹',
    };
  }

  if (typeof price === 'string') {
    const symbol = '₹';
    const lower = price.toLowerCase().trim();

    // Check for Indian Crore / Lac
    if (lower.includes('cr')) {
      const match = lower.match(/([0-9.]+)\s*cr/);
      if (match) return { amount: parseFloat(match[1]) * 10000000, symbol };
    }
    if (lower.includes('lac') || lower.includes('lakh')) {
      const match = lower.match(/([0-9.]+)\s*lac/);
      if (match) return { amount: parseFloat(match[1]) * 100000, symbol };
    }
    if (lower.includes('k')) {
      const match = lower.match(/([0-9.]+)\s*k/);
      if (match) return { amount: parseFloat(match[1]) * 1000, symbol };
    }

    const cleanNum = parseFloat(price.replace(/[^0-9.]/g, ''));
    if (!isNaN(cleanNum) && cleanNum > 0) {
      return { amount: cleanNum, symbol };
    }
    return { amount: defaultPrice, symbol };
  }

  return { amount: defaultPrice, symbol: '₹' };
}

export const parsePriceProp = getDefaultPriceAndSymbol;

/**
 * Formats values into localized Indian Rupees currency.
 */
function formatCurrency(amount: number, _symbol: string = '₹'): string {
  const rounded = Math.round(amount);
  return `₹${rounded.toLocaleString('en-IN')}`;
}

export default function InteractiveMortgageCalculator({
  price,
  listingType = 'SALE',
  propertyTaxRate: initialPropTaxRate = 1.2,
  hoaMonthly: initialHoa = 5000,
}: InteractiveMortgageCalculatorProps) {
  // Parse incoming price and detect currency symbol
  const parsedPriceData = useMemo(() => {
    return getDefaultPriceAndSymbol(price, listingType === 'RENT');
  }, [price, listingType]);

  const currencySymbol = parsedPriceData.symbol;

  // 1. Dual-Mode Switcher: 'SALE' | 'RENT'
  const [activeMode, setActiveMode] = useState<'SALE' | 'RENT'>(
    listingType === 'RENT' ? 'RENT' : 'SALE'
  );

  // Sync mode if listingType changes
  useEffect(() => {
    if (listingType) {
      setActiveMode(listingType === 'RENT' ? 'RENT' : 'SALE');
    }
  }, [listingType]);

  // ----------------------------------------------------
  // SALE MODE STATE
  // ----------------------------------------------------
  const [homePrice, setHomePrice] = useState<number>(
    listingType === 'RENT' ? 35000000 : parsedPriceData.amount
  );
  const [downPaymentPercent, setDownPaymentPercent] = useState<number>(20);
  const [interestRate, setInterestRate] = useState<number>(8.5);
  const [loanTerm, setLoanTerm] = useState<LoanTermType>('30_YEAR');
  const [taxRate, setTaxRate] = useState<number>(initialPropTaxRate || 1.2);
  const [homeInsuranceMonthly, setHomeInsuranceMonthly] = useState<number>(2500);
  const [hoaMonthly, setHoaMonthly] = useState<number>(initialHoa ?? 5000);

  // Sync home price if prop price changes in sale mode
  useEffect(() => {
    if (activeMode === 'SALE' && parsedPriceData.amount > 0) {
      setHomePrice(parsedPriceData.amount);
    }
  }, [parsedPriceData.amount, activeMode]);

  // ----------------------------------------------------
  // RENT MODE STATE
  // ----------------------------------------------------
  const [baseRent, setBaseRent] = useState<number>(
    listingType === 'RENT' ? parsedPriceData.amount : 150000
  );
  const [utilitiesElectric, setUtilitiesElectric] = useState<number>(4500);
  const [utilitiesWater, setUtilitiesWater] = useState<number>(1500);
  const [utilitiesFiber, setUtilitiesFiber] = useState<number>(1200);
  const [rentersInsuranceMonthly, setRentersInsuranceMonthly] = useState<number>(1000);
  const [securityDepositMonths, setSecurityDepositMonths] = useState<number>(2);
  const [applicationFee, setApplicationFee] = useState<number>(5000);

  // Sync rent if prop changes in rent mode
  useEffect(() => {
    if (activeMode === 'RENT' && parsedPriceData.amount > 0) {
      setBaseRent(parsedPriceData.amount);
    }
  }, [parsedPriceData.amount, activeMode]);

  // Chart hover state
  const [hoveredSlice, setHoveredSlice] = useState<string | null>(null);

  // Quick reset to initial defaults
  const handleReset = () => {
    if (activeMode === 'SALE') {
      setHomePrice(parsedPriceData.amount || 35000000);
      setDownPaymentPercent(20);
      setInterestRate(8.5);
      setLoanTerm('30_YEAR');
      setTaxRate(initialPropTaxRate || 1.2);
      setHomeInsuranceMonthly(2500);
      setHoaMonthly(initialHoa ?? 5000);
    } else {
      setBaseRent(parsedPriceData.amount || 150000);
      setUtilitiesElectric(4500);
      setUtilitiesWater(1500);
      setUtilitiesFiber(1200);
      setRentersInsuranceMonthly(1000);
      setSecurityDepositMonths(2);
      setApplicationFee(5000);
    }
  };

  // ----------------------------------------------------
  // AMORTIZATION & SALE CALCULATIONS
  // ----------------------------------------------------
  const saleCalculations = useMemo(() => {
    const downPaymentDollar = Math.round(homePrice * (downPaymentPercent / 100));
    const principalLoan = Math.max(0, homePrice - downPaymentDollar);

    // Term years & adjusted rates for 15-Yr or 5/1 ARM
    let years = 30;
    let effectiveRate = interestRate;

    if (loanTerm === '15_YEAR') {
      years = 15;
      effectiveRate = Math.max(1, interestRate - 0.5); // Typically 0.5% lower
    } else if (loanTerm === '5_1_ARM') {
      years = 30;
      effectiveRate = Math.max(1, interestRate - 0.75); // Introductory 5-year discount
    }

    const n = years * 12; // Total monthly payments
    const r = effectiveRate / 100 / 12; // Monthly interest rate

    // Standard Amortization Formula: M = P * [r(1+r)^n] / [(1+r)^n - 1]
    let monthlyPrincipalAndInterest = 0;
    if (principalLoan > 0 && n > 0) {
      if (r === 0) {
        monthlyPrincipalAndInterest = principalLoan / n;
      } else {
        const factor = Math.pow(1 + r, n);
        monthlyPrincipalAndInterest =
          principalLoan * ((r * factor) / (factor - 1));
      }
    }

    const monthlyTaxes = (homePrice * (taxRate / 100)) / 12;
    const monthlyInsurance = homeInsuranceMonthly;
    const monthlyHoaFee = hoaMonthly;

    const totalMonthlyPayment =
      monthlyPrincipalAndInterest +
      monthlyTaxes +
      monthlyInsurance +
      monthlyHoaFee;

    // Lifetime loan figures
    const totalLoanCost = monthlyPrincipalAndInterest * n;
    const totalInterestPaid = Math.max(0, totalLoanCost - principalLoan);
    const loanToValue = Math.round(
      (principalLoan / (homePrice > 0 ? homePrice : 1)) * 100
    );

    return {
      downPaymentDollar,
      principalLoan,
      monthlyPrincipalAndInterest,
      monthlyTaxes,
      monthlyInsurance,
      monthlyHoaFee,
      totalMonthlyPayment,
      totalInterestPaid,
      totalLoanCost,
      loanToValue,
      years,
      effectiveRate,
    };
  }, [
    homePrice,
    downPaymentPercent,
    interestRate,
    loanTerm,
    taxRate,
    homeInsuranceMonthly,
    hoaMonthly,
  ]);

  // ----------------------------------------------------
  // RENT CALCULATIONS
  // ----------------------------------------------------
  const rentCalculations = useMemo(() => {
    const totalUtilities = utilitiesElectric + utilitiesWater + utilitiesFiber;
    const totalMonthlyRentCost =
      baseRent + totalUtilities + rentersInsuranceMonthly;

    const securityDeposit = baseRent * securityDepositMonths;
    const totalMoveInCost =
      baseRent + securityDeposit + applicationFee + rentersInsuranceMonthly;

    return {
      baseRent,
      utilitiesElectric,
      utilitiesWater,
      utilitiesFiber,
      totalUtilities,
      rentersInsuranceMonthly,
      totalMonthlyRentCost,
      securityDeposit,
      applicationFee,
      totalMoveInCost,
    };
  }, [
    baseRent,
    utilitiesElectric,
    utilitiesWater,
    utilitiesFiber,
    rentersInsuranceMonthly,
    securityDepositMonths,
    applicationFee,
  ]);

  // ----------------------------------------------------
  // DONUT SLICES CONFIGURATION
  // ----------------------------------------------------
  const slices: SliceData[] = useMemo(() => {
    if (activeMode === 'SALE') {
      const total = saleCalculations.totalMonthlyPayment;
      const items = [
        {
          id: 'pi',
          label: 'Principal & Interest',
          amount: saleCalculations.monthlyPrincipalAndInterest,
          color: '#2563eb', // Royal Blue
        },
        {
          id: 'taxes',
          label: 'Property Taxes',
          amount: saleCalculations.monthlyTaxes,
          color: '#e11d48', // Brand Rose
        },
        {
          id: 'insurance',
          label: "Homeowner's Insurance",
          amount: saleCalculations.monthlyInsurance,
          color: '#f59e0b', // Amber
        },
        {
          id: 'hoa',
          label: 'HOA Fees',
          amount: saleCalculations.monthlyHoaFee,
          color: '#10b981', // Emerald
        },
      ];

      return items.map((item) => ({
        ...item,
        percentage: total > 0 ? (item.amount / total) * 100 : 0,
      }));
    } else {
      const total = rentCalculations.totalMonthlyRentCost;
      const items = [
        {
          id: 'rent',
          label: 'Base Rent',
          amount: rentCalculations.baseRent,
          color: '#2563eb', // Royal Blue
        },
        {
          id: 'utilities',
          label: 'Estimated Utilities',
          amount: rentCalculations.totalUtilities,
          color: '#e11d48', // Brand Rose
        },
        {
          id: 'renters_insurance',
          label: "Renter's Insurance",
          amount: rentCalculations.rentersInsuranceMonthly,
          color: '#f59e0b', // Amber
        },
        {
          id: 'hoa_amenities',
          label: 'Community & Amenities',
          amount: 0, // Included in rent or 0
          color: '#10b981', // Emerald
        },
      ];

      return items.map((item) => ({
        ...item,
        percentage: total > 0 ? (item.amount / total) * 100 : 0,
      }));
    }
  }, [activeMode, saleCalculations, rentCalculations]);

  const totalMonthlyCost =
    activeMode === 'SALE'
      ? saleCalculations.totalMonthlyPayment
      : rentCalculations.totalMonthlyRentCost;

  // Active slice for interactive center display
  const activeHoveredSliceData = useMemo(() => {
    if (!hoveredSlice) return null;
    return slices.find((s) => s.id === hoveredSlice) || null;
  }, [hoveredSlice, slices]);

  // Donut SVG Parameters
  const radius = 70;
  const circumference = 2 * Math.PI * radius; // ~439.82
  let accumulatedOffset = 0;

  return (
    <div className="w-full relative overflow-hidden rounded-3xl backdrop-blur-2xl bg-white/80 border border-slate-200/80 shadow-[0_12px_40px_-15px_rgba(0,0,0,0.08)] transition-all duration-300">
      {/* Top subtle decorative ambient glow */}
      <div className="absolute -top-24 -right-24 w-80 h-80 bg-blue-400/10 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute -bottom-24 -left-24 w-80 h-80 bg-rose-400/10 rounded-full blur-3xl pointer-events-none" />

      <div className="relative p-6 sm:p-8 space-y-8">
        {/* Header with iOS HIG aesthetic and Dual-Mode Switcher */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 pb-6 border-b border-slate-200/60">
          <div>
            <div className="flex items-center gap-2">
              <span className="p-1.5 rounded-xl bg-blue-50 text-blue-600 border border-blue-100/80 shadow-xs">
                <Sparkles className="w-4 h-4" />
              </span>
              <h3 className="text-xl sm:text-2xl font-bold tracking-tight text-slate-900">
                Payment & Affordability
              </h3>
            </div>
            <p className="text-xs sm:text-sm text-slate-500 mt-1">
              {activeMode === 'SALE'
                ? 'Accurate amortization, taxes, and monthly ownership breakdown'
                : 'Complete monthly living expenses and upfront move-in cash required'}
            </p>
          </div>

          {/* Dual-Mode Segmented Pill Switcher (Apple HIG style) */}
          <div className="flex items-center gap-2 self-stretch sm:self-auto">
            <div className="inline-flex p-1 rounded-2xl bg-slate-100/90 border border-slate-200/80 backdrop-blur-md shadow-inner w-full sm:w-auto">
              <button
                type="button"
                onClick={() => setActiveMode('SALE')}
                className={`flex-1 sm:flex-initial flex items-center justify-center gap-2 px-4 py-2 rounded-xl text-xs sm:text-sm font-semibold transition-all duration-200 ${
                  activeMode === 'SALE'
                    ? 'bg-white text-slate-900 shadow-[0_2px_8px_rgba(0,0,0,0.08)] scale-[1.02]'
                    : 'text-slate-500 hover:text-slate-900 hover:bg-white/40'
                }`}
              >
                <span>🏡</span>
                <span>Purchase Mortgage</span>
              </button>

              <button
                type="button"
                onClick={() => setActiveMode('RENT')}
                className={`flex-1 sm:flex-initial flex items-center justify-center gap-2 px-4 py-2 rounded-xl text-xs sm:text-sm font-semibold transition-all duration-200 ${
                  activeMode === 'RENT'
                    ? 'bg-white text-slate-900 shadow-[0_2px_8px_rgba(0,0,0,0.08)] scale-[1.02]'
                    : 'text-slate-500 hover:text-slate-900 hover:bg-white/40'
                }`}
              >
                <span>🏢</span>
                <span>Rental Breakdown</span>
              </button>
            </div>

            <button
              type="button"
              onClick={handleReset}
              title="Reset to defaults"
              className="p-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 active:scale-95 text-slate-500 hover:text-slate-700 transition-all border border-slate-200/60 hidden sm:flex items-center justify-center"
            >
              <RotateCcw className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Main Grid: Controls on Left, Visuals & Donut on Right */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
          {/* LEFT COLUMN: INTERACTIVE CONTROLS (7 Cols) */}
          <div className="lg:col-span-7 space-y-6">
            {activeMode === 'SALE' ? (
              /* SALE CONTROLS */
              <div className="space-y-6">
                {/* 1. Home Price Input */}
                <div className="bg-slate-50/80 backdrop-blur-md rounded-2xl p-4 sm:p-5 border border-slate-200/70 transition-all hover:border-slate-300">
                  <div className="flex justify-between items-center mb-2">
                    <label className="text-xs font-semibold uppercase tracking-wider text-slate-500">
                      Home Purchase Price
                    </label>
                    <span className="text-xs font-medium text-slate-400">
                      Editable
                    </span>
                  </div>
                  <div className="relative flex items-center">
                    <span className="absolute left-4 text-xl font-bold text-slate-400 select-none">
                      {currencySymbol}
                    </span>
                    <input
                      type="text"
                      value={homePrice ? Math.round(homePrice).toLocaleString('en-IN') : ''}
                      onChange={(e) => {
                        const val = parseFloat(e.target.value.replace(/[^0-9]/g, ''));
                        setHomePrice(isNaN(val) ? 0 : val);
                      }}
                      className="w-full pl-9 pr-4 py-3 bg-white rounded-xl border border-slate-200 text-2xl font-bold text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all shadow-xs"
                      placeholder="0"
                    />
                  </div>
                </div>

                {/* 2. Down Payment Slider + Live Computed Dollar */}
                <div className="bg-slate-50/80 backdrop-blur-md rounded-2xl p-4 sm:p-5 border border-slate-200/70 transition-all hover:border-slate-300 space-y-3">
                  <div className="flex justify-between items-baseline">
                    <label className="text-xs font-semibold uppercase tracking-wider text-slate-500">
                      Down Payment
                    </label>
                    <div className="text-right">
                      <span className="text-lg font-bold text-slate-900">
                        {formatCurrency(saleCalculations.downPaymentDollar, currencySymbol)}
                      </span>
                      <span className="ml-1.5 text-xs font-semibold px-2 py-0.5 rounded-full bg-blue-100 text-blue-700">
                        {downPaymentPercent}%
                      </span>
                    </div>
                  </div>

                  {/* iOS Style Range Slider */}
                  <div className="relative py-1">
                    <input
                      type="range"
                      min={0}
                      max={50}
                      step={1}
                      value={downPaymentPercent}
                      onChange={(e) => setDownPaymentPercent(Number(e.target.value))}
                      className="w-full h-2 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-blue-600 focus:outline-none"
                    />
                  </div>

                  {/* Quick percentage pills */}
                  <div className="flex items-center gap-2 pt-1">
                    {[5, 10, 15, 20, 30].map((pct) => (
                      <button
                        key={pct}
                        type="button"
                        onClick={() => setDownPaymentPercent(pct)}
                        className={`flex-1 py-1 text-xs font-semibold rounded-lg transition-all ${
                          downPaymentPercent === pct
                            ? 'bg-blue-600 text-white shadow-xs'
                            : 'bg-white text-slate-600 border border-slate-200/80 hover:bg-slate-100'
                        }`}
                      >
                        {pct}%
                      </button>
                    ))}
                  </div>

                  <div className="flex justify-between text-[11px] text-slate-400 pt-0.5">
                    <span>Loan Amount (Principal):</span>
                    <span className="font-semibold text-slate-700">
                      {formatCurrency(saleCalculations.principalLoan, currencySymbol)} (
                      {100 - downPaymentPercent}% LTV)
                    </span>
                  </div>
                </div>

                {/* 3. Interest Rate Slider with [-] and [+] Stepper Buttons */}
                <div className="bg-slate-50/80 backdrop-blur-md rounded-2xl p-4 sm:p-5 border border-slate-200/70 transition-all hover:border-slate-300 space-y-3">
                  <div className="flex justify-between items-center">
                    <label className="text-xs font-semibold uppercase tracking-wider text-slate-500">
                      Interest Rate (Annual APR)
                    </label>

                    {/* Stepper Buttons [-] and [+] */}
                    <div className="flex items-center gap-1.5 bg-white p-1 rounded-xl border border-slate-200 shadow-xs">
                      <button
                        type="button"
                        onClick={() =>
                          setInterestRate((prev) =>
                            Math.max(6.0, +(prev - 0.1).toFixed(2))
                          )
                        }
                        className="w-7 h-7 rounded-lg bg-slate-100 hover:bg-slate-200 active:scale-90 flex items-center justify-center text-slate-700 font-bold transition-all"
                        aria-label="Decrease rate by 0.1%"
                      >
                        <Minus className="w-3.5 h-3.5" />
                      </button>

                      <div className="w-16 text-center font-bold text-slate-900 text-sm">
                        {interestRate.toFixed(2)}%
                      </div>

                      <button
                        type="button"
                        onClick={() =>
                          setInterestRate((prev) =>
                            Math.min(14.0, +(prev + 0.1).toFixed(2))
                          )
                        }
                        className="w-7 h-7 rounded-lg bg-slate-100 hover:bg-slate-200 active:scale-90 flex items-center justify-center text-slate-700 font-bold transition-all"
                        aria-label="Increase rate by 0.1%"
                      >
                        <Plus className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>

                  <div className="relative py-1">
                    <input
                      type="range"
                      min={6.0}
                      max={14.0}
                      step={0.1}
                      value={interestRate}
                      onChange={(e) => setInterestRate(parseFloat(e.target.value))}
                      className="w-full h-2 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-blue-600 focus:outline-none"
                    />
                  </div>

                  <div className="flex justify-between text-[11px] text-slate-400">
                    <span>6.0% (Subsidized)</span>
                    <span>8.5% (Typical Benchmark)</span>
                    <span>14.0%</span>
                  </div>
                </div>

                {/* 4. Loan Term Pills */}
                <div className="bg-slate-50/80 backdrop-blur-md rounded-2xl p-4 sm:p-5 border border-slate-200/70 transition-all hover:border-slate-300 space-y-3">
                  <div className="flex justify-between items-center">
                    <label className="text-xs font-semibold uppercase tracking-wider text-slate-500">
                      Loan Term & Structure
                    </label>
                    <span className="text-xs font-medium text-slate-400">
                      {loanTerm === '30_YEAR'
                        ? '360 Payments'
                        : loanTerm === '15_YEAR'
                        ? '180 Payments (Save on interest)'
                        : 'Initial 5-Year Fixed'}
                    </span>
                  </div>

                  <div className="grid grid-cols-3 gap-2">
                    {[
                      { id: '30_YEAR', label: '30-Year Fixed', desc: 'Lower monthly' },
                      { id: '15_YEAR', label: '15-Year Fixed', desc: 'Lower rate & interest' },
                      { id: '5_1_ARM', label: '5/1 ARM', desc: 'Initial discount' },
                    ].map((term) => (
                      <button
                        key={term.id}
                        type="button"
                        onClick={() => setLoanTerm(term.id as LoanTermType)}
                        className={`p-3 rounded-xl text-left transition-all border ${
                          loanTerm === term.id
                            ? 'bg-blue-600 text-white border-blue-600 shadow-sm scale-[1.02]'
                            : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-100/70'
                        }`}
                      >
                        <p className="text-xs sm:text-sm font-bold leading-tight">
                          {term.label}
                        </p>
                        <p
                          className={`text-[10px] mt-0.5 ${
                            loanTerm === term.id ? 'text-blue-100' : 'text-slate-400'
                          }`}
                        >
                          {term.desc}
                        </p>
                      </button>
                    ))}
                  </div>
                </div>

                {/* 5. Additional Expenses: Taxes, Insurance & HOA */}
                <div className="bg-slate-50/80 backdrop-blur-md rounded-2xl p-4 sm:p-5 border border-slate-200/70 space-y-4">
                  <div className="flex items-center gap-2">
                    <Layers className="w-4 h-4 text-slate-400" />
                    <label className="text-xs font-semibold uppercase tracking-wider text-slate-500">
                      Taxes, Insurance & HOA Dues
                    </label>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                    {/* Property Tax Rate */}
                    <div className="bg-white p-3 rounded-xl border border-slate-200">
                      <div className="flex justify-between items-center text-xs text-slate-500 mb-1">
                        <span>Property Tax</span>
                        <span className="font-bold text-rose-600">{taxRate}%/yr</span>
                      </div>
                      <input
                        type="range"
                        min={0.2}
                        max={3.0}
                        step={0.05}
                        value={taxRate}
                        onChange={(e) => setTaxRate(parseFloat(e.target.value))}
                        className="w-full h-1.5 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-rose-600"
                      />
                      <p className="text-[11px] text-slate-400 mt-1">
                        {formatCurrency(saleCalculations.monthlyTaxes, currencySymbol)}/mo
                      </p>
                    </div>

                    {/* Homeowner's Insurance */}
                    <div className="bg-white p-3 rounded-xl border border-slate-200">
                      <div className="flex justify-between items-center text-xs text-slate-500 mb-1">
                        <span>Home Insurance</span>
                        <span className="font-bold text-amber-600">
                          {formatCurrency(homeInsuranceMonthly, currencySymbol)}
                        </span>
                      </div>
                      <input
                        type="range"
                        min={500}
                        max={15000}
                        step={250}
                        value={homeInsuranceMonthly}
                        onChange={(e) =>
                          setHomeInsuranceMonthly(parseInt(e.target.value, 10))
                        }
                        className="w-full h-1.5 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-amber-600"
                      />
                      <p className="text-[11px] text-slate-400 mt-1">Estimated / mo</p>
                    </div>

                    {/* HOA Monthly */}
                    <div className="bg-white p-3 rounded-xl border border-slate-200">
                      <div className="flex justify-between items-center text-xs text-slate-500 mb-1">
                        <span>HOA / Maint. Dues</span>
                        <span className="font-bold text-emerald-600">
                          {formatCurrency(hoaMonthly, currencySymbol)}
                        </span>
                      </div>
                      <input
                        type="range"
                        min={0}
                        max={50000}
                        step={500}
                        value={hoaMonthly}
                        onChange={(e) => setHoaMonthly(parseInt(e.target.value, 10))}
                        className="w-full h-1.5 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-emerald-600"
                      />
                      <p className="text-[11px] text-slate-400 mt-1">Maintenance dues</p>
                    </div>
                  </div>
                </div>
              </div>
            ) : (
              /* RENT CONTROLS */
              <div className="space-y-6">
                {/* 1. Base Rent Input */}
                <div className="bg-slate-50/80 backdrop-blur-md rounded-2xl p-4 sm:p-5 border border-slate-200/70 transition-all hover:border-slate-300">
                  <div className="flex justify-between items-center mb-2">
                    <label className="text-xs font-semibold uppercase tracking-wider text-slate-500">
                      Monthly Base Rent
                    </label>
                    <span className="text-xs font-medium text-slate-400">
                      Per Month
                    </span>
                  </div>
                  <div className="relative flex items-center">
                    <span className="absolute left-4 text-xl font-bold text-slate-400 select-none">
                      {currencySymbol}
                    </span>
                    <input
                      type="text"
                      value={baseRent ? Math.round(baseRent).toLocaleString('en-IN') : ''}
                      onChange={(e) => {
                        const val = parseFloat(e.target.value.replace(/[^0-9]/g, ''));
                        setBaseRent(isNaN(val) ? 0 : val);
                      }}
                      className="w-full pl-9 pr-4 py-3 bg-white rounded-xl border border-slate-200 text-2xl font-bold text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all shadow-xs"
                      placeholder="0"
                    />
                  </div>
                </div>

                {/* 2. Estimated Utilities Breakdown */}
                <div className="bg-slate-50/80 backdrop-blur-md rounded-2xl p-4 sm:p-5 border border-slate-200/70 space-y-4">
                  <div className="flex justify-between items-center">
                    <label className="text-xs font-semibold uppercase tracking-wider text-slate-500">
                      Estimated Monthly Utilities
                    </label>
                    <span className="text-sm font-bold text-rose-600">
                      +{formatCurrency(rentCalculations.totalUtilities, currencySymbol)}/mo
                    </span>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    {/* Electric & Gas */}
                    <div className="bg-white p-3 rounded-xl border border-slate-200 space-y-1.5">
                      <div className="flex items-center gap-1.5 text-xs text-slate-600 font-semibold">
                        <Zap className="w-3.5 h-3.5 text-amber-500" />
                        <span>Electric & Gas</span>
                      </div>
                      <div className="flex justify-between items-baseline">
                        <span className="text-sm font-bold text-slate-900">
                          {formatCurrency(utilitiesElectric, currencySymbol)}
                        </span>
                      </div>
                      <input
                        type="range"
                        min={1000}
                        max={20000}
                        step={250}
                        value={utilitiesElectric}
                        onChange={(e) =>
                          setUtilitiesElectric(parseInt(e.target.value, 10))
                        }
                        className="w-full h-1.5 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-blue-600"
                      />
                    </div>

                    {/* Water, Sewer & Trash */}
                    <div className="bg-white p-3 rounded-xl border border-slate-200 space-y-1.5">
                      <div className="flex items-center gap-1.5 text-xs text-slate-600 font-semibold">
                        <Droplets className="w-3.5 h-3.5 text-blue-500" />
                        <span>Water & Maint.</span>
                      </div>
                      <div className="flex justify-between items-baseline">
                        <span className="text-sm font-bold text-slate-900">
                          {formatCurrency(utilitiesWater, currencySymbol)}
                        </span>
                      </div>
                      <input
                        type="range"
                        min={300}
                        max={6000}
                        step={100}
                        value={utilitiesWater}
                        onChange={(e) =>
                          setUtilitiesWater(parseInt(e.target.value, 10))
                        }
                        className="w-full h-1.5 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-blue-600"
                      />
                    </div>

                    {/* Fiber Internet */}
                    <div className="bg-white p-3 rounded-xl border border-slate-200 space-y-1.5">
                      <div className="flex items-center gap-1.5 text-xs text-slate-600 font-semibold">
                        <Wifi className="w-3.5 h-3.5 text-emerald-500" />
                        <span>Gigabit Fiber</span>
                      </div>
                      <div className="flex justify-between items-baseline">
                        <span className="text-sm font-bold text-slate-900">
                          {formatCurrency(utilitiesFiber, currencySymbol)}
                        </span>
                      </div>
                      <input
                        type="range"
                        min={500}
                        max={4000}
                        step={100}
                        value={utilitiesFiber}
                        onChange={(e) =>
                          setUtilitiesFiber(parseInt(e.target.value, 10))
                        }
                        className="w-full h-1.5 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-blue-600"
                      />
                    </div>
                  </div>
                </div>

                {/* 3. Renter's Insurance */}
                <div className="bg-slate-50/80 backdrop-blur-md rounded-2xl p-4 sm:p-5 border border-slate-200/70 space-y-3">
                  <div className="flex justify-between items-center">
                    <div className="flex items-center gap-2">
                      <ShieldCheck className="w-4 h-4 text-amber-500" />
                      <label className="text-xs font-semibold uppercase tracking-wider text-slate-500">
                        Renter's Insurance Policy
                      </label>
                    </div>
                    <span className="text-sm font-bold text-slate-900">
                      {formatCurrency(rentersInsuranceMonthly, currencySymbol)}/mo
                    </span>
                  </div>

                  <input
                    type="range"
                    min={200}
                    max={3000}
                    step={100}
                    value={rentersInsuranceMonthly}
                    onChange={(e) =>
                      setRentersInsuranceMonthly(parseInt(e.target.value, 10))
                    }
                    className="w-full h-2 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-amber-600"
                  />
                  <p className="text-[11px] text-slate-400">
                    Covers personal property, liability, and temporary displacement.
                  </p>
                </div>

                {/* 4. Move-In Deposit & Upfront Cash Breakdown */}
                <div className="bg-gradient-to-br from-slate-900 to-slate-800 text-white rounded-2xl p-5 shadow-lg space-y-4">
                  <div className="flex justify-between items-center border-b border-slate-700/80 pb-3">
                    <div>
                      <span className="text-xs font-medium uppercase tracking-wider text-slate-400">
                        Upfront Move-In Cash Required
                      </span>
                      <h4 className="text-2xl font-black text-white">
                        {formatCurrency(rentCalculations.totalMoveInCost, currencySymbol)}
                      </h4>
                    </div>
                    <span className="text-xs font-medium px-3 py-1 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                      Estimated Upfront
                    </span>
                  </div>

                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 text-xs">
                    <div className="bg-slate-800/80 p-2.5 rounded-xl border border-slate-700">
                      <span className="text-slate-400 block">First Month</span>
                      <span className="font-bold text-white text-sm">
                        {formatCurrency(baseRent, currencySymbol)}
                      </span>
                    </div>

                    <div className="bg-slate-800/80 p-2.5 rounded-xl border border-slate-700">
                      <span className="text-slate-400 block">Security Deposit ({securityDepositMonths}mo)</span>
                      <span className="font-bold text-white text-sm">
                        {formatCurrency(rentCalculations.securityDeposit, currencySymbol)}
                      </span>
                    </div>

                    <div className="bg-slate-800/80 p-2.5 rounded-xl border border-slate-700 col-span-2 sm:col-span-1">
                      <span className="text-slate-400 block">App & Admin Fee</span>
                      <span className="font-bold text-white text-sm">
                        {formatCurrency(applicationFee, currencySymbol)}
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* RIGHT COLUMN: DONUT RING CHART & BREAKDOWN (5 Cols) */}
          <div className="lg:col-span-5 flex flex-col items-center justify-center bg-slate-50/60 backdrop-blur-xl rounded-3xl p-6 border border-slate-200/80 shadow-xs space-y-6">
            {/* Total Monthly Payment Display with Big Bold Typography */}
            <div className="text-center w-full">
              <span className="text-xs font-bold uppercase tracking-widest text-slate-400">
                {activeMode === 'SALE'
                  ? 'Estimated Total Monthly Payment'
                  : 'Estimated Total Monthly Living Cost'}
              </span>
              <div className="text-4xl sm:text-5xl font-black tracking-tight text-slate-900 mt-1">
                {formatCurrency(totalMonthlyCost, currencySymbol)}
                <span className="text-sm sm:text-base font-semibold text-slate-400 ml-1">
                  /mo
                </span>
              </div>
            </div>

            {/* Interactive Pure SVG Donut Ring Chart */}
            <div className="relative w-full flex items-center justify-center">
              <svg
                viewBox="0 0 200 200"
                className="w-56 h-56 sm:w-64 sm:h-64 filter drop-shadow-sm select-none"
              >
                {/* Background placeholder track */}
                <circle
                  cx="100"
                  cy="100"
                  r={radius}
                  fill="none"
                  stroke="#e2e8f0"
                  strokeWidth="20"
                />

                {/* Slices rotated -90deg so they start at 12 o'clock */}
                <g transform="rotate(-90 100 100)">
                  {slices.map((slice) => {
                    const fraction = totalMonthlyCost > 0 ? slice.amount / totalMonthlyCost : 0;
                    if (fraction <= 0.001) return null;

                    const dashLength = fraction * circumference;
                    const spaceLength = circumference - dashLength;
                    const offset = accumulatedOffset;
                    accumulatedOffset += fraction;

                    const isHovered = hoveredSlice === slice.id;
                    const isAnyHovered = hoveredSlice !== null;

                    return (
                      <circle
                        key={slice.id}
                        cx="100"
                        cy="100"
                        r={radius}
                        fill="none"
                        stroke={slice.color}
                        strokeWidth={isHovered ? 26 : 20}
                        strokeDasharray={`${dashLength} ${spaceLength}`}
                        strokeDashoffset={`${-offset * circumference}`}
                        strokeLinecap="round"
                        className="cursor-pointer transition-all duration-300 ease-out"
                        style={{
                          opacity: isAnyHovered ? (isHovered ? 1 : 0.4) : 1,
                        }}
                        onMouseEnter={() => setHoveredSlice(slice.id)}
                        onMouseLeave={() => setHoveredSlice(null)}
                      />
                    );
                  })}
                </g>
              </svg>

              {/* Dynamic Center Text inside Donut */}
              <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none p-4 text-center">
                {activeHoveredSliceData ? (
                  <div className="transition-all duration-200">
                    <span className="text-[10px] sm:text-xs font-bold uppercase tracking-wider text-slate-400 block truncate max-w-[120px]">
                      {activeHoveredSliceData.label}
                    </span>
                    <span className="text-xl sm:text-2xl font-black text-slate-900 block">
                      {formatCurrency(activeHoveredSliceData.amount, currencySymbol)}
                    </span>
                    <span className="text-[11px] font-semibold text-blue-600 block">
                      {activeHoveredSliceData.percentage.toFixed(1)}% of total
                    </span>
                  </div>
                ) : (
                  <div className="transition-all duration-200">
                    <span className="text-[10px] sm:text-xs font-bold uppercase tracking-wider text-slate-400 block">
                      Total Monthly
                    </span>
                    <span className="text-xl sm:text-2xl font-black text-slate-900 block">
                      {formatCurrency(totalMonthlyCost, currencySymbol)}
                    </span>
                    <span className="text-[11px] font-semibold text-slate-400 block">
                      per month
                    </span>
                  </div>
                )}
              </div>
            </div>

            {/* Horizontal Color-Coded Breakdown Bar */}
            <div className="w-full space-y-1.5">
              <div className="w-full h-3 bg-slate-100 rounded-full flex overflow-hidden p-0.5 gap-0.5 shadow-inner">
                {slices.map((slice) => {
                  const pct = slice.percentage;
                  if (pct <= 0) return null;
                  return (
                    <div
                      key={slice.id}
                      style={{ width: `${pct}%`, backgroundColor: slice.color }}
                      className={`h-full rounded-full transition-all duration-300 cursor-pointer ${
                        hoveredSlice === slice.id
                          ? 'brightness-110 scale-y-125'
                          : 'hover:opacity-90'
                      }`}
                      onMouseEnter={() => setHoveredSlice(slice.id)}
                      onMouseLeave={() => setHoveredSlice(null)}
                      title={`${slice.label}: ${formatCurrency(
                        slice.amount,
                        currencySymbol
                      )} (${pct.toFixed(1)}%)`}
                    />
                  );
                })}
              </div>
            </div>

            {/* Detailed Legend with Percentages and Dollar Amounts */}
            <div className="w-full divide-y divide-slate-200/60 border-t border-slate-200/60 pt-2 text-xs">
              {slices.map((slice) => {
                const isHovered = hoveredSlice === slice.id;
                return (
                  <div
                    key={slice.id}
                    onMouseEnter={() => setHoveredSlice(slice.id)}
                    onMouseLeave={() => setHoveredSlice(null)}
                    className={`flex items-center justify-between py-2 px-2 rounded-xl transition-all cursor-pointer ${
                      isHovered ? 'bg-slate-100/90 scale-[1.01]' : 'hover:bg-slate-100/50'
                    }`}
                  >
                    <div className="flex items-center gap-2.5">
                      <span
                        className="w-3 h-3 rounded-full flex-shrink-0 transition-transform shadow-xs"
                        style={{ backgroundColor: slice.color }}
                      />
                      <span
                        className={`font-medium ${
                          isHovered ? 'text-slate-900 font-semibold' : 'text-slate-600'
                        }`}
                      >
                        {slice.label}
                      </span>
                    </div>

                    <div className="flex items-center gap-3">
                      <span className="font-semibold text-slate-400 text-[11px]">
                        {slice.percentage.toFixed(0)}%
                      </span>
                      <span className="font-bold text-slate-900 text-right min-w-[65px]">
                        {formatCurrency(slice.amount, currencySymbol)}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Extra Amortization Lifetime Badge for SALE mode */}
            {activeMode === 'SALE' && (
              <div className="w-full bg-blue-50/80 border border-blue-100/80 rounded-2xl p-4 text-xs space-y-1">
                <div className="flex justify-between text-blue-900 font-semibold">
                  <span>Total 30-Year Interest:</span>
                  <span>
                    {formatCurrency(saleCalculations.totalInterestPaid, currencySymbol)}
                  </span>
                </div>
                <div className="flex justify-between text-slate-500 text-[11px]">
                  <span>Total Payments (P&I):</span>
                  <span>
                    {formatCurrency(saleCalculations.totalLoanCost, currencySymbol)}
                  </span>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

export { InteractiveMortgageCalculator };
