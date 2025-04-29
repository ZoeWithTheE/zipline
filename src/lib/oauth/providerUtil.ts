import type { OAuthProviderType } from '@prisma/client';
import { User } from '../db/models/user';

export function findProvider(
  provider: OAuthProviderType,
  providers: User['oauthProviders'],
): User['oauthProviders'][0] | undefined {
  return providers.find((p) => p.provider === provider);
}

export const githubAuth = {
  url: (clientId: string, state?: string, redirectUri?: string) =>
    `https://github.com/login/oauth/authorize?client_id=${clientId}&scope=read:user${
      state ? `&state=${encodeURIComponent(state)}` : ''
    }${redirectUri ? `&redirect_uri=${encodeURIComponent(redirectUri)}` : ''}`,
  user: async (accessToken: string) => {
    const res = await fetch('https://api.github.com/user', {
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    });
    if (!res.ok) return null;

    return res.json();
  },
};

export const discordAuth = {
  url: (clientId: string, origin: string, state?: string, redirectUri?: string) =>
    `https://discord.com/api/oauth2/authorize?client_id=${clientId}&redirect_uri=${encodeURIComponent(
      redirectUri ?? `${origin}/api/auth/oauth/discord`,
    )}&response_type=code&scope=identify&prompt=none${state ? `&state=${encodeURIComponent(state)}` : ''}`,
  user: async (accessToken: string) => {
    const res = await fetch('https://discord.com/api/users/@me', {
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    });
    if (!res.ok) return null;

    return res.json();
  },
};

export const googleAuth = {
  url: (clientId: string, origin: string, state?: string, redirectUri?: string) =>
    `https://accounts.google.com/o/oauth2/auth?client_id=${clientId}&redirect_uri=${encodeURIComponent(
      redirectUri ?? `${origin}/api/auth/oauth/google`,
    )}&response_type=code&access_type=offline&scope=https://www.googleapis.com/auth/userinfo.profile${
      state ? `&state=${encodeURIComponent(state)}` : ''
    }`,
  user: async (accessToken: string) => {
    const res = await fetch('https://www.googleapis.com/oauth2/v1/userinfo?alt=json', {
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    });
    if (!res.ok) return null;

    return res.json();
  },
};

export const oidcAuth = {
  url: (clientId: string, origin: string, authorizeUrl: string, state?: string, redirectUri?: string) =>
    `${authorizeUrl}?client_id=${clientId}&redirect_uri=${encodeURIComponent(
      redirectUri ?? `${origin}/api/auth/oauth/oidc`,
    )}&response_type=code&scope=openid+email+profile+offline_access${state ? `&state=${encodeURIComponent(state)}` : ''}`,
  user: async (accessToken: string, userInfoUrl: string) => {
    const res = await fetch(userInfoUrl, {
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    });
    if (!res.ok) return null;

    return res.json();
  },
};
