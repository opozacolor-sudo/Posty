import type { LegalDocumentContent, LegalDocumentKind } from "./types";
import { getPrivacyPolicyEn } from "./privacy-en";
import { getPrivacyPolicyRo } from "./privacy-ro";
import { getTermsOfServiceEn } from "./terms-en";
import { getTermsOfServiceRo } from "./terms-ro";

export function getLegalDocument(
  kind: LegalDocumentKind,
  locale: string,
): LegalDocumentContent {
  const useRomanian = locale === "ro";

  if (kind === "privacy") {
    return useRomanian ? getPrivacyPolicyRo() : getPrivacyPolicyEn();
  }

  return useRomanian ? getTermsOfServiceRo() : getTermsOfServiceEn();
}

export function isLegalRoute(pathWithoutLocale: string): boolean {
  return pathWithoutLocale === "/privacy" || pathWithoutLocale === "/terms";
}
