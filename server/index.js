require('dotenv').config() //加载项目根目录下的 .env 文件，将其中定义的环境变量注入到 process.env 中。
const express = require('express')
const axios = require('axios')
const cors = require('cors') //引入 Express 框架、Axios（用于发送 HTTP 请求）和 CORS 中间件。

const app = express() //创建一个 Express 应用实例。
app.use(cors()) //使用 CORS 中间件，允许所有跨域请求（默认配置）。这样前端可以从不同源访问该后端。
app.use(express.json()) //使用 Express 内置的 JSON 解析中间件，使 req.body 能够正确解析 JSON 格式的请求体。

app.post('/api/chat', async (req, res) => { //定义一个 POST 路由，路径为 /api/chat
  const { messages } = req.body  //从请求体对象中解构出 prompt 字段

  //验证 messages 是否为有效数组
  if (!Array.isArray(messages) || messages.length === 0) {
    return res.status(400).json({ error: 'messages 必须是一个非空数组' });
  }

  console.log('收到请求，messages:', messages);
  const question = messages[0].content;
  const messagesToSend = messages.slice(0,1).map(msg => ({
    role: msg.role === 'agent' ? 'assistant' : 'user',
    content: msg.content
  }))

  // 设置 SSE 响应头
  res.setHeader('Content-Type', 'text/event-stream') //表明这是一个事件流。
  res.setHeader('Cache-Control', 'no-cache') //禁止缓存。
  res.setHeader('Connection', 'keep-alive') //保持长连接。

  try {
    // 调用 DeepSeek API（流式）
    const response = await axios({
      method: 'post',
      url: 'https://api.deepseek.com/v1/chat/completions',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${process.env.DEEPSEEK_API_KEY}`
      },
      data: {
        model: 'deepseek-chat', // 使用的模型
        messages: [
          { role: 'system', content: `你是一个专业的客服助手，请根据用户的问题${question}提供准确、友好的建议。以下是可供参考的上下文信息：` },
          ...messagesToSend
        ],
        stream: true, // 启用流式输出
      },
      responseType: 'stream' // 关键：告诉 axios 返回流。这样 Axios 会将响应数据作为可读流返回（而不是自动解析为 JSON）。
    })

    // 将 DeepSeek 返回的流用pipe方法直接连接到前端的响应对象 res 上
    // DeepSeek 流式响应的格式是 data: {...}\n\n，和我们之前模拟的格式一致，可以直接透传
    //这样 DeepSeek 返回的 SSE 数据块会原封不动地转发给前端，无需额外处理
    response.data.pipe(res)

    // 监听前端中断
    req.on('close', () => {
      console.log('前端中断了连接')
      response.data.destroy() // 关闭与 DeepSeek 的连接
    })

  } catch (error) {
    console.error('调用 DeepSeek API 出错:', error.message)
    // 向前端发送错误信息（也可用 SSE 格式发送错误事件）
    res.write(`data: ${JSON.stringify({ error: 'AI 服务暂时不可用' })}\n\n`)
    res.end()
  }
})

//启动 Express 服务器，监听 3000 端口，启动成功后打印提示信息。
app.listen(3000, () => {
  console.log('后端服务运行在 http://localhost:3000')
})