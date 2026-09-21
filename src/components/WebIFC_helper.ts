import * as WebIFC from "web-ifc"
import { isObject } from "./utils";

export type IfcValueClass = {
  type: number,
  value: any,
};

export type Reference = {
  type: number,
  value: number,
};

export type HandleLike = Reference | WebIFC.IfcLineObjectInterface;

export function isReference(x: unknown): x is Reference {
  return (x instanceof WebIFC.Handle) ||
         (isObject(x) && "type" in x && "value" in x &&
          typeof x.type === "number" && typeof x.value === "number" &&
          x.type === WebIFC.REF);
}

export function isIfcValueClass(x: unknown): x is IfcValueClass {
  return isObject(x) && "type" in x && "value" in x &&
         typeof x.type === "number" && !isReference(x);
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
  return isReference(x) || isIfcLineObject(x);
}
