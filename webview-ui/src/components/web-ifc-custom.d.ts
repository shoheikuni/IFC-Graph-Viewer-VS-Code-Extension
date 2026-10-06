// web-ifc-custom.d.ts
import * as IFC from 'web-ifc';

declare module 'web-ifc' {
  // 1. 構造的部分型として安全に扱える interface を定義
  export interface IfcLineObjectInterface {
    expressID: number;
    type: number;
    //  これ以外のどんな属性（Name, GlobalId など）が入ってきても許容する定義
    [key: string]: any;
  }

  // 2. IfcAPI クラスの GetLine メソッドの戻り値を any から interface に上書き
  export interface IfcAPI {
    GetLine(modelID: number, expressID: number, flatten?: boolean, inverse?: boolean, inversePropKey?: string | null | undefined): IfcLineObjectInterface;
  }
}
