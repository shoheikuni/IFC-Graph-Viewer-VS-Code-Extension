<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted } from "vue";

import NodeComponent from "./NodeComponent.vue";
import EdgeComponent from "./EdgeComponent.vue";
import { IfcNode, Edge, Position, Attribute } from "./interfaces";
import { hasValue } from "./utils";
import PropertyArea from "./PropertyArea.vue";
import SearchEntity from "./SearchEntity.vue";
import ToolbarComponent from "./ToolbarComponent.vue";
import { loadFile_impl, addNode_impl, addNodeById_impl } from "./processIfc_webIfc"


// ノードとエッジのデータ
const nodes = ref<IfcNode[]>([]);
const edges = ref<Edge[]>([]);

// エッジの描画中の状態
const drawingEdge = ref<{ from: Position; to: Position } | null>(null);

// 属性表示用のノード
const viewedAttrNode = ref<IfcNode | null>(null);

// 選択されたノード
const selectedNodeIds = ref<number[]>([]);
// 範囲選択中に選択されたノード
const rectSelectedNodeIds = ref<number[]>([]);
// 範囲選択前に選択されていたノード
const previousSelectedNodeIds = ref<number[]>([]);

// ドラッグ中のノードの初期位置（ノード移動処理用）
const dragStartNodePositions = ref<{ [id: number]: Position }>({});

// IFCファイルの要素（右クリックメニュー表示用）
const ifcElements = ref<{ [key: string]: number[] }>({});

// 右クリックメニュー表示フラグ
const showSearch = ref<boolean>(false);

// ドラッグ中の位置を追跡するための状態
const dragging = ref(false);
const dragStartRelativePosition = ref<Position>({ x: 0, y: 0 });
const dragEndRelativePosition = ref<Position>({ x: 0, y: 0 });
const dragStartPosition = ref<Position>({ x: 0, y: 0 });
const dragEndPosition = ref<Position>({ x: 0, y: 0 });
const rectSelecting = ref(false);

// 右クリック位置
const rightClickPosition = ref({ x: 0, y: 0 });

const fileOpen = ref<Boolean>(false);

// 描画領域の拡大縮小、移動
const scale = ref(1);
const position = ref({ x: 0, y: 0 });
const zoomContainer = ref<HTMLElement | null>(null);

// ライフサイクルフック
onMounted(() => {
  window.addEventListener("keydown", handleKeyDown);
});

onUnmounted(() => {
  window.removeEventListener("keydown", handleKeyDown);
});

// キーボードイベントのハンドラ
function handleKeyDown(event: KeyboardEvent) {
  if (event.key === "Delete") {
    // 選択されたノードとそれに紐づくエッジを削除
    edges.value = edges.value.filter(
      (edge) =>
        !selectedNodeIds.value.includes(edge.from.nodeId) &&
        !selectedNodeIds.value.includes(edge.to.nodeId)
    );
    nodes.value = nodes.value.filter(
      (node) => !selectedNodeIds.value.includes(node.id)
    );
    selectedNodeIds.value = [];
  }
}

// ドラッグ操作のハンドラ（全体の移動処理、範囲選択）
function startDrag(event: MouseEvent) {
  if (event.button === 2) {
    // 右クリックは処理しない
    return;
  }

  // Shiftで範囲選択、それ以外は全体移動
  if (event.shiftKey) {
    rectSelecting.value = true;
    previousSelectedNodeIds.value = [...selectedNodeIds.value];
    rectSelectedNodeIds.value = [];
  } else {
    clearSelect(event);
  }

  dragging.value = true;
  dragStartRelativePosition.value = getRelativePosition(event);
  dragEndRelativePosition.value = { ...dragStartRelativePosition.value };
  dragStartPosition.value = { x: event.clientX, y: event.clientY };
  dragEndPosition.value = { x: event.clientX, y: event.clientY };
  // テキスト選択やスクロールを防ぐ
  document.body.style.userSelect = "none";
}

