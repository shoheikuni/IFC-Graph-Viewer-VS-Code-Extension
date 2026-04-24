<script setup lang="ts">
import Canvas from "./components/Canvas.vue";
import { onMounted, onUnmounted, useTemplateRef } from 'vue';
import { initProcessIfc, deinitProcessIfc, processIfcInitialized } from "./components/processIfc_webIfc"

const canvas = useTemplateRef('canvas');
let unloadedText: string = "";

onMounted(async () => {
  // IFC受信
  window.addEventListener("message", (event) => {
    if (event.data?.type === "loadIfc") {
      console.log("[App] IFC received");
      if (processIfcInitialized()) {
        canvas.value!.loadIfcFromText(event.data.data);
      }
      else {
        unloadedText = event.data.data; // processIfc_webIfcの初期化後まで保持する
      }
    }
  });

  const wasmDir = (window as any).__WASM_DIR__;
  console.log("[App] wasmDir =", wasmDir);
  await initProcessIfc(wasmDir);

  // 受信済みのIFCテキストを読み込み
  if (unloadedText !== "") {
    canvas.value!.loadIfcFromText(unloadedText);
    unloadedText = "";
  }

});
onUnmounted(() => {
  deinitProcessIfc();
});
</script>

<template>
  <Canvas ref="canvas" />
</template>

<style scoped></style>
