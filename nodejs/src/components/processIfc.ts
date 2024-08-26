
import axios from "axios";

const endpoint = import.meta.env.VITE_API_ENDPOINT as string;


export async function loadFile_impl(selectedFile) {

  // FormData オブジェクトを作成してファイルを追加
  const formData = new FormData();
  formData.append("file", selectedFile);

  // ファイルをサーバーにアップロード
  return axios
    .post(endpoint + "/upload", formData, {
      headers: {
        "Content-Type": "multipart/form-data",
      },
    })
    .then((response) => {
      // レスポンスを処理
      return [response.data.model, response.data.entities, response.data.path];
    })
}

export async function addNode_impl(filepath: string, dstId: number) {
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
      // レスポンスを処理
      // console.log(response.data);
      return response.data.node;
    });
}

export async function addNodeById_impl(filepath: string, id: number) {
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
      // レスポンスを処理
      return response.data.node;
    });
}

