import * as WebIFC from "web-ifc"
import { isObject } from "./utils";

export type IfcValueClass = {
  type: number,
  value: any,
};

export interface HandleInterface {
  type: number;
  value: number;
}

export type HandleLike = HandleInterface | WebIFC.IfcLineObjectInterface;

function isTrueHandle(x: unknown): x is WebIFC.Handle<any> {
    return x instanceof WebIFC.Handle;
}

// WebIFC.HandleインスタンスではないがtypeがWebIFC.REFであるオブジェクト
function isStructuredHandle(x: unknown): boolean {
    return !isTrueHandle(x) &&
           isObject(x) && "type" in x && "value" in x &&
           typeof x.type === "number" && typeof x.value === "number" &&
           x.type === WebIFC.REF;
}

export function isHandle(x: unknown): x is HandleInterface {
    // 単なるTrueHandle判定(`instanceof WebIFC.Handle`の判定)では不十分。
    // "IsDecomposedBy"のような逆属性の値として、TrueHandleではなくてStructuredHandleが格納される場合があるため。
    // (逆属性なら必ずStructuredHandleかどうかまでは調査していない)
    return isTrueHandle(x) || isStructuredHandle(x);
}

export function isIfcValueClass(x: unknown): x is IfcValueClass {
  return isObject(x) && "type" in x && "value" in x &&
         typeof x.type === "number" && !isHandle(x);
}

function isTrueIfcLineObject(x: unknown): x is WebIFC.IfcLineObject {
    return x instanceof WebIFC.IfcLineObject;
}

function isStructuredIfcLineObject(x: unknown): boolean {
  return !isTrueIfcLineObject(x) &&
         isObject(x) && "type" in x && "expressID" in x &&
         typeof x.type === "number" && typeof x.expressID === "number";
}

export function isIfcLineObject(x: unknown): x is WebIFC.IfcLineObjectInterface {
    return isTrueIfcLineObject(x) || isStructuredIfcLineObject(x);
}

export function isHandleLike(x: unknown): x is HandleLike {
  return isHandle(x) || isIfcLineObject(x);
}
