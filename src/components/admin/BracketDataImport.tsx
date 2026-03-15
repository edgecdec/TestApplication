"use client";

import { useState } from "react";
import { REGIONS, SEEDS_PER_REGION } from "@/lib/bracket-constants";
import type { RegionData, TeamSeed } from "@/types/tournament";

interface Props {
  tournamentId: number;
  existingData: RegionData[];
  onImported: () => void;
}

const SAMPLE_BRACKET: RegionData[] = REGIONS.map((name) => ({
  name,
  seeds: Array.from({ length: SEEDS_PER_REGION }, (_, i) => ({
    seed: i + 1,
    name: `${name} Seed ${i + 1}`,
  })),
}));

const SAMPLE_JSON = JSON.stringify(SAMPLE_BRACKET, null, 2);

type ImportMode = "json" | "form";

export default function BracketDataImport({ tournamentId, existingData, onImported }: Props) {
  const [mode, setMode] = useState<ImportMode>("form");
  const [jsonText, setJsonText] = useState("");
  const [formData, setFormData] = useState<RegionData[]>(
    existingData.length > 0 ? existingData : SAMPLE_BRACKET
  );
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  function validateBracketData(data: RegionData[]): string | null {
    if (!Array.isArray(data) || data.length !== REGIONS.length) {
      return `Expected ${REGIONS.length} regions, got ${Array.isArray(data) ? data.length : "non-array"}`;
    }
    for (const region of data) {
      if (!region.name || !Array.isArray(region.seeds)) {
        return `Region missing name or seeds array`;
      }
      if (region.seeds.length !== SEEDS_PER_REGION) {
        return `Region "${region.name}" has ${region.seeds.length} seeds, expected ${SEEDS_PER_REGION}`;
      }
      for (const seed of region.seeds) {
        if (typeof seed.seed !== "number" || !seed.name) {
          return `Invalid seed in region "${region.name}": seed=${seed.seed}, name=${seed.name}`;
        }
      }
    }
    return null;
  }

  async function handleSubmit() {
    setError(null);
    setSuccess(null);

    let data: RegionData[];
    if (mode === "json") {
      try {
        data = JSON.parse(jsonText);
      } catch {
        setError("Invalid JSON");
        return;
      }
    } else {
      data = formData;
    }

    const validationError = validateBracketData(data);
    if (validationError) {
      setError(validationError);
      return;
    }

    setSubmitting(true);
    try {
      const res = await fetch(`/api/tournaments/${tournamentId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ bracket_data: data }),
      });
      const result = await res.json();
      if (!res.ok) {
        setError(result.error ?? "Failed to import");
      } else {
        setSuccess("Bracket data imported successfully!");
        onImported();
      }
    } catch {
      setError("Network error");
    } finally {
      setSubmitting(false);
    }
  }

  function updateTeamName(regionIdx: number, seedIdx: number, name: string) {
    const next = formData.map((r, ri) =>
      ri === regionIdx
        ? { ...r, seeds: r.seeds.map((s, si) => (si === seedIdx ? { ...s, name } : s)) }
        : r
    );
    setFormData(next);
  }

  return (
    <div className="space-y-4">
      <div className="flex gap-2">
        <button
          onClick={() => setMode("form")}
          className={`px-3 py-1 text-sm rounded ${mode === "form" ? "bg-blue-600 text-white" : "bg-gray-200"}`}
        >
          Form Entry
        </button>
        <button
          onClick={() => setMode("json")}
          className={`px-3 py-1 text-sm rounded ${mode === "json" ? "bg-blue-600 text-white" : "bg-gray-200"}`}
        >
          Paste JSON
        </button>
      </div>

      {mode === "json" ? (
        <div>
          <label className="block text-sm font-medium mb-1">
            Bracket JSON (array of 4 regions, each with 16 seeds)
          </label>
          <textarea
            value={jsonText}
            onChange={(e) => setJsonText(e.target.value)}
            rows={12}
            className="w-full border rounded px-3 py-2 font-mono text-xs"
            placeholder={SAMPLE_JSON}
          />
          <button
            onClick={() => setJsonText(SAMPLE_JSON)}
            className="mt-1 text-xs text-blue-600 hover:underline"
          >
            Load sample template
          </button>
        </div>
      ) : (
        <div className="space-y-4">
          {formData.map((region, ri) => (
            <details key={region.name} className="border rounded p-3">
              <summary className="font-semibold cursor-pointer">
                {region.name} Region ({region.seeds.filter((s) => !s.name.startsWith(`${region.name} Seed`)).length}/{SEEDS_PER_REGION} teams set)
              </summary>
              <div className="mt-2 grid grid-cols-2 gap-2">
                {region.seeds.map((seed: TeamSeed, si: number) => (
                  <div key={seed.seed} className="flex items-center gap-2">
                    <span className="text-xs text-gray-500 w-6 text-right">#{seed.seed}</span>
                    <input
                      value={seed.name}
                      onChange={(e) => updateTeamName(ri, si, e.target.value)}
                      className="flex-1 border rounded px-2 py-1 text-sm"
                    />
                  </div>
                ))}
              </div>
            </details>
          ))}
        </div>
      )}

      {error && <p className="text-red-600 text-sm">{error}</p>}
      {success && <p className="text-green-600 text-sm">{success}</p>}

      <button
        onClick={handleSubmit}
        disabled={submitting}
        className="px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700 transition disabled:opacity-50"
      >
        {submitting ? "Importing..." : "Import Bracket Data"}
      </button>
    </div>
  );
}
