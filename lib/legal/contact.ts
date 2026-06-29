import { getAppBaseUrl } from "../app-url";

export function getLegalContactEmail(): string {
  return (
    process.env.NEXT_PUBLIC_LEGAL_CONTACT_EMAIL?.trim() ||
    process.env.NEXT_PUBLIC_SUPPORT_EMAIL?.trim() ||
    "opozacolor@gmail.com"
  );
}

export function getLegalSiteUrl(request?: Request): string {
  return getAppBaseUrl(request);
}
