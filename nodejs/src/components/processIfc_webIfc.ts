import * as WebIFC from "web-ifc"
import { Attribute, AttrContent, IfcNode } from "./interfaces";
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

function refersToOtherId(lineObjectValue: any): boolean {
  const handleType: number = 5; // magic number
  if (!lineObjectValue) return false;
  if (lineObjectValue instanceof WebIFC.Handle) return true;
  return lineObjectValue.type == handleType;
}

function makeAttribute(lineObjectKey: string, lineObjectValue: any, keyIsInverse: boolean, attrIdx: number): Attribute {
  const omittedId = 0; // #0 is the id for the omitted parameter "*"

  let content: AttrContent | Array<AttrContent>;

  if (lineObjectValue instanceof Array) {
    content = lineObjectValue.map(elem => {
      if (refersToOtherId(elem)) {
        const value = elem.value == omittedId ? null : elem.value;
        return { type: "id", value: value };
      }
      else {
        return { type: "value", value: elem.value };
      }
    }).filter(content => !!content);
  }
  else if (refersToOtherId(lineObjectValue)) {
    console.assert(!keyIsInverse);
    const value = lineObjectValue.value == omittedId ? null : lineObjectValue.value;
    content = { type: "id", value: value };
  }
  else if (lineObjectValue == null) {
    console.assert(!keyIsInverse);
    content = { type: "value", value: null };
  }
  else if (typeof lineObjectValue == "number" || typeof lineObjectValue == "string") {
    console.assert(!keyIsInverse);
    content = { type: "value", value: lineObjectValue };
  }
  else {
    console.assert(!keyIsInverse);
    console.log(lineObjectValue.name); // IFCクラス名。使わない。
    content = { type: "value", value: lineObjectValue.value };
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



