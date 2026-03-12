import { ref } from 'vue'
export function useAIChat() {
  const aiSuggestion = ref('')
  const isReceiving = ref(false)
  //新增状态：用于中断请求的AbortController
  const abortController = ref(null)
  
  //用于节流的缓冲区
  // let buffer = ''
  let buffer = [];
  
  //节流。控制aiSuggestion的更新频率
  const throttledUpdate = (() => {
    let valid = true;
    return () => {
      if(!valid) return false;
      valid = false;
      setTimeout(()=>{
        aiSuggestion.value = buffer.join('');
        valid = true;
      },50)
    }
  })(); //立即执行

  const fetchAI = async (messages = []) => {
    if (abortController.value) {
      abortController.value.abort()
    }
    
    abortController.value = new AbortController()
    isReceiving.value = true
    aiSuggestion.value = ''
    buffer = [];

    try {
      const response = await fetch('http://localhost:3000/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ messages:messages || '默认问题' }),
        signal: abortController.value.signal, //将 abortController.value.signal 作为signal参数传入，使得后续可以通过abort()中断该请求。
      })

      const reader = response.body.getReader()//从响应体中获取一个ReadableStreamDefaultReader对象，用于读取流式数据。
      const decoder = new TextDecoder() //创建一个TextDecoder实例，用于将二进制数据（Uint8Array）解码为字符串。

      while (true) { //进入无限循环，每次读取一块数据
        const { done, value } = await reader.read() //reader.read()返回一个 Promise，解析为一个对象，包含 done（是否完成）和value（Uint8Array 数据块）。
        if (done) break //如果done为 true，表示流结束，退出循环。

        const chunk = decoder.decode(value)//将读取到的二进制块解码为字符串chunk
        const lines = chunk.split('\n\n') //由于服务端返回的是SSE格式，每个消息以两个换行符\n\n分隔，因此用split('\n\n')分割得到多条可能的lines。
        for (const line of lines) {
          if (line.startsWith('data: ')) { //遍历每一行（实际是每个消息），检查是否以 'data: ' 开头，这是 SSE 数据格式的标准前缀
            const data = line.slice(6) //去掉前缀 'data: '（长度为 6），得到实际的数据字符串
            if (data === '[DONE]') { //如果数据内容恰好是 '[DONE]'，表示流式响应结束。
              isReceiving.value = false
              return
            }
            try {
              const parsed = JSON.parse(data) //尝试将数据解析为JS对象parsed
              if(parsed.choices && parsed.choices[0]?.delta?.content){ //检查解析后的对象是否符合OpenAI流式响应的格式：存在 choices 数组，且第一个元素的 delta 对象中包含 content 属性。
                const token = parsed.choices[0].delta.content; //如果存在，则取出增量内容token
                buffer.push(token);
                throttledUpdate();
                // aiSuggestion.value += token;
              }
            } catch (e) {
              console.error('解析失败', e)
            }
          }
        }
      }
    } catch (error) {
      if (error.name !== 'AbortError') {
        console.error('请求出错', error)
      }
    } finally {
      isReceiving.value = false
      abortController.value = null
      //确保最后一次更新
      // throttledUpdate.flush()
      //不用。buffer是累积的，所以被忽略的数据会被前一个定时器包含。所以数据不会丢失，只是更新可能延迟最多一个周期。
    }
  }

  const stopAI = () => {
    if (abortController.value) {
      abortController.value.abort()
      isReceiving.value = false
    }
  }

  return {
    aiSuggestion,
    isReceiving,
    fetchAI,
    stopAI,
  }
}