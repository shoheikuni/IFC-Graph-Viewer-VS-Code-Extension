import axios from "axios";
import { IfcNode } from "./interfaces";
import { hasValue } from "./utils";

const endpoint = import.meta.env.VITE_API_ENDPOINT as string;

let filepath = "";

export async function loadFile_impl(ifcFile: File): Promise<[IfcNode, { [key: string]: number[] }]> {

  // FormData オブジェクトを作成してファイルを追加
  const formData = new FormData();
  formData.append("file", ifcFile);

  // ファイルをサーバーにアップロード
  return axios
    .post(endpoint + "/upload", formData, {
      headers: {
        "Content-Type": "multipart/form-data",
      },
    })
    .then((response) => {
      filepath = response.data.path;
      return [convertToNode(response.data.model), response.data.entities];
    });
}

export async function addNode_impl(dstId: number): Promise<IfcNode> {
  const config = {
    method: "post",
    url: endpoint + "/get_node",
    data: {
      path: filepath,
      id: dstId,
    },
  };
  return axios(config)
    .then((response) => {
      // console.log(response.data);
      return convertToNode(response.data.node);
    });
}

export async function addNodeById_impl(id: number): Promise<IfcNode> {
  const config = {
    method: "post",
    url: endpoint + "/get_node",
    data: {
      path: filepath,
      id: id,
    },
  };
  return axios(config)
    .then((response) => {
      return convertToNode(response.data.node);
    });
}

// レスポンスデータをNodeに変換
function convertToNode(data: any): IfcNode {
  const node: IfcNode = {
    id: data.id,
    type: data.type,
    attributes: [],
    position: { x: 40, y: 60 },
  };

  // attributes
  let count = 0;
  for (const attr of data.attributes) {
    const attribute = {
      name: attr.name,
      content: attr.content,
      edgePosition: { x: attr.inverse ? 0 : 200, y: 68 + count * 29 },
      inverse: attr.inverse,
    };
    hasValue(attr.content) && count++;
    node.attributes.push(attribute);
  }

  return node;
}

