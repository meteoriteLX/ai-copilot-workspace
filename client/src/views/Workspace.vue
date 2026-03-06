<template>
  <div class="workspace">
    <!-- 聊天区 -->
    <div class="chat-box">
      <!-- 聊天框 -->
      <div class="chat-area">
        <div class="message-list" ref="messageListRef">
          <div v-for="msg in messageList" :key="msg.id" :class="['bubble',msg.role]">
            <!-- :class="['bubble', msg.role]数组语法，表示这个 <div> 会同时拥有两个类： -->
            {{ msg.content }}
          </div>
        </div>
      </div>

      <!-- 底部输入框 -->
      <div class="input-area">
        <textarea v-model="inputText" placeholder="请输入消息..." @input="handleInput" rows="3"></textarea>
        <!-- rows="3" 指定文本框的可见行数。文本框默认显示 3 行的高度，用户输入更多行时可以通过滚动查看。-->
        <button @click="sendMessage">发送</button>
      </div>

    </div>
    

    <!-- AI辅助面板 -->
    <div class="ai-panel">
      <h3>AI建议回复</h3>
      <div class="ai-content">
        {{ aiSuggestion }}
      </div>
      <div class="ai-actions">
        <button v-if="isReceiving" @click="stopAI">停止生成</button>
        <button v-else @click="fetchAI">生成建议</button>
      </div>
    </div>

  </div>


</template>

<script setup>
import { ref } from 'vue';
import { useAIChat } from '../hooks/useAIChat'

const messageList = ref([])
const inputText = ref('');

const { aiSuggestion,isReceiving,fetchAI,stopAI } = useAIChat();


messageList.value = [
  { id:1, role:'customer', content:'你好，请问这个商品有货吗？'},
  { id:1, role:'agent', content:'有的，请问您需要什么尺寸？'}
]



//防抖处理输入
//防抖保存草稿到LocalStorage
const saveDraft = (() => {
  let timer = null;
  return (text) => {
    if(timer) clearTimeout(timer);
    timer = setTimeout(()=>{
      console.log('保存草稿',text);
      localStorage.setItem('chat_draft',text);
    },1000)
  }
})();//立即执行，就能执行return的函数了

const handleInput = () => {
  saveDraft(inputText.value);
}

const sendMessage = ()=> {
  if(!inputText.value.trim()) return; //trim去掉空格。空格不发送
  messageList.value.push({
    id:Date.now(),
    role:'agent',
    content:inputText.value
  })
  inputText.value = '';
  //清除草稿
  localStorage.removeItem('chat_draft');
}

//页面加载时读取草稿。还没按send还没触发send前，input的时候，就已经从localStorage中得到draft了
//draft只在页面刚刷新时更新。读取之前的草稿。
//“草稿箱”功能，主要目的是在页面刷新、关闭或意外离开后，用户重新打开时能恢复之前未发送的输入内容
const draft = localStorage.getItem('chat_draft');
if(draft) inputText.value = draft;


</script>


<style scoped>
.workspace{
  display: flex;
  height: 100vh;
  font-family: system-ui, sans-serif;
}

.chat-box{
  flex: 2;
  display: flex;
  border: 1px solid #ccc;
  flex-direction: column;
}

.chat-area{
  flex: 4;
  display: flex;
  flex-direction: column;
}

.message-list{
  flex: 1;
  display: flex;
  flex-direction: column;
  overflow-y: auto;
  padding: 20px;
  background: #f9f9f9;
}

.bubble{
  max-width: 70%;
  margin-bottom: 12px;
  padding: 10px 14px;
  border-radius: 18px;
  word-wrap: break-word;
  /* 允许浏览器在必要时强制在单词内部换行，以确保所有内容都保持在容器内。 */
}

.bubble.customer{
  background-color: #e4e6eb;
  align-self: flex-start;
  /* 沿侧轴/交叉轴起始处对齐。此处因为父级flex-direction: column,所以侧轴为水平轴，为水平左对齐 */
}

.bubble.agent{
  background-color: #0084ff;
  color: white;
  align-self: flex-end;
}

.input-area{
  flex: 1;
  display: flex;
  padding: 12px;
  border-top: 1px solid #ccc;
  background: white;
}

.input-area textarea{
  flex: 1;
  resize: none;
  padding: 8px;
  border: 1px solid #ccc;
  border-radius: 8px;
  margin-right: 8px;
  outline: none;
}

.input-area button{
  padding: 8px 16px;
  background: #0084ff;
  color: white;
  border: none;
  border-radius: 8px;
  cursor: pointer;
}

.ai-panel{
  flex: 1;
  background: white;
  padding: 20px;
  border-radius: 8px;
  margin: 12px 0;
  overflow-y: auto;
  /* 当内容超出元素的高度时，自动显示垂直滚动条；如果内容没有超出，则不显示滚动条 */
  min-height: 100px;
}

.ai-actions button{
  width: 100%;
  padding: 10px;
  background: #0084ff;
  color: white;
  border: none;
  border-radius: 8px;
  cursor: pointer;
  margin-top: 8px;
}

</style>