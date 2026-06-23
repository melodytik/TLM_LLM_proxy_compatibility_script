const express = require('express');
const axios = require('axios');

const app = express();
const PORT = 11435;
const TARGET_BASE_URL = 'http://127.0.0.1:11434';

// 串行请求队列
let requestQueue = Promise.resolve();
let queueLength = 0;

app.use(express.json({ limit: '50mb' }));

app.use((req, res) => {
    // 确保请求体是对象（防止数组或 null）
    if (typeof req.body !== 'object' || req.body === null) {
        return res.status(400).json({ error: 'Invalid JSON body' });
    }

    let modifiedBody = { ...req.body };

    // 强制 stream=false（车万女仆模组不支持流式）
    modifiedBody.stream = false;

    const targetUrl = `${TARGET_BASE_URL}${req.originalUrl}`;

    const forwardHeaders = { ...req.headers };
    delete forwardHeaders['host'];
    delete forwardHeaders['content-length'];
    delete forwardHeaders['connection'];

    queueLength++;
    const queuePos = queueLength;
    console.log(`[${new Date().toISOString()}] 入队 #${queuePos} ${req.method} ${req.originalUrl} (队列长度: ${queueLength})`);

    requestQueue = requestQueue
        .then(() => handleRequest(req, res, modifiedBody, forwardHeaders, targetUrl, queuePos))
        .catch(err => {
            console.error(`队列兜底错误: ${err}`);
            if (!res.headersSent) {
                res.status(500).json({ error: 'Unexpected queue error' });
            }
            queueLength--;
        });
});

async function handleRequest(req, res, modifiedBody, forwardHeaders, targetUrl, queuePos) {
    console.log(`[${new Date().toISOString()}] 开始处理 #${queuePos} ${req.method} ${req.originalUrl}`);
    try {
        const response = await axios({
            method: req.method,
            url: targetUrl,
            data: modifiedBody,
            headers: forwardHeaders,
            responseType: 'text',
            validateStatus: () => true,
            timeout: 300000,
        });

        let responseText = response.data;

        // 直接透传响应，不再做 reasoning 或 <think> 修复
        const responseBuffer = Buffer.from(responseText, 'utf-8');
        const responseHeaders = { ...response.headers };
        delete responseHeaders['transfer-encoding'];
        delete responseHeaders['content-encoding'];
        responseHeaders['content-length'] = String(responseBuffer.length);
        responseHeaders['content-type'] = 'application/json; charset=utf-8';

        res.set(responseHeaders);
        res.status(response.status).send(responseBuffer);

        console.log(`[${new Date().toISOString()}] 完成 #${queuePos}，状态码: ${response.status}，大小: ${responseBuffer.length} bytes`);
    } catch (error) {
        console.error(`[${new Date().toISOString()}] 请求 #${queuePos} 出错: ${error.message}`);
        if (!res.headersSent) {
            res.status(500).json({ error: 'Proxy server internal error', details: error.message });
        }
    } finally {
        queueLength--;
    }
}

app.listen(PORT, '127.0.0.1', () => {
    console.log(`代理服务器已启动，监听 http://127.0.0.1:${PORT}`);
    console.log(`请求将被修改并转发至 ${TARGET_BASE_URL}`);
    console.log(`模式：串行队列`);
});