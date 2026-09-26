import * as WebIFC from "web-ifc"
import { IfcValueInterface, HandleLike, isIfcValue, isHandleLike, isHandle, isIfcLineObject } from "./WebIFC_helper"
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

function getEntities(): { [key: string]: number[] } {
  let entities: { [key: string]: number[] } = {};
  for (const expressID of ifcapi.GetAllLines(modelID)) {
    const lineEntity = ifcapi.GetLine(modelID, expressID);
    const ifcClassName = ifcapi.GetNameFromTypeCode(lineEntity.type);
    if (!entities[ifcClassName]) entities[ifcClassName] = [];
    entities[ifcClassName].push(expressID);
  }
  return entities;
}

export async function loadFile_impl(ifcFile: File): Promise<[IfcNode, { [key: string]: number[] }]> {
  const rawFileData = await ifcFile.arrayBuffer();
  modelID = ifcapi.OpenModel(new Uint8Array(rawFileData), settings); // いつ、どうやって閉じるの？

  const entities = getEntities();
  const ifcProjectId = entities["IfcProject"][0];

  return [createIfcNode(ifcProjectId), entities];
}

export async function addNode_impl(id: number): Promise<IfcNode> {
  return createIfcNode(id);
}

export async function addNodeById_impl(id: number): Promise<IfcNode> {
  return createIfcNode(id);
}


function isEmptyArray(x: unknown): boolean {
  return Array.isArray(x) && x.length === 0;
}

function isIfcValueArray(x: unknown): x is IfcValueInterface[] {
  return Array.isArray(x) &&  x.every(item => isIfcValue(item));
}

function isHandleLikeArray(x: unknown): x is (HandleLike)[] {
  return Array.isArray(x) &&  x.every(item => isHandleLike(item));
}

function isNumberArray(x: unknown): x is number[] {
  return Array.isArray(x) && x.every(item => typeof item === 'number');
}

function isArrayOfEmptyArray(x: unknown): boolean {
  return Array.isArray(x) && x.length > 0 && x.every(item => isEmptyArray(item));
}

function isArrayOfIfcValueArray(x: unknown): x is IfcValueInterface[][] {
  return Array.isArray(x) && x.length > 0 && x.filter(item => !isEmptyArray(item)).every(item => isIfcValueArray(item));
}

function isArrayOfHandleLikeArray(x: unknown): x is (HandleLike)[][] {
  return Array.isArray(x) && x.length > 0 && x.filter(item => !isEmptyArray(item)).every(item => isHandleLikeArray(item));
}

function getId(obj: HandleLike): number | null {
  const omittedId = 0; // #0 is the id for the omitted parameter "*"

  if (isHandle(obj)) {
    return obj.value == omittedId ? null : obj.value;
  }
  else {
    return obj.expressID;
  }
}

function asNumbers(arr: IfcValueInterface[]): number[] | undefined {
  if (arr.every(item => item.type === WebIFC.REAL || item.type === WebIFC.INTEGER)) {
    return arr.map(item => item.value as number);
  }
  return undefined;
}
function asTexts(arr: IfcValueInterface[]): string[] | undefined {
  if (arr.every(item => item.type === WebIFC.STRING)) {
    return arr.map(item => item.value as string);
  }
  return undefined;
}


type AttrValueType =
  HandleLike | IfcValueInterface | number |
  HandleLike[] | IfcValueInterface[] | number[] |
  HandleLike[][] | IfcValueInterface[][] |
  null;


function makeAttrContents(attrValue: AttrValueType, isInverse: boolean)
: AttrContent[] {
  let result: AttrContent[];

  if (attrValue === null) {
    console.assert(!isInverse);
    result = [{ type: "value", value: null }];
  }
  else if (isHandle(attrValue)) {
    console.assert(!isInverse); // 逆参照なら必ずリストになるので。
    result = [{ type: "id", value: getId(attrValue) }];
  }
  else if (isIfcLineObject(attrValue)) {
    console.assert(!isInverse); // 逆参照なら必ずリストになるので。
    result = [{ type: "id", value: getId(attrValue) }];
  }
  else if (isIfcValue(attrValue)) {
    result = [{ type: "value", value: attrValue.value }];
  }
  else if (typeof attrValue === "number") {
    result = [{ type: "value", value: attrValue }];
  }
  else if (typeof attrValue === "string" && !Number.isNaN(Number(attrValue))) {
    // WebIFCのクラス定義を見ると数値はnumber型でしか格納されないはずなんだけど
    // なぜかstring型の場合があるのでその場合に対処する
    result = [{ type: "value", value: Number(attrValue) }];
  }
  else if (isEmptyArray(attrValue)) {
    result = [];
  }
  else if (isHandleLikeArray(attrValue)) {
    result = attrValue.map(item => {
      return { type: "id", value: getId(item) };
    });
  }
  else if (isIfcValueArray(attrValue)) {
    let numbers: number[] | undefined;
    let texts: string[] | undefined;
    if (numbers = asNumbers(attrValue)) {
      result = [{ type: "value", value: numbers }];
    }
    else if (texts = asTexts(attrValue)) {
      result = texts.map(text => { return { type: "value", value: text }; });
    }
    else {
      console.assert(false);
      result = []; // dummy
    }
  }
  else if (isNumberArray(attrValue)) {
    result = [{ type: "value", value: attrValue }];
  }
  else if (isArrayOfEmptyArray(attrValue)) {
    result = attrValue.map(arr => {
      console.assert(arr.length === 0);
      return { type: "value", value: [] }
    });
  }
  else if (isArrayOfHandleLikeArray(attrValue)) {
    result = attrValue.map(arr => {
      const ids: number[] = arr.map(item => getId(item)).filter((item): item is number => item !== null);
      return { type: "id", value: ids }
    });
  }
  else if (isArrayOfIfcValueArray(attrValue)) {
    result = attrValue.map(arr => {
      let numbers: number[] | undefined;
      if (numbers = asNumbers(arr)) {
        return { type: "value", value: numbers };
      }
      else {
        console.assert(false);
        return { type: "value", value: null }; // dummy
      }
    });
  }
  else {
    console.assert(false);
    result = []; // dummy
  }

  return result;
}

function makeAttribute(attrName: string, attrValue: AttrValueType, isInverse: boolean, attrIdx: number): Attribute {
  return {
    name: attrName,
    contents: makeAttrContents(attrValue, isInverse),
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
    reference: null,
    type: ifcapi.GetNameFromTypeCode(lineObject.type),
    attributes: [],
    position: { x: 40, y: 60 },
  };

  let count = 0;
  for (const attrName of attrNamesIncludingInverses) {
    const attrValue = lineObjectWithInverses[attrName];
    const isInverse = inverseNames.has(attrName);

    const attribute = makeAttribute(attrName, attrValue, isInverse, count);
    hasValue(attribute.contents) && count++;
    node.attributes.push(attribute);
  }

  // TODO: 参照(逆属性ではない参照)の取得
  // webIfcには、すべての参照関係を取得する機能はない。
  // 全エンティティを走査して逆引き辞書を自前で作るしかない。
  node.reference = null;

  return node;
}



