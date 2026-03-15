"use client";

import type { BracketGradeInfo } from "@/lib/grading";

interface Props {
  grade: BracketGradeInfo;
  size?: "sm" | "lg";
}

export default function BracketGrade({ grade, size = "sm" }: Props) {
  const isLarge = size === "lg";
  return (
    <span
      className={`inline-flex items-center justify-center font-bold rounded ${isLarge ? "text-lg px-2.5 py-1" : "text-xs px-1.5 py-0.5"}`}
      style={{ backgroundColor: grade.color + "22", color: grade.color, border: `1px solid ${grade.color}44` }}
      title={`Bracket grade: ${grade.letter}`}
    >
      {grade.letter}
    </span>
  );
}
