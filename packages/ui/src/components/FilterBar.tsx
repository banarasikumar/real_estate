import React from "react";
import { Search, MapPin, SlidersHorizontal } from "lucide-react";
import { Button } from "./Button";
import { Input } from "./Input";

export function FilterBar() {
  return (
    <div className="flex items-center gap-3 w-full bg-white p-3 rounded-lg border border-slate-200 shadow-sm overflow-x-auto no-scrollbar">
      <div className="relative flex-1 min-w-[200px]">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
        <Input placeholder="Search location, neighborhood..." className="pl-9 bg-slate-50 border-none" />
      </div>
      
      <div className="h-6 w-px bg-slate-200 hidden md:block"></div>
      
      <div className="flex gap-2 min-w-max">
        <Button variant="outline" size="sm" className="rounded-full">
          Price
        </Button>
        <Button variant="outline" size="sm" className="rounded-full">
          Beds & Baths
        </Button>
        <Button variant="outline" size="sm" className="rounded-full">
          Home Type
        </Button>
        <Button variant="outline" size="sm" className="rounded-full gap-2 text-primary border-primary/20 bg-primary/5">
          <SlidersHorizontal className="h-4 w-4" />
          More Filters
        </Button>
      </div>
    </div>
  );
}
