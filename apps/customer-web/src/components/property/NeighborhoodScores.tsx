'use client';

import React, { useState } from 'react';
import {
  Footprints,
  Train,
  Bike,
  GraduationCap,
  School,
  MapPin,
  ShoppingCart,
  Utensils,
  TreePine,
  Zap,
  Info,
  ChevronRight,
  ExternalLink,
  Award,
  Sparkles,
  ShieldCheck,
  Star,
  CheckCircle2,
} from 'lucide-react';

export interface ScoreItem {
  id: 'walk' | 'transit' | 'bike';
  title: string;
  score: number;
  maxScore: number;
  label: string;
  description: string;
  colorScheme: 'emerald' | 'blue' | 'amber';
  highlights: string[];
}

export interface SchoolItem {
  id: string;
  name: string;
  score: number;
  maxScore: number;
  distance: string;
  grades: string;
  type: 'Public' | 'Private' | 'Charter';
  district?: string;
  ratingBadge?: string;
  studentsPerTeacher?: string;
}

export interface HighlightTag {
  id: string;
  name: string;
  category: 'Groceries' | 'Dining' | 'Parks' | 'Transit' | 'Infrastructure' | 'Lifestyle';
  distance: string;
  walkingTime: string;
  iconName: 'ShoppingCart' | 'Utensils' | 'TreePine' | 'Train' | 'Zap';
}

export interface NeighborhoodScoresProps {
  propertyName?: string;
  address?: string;
  walkScore?: number;
  transitScore?: number;
  bikeScore?: number;
  schools?: SchoolItem[];
  highlights?: HighlightTag[];
  className?: string;
}

const DEFAULT_SCORES: ScoreItem[] = [
  {
    id: 'walk',
    title: 'Walk Score®',
    score: 94,
    maxScore: 100,
    label: "Walker's Paradise",
    description: 'Daily errands do not require a car',
    colorScheme: 'emerald',
    highlights: ['Groceries (3 min walk)', 'Artisan Cafés & Bakeries', 'Pedestrian Walkways'],
  },
  {
    id: 'transit',
    title: 'Transit Score®',
    score: 88,
    maxScore: 100,
    label: 'Excellent Transit',
    description: 'Transit is convenient for most trips',
    colorScheme: 'blue',
    highlights: ['Metro Red Line (0.2 mi)', '4 Express Bus Routes', 'Regional Commuter Rail'],
  },
  {
    id: 'bike',
    title: 'Bike Score®',
    score: 82,
    maxScore: 100,
    label: 'Very Bikeable',
    description: 'Flat as a pancake, excellent bike lanes',
    colorScheme: 'amber',
    highlights: ['Protected Greenways', 'Flat Terrain (12ft gain)', 'Public Bike-Share Hubs'],
  },
];

const DEFAULT_SCHOOLS: SchoolItem[] = [
  {
    id: '1',
    name: 'Lincoln Elementary School',
    score: 10,
    maxScore: 10,
    distance: '0.4 mi',
    grades: 'K-5',
    type: 'Public',
    district: 'Silicon Valley Unified',
    ratingBadge: 'Top 1% in State',
    studentsPerTeacher: '14:1 Ratio',
  },
  {
    id: '2',
    name: 'Roosevelt Middle School',
    score: 9,
    maxScore: 10,
    distance: '0.8 mi',
    grades: '6-8',
    type: 'Public',
    district: 'Silicon Valley Unified',
    ratingBadge: 'STEM Certified',
    studentsPerTeacher: '16:1 Ratio',
  },
  {
    id: '3',
    name: 'Washington High Academy',
    score: 9,
    maxScore: 10,
    distance: '1.2 mi',
    grades: '9-12',
    type: 'Public',
    district: 'Silicon Valley Unified',
    ratingBadge: 'IB Diploma Program',
    studentsPerTeacher: '17:1 Ratio',
  },
  {
    id: '4',
    name: 'St. Jude Preparatory Academy',
    score: 10,
    maxScore: 10,
    distance: '1.5 mi',
    grades: 'PK-12',
    type: 'Private',
    district: 'Independent College Prep',
    ratingBadge: '100% University Placement',
    studentsPerTeacher: '9:1 Ratio',
  },
];

