export default async function handler(req, res) {
  try {
    console.log("👉 1. 收到请求，原始 URL:", req.url);

    // 1. 清理路径，确保拼接给 Google 的路径是正确的
    let targetPath = req.url;
    if (targetPath.startsWith('/api/index')) {
      targetPath = targetPath.replace('/api/index', '');
    } else if (targetPath.startsWith('/api')) {
      targetPath = targetPath.replace('/api', '');
    }
    
    // 如果路径为空，默认给一个基础路径避免报错
    if (!targetPath || targetPath === '/') {
      targetPath = '/v1beta/models';
    }

    const targetUrl = `https://generativelanguage.googleapis.com${targetPath}`;
    console.log("👉 2. 准备转发给 Google:", targetUrl);

    // 2. 组装请求头
    const options = {
      method: req.method,
      headers: {
        'Content-Type': req.headers['content-type'] || 'application/json',
      }
    };

    // 3. 提取 API Key (支持 Header 和 URL 参数两种方式)
    const apiKey = req.headers['x-goog-api-key'] || (req.query && req.query.key);
    if (apiKey) {
      options.headers['x-goog-api-key'] = apiKey;
    }

    // 4. 处理 POST 请求体
    if (req.method !== 'GET' && req.method !== 'HEAD' && req.body) {
      options.body = typeof req.body === 'string' ? req.body : JSON.stringify(req.body);
    }

    console.log("👉 3. 正在向 Google 发送请求...");
    const response = await fetch(targetUrl, options);
    
    console.log("👉 4. Google 返回状态码:", response.status);
    const data = await response.text();

    // 5. 返回结果给 n8n
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.status(response.status).send(data);

  } catch (error) {
    // 终极防崩溃：即使出错，也会返回 JSON 而不是直接 Crash 报 500
    console.error("❌ 代理运行发生严重错误:", error);
    res.status(500).json({ 
      error: "代理内部错误", 
      message: error.message,
      stack: error.stack 
    });
  }
}
