import { AttrContent } from "./interfaces";

// attributeに値があるかどうか
export function hasValue(contents: AttrContent[]): boolean {
  return contents.length > 0;
}

export function isObject(x: unknown): x is object {
  return x !== null && (typeof x === 'object' || typeof x === 'function');
}