const DEFAULT_HIGHLIGHTS: HighlightTag[] = [
  {
    id: '1',
    name: 'Whole Foods Market',
    category: 'Groceries',
    distance: '0.3 mi',
    walkingTime: '5 min walk',
    iconName: 'ShoppingCart',
  },
  {
    id: '2',
    name: 'Michelin-Star Dining',
    category: 'Dining',
    distance: '0.4 mi',
    walkingTime: '7 min walk',
    iconName: 'Utensils',
  },
  {
    id: '3',
    name: 'Botanical Trail',
    category: 'Parks',
    distance: '0.6 mi',
    walkingTime: '10 min walk',
    iconName: 'TreePine',
  },
  {
    id: '4',
    name: 'Rapid Transit Station',
    category: 'Transit',
    distance: '0.2 mi',
    walkingTime: '3 min walk',
    iconName: 'Train',
  },
  {
    id: '5',
    name: 'EV Charging Hub',
    category: 'Infrastructure',
    distance: '0.1 mi',
    walkingTime: '2 min walk',
    iconName: 'Zap',
  },
];

function getHighlightIcon(iconName: HighlightTag['iconName']) {
  switch (iconName) {
    case 'ShoppingCart':
      return <ShoppingCart className="w-4 h-4 text-emerald-600" />;
    case 'Utensils':
      return <Utensils className="w-4 h-4 text-rose-600" />;
    case 'TreePine':
      return <TreePine className="w-4 h-4 text-teal-600" />;
    case 'Train':
      return <Train className="w-4 h-4 text-blue-600" />;
    case 'Zap':
      return <Zap className="w-4 h-4 text-amber-500" />;
    default:
      return <MapPin className="w-4 h-4 text-slate-500" />;
  }
}

