const express = require('express');
const axios = require('axios');

const app = express();
const PORT = 11435; // 代理服务器监听端口
const TARGET_BASE_URL = 'http://127.0.0.1:11434'; // Ollama 本地地址

// 解析 JSON 请求体，限制大小设置为 50MB 以防止长上下文请求被拦截
app.use(express.json({ limit: '50mb' }));

// 拦截所有请求
app.use(async (req, res) => {
    // 1. 复制原始请求体
    let modifiedBody = { ...req.body };

    // 2. 强制添加/覆盖指定字段
    // 注意：仅当请求体存在且为对象时进行修改（通常是 POST 请求）
    if (req.method === 'POST' || req.method === 'PUT') {
        modifiedBody.stream = false;
        modifiedBody.enable_thinking = false;
    }

    // 3. 构建完整的 Ollama 目标 URL (保留原始路径，如 /v1/chat/completions)
    const targetUrl = `${TARGET_BASE_URL}${req.originalUrl}`;

    // 4. 准备转发请求的 Headers
    const forwardHeaders = { ...req.headers };
    // 删除 hop-by-hop 头部和 host，让 axios 重新生成
    delete forwardHeaders['host'];
    delete forwardHeaders['content-length']; 
    delete forwardHeaders['connection'];

    console.log(`[${new Date().toISOString()}] ${req.method} ${req.originalUrl} -> ${targetUrl}`);
    console.log('Modified Body:', JSON.stringify(modifiedBody, null, 2));

    try {
        // 5. 发送请求到 Ollama
        const response = await axios({
            method: req.method,
            url: targetUrl,
            data: modifiedBody,
            headers: forwardHeaders,
            responseType: 'stream', // 使用 stream 接收，以便完美透传响应数据
            validateStatus: () => true // 允许所有 HTTP 状态码，以便将 Ollama 的错误原样透传给客户端
        });

        // 6. 处理响应头，过滤掉可能导致乱码或冲突的头部
        const responseHeaders = { ...response.headers };
        delete responseHeaders['transfer-encoding'];
        delete responseHeaders['content-length']; // 让 express 重新计算
        delete responseHeaders['content-encoding']; // axios 默认会解压 gzip，需移除该头防止客户端解析乱码
        
        res.set(responseHeaders);

        // 7. 将 Ollama 的响应状态码和数据流透传给原始客户端
        res.status(response.status);
        response.data.pipe(res);

    } catch (error) {
        console.error('Proxy Error:', error.message);
        res.status(500).json({ 
            error: 'Proxy server internal error', 
            details: error.message 
        });
    }
});

// 启动服务器
app.listen(PORT, '127.0.0.1', () => {
    console.log(`代理服务器已启动，监听 http://127.0.0.1:${PORT}`);
    console.log(`请求将被修改并转发至 ${TARGET_BASE_URL}`);
});
