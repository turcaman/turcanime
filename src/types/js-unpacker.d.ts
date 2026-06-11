declare module "js-unpacker" {
  class JsUnpacker {
    constructor(packedJS: string);
    unpack(): string;
  }
  export default JsUnpacker;
}
