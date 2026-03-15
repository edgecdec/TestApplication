"use client";

import { useState, useRef, useEffect } from "react";
import { AUTOFILL_OPTIONS, type AutofillMode } from "@/lib/autofill";

interface AutofillDropdownProps {
  onSelect: (mode: AutofillMode) => void;
  disabled: boolean;
}

export default function AutofillDropdown({ onSelect, disabled }: AutofillDropdownProps) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  return (
    <div ref={ref} className="relative">
      <button
        onClick={() => setOpen((o) => !o)}
        disabled={disabled}
        className="px-3 py-1.5 bg-purple-600 text-white text-sm rounded hover:bg-purple-700 disabled:opacity-50 transition"
        aria-haspopup="listbox"
        aria-expanded={open}
      >
        Autofill ▾
      </button>
      {open && (
        <div className="absolute right-0 mt-1 w-56 bg-white border rounded shadow-lg z-50" role="listbox">
          {AUTOFILL_OPTIONS.map((opt) => (
            <button
              key={opt.mode}
              role="option"
              aria-selected={false}
              className="w-full text-left px-3 py-2 hover:bg-purple-50 transition-colors"
              onClick={() => {
                onSelect(opt.mode);
                setOpen(false);
              }}
            >
              <div className="text-sm font-medium">{opt.label}</div>
              <div className="text-xs text-gray-500">{opt.description}</div>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
