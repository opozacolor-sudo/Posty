import { assertMetaConfigured } from "./meta-env";

export const INSTAGRAM_OAUTH_SCOPES = [
  "pages_show_list",
  "instagram_basic",
  "public_profile",
  "email",
] as const;

const GRAPH_API_VERSION = "v21.0";

export function buildInstagramOAuthUrl(
  state: string,
  scopes: readonly string[] = INSTAGRAM_OAUTH_SCOPES,
): string {
  const { appId, redirectUri } = assertMetaConfigured();

  const params = new URLSearchParams({
    client_id: appId,
    redirect_uri: redirectUri,
    scope: scopes.join(","),
    response_type: "code",
    state,
  });

  return `https://www.facebook.com/${GRAPH_API_VERSION}/dialog/oauth?${params.toString()}`;
}

type TokenResponse = {
  access_token?: string;
  token_type?: string;
  expires_in?: number;
  error?: { message: string; type: string; code: number };
};

export async function exchangeCodeForToken(
  code: string,
): Promise<{ accessToken: string; expiresIn?: number }> {
  const { appId, appSecret, redirectUri } = assertMetaConfigured();

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

type InstagramAccountResult = {
  accountName: string;
  instagramUserId: string;
};

export async function fetchInstagramAccount(
  accessToken: string,
): Promise<InstagramAccountResult | null> {
  const pagesResponse = await fetch(
    `https://graph.facebook.com/${GRAPH_API_VERSION}/me/accounts?` +
      new URLSearchParams({
        fields: "name,instagram_business_account",
        access_token: accessToken,
      }),
  );

  const pagesData = (await pagesResponse.json()) as {
    data?: Array<{
      name?: string;
      instagram_business_account?: { id: string };
    }>;
    error?: { message: string };
  };

  if (!pagesResponse.ok || !pagesData.data?.length) {
    return null;
  }

  const pageWithInstagram = pagesData.data.find(
    (page) => page.instagram_business_account?.id,
  );

  if (!pageWithInstagram?.instagram_business_account?.id) {
    return null;
  }

  const instagramId = pageWithInstagram.instagram_business_account.id;

  const profileResponse = await fetch(
    `https://graph.facebook.com/${GRAPH_API_VERSION}/${instagramId}?` +
      new URLSearchParams({
        fields: "username,name",
        access_token: accessToken,
      }),
  );

  const profileData = (await profileResponse.json()) as {
    username?: string;
    name?: string;
    error?: { message: string };
  };

  if (!profileResponse.ok) {
    return {
      accountName: pageWithInstagram.name ?? "Instagram",
      instagramUserId: instagramId,
    };
  }

  const accountName =
    profileData.username ??
    profileData.name ??
    pageWithInstagram.name ??
    "Instagram";

  return {
    accountName,
    instagramUserId: instagramId,
  };
}
