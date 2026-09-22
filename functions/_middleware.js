// Cloudflare Pages Function: 全局边缘中间件
// 支持通过 ?key=xxx 快捷直达并写入 Cookie

export async function onRequest(context) {
  const { request, env, next } = context;
  const url = new URL(request.url);
  const path = url.pathname;

  // 1. 白名单放行静态资源和 API
  const isDirectAsset =
    path.startsWith('/_next/') ||
    path.startsWith('/api/') ||
    path.startsWith('/fonts/') ||
    path.startsWith('/sprites/') ||
    path.startsWith('/search-index/') ||
    path === '/favicon.ico';

  if (isDirectAsset) {
    return next();
  }

  // 2. 如果携带了 ?key=xxx 参数且匹配 ACCESS_KEY，直接注入 Cookie 放行
  const queryKey = url.searchParams.get('key');
  if (queryKey && env.ACCESS_KEY && queryKey.trim() === env.ACCESS_KEY.trim()) {
    const response = await next();
    const encoder = new TextEncoder();
    const data = encoder.encode(env.ACCESS_KEY.trim() + '_aimodel_salt_2026');
    const hashBuffer = await crypto.subtle.digest('SHA-256', data);
    const token = Array.from(new Uint8Array(hashBuffer))
      .map((b) => b.toString(16).padStart(2, '0'))
      .join('');

    const newHeaders = new Headers(response.headers);
    newHeaders.append(
      'Set-Cookie',
      `site_auth=${token}; Path=/; Max-Age=2592000; SameSite=Lax; Secure`
    );
    return new Response(response.body, {
      status: response.status,
      statusText: response.statusText,
      headers: newHeaders,
    });
  }

  return next();
}
