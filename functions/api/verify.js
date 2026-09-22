// Cloudflare Pages Function: /api/verify
// 验证用户提交的密钥，对比 Cloudflare 环境变量 ACCESS_KEY，并下发安全凭证

export async function onRequestPost(context) {
  const { request, env } = context;

  try {
    const body = await request.json();
    const inputKey = (body?.key || '').trim();

    // 1. 如果 Cloudflare 后台未配置 ACCESS_KEY，默认免密放行
    if (!env.ACCESS_KEY) {
      return new Response(
        JSON.stringify({
          success: true,
          message: '未配置 ACCESS_KEY 环境变量，已直接放行',
          warning: 'no_env',
        }),
        {
          headers: { 'Content-Type': 'application/json; charset=utf-8' },
        }
      );
    }

    // 2. 比对密钥
    const correctKey = env.ACCESS_KEY.trim();
    if (inputKey === correctKey) {
      // 生成加盐安全签名 Token
      const encoder = new TextEncoder();
      const data = encoder.encode(correctKey + '_aimodel_salt_2026');
      const hashBuffer = await crypto.subtle.digest('SHA-256', data);
      const hashArray = Array.from(new Uint8Array(hashBuffer));
      const token = hashArray.map((b) => b.toString(16).padStart(2, '0')).join('');

      // 设置 30 天有效期 Cookie
      const cookieHeader = `site_auth=${token}; Path=/; Max-Age=2592000; SameSite=Lax; Secure`;

      return new Response(
        JSON.stringify({
          success: true,
          message: '验证成功',
          token: token,
        }),
        {
          headers: {
            'Content-Type': 'application/json; charset=utf-8',
            'Set-Cookie': cookieHeader,
          },
        }
      );
    } else {
      return new Response(
        JSON.stringify({
          success: false,
          message: '访问密钥错误，请重新输入',
        }),
        {
          status: 401,
          headers: { 'Content-Type': 'application/json; charset=utf-8' },
        }
      );
    }
  } catch {
    return new Response(
      JSON.stringify({
        success: false,
        message: '请求格式异常',
      }),
      {
        status: 400,
        headers: { 'Content-Type': 'application/json; charset=utf-8' },
      }
    );
  }
}