function drag(event: MouseEvent) {
  if (dragging.value) {
    if (rectSelecting.value) {
      // 選択範囲を描画
      dragEndPosition.value = { x: event.clientX, y: event.clientY };
      dragEndRelativePosition.value = getRelativePosition(event);
      const [x1, x2] = [
        dragStartRelativePosition.value.x,
        dragEndRelativePosition.value.x,
      ].sort((a, b) => a - b);
      const [y1, y2] = [
        dragStartRelativePosition.value.y,
        dragEndRelativePosition.value.y,
      ].sort((a, b) => a - b);

      // 選択範囲内のノードを選択
      nodes.value.forEach((node) => {
        const nodePosition = node.position;
        const left = nodePosition.x;
        const right = nodePosition.x + 200;
        const top = nodePosition.y;
        const length = node.attributes.filter((attr) =>
          hasValue(attr.content)
        ).length;
        // ヘッダーの高さ44px、bodyのpadding20px、属性の高さ29px
        const bottom = nodePosition.y + 44 + 20 + 29 * length;

        // 選択開始前に選択済みのノードは処理しない
        if (!previousSelectedNodeIds.value.includes(node.id)) {
          if (!(x2 < left || right < x1) && !(y2 < top || bottom < y1)) {
            // 範囲内にあるノードを選択
            if (!rectSelectedNodeIds.value.includes(node.id)) {
              rectSelectedNodeIds.value.push(node.id);
              selectedNodeIds.value.push(node.id);
            }
          } else {
            // 範囲外にあるノードを選択解除
            if (rectSelectedNodeIds.value.includes(node.id)) {
              rectSelectedNodeIds.value = rectSelectedNodeIds.value.filter(
                (id) => id !== node.id
              );
              selectedNodeIds.value = selectedNodeIds.value.filter(
                (id) => id !== node.id
              );
            }
          }
        }
      });
    } else {
      // 全体を移動
      position.value.x += event.clientX - dragStartPosition.value.x;
      position.value.y += event.clientY - dragStartPosition.value.y;
      dragStartPosition.value = { x: event.clientX, y: event.clientY };
    }
  }
}

function endDrag() {
  dragging.value = false;
  rectSelecting.value = false;
  document.body.style.userSelect = "auto";
}

// ファイルのアップロード
async function loadFile(event: Event) {
  const input = event.target as HTMLInputElement;
  if (input.files?.length) {
    const selectedFile = input.files[0];

    try {
      const [model, entities] = await loadFile_impl(selectedFile);

      ifcElements.value = entities;
      nodes.value.push(model);
      fileOpen.value = true;
      console.log(model);
    }
    catch(error) {
      // エラー処理
      console.error("ファイルのアップロードに失敗しました:", error);
    }
  }
}

// ノードの位置を更新するハンドラ
const updateNodePosition = (moveDistance: { x: number; y: number }) => {
  nodes.value.forEach((node) => {
    // 選択されたノードのみ移動
    if (selectedNodeIds.value.includes(node.id)) {
      const startPosition = dragStartNodePositions.value[node.id];
      node.position.x = startPosition.x + moveDistance.x;
      node.position.y = startPosition.y + moveDistance.y;
    }
  });
};

