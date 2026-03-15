import crypto from "crypto";
import { INVITE_CODE_LENGTH } from "@/lib/bracket-constants";

export function generateInviteCode(): string {
  return crypto.randomBytes(INVITE_CODE_LENGTH / 2).toString("hex");
}
