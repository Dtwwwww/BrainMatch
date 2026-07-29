/**
 * 微信 OAuth 配置
 */
export const wechatOAuthConfig = {
  appId: process.env.NEXT_PUBLIC_WECHAT_APPID!,
  appSecret: process.env.WECHAT_APPSECRET!,
  redirectUri: `${process.env.NEXT_PUBLIC_APP_URL}/api/auth/callback/wechat`,
  scope: 'snsapi_login',
};

/**
 * 构建微信 OAuth 授权 URL
 */
export function buildWechatOAuthUrl(): string {
  const params = new URLSearchParams({
    appid: wechatOAuthConfig.appId,
    redirect_uri: wechatOAuthConfig.redirectUri,
    response_type: 'code',
    scope: wechatOAuthConfig.scope,
    state: crypto.randomUUID(),
  });
  return `https://open.weixin.qq.com/connect/qrconnect?${params.toString()}#wechat_redirect`;
}
