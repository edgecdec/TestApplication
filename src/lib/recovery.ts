import crypto from "crypto";
import { RECOVERY_CODE_LENGTH } from "@/lib/constants";

const CHARSET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789"; // no 0/O/1/I to avoid confusion

export function generateRecoveryCode(): string {
  const bytes = crypto.randomBytes(RECOVERY_CODE_LENGTH);
  return Array.from(bytes, (b) => CHARSET[b % CHARSET.length]).join("");
}