// ノードの整列処理
const alignNodePosition = (
  align:
    | "left"
    | "center"
    | "right"
    | "top"
    | "middle"
    | "bottom"
    | "horizontal"
    | "vertical"
) => {
  if (selectedNodeIds.value.length <= 1) return;
  const selectedNodes = nodes.value.filter((node) =>
    selectedNodeIds.value.includes(node.id)
  );
  const xs = selectedNodes.map((node) => node.position.x);
  const ys = selectedNodes.map((node) => node.position.y);
  const [minX, maxX] = [Math.min(...xs), Math.max(...xs)];
  const [minY, maxY] = [Math.min(...ys), Math.max(...ys)];
  if (align === "left") {
    setAlignNodePosition(selectedNodes, { x: minX });
  } else if (align === "center") {
    setAlignNodePosition(selectedNodes, { x: minX + (maxX - minX) / 2 });
  } else if (align === "right") {
    setAlignNodePosition(selectedNodes, { x: maxX });
  } else if (align === "top") {
    setAlignNodePosition(selectedNodes, { y: minY });
  } else if (align === "middle") {
    setAlignNodePosition(selectedNodes, { y: minY + (maxY - minY) / 2 });
  } else if (align === "bottom") {
    setAlignNodePosition(selectedNodes, { y: maxY });
  } else if (align === "horizontal") {
    const interval = (maxX - minX) / (selectedNodes.length - 1);
    selectedNodes.sort((a, b) => a.position.x - b.position.x);
    setAlignNodePosition(selectedNodes, { x: minX }, interval);
  } else if (align === "vertical") {
    const interval = (maxY - minY) / (selectedNodes.length - 1);
    selectedNodes.sort((a, b) => a.position.y - b.position.y);
    setAlignNodePosition(selectedNodes, { y: minY }, interval);
  }
};
const setAlignNodePosition = (
  selectedNodes: IfcNode[],
  { x = null, y = null }: { x?: number | null; y?: number | null },
  interval = 0
) => {
  selectedNodes.forEach((node, idx) => {
    if (x !== null) node.position.x = x + interval * idx;
    if (y !== null) node.position.y = y + interval * idx;
  });
};

// エッジの位置を計算する
const edgePosition = computed(() => {
  /* パフォーマンス悪いかも */
  return edges.value.map((edge) => {
    const from = edge.from;
    const from_node = nodes.value.find((c) => c.id === from.nodeId);
    const from_attr = from_node?.attributes.find(
      (c) => c.name === from.attrName
    );
    const from_edge = {
      x: (from_node?.position.x ?? 0) + (from_attr?.edgePosition.x ?? 0),
      y: (from_node?.position.y ?? 0) + (from_attr?.edgePosition.y ?? 22.5),
    };

    const to = edge.to;
    const to_node = nodes.value.find((c) => c.id === to.nodeId);
    const to_attr = to_node?.attributes.find((c) => c.name === to.attrName);
    const to_edge = {
      x: (to_node?.position.x ?? 0) + (to_attr?.edgePosition.x ?? 0),
      y: (to_node?.position.y ?? 0) + (to_attr?.edgePosition.y ?? 22.5),
    };

    return {
      id: edge.id,
      from: from_edge,
      to: to_edge,
    };
  });
});

// ノードの選択処理
const selectNode = (node: IfcNode, toggle = false) => {
  if (toggle) {
    // Shiftキーを押しながらの選択はトグル選択
    if (selectedNodeIds.value.includes(node.id)) {
      selectedNodeIds.value = selectedNodeIds.value.filter(
        (id) => id !== node.id
      );
    } else {
      selectedNodeIds.value.push(node.id);
    }
  } else {
    // 未選択であれば選択
    if (!selectedNodeIds.value.includes(node.id)) {
      viewedAttrNode.value = node;
      selectedNodeIds.value = [node.id];
    }

    // 選択されたノードの初期位置を記録
    dragStartNodePositions.value = nodes.value.reduce((obj, node) => {
      if (selectedNodeIds.value.includes(node.id)) {
        obj[node.id] = { ...node.position };
      }
      return obj;
    }, {} as { [id: number]: Position });
  }
};

