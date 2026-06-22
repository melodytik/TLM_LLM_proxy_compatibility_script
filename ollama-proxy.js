const express = require('express');
const axios = require('axios');

const app = express();
const PORT = 11435;
const TARGET_BASE_URL = 'http://127.0.0.1:11434';

// ============================================================
// 串行请求队列
// Ollama 单实例同时只能处理一个请求。后来的请求排队等待。
// ============================================================
let requestQueue = Promise.resolve();
let queueLength = 0;

app.use(express.json({ limit: '50mb' }));

app.use((req, res) => {
    let modifiedBody = { ...req.body };

    // 强制 stream=false（车万女仆模组不支持流式）
    if (req.method === 'POST' || req.method === 'PUT') {
        modifiedBody.stream = false;
        // 注意：enable_thinking 参数对 /v1/chat/completions 接口无效，
        // Ollama 会忽略它。思考内容会进入 reasonig 字段，
        // 我们在下面的响应处理中合并它。
        delete modifiedBody.enable_thinking;
    }

    const targetUrl = `${TARGET_BASE_URL}${req.originalUrl}`;

    const forwardHeaders = { ...req.headers };
    delete forwardHeaders['host'];
    delete forwardHeaders['content-length'];
    delete forwardHeaders['connection'];

    queueLength++;
    const queuePos = queueLength;
    console.log(`[${new Date().toISOString()}] 入队 #${queuePos} ${req.method} ${req.originalUrl} (队列长度: ${queueLength})`);

    requestQueue = requestQueue.then(() => handleRequest(req, res, modifiedBody, forwardHeaders, targetUrl, queuePos));
});

async function handleRequest(req, res, modifiedBody, forwardHeaders, targetUrl, queuePos) {
    console.log(`[${new Date().toISOString()}] 开始处理 #${queuePos} ${req.method} ${req.originalUrl}`);

    try {
        const response = await axios({
            method: req.method,
            url: targetUrl,
            data: modifiedBody,
            headers: forwardHeaders,
            responseType: 'text',       // 以文本接收，方便 JSON 解析和修复
            validateStatus: () => true,
            timeout: 300000,
        });

        let responseText = response.data;

        // ============================================================
        // 修复：如果 content 为空但 reasonig 有内容，
        // 把 reasonig 的内容作为 content 返回给模组。
        // 原因：enable_thinking 对 /v1/chat/completions 无效，
        // Ollama 会把思考内容放进 reasonig 字段，content 反而为空。
        // ============================================================
        try {
            const parsed = JSON.parse(responseText);
            let modified = false;

            if (parsed.choices && Array.isArray(parsed.choices)) {
                for (const choice of parsed.choices) {
                    if (choice.message) {
                        // 情况1：content 为空但 reasonig 有内容 → 合并
                        if ((!choice.message.content || choice.message.content.trim() === '') &&
                            choice.message.reasoning) {
                            choice.message.content = choice.message.reasoning;
                            delete choice.message.reasoning;
                            modified = true;
                            console.log(`  [#${queuePos}] 修复：将 reasonig 内容移入 content`);
                        }
                        // 情况2：content 里有 <think> 标签 → 去掉标签，保留正文
                        if (choice.message.content && choice.message.content.includes('<think>')) {
                            choice.message.content = choice.message.content.replace(/<think>[\s\S]*?<\/think>/g, '').trim();
                            modified = true;
                            console.log(`  [#${queuePos}] 修复：移除 content 中的 <think> 标签`);
                        }
                    }
                }
            }

            if (modified) {
                responseText = JSON.stringify(parsed);
            }
        } catch (e) {
            // 不是合法 JSON，原样透传
            console.log(`  [#${queuePos}] 响应非 JSON，原样透传`);
        }

        // 重新计算正确的 content-length
        const responseBuffer = Buffer.from(responseText, 'utf-8');

        const responseHeaders = { ...response.headers };
        delete responseHeaders['transfer-encoding'];
        delete responseHeaders['content-encoding'];
        responseHeaders['content-length'] = String(responseBuffer.length);
        responseHeaders['content-type'] = 'application/json; charset=utf-8';

        res.set(responseHeaders);
        res.status(response.status).send(responseBuffer);

        console.log(`[${new Date().toISOString()}] 完成 #${queuePos}，状态码: ${response.status}，响应大小: ${responseBuffer.length} bytes`);

    } catch (error) {
        console.error(`[${new Date().toISOString()}] 请求 #${queuePos} 出错: ${error.message}`);
        if (!res.headersSent) {
            res.status(500).json({
                error: 'Proxy server internal error',
                details: error.message
            });
        }
    }

    queueLength--;
}

app.listen(PORT, '127.0.0.1', () => {
    console.log(`代理服务器已启动，监听 http://127.0.0.1:${PORT}`);
    console.log(`请求将被修改并转发至 ${TARGET_BASE_URL}`);
    console.log(`模式：串行队列 + reasonig→content 自动修复`);
});
