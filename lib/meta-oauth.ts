import { assertMetaConfigured } from "./meta-env";

export const INSTAGRAM_OAUTH_SCOPES = [
  "instagram_basic",
  "instagram_content_publish",
  "instagram_manage_insights",
  "pages_show_list",
  "pages_read_engagement",
] as const;

// Publishing to a Facebook Page requires pages_manage_posts (App Review in production).
export const FACEBOOK_OAUTH_SCOPES = [
  "pages_show_list",
  "pages_read_engagement",
  "pages_manage_posts",
  "business_management",
] as const;

const GRAPH_API_VERSION = "v21.0";

export function buildMetaOAuthUrl(
  state: string,
  scopes: readonly string[],
  platform: "instagram" | "facebook" = "instagram",
): string {
  const { appId, redirectUri } = assertMetaConfigured(platform);

  const params = new URLSearchParams({
    client_id: appId,
    redirect_uri: redirectUri,
    scope: scopes.join(","),
    response_type: "code",
    state,
  });

  return `https://www.facebook.com/${GRAPH_API_VERSION}/dialog/oauth?${params.toString()}`;
}

export function buildInstagramOAuthUrl(
  state: string,
  scopes: readonly string[] = INSTAGRAM_OAUTH_SCOPES,
): string {
  return buildMetaOAuthUrl(state, scopes, "instagram");
}

export function buildFacebookOAuthUrl(
  state: string,
  scopes: readonly string[] = FACEBOOK_OAUTH_SCOPES,
): string {
  return buildMetaOAuthUrl(state, scopes, "facebook");
}

type TokenResponse = {
  access_token?: string;
  token_type?: string;
  expires_in?: number;
  error?: { message: string; type: string; code: number };
};

export async function exchangeCodeForToken(
  code: string,
  platform: "instagram" | "facebook" = "instagram",
): Promise<{ accessToken: string; expiresIn?: number }> {
  const { appId, appSecret, redirectUri } = assertMetaConfigured(platform);

  const params = new URLSearchParams({
    client_id: appId,
    client_secret: appSecret,
    redirect_uri: redirectUri,
    code,
  });

  const response = await fetch(
    `https://graph.facebook.com/${GRAPH_API_VERSION}/oauth/access_token?${params.toString()}`,
  );

  const data = (await response.json()) as TokenResponse;

  if (!response.ok || !data.access_token) {
    throw new Error(data.error?.message ?? "Failed to exchange OAuth code");
  }

  return {
    accessToken: data.access_token,
    expiresIn: data.expires_in,
  };
}

export async function exchangeForLongLivedToken(
  shortLivedToken: string,
): Promise<{ accessToken: string; expiresIn?: number }> {
  const { appId, appSecret } = assertMetaConfigured();

  const params = new URLSearchParams({
    grant_type: "fb_exchange_token",
    client_id: appId,
    client_secret: appSecret,
    fb_exchange_token: shortLivedToken,
  });

  const response = await fetch(
    `https://graph.facebook.com/${GRAPH_API_VERSION}/oauth/access_token?${params.toString()}`,
  );

  const data = (await response.json()) as TokenResponse;

  if (!response.ok || !data.access_token) {
    return { accessToken: shortLivedToken, expiresIn: undefined };
  }

  return {
    accessToken: data.access_token,
    expiresIn: data.expires_in,
  };
}

type MetaPageAccount = {
  accountName: string;
  pageId: string;
  accessToken: string;
  expiresIn?: number;
};

type InstagramAccountResult = MetaPageAccount & {
  instagramUserId: string;
};

type FacebookPageResult = MetaPageAccount;

type PagesResponse = {
  data?: Array<{
    id?: string;
    name?: string;
    access_token?: string;
    instagram_business_account?: { id: string };
  }>;
  error?: { message: string; code?: number };
};

async function fetchManagedPages(accessToken: string): Promise<PagesResponse> {
  const response = await fetch(
    `https://graph.facebook.com/${GRAPH_API_VERSION}/me/accounts?` +
      new URLSearchParams({
        fields: "id,name,access_token,instagram_business_account",
        access_token: accessToken,
      }),
  );

  return (await response.json()) as PagesResponse;
}

async function resolvePageAccessToken(
  pageAccessToken: string,
): Promise<{ accessToken: string; expiresIn?: number }> {
  return exchangeForLongLivedToken(pageAccessToken);
}

export async function fetchInstagramAccount(
  userAccessToken: string,
): Promise<InstagramAccountResult | null> {
  const pagesData = await fetchManagedPages(userAccessToken);

  if (pagesData.error || !pagesData.data?.length) {
    return null;
  }

  const pageWithInstagram = pagesData.data.find(
    (page) => page.instagram_business_account?.id && page.access_token,
  );

  if (
    !pageWithInstagram?.instagram_business_account?.id ||
    !pageWithInstagram.access_token
  ) {
    return null;
  }

  const instagramId = pageWithInstagram.instagram_business_account.id;
  const pageToken = await resolvePageAccessToken(pageWithInstagram.access_token);

  const profileResponse = await fetch(
    `https://graph.facebook.com/${GRAPH_API_VERSION}/${instagramId}?` +
      new URLSearchParams({
        fields: "username,name",
        access_token: pageToken.accessToken,
      }),
  );

  const profileData = (await profileResponse.json()) as {
    username?: string;
    name?: string;
    error?: { message: string };
  };

  const accountName =
    profileData.username ??
    profileData.name ??
    pageWithInstagram.name ??
    "Instagram";

  return {
    accountName,
    pageId: pageWithInstagram.id ?? instagramId,
    instagramUserId: instagramId,
    accessToken: pageToken.accessToken,
    expiresIn: pageToken.expiresIn,
  };
}

export async function fetchFacebookPage(
  userAccessToken: string,
): Promise<FacebookPageResult | null> {
  const pagesData = await fetchManagedPages(userAccessToken);

  if (pagesData.error || !pagesData.data?.length) {
    return null;
  }

  const page = pagesData.data.find((item) => item.access_token && item.id);

  if (!page?.access_token || !page.id) {
    return null;
  }

  const pageToken = await resolvePageAccessToken(page.access_token);

  return {
    accountName: page.name ?? "Facebook",
    pageId: page.id,
    accessToken: pageToken.accessToken,
    expiresIn: pageToken.expiresIn,
  };
}