// ノードを追加するハンドラ
async function addNode_(
  srcId: number,
  dstId: number,
  srcName: string,
  inverse: boolean,
  dstPosition: Position,
  idx: number
) {
  try {
    const node = await addNode_impl(dstId);

    // 表示済みならノードを追加しない
    if (!nodes.value.find((c) => c.id === dstId)) {
      nodes.value.push(node);
    }

    // nodeIdと一致するattributeのnameを取得
    const targetAttr = node.attributes.find((attr) => {
      if (Array.isArray(attr.content)) {
        if (attr.content.find((c) => c.type === "id" && c.value === srcId)) {
          return true;
        }
      } else {
        return attr.content.type === "id" && attr.content.value === srcId;
      }
    });

    // ノードの位置をエッジ接続点を合わせるように更新
    // （ノードが複数あるときは重ならないように位置をずらす）
    const position = {
      x: dstPosition.x - (targetAttr?.edgePosition.x ?? 0) + idx * 10,
      y: dstPosition.y - (targetAttr?.edgePosition.y ?? 22.5) + idx * 10,
    };
    node.position = position;

    // エッジ作成
    const from: { nodeId: number; attrName: string | undefined } = {
      nodeId: 0,
      attrName: "",
    };
    const to: { nodeId: number; attrName: string | undefined } = {
      nodeId: 0,
      attrName: "",
    };
    if (inverse) {
      from.nodeId = dstId;
      from.attrName = targetAttr?.name;
      to.nodeId = srcId;
      to.attrName = srcName;
    } else {
      from.nodeId = srcId;
      from.attrName = srcName;
      to.nodeId = dstId;
      to.attrName = targetAttr?.name;
    }

    const id = `${from.nodeId}-${from.attrName}-${to.nodeId}-${to.attrName}`;
    if (edges.value.find((c) => c.id === id)) {
      return;
    }
    edges.value.push({
      id: id,
      from: from,
      to: to,
    });
  }
  catch(error) {
    console.log(error);
  }
  finally {
    // 描画中のエッジを削除
    updateDrawingEdge(null);
  }
}

const addNode = (
  nodeId: number,
  data: { position: Position; attribute: Attribute }
) => {
  // console.log(data);
  const id = data.attribute.content;
  const ids = Array.isArray(id) ? id : [id];
  ids.forEach((id, idx) => {
    addNode_(
      nodeId,
      id.value as number,
      data.attribute.name,
      data.attribute.inverse,
      data.position,
      idx
    );
  });
};

// 描画中のエッジを更新する
const updateDrawingEdge = (edge: { from: Position; to: Position } | null) => {
  drawingEdge.value = edge;
};

// ホイールイベントのハンドラ
const handleWheel = (event: WheelEvent) => {
  event.preventDefault();
  const container = zoomContainer.value;
  if (!container) return;

  const previousScale = scale.value;

  const zoomIntensity = 0.1;
  const wheelDelta = event.deltaY;
  // ズームインまたはズームアウト
  const scaleChange = wheelDelta > 0 ? -zoomIntensity : zoomIntensity;
  // スケールが小さすぎるか大きすぎないように制限する
  scale.value = Math.min(Math.max(0.1, scale.value + scaleChange), 2);
  if (previousScale === scale.value) return;

  // スケール変更に基づいて位置を調整
  const rect = container.getBoundingClientRect();
  const x = event.clientX - rect.left;
  const y = event.clientY - rect.top;
  position.value.x -= (x - position.value.x) * (scaleChange / previousScale);
  position.value.y -= (y - position.value.y) * (scaleChange / previousScale);
};

// ノード以外の領域をクリックした場合に選択を解除する
const clearSelect = (event: MouseEvent) => {
  viewedAttrNode.value = null;
  const targetElement = event.target as Element;
  if (!targetElement.closest(".node")) {
    selectedNodeIds.value = [];
  }
};

const selectEntity = (id: number) => {
  // 選択された項目の処理
  addNodeById(id, { ...rightClickPosition.value });
};

async function addNodeById(id: number, dstPosition: Position) {
  try {
    const node = await addNodeById_impl(id);

    // 表示済みならノードを追加しない
    if (!nodes.value.find((c) => c.id === node.id)) {
      node.position = dstPosition;
      nodes.value.push(node);
    }
  }
  catch(error) {
    console.log(error);
  }
}

const getRelativePosition = (event: MouseEvent) => {
  const container = zoomContainer.value;
  if (!container) return { x: 0, y: 0 };

  const rect = container.getBoundingClientRect();

  // 要素内でのマウスの相対座標
  const relativeX =
    (event.clientX - rect.left - position.value.x) / scale.value;
  const relativeY = (event.clientY - rect.top - position.value.y) / scale.value;

  return { x: relativeX, y: relativeY };
};

const handleRightClick = (event: MouseEvent) => {
  event.preventDefault(); // デフォルトのコンテキストメニューを防ぐ
  const relativePosition = getRelativePosition(event);
  rightClickPosition.value = relativePosition;
  showSearch.value = true;
};

const closeSearch = () => {
  showSearch.value = false;
};
</script>

