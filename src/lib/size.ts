import { JerseySize } from "@/lib/types";

export function predictSize(heightCm: number, weightKg: number): JerseySize {
  const score = heightCm * 0.45 + weightKg * 0.55;

  if (score < 90) return "S";
  if (score < 108) return "M";
  if (score < 126) return "L";
  if (score < 144) return "XL";
  if (score < 162) return "XXL";
  return "XXXL";
}
