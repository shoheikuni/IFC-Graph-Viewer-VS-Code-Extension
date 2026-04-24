<script setup lang="ts">
import Canvas from "./components/Canvas.vue";
import { onMounted, onUnmounted } from 'vue';
import { initProcessIfc, deinitProcessIfc } from "./components/processIfc_webIfc"

onMounted(async () => {
  const wasmDir = (window as any).__WASM_DIR__;
  console.log("[App] wasmDir =", wasmDir);
  await initProcessIfc(wasmDir);
});
onUnmounted(() => {
  deinitProcessIfc();
});
</script>

<template>
  <Canvas></Canvas>
</template>

<style scoped></style>
