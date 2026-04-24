<script setup lang="ts">
import Canvas from "./components/Canvas.vue";
import { onMounted, onUnmounted } from 'vue';
import { initProcessIfc, deinitProcessIfc } from "./components/processIfc_webIfc"

onMounted(() => {
  window.addEventListener('message', async (msg: MessageEvent) => {
      switch (msg.data.type) {
        case 'wasmDir': {
          await initProcessIfc(msg.data.value + "/");
          break;
        }
      }
    })
});
onUnmounted(() => {
  deinitProcessIfc();
});
</script>

<template>
  <Canvas></Canvas>
</template>

<style scoped></style>
