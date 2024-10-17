<script setup lang="ts">
import Canvas from "./components/Canvas.vue";
import { onMounted } from 'vue';
import { initWebIfc } from "./components/processIfc_webIfc"

onMounted(() => {
  window.addEventListener('message', (msg: MessageEvent) => {
      switch (msg.data.type) {
        case 'wasmDir': {
          initWebIfc(msg.data.value + "/");
          break;
        }
      }
    })
});
</script>

<template>
  <Canvas></Canvas>
</template>

<style scoped></style>
