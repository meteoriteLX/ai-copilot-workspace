require('dotenv').config()
const express = require('express')
const axios = require('axios')
const cors = require('cors')

const app = express()
app.use(cors())
app.use(express.json())

app.post('/api/chat', async (req, res) => {
  const { prompt } = req.body
  console.log('收到请求，prompt:', prompt)

  // 设置 SSE 响应头
  res.setHeader('Content-Type', 'text/event-stream')
  res.setHeader('Cache-Control', 'no-cache')
  res.setHeader('Connection', 'keep-alive')

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
          { role: 'system', content: '你是一个专业的客服助手，请根据用户的问题提供准确、友好的建议。' },
          { role: 'user', content: prompt }
        ],
        stream: true, // 启用流式输出
      },
      responseType: 'stream' // 关键：告诉 axios 返回流
    })

    // 将 DeepSeek 返回的流 pipe 到前端的 SSE 响应中
    // DeepSeek 流式响应的格式是 data: {...}\n\n，和我们之前模拟的格式一致，可以直接透传
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

app.listen(3000, () => {
  console.log('后端服务运行在 http://localhost:3000')
})