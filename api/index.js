// 开启 Edge Runtime：启动零延迟、支持原生流式透传、大幅突破 10 秒超时限制
export const config = {
  runtime: 'edge',
  regions: ['iad1'], // 固定在美东节点，确保访问 Google API 稳定
};

export default async function handler(req) {
  // 处理 CORS 预检请求
  if (req.method === 'OPTIONS') {
    return new Response(null, {
      status: 204,
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type, Authorization, x-goog-api-key',
      },
    });
  }

  try {
    const url = new URL(req.url);
    
    // 1. 清理路径并消除多余的双斜杠（修复 //v1beta 问题）
    let targetPath = url.pathname
      .replace(/^\/api\/index/, '')
      .replace(/^\/api/, '')
      .replace(/\/+/g, '/');

    if (!targetPath || targetPath === '/') {
      targetPath = '/v1beta/models';
    }

    // 保留原始 Query 参数（如 ?key=xxx 或 ?alt=sse）
    const targetUrl = `https://generativelanguage.googleapis.com${targetPath}${url.search}`;

    // 2. 组装请求头（同时兼容 Google 原生节点与 OpenAI 兼容节点）
    const headers = new Headers();
    headers.set('Content-Type', req.headers.get('content-type') || 'application/json');

    // 兼容 Google 原生 Header: x-goog-api-key
    const googApiKey = req.headers.get('x-goog-api-key');
    if (googApiKey) {
      headers.set('x-goog-api-key', googApiKey);
    }

    // 兼容 OpenAI 协议 Header: Authorization: Bearer <API_KEY>
    const authHeader = req.headers.get('authorization');
    if (authHeader) {
      headers.set('Authorization', authHeader);
    }

    // 3. 转发请求（直接使用 req.body 流，无需手动 JSON.stringify 阻塞内存）
    const fetchOptions = {
      method: req.method,
      headers: headers,
      body: (req.method !== 'GET' && req.method !== 'HEAD') ? req.body : undefined,
    };

    const response = await fetch(targetUrl, fetchOptions);

    // 4. 原生流式返回（直接透传 response.body ReadableStream，拒绝 504 超时）
    const responseHeaders = new Headers(response.headers);
    responseHeaders.set('Access-Control-Allow-Origin', '*');

    return new Response(response.body, {
      status: response.status,
      statusText: response.statusText,
      headers: responseHeaders,
    });

  } catch (error) {
    return new Response(
      JSON.stringify({
        error: '代理内部错误',
        message: error.message,
      }),
      {
        status: 500,
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*',
        },
      }
    );
  }
}