export default function NeighborhoodScores({
  propertyName = 'This Residence',
  address = 'Silicon Foothills, CA',
  walkScore = 94,
  transitScore = 88,
  bikeScore = 82,
  schools = DEFAULT_SCHOOLS,
  highlights = DEFAULT_HIGHLIGHTS,
  className = '',
}: NeighborhoodScoresProps) {
  const [activeTab, setActiveTab] = useState<'all' | 'schools' | 'highlights'>('all');
  const [selectedHighlightCategory, setSelectedHighlightCategory] = useState<string>('ALL');

  // Filtered highlights
  const filteredHighlights =
    selectedHighlightCategory === 'ALL'
      ? highlights
      : highlights.filter((h) => h.category.toUpperCase() === selectedHighlightCategory);

  const scoresList: ScoreItem[] = [
    {
      ...DEFAULT_SCORES[0],
      score: walkScore,
    },
    {
      ...DEFAULT_SCORES[1],
      score: transitScore,
    },
    {
      ...DEFAULT_SCORES[2],
      score: bikeScore,
    },
  ];

  return (
    <div
      className={`w-full bg-white rounded-3xl border border-slate-200/90 shadow-sm p-6 sm:p-8 space-y-8 ${className}`}
    >
      {/* Header Section */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-100 pb-6">
        <div>
          <div className="flex items-center gap-2 mb-1.5">
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-extrabold bg-blue-50 text-blue-700 border border-blue-200">
              <Award className="w-3.5 h-3.5 text-blue-600" />
              Verified Neighborhood Intelligence
            </span>
            <span className="text-xs text-slate-400 font-medium">Updated Weekly</span>
          </div>
          <h2 className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight">
            Neighborhood Scores & Insights
          </h2>
          <p className="text-sm text-slate-500 mt-1">
            Comprehensive walkability, transit velocity, and educational standards for {address}.
          </p>
        </div>

        {/* View Segmented Switch */}
        <div className="flex items-center bg-slate-100 p-1 rounded-2xl border border-slate-200/80 self-start sm:self-auto">
          <button
            type="button"
            onClick={() => setActiveTab('all')}
            className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all ${
              activeTab === 'all'
                ? 'bg-white text-slate-900 shadow-sm border border-slate-200'
                : 'text-slate-500 hover:text-slate-800'
            }`}
          >
            Overview
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('schools')}
            className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all ${
              activeTab === 'schools'
                ? 'bg-white text-slate-900 shadow-sm border border-slate-200'
                : 'text-slate-500 hover:text-slate-800'
            }`}
          >
            Schools ({schools.length})
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('highlights')}
            className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all ${
              activeTab === 'highlights'
                ? 'bg-white text-slate-900 shadow-sm border border-slate-200'
                : 'text-slate-500 hover:text-slate-800'
            }`}
          >
            Highlights ({highlights.length})
          </button>
        </div>
      </div>

      {/* 1. iOS Widget-Style Score Cards */}
      {(activeTab === 'all' || activeTab === 'highlights') && (
        <div>
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-extrabold uppercase tracking-wider text-slate-500">
              Mobility & Environmental Scores
            </h3>
            <span className="text-xs text-slate-400">Scores out of 100</span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
            {scoresList.map((item) => {
              const isEmerald = item.colorScheme === 'emerald';
              const isBlue = item.colorScheme === 'blue';
              const isAmber = item.colorScheme === 'amber';

              // Visual styling classes
              const containerStyles = isEmerald
                ? 'bg-gradient-to-br from-emerald-50/70 via-emerald-50/30 to-white border-emerald-200/80 shadow-emerald-950/5'
                : isBlue
                ? 'bg-gradient-to-br from-blue-50/70 via-blue-50/30 to-white border-blue-200/80 shadow-blue-950/5'
                : 'bg-gradient-to-br from-amber-50/70 via-amber-50/30 to-white border-amber-200/80 shadow-amber-950/5';

              const ringColor = isEmerald
                ? '#10b981'
                : isBlue
                ? '#2563eb'
                : '#f59e0b';

              const badgeStyles = isEmerald
                ? 'bg-emerald-600 text-white'
                : isBlue
                ? 'bg-blue-600 text-white'
                : 'bg-amber-500 text-white';

              const strokeOffset = 220 - (220 * item.score) / item.maxScore;

              return (
                <div
                  key={item.id}
                  className={`p-5 rounded-3xl border shadow-sm transition-all duration-300 hover:shadow-md hover:-translate-y-0.5 flex flex-col justify-between ${containerStyles}`}
                >
                  <div>
                    {/* Header with circular gauge and score */}
                    <div className="flex items-start justify-between gap-4 mb-4">
                      <div>
                        <div className="flex items-center gap-1.5 mb-1">
                          {isEmerald && <Footprints className="w-4 h-4 text-emerald-600" />}
                          {isBlue && <Train className="w-4 h-4 text-blue-600" />}
                          {isAmber && <Bike className="w-4 h-4 text-amber-600" />}
                          <span className="text-xs font-bold text-slate-600">{item.title}</span>
                        </div>
                        <span
                          className={`inline-block text-[11px] font-extrabold uppercase px-2.5 py-0.5 rounded-full ${badgeStyles}`}
                        >
                          {item.label}
                        </span>
                      </div>

                      {/* Radial Progress Gauge */}
                      <div className="relative w-14 h-14 flex items-center justify-center flex-shrink-0">
                        <svg className="w-14 h-14 -rotate-90" viewBox="0 0 80 80">
                          <circle
                            cx="40"
                            cy="40"
                            r="34"
                            stroke="#e2e8f0"
                            strokeWidth="8"
                            fill="transparent"
                          />
                          <circle
                            cx="40"
                            cy="40"
                            r="34"
                            stroke={ringColor}
                            strokeWidth="8"
                            strokeDasharray="213.6"
                            strokeDashoffset={213.6 - (213.6 * item.score) / 100}
                            strokeLinecap="round"
                            fill="transparent"
                            className="transition-all duration-1000 ease-out"
                          />
                        </svg>
                        <div className="absolute inset-0 flex flex-col items-center justify-center text-slate-900">
                          <span className="text-base font-black leading-none">{item.score}</span>
                          <span className="text-[9px] font-bold text-slate-400">/100</span>
                        </div>
                      </div>
                    </div>

                    {/* Description */}
                    <p className="text-xs text-slate-700 font-semibold leading-relaxed mb-4">
                      “{item.description}”
                    </p>
                  </div>

                  {/* Highlights Bullet List */}
                  <div className="pt-3 border-t border-slate-200/60 space-y-1.5">
                    {item.highlights.map((h, i) => (
                      <div key={i} className="flex items-center gap-1.5 text-[11px] text-slate-600">
                        <CheckCircle2
                          className={`w-3 h-3 flex-shrink-0 ${
                            isEmerald
                              ? 'text-emerald-500'
                              : isBlue
                              ? 'text-blue-500'
                              : 'text-amber-500'
                          }`}
                        />
                        <span className="font-medium truncate">{h}</span>
                      </div>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* 2. GreatSchools District Ratings Section */}
      {(activeTab === 'all' || activeTab === 'schools') && (
        <div className="space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
            <div>
              <div className="flex items-center gap-2">
                <GraduationCap className="w-5 h-5 text-blue-600" />
                <h3 className="text-lg font-bold text-slate-900">
                  GreatSchools® District Ratings
                </h3>
              </div>
              <p className="text-xs text-slate-500 mt-0.5">
                Designated public and private academic institutions serving this property.
              </p>
            </div>
            <span className="text-xs font-bold text-emerald-700 bg-emerald-50 px-3 py-1 rounded-full border border-emerald-200 self-start sm:self-auto">
              Top Rated District
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {schools.map((school) => (
              <div
                key={school.id}
                className="p-4 rounded-2xl border border-slate-200/90 bg-slate-50/60 hover:bg-slate-50 transition-all flex items-start justify-between gap-4 group"
              >
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <span
                      className={`text-[10px] font-extrabold uppercase px-2 py-0.5 rounded-md ${
                        school.type === 'Public'
                          ? 'bg-blue-100 text-blue-800'
                          : 'bg-purple-100 text-purple-800'
                      }`}
                    >
                      {school.type}
                    </span>
                    <span className="text-[11px] font-bold text-slate-500">
                      Grades {school.grades}
                    </span>
                    {school.ratingBadge && (
                      <span className="hidden sm:inline-block text-[10px] font-bold text-emerald-700 bg-emerald-100/80 px-2 py-0.5 rounded-md">
                        {school.ratingBadge}
                      </span>
                    )}
                  </div>

                  <h4 className="text-sm font-bold text-slate-900 group-hover:text-blue-600 transition-colors truncate">
                    {school.name}
                  </h4>

                  <div className="flex items-center gap-3 mt-2 text-xs text-slate-500">
                    <span className="flex items-center gap-1 font-medium">
                      <MapPin className="w-3.5 h-3.5 text-slate-400" />
                      {school.distance} away
                    </span>
                    {school.studentsPerTeacher && (
                      <span className="text-slate-400">• {school.studentsPerTeacher}</span>
                    )}
                  </div>
                </div>

                {/* Score Badge */}
                <div className="flex flex-col items-center justify-center p-2 rounded-xl bg-emerald-600 text-white min-w-[50px] shadow-sm">
                  <span className="text-base font-black leading-none">{school.score}</span>
                  <span className="text-[9px] font-bold opacity-80 mt-0.5">/{school.maxScore}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* 3. Local Highlights Tags */}
      {(activeTab === 'all' || activeTab === 'highlights') && (
        <div className="space-y-4 pt-2">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <div className="flex items-center gap-2">
                <Sparkles className="w-5 h-5 text-amber-500" />
                <h3 className="text-lg font-bold text-slate-900">
                  Local Lifestyle Highlights
                </h3>
              </div>
              <p className="text-xs text-slate-500 mt-0.5">
                Curated prime lifestyle destinations within immediate walking & transit range.
              </p>
            </div>

            {/* Quick Filter Chips */}
            <div className="flex items-center gap-1.5 overflow-x-auto pb-1 no-scrollbar">
              {['ALL', 'GROCERIES', 'DINING', 'PARKS', 'TRANSIT', 'INFRASTRUCTURE'].map((cat) => (
                <button
                  key={cat}
                  type="button"
                  onClick={() => setSelectedHighlightCategory(cat)}
                  className={`px-2.5 py-1 rounded-lg text-[10px] font-bold uppercase transition-all whitespace-nowrap ${
                    selectedHighlightCategory === cat
                      ? 'bg-slate-900 text-white'
                      : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                  }`}
                >
                  {cat}
                </button>
              ))}
            </div>
          </div>

          <div className="flex flex-wrap gap-3">
            {filteredHighlights.map((tag) => (
              <div
                key={tag.id}
                className="flex items-center gap-3 p-3.5 rounded-2xl border border-slate-200/90 bg-white hover:border-slate-300 hover:shadow-sm transition-all group"
              >
                <div className="w-9 h-9 rounded-xl bg-slate-100 flex items-center justify-center group-hover:scale-105 transition-transform flex-shrink-0">
                  {getHighlightIcon(tag.iconName)}
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h5 className="text-xs font-bold text-slate-900">{tag.name}</h5>
                    <span className="text-[10px] font-bold text-slate-400 uppercase">
                      {tag.category}
                    </span>
                  </div>
                  <div className="flex items-center gap-2 text-[11px] text-slate-500 mt-0.5">
                    <span className="font-semibold text-slate-700">{tag.distance}</span>
                    <span>•</span>
                    <span>{tag.walkingTime}</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Footer / Transparency Notice */}
      <div className="pt-6 border-t border-slate-100 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-slate-400">
        <div className="flex items-center gap-2">
          <ShieldCheck className="w-4 h-4 text-emerald-600" />
          <span>Accredited metrics sourced from Walk Score® & GreatSchools®</span>
        </div>
        <div className="flex items-center gap-4">
          <span className="hover:text-slate-600 cursor-pointer">Score Methodology</span>
          <span>•</span>
          <span className="hover:text-slate-600 cursor-pointer">School Attendance Boundaries</span>
        </div>
      </div>
    </div>
  );
}
