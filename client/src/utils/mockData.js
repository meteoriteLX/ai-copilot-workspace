export function generateMockChatHistory(count = 1000) {
  const roles = ['customer', 'agent']
  const contents = [
    '你好，请问这个商品有货吗？',
    '有的，请问您需要什么尺寸？',
    '我想买一件L码的白色T恤。',
    '好的，L码白色有货，您可以下单。',
    '好的，谢谢。',
    '不客气，有任何问题随时联系。',
    '为什么我的订单还没发货？',
    '您好，我帮您查一下，请稍等。'
  ]
  const list = []
  for (let i = 0; i < count; i++) {
    list.push({
      id: `msg_${i}`,
      role: roles[Math.floor(Math.random() * roles.length)],
      content: contents[Math.floor(Math.random() * contents.length)] + ` (这是第${i+1}条消息)`,
      time: new Date().toLocaleTimeString(),
    })
  }
  return list
}