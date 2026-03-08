const express = require('express')
const app = express()
app.use(express.json())

//跨域解决
const cors = require('cors')
app.use(cors()) //允许所有跨域请求

//模拟流式输出接口
app.post('/api/chat', (req, res) => {
  const { prompt } = req.body
  console.log('收到请求:', prompt)

  //设置 SSE 响应头
  res.setHeader('Content-Type', 'text/event-stream')
  res.setHeader('Cache-Control', 'no-cache')
  res.setHeader('Connection', 'keep-alive')

  //构造一段较长的回复（为了体现流式效果）
  const mockAnswer = `您好！作为客服，我为您提供以下建议：关于您提到的“${prompt}”问题，我们可以这样处理：首先，请确认您的订单号是否正确；其次，登录官网查看物流状态；如果仍未解决，请提供相关截图，我们会进一步帮助您。感谢您的耐心等待！`

  let index = 0
  const interval = setInterval(() => {
    if (index < mockAnswer.length) {
      //每次发送一个字符
      const token = mockAnswer.charAt(index)
      //SSE 数据格式：data: <json>\n\n
      res.write(`data: ${JSON.stringify({ content: token })}\n\n`)
      index++
    } else {
      //发送结束标记
      res.write(`data: [DONE]\n\n`)
      clearInterval(interval)
      res.end()
    }
  }, 30) // 30ms 一个字，可以明显看到流式效果

  //监听客户端中断请求
  req.on('close', () => {
    clearInterval(interval)
    console.log('客户端中断了连接')
  })
})

app.listen(3000, () => {
  console.log('后端服务运行在 http://localhost:3000')
})