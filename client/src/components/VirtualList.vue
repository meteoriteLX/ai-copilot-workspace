<template>
  <div class="virtual-list" ref="containerRef" @scroll="onScroll">
    <!-- 占位元素.phantom，高度等于所有列表项的总高度，用占位空白来使非可视区域的DOM元素不用渲染，又能生成正确的滚动条。-->
    <div class="phantom" :style="{height: totalHeight + 'px'}"></div>
    <!-- 实际渲染的内容区域，通过transform偏移，使可视的第一个项开始能显示在内容区域顶部-->
    <div class="content" :style="{ transform: `translateY(${offsetY}px)` }">
      <div v-for="(item,index) in visibleItems" :ref="el => setItemRef(el,index)" :key="item.id" class="list-item">
        <!-- :ref="el => setItemRef(el, index)" el为当前循环项的DOM，将这个DOM和Index传给函数。el是html的真实DOM元素div什么的，拥有各种属性方法。item是数据对象而已如{id: text:} -->
        <slot></slot>
      </div>
    </div>

  </div>

</template>

<script setup>
import { ref } from 'vue';

const props = defineProps({
  items: {type: Array, required: true},
  itemHeight: {type: Number, default: 80},
  buffer: {type: Number, default: 5} //缓冲区大小，即在可视区域上下额外渲染的项数，避免快速滚动时出现白屏。
})

const containerRef = ref(null); //容器的DOM
const totalHeight = ref(0); //所有项总高度
const offsetY = ref(0); //内容区的偏移量
const startIndex = ref(0); //当前渲染的第一个元素的索引
const endIndex = ref(0); //当前渲染的最后一个元素的索引
const visibleItems = ref([]); //当前需要渲染的项数组

//存储每一项的真实高度和位置信息{index,height,top,bottom}
const positions = ref([]);

//更新positions数组（初始化或重置）
const updatePositions = () => {
  positions.value = props.items.map((item,index) => {
    return {
      index: index,
      height: props.itemHeight,
      top: index * props.itemHeight, //当前项顶部距离滚动容器顶部的偏移量
      bottom:(index + 1) * props.itemHeight //前项底部距离滚动容器顶部的偏移量
    }
  })
  totalHeight.value = positions.value[positons.value.length - 1]?.bottom || 0;
  // positions.value[positions.value.length - 1]：取最后一个项的位置信息对象。
  // ?.bottom：如果数组不为空，就取其bottom值，即最后一项的底部偏移。由于最后一项的底部就是整个列表的底部，所以这个值就是所有项的总高度。
}

//存储每一项的DOM元素
const itemRefs = ref([]);
const setItemRef = (el,index) =>{
  if(el) itemRefs.value[index] = el;
}

//计算可见范围。根据滚动位置计算出哪些项应该被渲染。
const calcVisibleRange = () => {
  if(!containerRef.value) return;
  const scrollTop = containerRef.value.scrollTop; //当前滚动距离
  const containerHeight = containerRef.value.clientHeight; //容器可视高度

  //二分查找，找到第一个项底部到页面顶部的距离 大于 滚动条到页面顶部距离的项 ，bottom > scrollTop的项，也就是startIndex，需要显示渲染的开始
  let start = 0;
  let end = positions.value.length - 1;
  while(start <= end){
    const mid = Math.floor((start + end) / 2);
    if(positions.value[mid].bottom < scrollTop)  start = mid + 1;
    else end = mid - 1;
  }
  let startIdx = start;

  //从startIdx开始往后找，直到找到第一个 项顶部距离页面顶部的高度 大于 滚动条距离页面顶部高度（已经滑走看不见的部分） + 容器可视高度
  let endIdx = startIdx;
  while(endIdx <= positions.value.length - 1 && positions.value[endIdx].top <= scrollTop + containerHeight){
    endIdx++;
  }

  //加上缓冲区，预留一些可视区域附近渲染的项，防止快速滚动出现空白
  startIdx = Math.max(startIdx - props.buffer, 0);
  endIdx = Math.min(endIdx + props.buffer,positions.value.length - 1);

  startIndex.value = startIdx;
  endIndex.value = endIdx;
  visibleItems.value = props.items.slice(startIdx, endIdx + 1);//注意是左闭右开，这样正好取到endIdx

  //计算内容区域的偏移量，也就是将第一个渲染项移动到容器顶部所需偏移
  offsetY.value = positions.value[startIdx]?.top || 0;
}

//处理滚动事件
const onScroll = () => {
  calcVisibleRange();
}


</script>


<style scoped>

</style>