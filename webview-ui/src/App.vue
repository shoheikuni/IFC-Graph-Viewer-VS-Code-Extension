<script setup lang="ts">
import Canvas from "./components/Canvas.vue";
import { onMounted, onUnmounted, useTemplateRef } from 'vue';
import { initProcessIfc, deinitProcessIfc, processIfcInitialized } from "./components/processIfc_webIfc"
import { vscode } from "./utilities/vscode.ts";

const canvas = useTemplateRef('canvas');

onMounted(async () => {
  // IFC受信
  window.addEventListener("message", (event) => {
    if (event.data?.type === "loadIfc") {
      console.log(`[App] IFC file received: ${event.data.data.value}`);
      console.assert(processIfcInitialized());
      canvas.value!.loadIfcFromText(event.data.data.ifcText);
    }
  });

  const wasmDir = (window as any).__WASM_DIR__;
  console.log("[App] wasmDir =", wasmDir);
  await initProcessIfc(wasmDir);

  console.log("[App] Posting ready command");
  vscode.postMessage({ command: "ready" });
});
onUnmounted(() => {
  deinitProcessIfc();
});
</script>

<template>
  <Canvas ref="canvas" />
</template>

<style scoped></style>
