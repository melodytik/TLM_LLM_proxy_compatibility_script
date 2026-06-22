const http = require('http');
const url = require('url');

// 代理配置
const PROXY_PORT = 11435;                // 代理监听端口
const TARGET_HOST = '127.0.0.1';         // Ollama 服务地址
const TARGET_PORT = 11434;               // Ollama 服务端口

// 创建 HTTP 服务器
const server = http.createServer((req, res) => {
    // 只处理 POST 请求（因为只有 POST 才有请求体）
    if (req.method !== 'POST') {
        // 对于非 POST 请求，直接转发（不做修改）
        const targetUrl = url.parse(req.url);
        const options = {
            hostname: TARGET_HOST,
            port: TARGET_PORT,
            path: targetUrl.path,
            method: req.method,
            headers: req.headers,
        };
        delete options.headers.host; // 避免 Host 冲突
        const proxyReq = http.request(options, (proxyRes) => {
            res.writeHead(proxyRes.statusCode, proxyRes.headers);
            proxyRes.pipe(res);
        });
        proxyReq.on('error', (err) => {
            console.error('代理错误:', err.message);
            res.writeHead(500, { 'Content-Type': 'text/plain' });
            res.end('Proxy Error: ' + err.message);
        });
        req.pipe(proxyReq);
        return;
    }

    // 收集请求体数据
    let body = [];
    req.on('data', chunk => body.push(chunk));
    req.on('end', () => {
        const rawBody = Buffer.concat(body).toString();

        // 尝试解析 JSON 请求体
        let jsonBody;
        try {
            jsonBody = JSON.parse(rawBody);
        } catch (e) {
            // 如果不是 JSON，直接原样转发（不添加 stream 参数）
            console.warn('请求体不是 JSON，原样转发');
            forwardRequest(req, res, rawBody);
            return;
        }

        // ✅ 强制设置 stream: false 和 think: false（覆盖任何已有值）
        jsonBody.stream = false;
        jsonBody.think = false;   // 新增：禁用思考模式

        // 重新序列化为 JSON 字符串
        const newBody = JSON.stringify(jsonBody);
        console.log(`[${new Date().toISOString()}] 添加 stream=false & think=false: ${req.url}`);

        // 转发修改后的请求
        forwardRequest(req, res, newBody);
    });

    req.on('error', (err) => {
        console.error('读取请求体错误:', err.message);
        res.writeHead(400);
        res.end('Bad Request');
    });
});

// 转发请求函数
function forwardRequest(req, res, bodyString) {
    const targetUrl = url.parse(req.url);
    const headers = { ...req.headers };
    // 删除可能导致问题的头
    delete headers.host;
    delete headers['content-length']; // 将由新 body 重新计算

    const options = {
        hostname: TARGET_HOST,
        port: TARGET_PORT,
        path: targetUrl.path,
        method: req.method,
        headers: {
            ...headers,
            'Content-Type': 'application/json', // 确保是 JSON
            'Content-Length': Buffer.byteLength(bodyString),
        },
    };

    const proxyReq = http.request(options, (proxyRes) => {
        // 将状态码和响应头转发给客户端
        res.writeHead(proxyRes.statusCode, proxyRes.headers);
        // 将响应体通过管道传输
        proxyRes.pipe(res);
    });

    proxyReq.on('error', (err) => {
        console.error('转发请求失败:', err.message);
        res.writeHead(500, { 'Content-Type': 'text/plain' });
        res.end('Proxy Error: ' + err.message);
    });

    // 设置超时（300秒）
    proxyReq.setTimeout(300000, () => {
        proxyReq.destroy();
        res.writeHead(504, { 'Content-Type': 'text/plain' });
        res.end('Gateway Timeout');
    });

    // 写入修改后的请求体
    proxyReq.write(bodyString);
    proxyReq.end();
}

// 启动服务器
server.listen(PROXY_PORT, () => {
    console.log(`Ollama 代理已启动，监听端口: ${PROXY_PORT}`);
    console.log(`转发目标: http://${TARGET_HOST}:${TARGET_PORT}`);
    console.log(`所有 POST 请求将自动添加 stream: false 和 think: false`);
    console.log(`请将车万女仆模组的 API URL 改为: http://127.0.0.1:${PROXY_PORT}`);
});