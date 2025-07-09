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

  return [getIfcNode(ifcProjectId), entities];
}

export async function addNode_impl(id: number): Promise<IfcNode> {
  return getIfcNode(id);
}

export async function addNodeById_impl(id: number): Promise<IfcNode> {
  return getIfcNode(id);
}

function refersToAnotherId(lineObjectValue: any): boolean {
  if (!lineObjectValue) return false;
  if (lineObjectValue instanceof WebIFC.Handle) return true;
  return lineObjectValue.type == WebIFC.REF;
}

function makeAttribute(lineObjectKey: string, lineObjectValue: any, keyIsInverse: boolean, attrIdx: number): Attribute {
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
    console.assert(!keyIsInverse);
    content = { type: "id", value: extractId(lineObjectValue) };
  }
  else if (lineObjectValue == null) {
    console.assert(!keyIsInverse);
    content = { type: "value", value: null };
  }
  else {
    console.assert(!keyIsInverse);
    console.log(lineObjectValue.name); // IFCクラス名。使わない。
    content = { type: "value", value: extractValue(lineObjectValue) };
  }

  return {
    name: lineObjectKey,
    content: content,
    edgePosition: { x: keyIsInverse ? 0 : 200, y: 68 + attrIdx * 29 },
    inverse: keyIsInverse,
  };
}

function getIfcNode(id: number): IfcNode {
  const lineObject = ifcapi.GetLine(modelID, id, false, false);
  const lineObjectWithInverses = ifcapi.GetLine(modelID, id, false, true);

  const keys = new Set(Object.keys(lineObject));
  const keysWithInverses = Object.keys(lineObjectWithInverses);

  const inverseKeys = new Set(keysWithInverses.filter(key => !keys.has(key)));

  const node: IfcNode = {
    id: lineObject.expressID,
    type: ifcapi.GetNameFromTypeCode(lineObject.type),
    attributes: [],
    position: { x: 40, y: 60 },
  };

  let count = 0;
  for (const key of keysWithInverses) {
    if (key == "expressID" || key == "type") continue;

    const value = lineObjectWithInverses[key];
    const keyIsInverse = inverseKeys.has(key);

    const attribute = makeAttribute(key, value, keyIsInverse, count);
    hasValue(attribute.content) && count++;
    node.attributes.push(attribute);
  }

  return node;
}



