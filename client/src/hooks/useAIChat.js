import { ref } from 'vue'
export function useAIChat() {
  const aiSuggestion = ref('')
  const isReceiving = ref(false)
  //新增状态：用于中断请求的AbortController
  const abortController = ref(null)
  
  
  //用于节流的缓冲区
  let buffer = ''
  
  //节流
  const throttledUpdate = (() => {
    let valid = true;
    return () => {
      if(!valid) return false;
      valid = false;
      setTimeout(()=>{
        aiSuggestion.value = buffer;
        valid = true;
      },50)
    }
  })(); //立即执行

  const fetchAI = async (prompt = '') => {
    if (abortController.value) {
      abortController.value.abort()
    }
    
    abortController.value = new AbortController()
    isReceiving.value = true
    aiSuggestion.value = ''
    buffer = ''

    try {
      const response = await fetch('http://localhost:3000/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ prompt: prompt || '默认问题' }),
        signal: abortController.value.signal,
      })

      const reader = response.body.getReader()
      const decoder = new TextDecoder()

      while (true) {
        const { done, value } = await reader.read()
        if (done) break

        const chunk = decoder.decode(value)
        const lines = chunk.split('\n\n')
        for (const line of lines) {
          if (line.startsWith('data: ')) {
            const data = line.slice(6)
            if (data === '[DONE]') {
              isReceiving.value = false
              return
            }
            try {
              const parsed = JSON.parse(data)
              if (parsed.content) {
                buffer += parsed.content
                //触发节流更新
                throttledUpdate()
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