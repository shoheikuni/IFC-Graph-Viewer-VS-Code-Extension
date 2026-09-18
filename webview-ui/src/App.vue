<script setup lang="ts">
import Canvas from "./components/Canvas.vue";
import { onMounted, onUnmounted, ref, useTemplateRef } from 'vue';
import { initProcessIfc, deinitProcessIfc, processIfcInitialized } from "./components/processIfc_webIfc"

const canvas = useTemplateRef('canvas');
let unloadedData: { ifcText: string, fileName: string } | undefined;
const fileName = ref<string>("");

onMounted(async () => {
  // IFC受信
  window.addEventListener("message", (event) => {
    if (event.data?.type === "loadIfc") {
      console.log("[App] IFC received");
      if (processIfcInitialized()) {
	fileName.value = event.data.data.fileName;
        canvas.value!.loadIfcFromText(event.data.data.ifcText);
      }
      else {
        unloadedData = event.data.data; // processIfc_webIfcの初期化後まで保持する
      }
    }
  });

  const wasmDir = (window as any).__WASM_DIR__;
  console.log("[App] wasmDir =", wasmDir);
  await initProcessIfc(wasmDir);

  // 受信済みのIFCテキストを読み込み
  if (unloadedData) {
    fileName.value = unloadedData.fileName;
    canvas.value!.loadIfcFromText(unloadedData.ifcText);
    unloadedData = undefined;
  }

});
onUnmounted(() => {
  deinitProcessIfc();
});
</script>

<template>
  <div class="viewer-root">
    <div class="header">{{ fileName }}</div>
    <Canvas ref="canvas" />
  </div>
</template>

<style scoped>

/* 表示位置調整がうまくいかないので無効化中
.header {
  display: flex;
  align-items: center;
  padding: 8px 10px;
  font-size: 12px;
  line-height: 1.6;
  background-color: #f3f3f3;
  border-bottom: 1px solid #ddd;
  color: #333;
}
*/

</style>
