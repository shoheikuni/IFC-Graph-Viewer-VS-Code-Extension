import * as WebIFC from "web-ifc"
import { Attribute, AttrContent, AttrContentValueType, AttrContentIdType, IfcNode } from "./interfaces";
import { hasValue } from "./utils";


const ifcapi = new WebIFC.IfcAPI();
(async function() {
  await ifcapi.Init();
})();

let modelID: number = -1;

const settings = {
  COORDINATE_TO_ORIGIN: true
};

export async function loadFile_impl(ifcFile: File): Promise<[IfcNode, { [key: string]: number[] }]> {
  const rawFileData = await ifcFile.arrayBuffer();
  modelID = ifcapi.OpenModel(new Uint8Array(rawFileData), settings); // いつ、どうやって閉じるの？

  let entities: { [key: string]: number[] } = {};
  for (const expressID of ifcapi.GetAllLines(modelID)) {
    const lineEntity = ifcapi.GetLine(modelID, expressID);
    const ifcClassName = ifcapi.GetNameFromTypeCode(lineEntity.type);
    if (!entities[ifcClassName]) entities[ifcClassName] = [];
    entities[ifcClassName].push(expressID);
  }

  const ifcProjectId = entities["IfcProject"][0];

  return [createIfcNode(ifcProjectId), entities];
}

export async function addNode_impl(id: number): Promise<IfcNode> {
  return createIfcNode(id);
}

export async function addNodeById_impl(id: number): Promise<IfcNode> {
  return createIfcNode(id);
}

function refersToAnotherId(lineObjectValue: any): boolean {
  if (!lineObjectValue) return false;
  if (lineObjectValue instanceof WebIFC.Handle) return true;
  return lineObjectValue.type == WebIFC.REF;
}

function makeAttribute(attrName: string, lineObjectValue: any, isInverse: boolean, attrIdx: number): Attribute {
  const omittedId = 0; // #0 is the id for the omitted parameter "*"

  let content: AttrContent | Array<AttrContent>;

  const extractId = (obj: any): AttrContentIdType => { return obj.value == omittedId ? null : obj.value; };
  const extractValue = (obj: any): AttrContentValueType => {
    if (obj instanceof Array) {
      if (obj[0].type === WebIFC.REAL) { // ifじゃなくてassertであるべき？
        const values: Array<number> = obj.map(elem => elem.value);
        return values;
      }
    }
    return obj.value;
  };

  if (lineObjectValue instanceof Array) {
    if (lineObjectValue.length == 0) {
      content = [];
    }
    else if (lineObjectValue[0].type === WebIFC.REAL) {
      // 座標
      content = { type: "value", value: extractValue(lineObjectValue) };
    }
    else {
      // リスト
      content = lineObjectValue.map(elem => {
        if (refersToAnotherId(elem)) { // IDリスト
          return { type: "id", value: extractId(elem) };
        }
        else { // テキストリスト or 座標リスト
          return { type: "value", value: extractValue(elem) };
        }
      }).filter(content => !!content); // このフィルタ意味ある？
    }
  }
  else if (refersToAnotherId(lineObjectValue)) {
    console.assert(!isInverse);
    content = { type: "id", value: extractId(lineObjectValue) };
  }
  else if (lineObjectValue == null) {
    console.assert(!isInverse);
    content = { type: "value", value: null };
  }
  else {
    console.assert(!isInverse);
    console.log(lineObjectValue.name); // IFCクラス名。使わない。
    content = { type: "value", value: extractValue(lineObjectValue) };
  }

  return {
    name: attrName,
    content: content,
    edgePosition: { x: isInverse ? 0 : 200, y: 68 + attrIdx * 29 },
    inverse: isInverse,
  };
}

function createIfcNode(id: number): IfcNode {
  // lineObjectはid(Express ID)の行に対応するIFCオブジェクト。
  // keyはexpressID, type, 及びIFC属性名
  // {
  //   expressID: id値,
  //   type: IFCクラスに対応する内部の型コード番号,
  //   GlobalId: { type: 1, value: "1s5utE$rDDfRKgzV6jUJ3d" },
  //   以下、IFC属性が続く...
  // }
  const lineObject = ifcapi.GetLine(modelID, id, false, false);
  const lineObjectWithInverses = ifcapi.GetLine(modelID, id, false, true);

  const keysExcludingInverses = new Set(Object.keys(lineObject)); // expressID, type, or 属性名. 逆参照名含まず
  const keysIncludingInverses = Object.keys(lineObjectWithInverses); // expressID, type, or 属性名. 逆参照名含む

  const attrNamesIncludingInverses = keysIncludingInverses.filter(key => key !== "expressID" && key !== "type"); // 属性名（逆参照名含む）
  const inverseNames = new Set(keysIncludingInverses.filter(key => !keysExcludingInverses.has(key))); // 逆参照名

  const node: IfcNode = {
    id: lineObject.expressID,
    type: ifcapi.GetNameFromTypeCode(lineObject.type),
    attributes: [],
    position: { x: 40, y: 60 },
  };

  let count = 0;
  for (const attrName of attrNamesIncludingInverses) {
    const value = lineObjectWithInverses[attrName];
    const isInverse = inverseNames.has(attrName);

    const attribute = makeAttribute(attrName, value, isInverse, count);
    hasValue(attribute.content) && count++;
    node.attributes.push(attribute);
  }

  return node;
}



