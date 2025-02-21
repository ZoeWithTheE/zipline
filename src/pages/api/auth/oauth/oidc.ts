import { fetchToDataURL } from '@/lib/base64';
import { config } from '@/lib/config';
import { encrypt } from '@/lib/crypto';
import Logger from '@/lib/logger';
import { combine } from '@/lib/middleware/combine';
import { method } from '@/lib/middleware/method';
import enabled from '@/lib/oauth/enabled';
import { oidcAuth } from '@/lib/oauth/providerUtil';
import { OAuthQuery, OAuthResponse, withOAuth } from '@/lib/oauth/withOAuth';

// thanks to @danejur for this https://github.com/diced/zipline/pull/372
async function handler({ code, host, state }: OAuthQuery, logger: Logger): Promise<OAuthResponse> {
  if (!config.features.oauthRegistration)
    return {
      error: 'OAuth registration is disabled.',
      error_code: 403,
    };

  const { oidc: oidcEnabled } = enabled(config);

  if (!oidcEnabled)
    return {
      error: 'OpenID Connect OAuth is not configured.',
      error_code: 401,
    };

  if (!code) {
    const linkState = encrypt('link', config.core.secret);
    const defaultState = encrypt('default', config.core.secret);

    return {
      redirect: oidcAuth.url(
        config.oauth.oidc.clientId!,
        `${config.core.returnHttpsUrls ? 'https' : 'http'}://${host}`,
        config.oauth.oidc.authorizeUrl!,
        state === 'link' ? linkState : defaultState,
        config.oauth.oidc.redirectUri ?? undefined,
      ),
    };
  }

  const body = new URLSearchParams({
    client_id: config.oauth.oidc.clientId!,
    client_secret: config.oauth.oidc.clientSecret!,
    grant_type: 'authorization_code',
    code,
    redirect_uri:
      config.oauth.oidc.redirectUri ??
      `${config.core.returnHttpsUrls ? 'https' : 'http'}://${host}/api/auth/oauth/oidc`,
  });

  logger.debug('oidc oauth request', {
    body: body.toString(),
  });

  const res = await fetch(config.oauth.oidc.tokenUrl!, {
    method: 'POST',
    body,
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
    },
  });

  if (!res.ok)
    return {
      error: 'Failed to fetch access token',
    };

  const json = await res.json();
  if (!json.access_token) return { error: 'No access token in response' };

  const userJson = await oidcAuth.user(json.access_token, config.oauth.oidc.userinfoUrl!);
  if (!userJson) return { error: 'Failed to fetch user' };

  logger.debug('user', { userinfo: userJson });

  return {
    access_token: json.access_token,
    refresh_token: json.refresh_token || null,
    // many different properties, so we are just gonna go down the list
    username:
      userJson.preferred_username ?? userJson.name ?? userJson.given_name ?? userJson.email ?? userJson.sub,
    user_id: userJson.sub,
    avatar: await fetchToDataURL(userJson.picture ?? null),
  };
}

export default combine([method(['GET'])], withOAuth('OIDC', handler));