<template>
  <input
    type="file"
    @change="loadFile"
    class="fileInput"
    v-if="!fileOpen"
  />

  <div class="container">
    <div
      class="canvas"
      @mousedown="startDrag"
      @mousemove="drag"
      @mouseup="endDrag"
      @mouseleave="endDrag"
      @wheel="handleWheel"
      @contextmenu.prevent="handleRightClick"
      ref="zoomContainer"
    >
      <!-- エッジ -->
      <svg class="edge-container" xmlns="http://www.w3.org/2000/svg">
        <g
          :style="{
            transform: `translate(${position.x}px, ${position.y}px) scale(${scale})`,
            transformOrigin: '0 0',
          }"
        >
          <EdgeComponent
            v-for="edge in edgePosition"
            :key="edge.id"
            :from="edge.from"
            :to="edge.to"
          />

          <!-- 追加途中のエッジ -->
          <EdgeComponent
            v-if="drawingEdge !== null"
            :from="drawingEdge.from"
            :to="drawingEdge.to"
            :dashed="true"
          />
        </g>
      </svg>

      <!-- ノード -->
      <div
        class="node-container"
        :style="{
          transform: `translate(${position.x}px, ${position.y}px) scale(${scale})`,
        }"
      >
        <NodeComponent
          v-for="(node, _) in nodes"
          :key="node.id"
          :node="node"
          :selected="selectedNodeIds.includes(node.id)"
          :scale="scale"
          @update:position="updateNodePosition($event)"
          @add:node="addNode(node.id, $event)"
          @select:node="selectNode(node, $event)"
          @update:drawingEdgePosition="updateDrawingEdge($event)"
        />
      </div>

      <!-- 選択ボックス -->
      <div
        v-show="rectSelecting"
        class="selection-rectangle"
        :style="{
          left: `${Math.min(dragStartPosition.x, dragEndPosition.x)}px`,
          top: `${Math.min(dragStartPosition.y, dragEndPosition.y)}px`,
          width: `${Math.abs(dragEndPosition.x - dragStartPosition.x)}px`,
          height: `${Math.abs(dragEndPosition.y - dragStartPosition.y)}px`,
        }"
      ></div>

      <!-- ツールバー -->
      <ToolbarComponent @align:node="alignNodePosition($event)" />
    </div>

    <!-- 属性表示欄 -->
    <div class="sidebar">
      <div v-if="viewedAttrNode">
        <PropertyArea :node="viewedAttrNode" />
      </div>
    </div>

    <!-- ノード追加メニュー -->
    <div class="add-menu" v-if="showSearch" @click="closeSearch">
      <SearchEntity :elements="ifcElements" @select="selectEntity" />
    </div>
  </div>
</template>

<style scoped>
.container {
  display: flex;
  height: 100vh;
}
.fileInput {
  position: absolute;
  top: 20px;
  left: 20px;
  z-index: 1;
}
.canvas {
  width: 75vw;
  height: 100vh;
  overflow: auto;
  position: relative;
}
.sidebar {
  position: absolute;
  top: 0;
  right: 0;
  width: 25vw; /* 1/4 of the screen width */
  height: 100vh; /* Full height of the container */
  z-index: 2; /* Overlay on top of the canvas */
  word-wrap: break-word; /* 長い単語でも折り返しを行う */
  overflow: auto; /* 必要に応じてスクロールバーを表示 */
  background-color: #f0f0f0;
}
.node-container {
  transform-origin: 0 0;
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
}
.edge-container {
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
}
.selection-rectangle {
  position: absolute;
  border: 2px dashed #4a90e2; /* 青い点線の境界線 */
  background-color: rgba(74, 144, 226, 0.3); /* 半透明の青色背景 */
}
.add-menu {
  position: absolute;
  overflow: auto;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
}
.align-icons {
  position: absolute;
  top: 10px;
  right: 10px;
  display: flex;
  flex-direction: column;
  align-items: center;
}

.align-icon {
  padding: 3px;
  cursor: pointer;
}

.align-icon:hover {
  background-color: rgba(129, 129, 129, 0.3);
}
</style>
