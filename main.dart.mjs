// Compiles a dart2wasm-generated main module from `source` which can then
// be instantiated via the `instantiate` method.
//
// `source` needs to be a `Response` object (or promise thereof) e.g. created
// via the `fetch()` JS API.
export async function compileStreaming(source) {
  const builtins = {builtins: ['js-string']};
  return new CompiledApp(
      await WebAssembly.compileStreaming(source, builtins), builtins);
}

// Compiles a dart2wasm-generated wasm module from `bytes` which is then
// instantiable via the `instantiate` method.
export async function compile(bytes) {
  const builtins = {builtins: ['js-string']};
  return new CompiledApp(await WebAssembly.compile(bytes, builtins), builtins);
}

class CompiledApp {
  constructor(module, builtins) {
    this.module = module;
    this.builtins = builtins;
  }

  // The second argument is an options object containing:
  // `loadDeferredModules` is a JS function that takes an array of module names
  //   matching wasm files produced by the dart2wasm compiler. It also takes a
  //   callback that should be invoked for each loaded module with 2 arguments:
  //   (1) the module name, (2) the loaded module in a format supported by
  //   `WebAssembly.compile` or `WebAssembly.compileStreaming`. The callback
  //   returns a Promise that resolves when the module is instantiated.
  //   loadDeferredModules should return a Promise that resolves when all the
  //   modules have been loaded and the callback promises have resolved.
  // `loadDeferredId` is a JS function that takes load ID produced by the
  //   compiler when the `use-load-ids` option is passed. Each load ID maps to
  //   one or more wasm files as specified in the emitted JSON file. It also
  //   takes a callback that should be invoked for each loaded module with 2
  //   arguments: (1) the module name, (2) the loaded module in a format
  //   supported by `WebAssembly.compile` or `WebAssembly.compileStreaming`.
  //   The callback returns a Promise that resolves when the module is
  //   instantiated.
  //   loadDeferredId should return a Promise that resolves when all the
  //   modules have been loaded and the callback promises have resolved.
  async instantiate(additionalImports, {loadDeferredModules, loadDeferredId} = {}) {
    let dartInstance;

    // Prints to the console
    function printToConsole(value) {
      if (typeof dartPrint == "function") {
        dartPrint(value);
        return;
      }
      if (typeof console == "object" && typeof console.log != "undefined") {
        console.log(value);
        return;
      }
      if (typeof print == "function") {
        print(value);
        return;
      }

      throw "Unable to print message: " + value;
    }

    // A special symbol attached to functions that wrap Dart functions.
    const jsWrappedDartFunctionSymbol = Symbol("JSWrappedDartFunction");

    function finalizeWrapper(dartFunction, wrapped) {
      wrapped.dartFunction = dartFunction;
      wrapped[jsWrappedDartFunctionSymbol] = true;
      return wrapped;
    }

    // Imports
    const dart2wasm = {
            AB: (x0,x1,x2,x3) => x0.addEventListener(x1,x2,x3),
      AC: Function.prototype.call.bind(DataView.prototype.setInt16),
      AD: x0 => x0.height,
      AE: (x0,x1) => x0.observe(x1),
      AF: x0 => x0.wheelDeltaY,
      AG: x0 => x0.search,
      AH: (x0,x1) => x0.getElementsByClassName(x1),
      AI: x0 => x0.next(),
      AJ: (x0,x1) => x0.renderButton(x1),
      AK: (x0,x1,x2,x3) => x0.open(x1,x2,x3),
      AL: (x0,x1) => x0.clear(x1),
      AM: (x0,x1,x2,x3) => x0.uniformBlockBinding(x1,x2,x3),
      AN: x0 => x0.allocationSize(),
      AO: x0 => x0.message,
      AP: x0 => x0.access_token,
      AQ: x0 => x0.size,
      B: s => printToConsole(s),
      BB: b => !!b,
      BC: Function.prototype.call.bind(DataView.prototype.setUint16),
      BD: x0 => x0.width,
      BE: (wasmFunction,f) => finalizeWrapper(f, function(x0,x1) { return wasmFunction(f,arguments.length,x0,x1) }),
      BF: x0 => x0.wheelDeltaX,
      BG: x0 => x0.location,
      BH: (jsArray, jsArrayOffset, wasmArray, wasmArrayOffset, length) => {
        const setValue = dartInstance.exports.$wasmF32ArraySet;
        for (let i = 0; i < length; i++) {
          setValue(wasmArray, wasmArrayOffset + i, jsArray[jsArrayOffset + i]);
        }
      },
      BI: x0 => x0.value,
      BJ: (x0,x1,x2) => x0.renderButton(x1,x2),
      BK: x0 => x0.send(),
      BL: (x0,x1,x2,x3,x4) => x0.drawElements(x1,x2,x3,x4),
      BM: (x0,x1,x2) => x0.getUniformLocation(x1,x2),
      BN: (x0,x1) => x0.copyTo(x1),
      BO: (o, a) => o + a,
      BP: (x0,x1,x2) => x0.hasGrantedAllScopes(x1,x2),
      BQ: x0 => x0.name,
      C: Function.prototype.call.bind(Number.prototype.toString),
      CB: (wasmFunction,f) => finalizeWrapper(f, function(x0) { return wasmFunction(f,arguments.length,x0) }),
      CC: Function.prototype.call.bind(DataView.prototype.setUint8),
      CD: x0 => x0.screen,
      CE: x0 => new ResizeObserver(x0),
      CF: x0 => x0.key,
      CG: x0 => x0.pathname,
      CH: (jsArray, jsArrayOffset, wasmArray, wasmArrayOffset, length) => {
        const setValue = dartInstance.exports.$wasmF64ArraySet;
        for (let i = 0; i < length; i++) {
          setValue(wasmArray, wasmArrayOffset + i, jsArray[jsArrayOffset + i]);
        }
      },
      CI: x0 => x0.done,
      CJ: (x0,x1,x2,x3,x4,x5,x6,x7,x8) => ({type: x0,theme: x1,size: x2,text: x3,shape: x4,logo_alignment: x5,width: x6,locale: x7,click_listener: x8}),
      CK: x0 => x0.type,
      CL: (x0,x1) => x0.blendEquation(x1),
      CM: (x0,x1,x2) => x0.uniform1i(x1,x2),
      CN: (x0,x1) => { x0.height = x1 },
      CO: (x0,x1,x2) => ({files: x0,title: x1,text: x2}),
      CP: () => globalThis.google.accounts.oauth2,
      CQ: (x0,x1) => x0.item(x1),
      D: Function.prototype.call.bind(BigInt.prototype.toString),
      DB: (x0,x1) => x0.focus(x1),
      DC: Function.prototype.call.bind(DataView.prototype.setInt8),
      DD: o => {
        if (o === null || o === undefined) return 0;
        if (typeof(o) === 'string') return 1;
        return 2;
      },
      DE: (x0,x1) => x0.getPropertyValue(x1),
      DF: x0 => x0.identifier,
      DG: (x0,x1,x2,x3) => x0.replaceState(x1,x2,x3),
      DH: (x0,x1) => x0.dispatchEvent(x1),
      DI: (o, m, a) => o[m].apply(o, a),
      DJ: () => globalThis.google.accounts.id,
      DK: x0 => x0.response,
      DL: (x0,x1,x2,x3,x4) => x0.blendFuncSeparate(x1,x2,x3,x4),
      DM: (x0,x1) => x0.createShader(x1),
      DN: (x0,x1) => { x0.width = x1 },
      DO: (x0,x1) => ({files: x0,text: x1}),
      DP: (x0,x1) => x0.revoke(x1),
      DQ: x0 => x0.length,
      E: (exn) => {
        let stackString = exn.toString();
        let frames = stackString.split('\n');
        let drop = 4;
        if (frames[0].startsWith('Error')) {
            drop += 1;
        }
        return frames.slice(drop).join('\n');
      },
      EB: () => ({}),
      EC: Function.prototype.call.bind(DataView.prototype.getInt8),
      ED: x0 => x0.tabIndex,
      EE: x0 => globalThis.parseFloat(x0),
      EF: x0 => x0.touches,
      EG: o => {
        const proto = Object.getPrototypeOf(o);
        return proto === Object.prototype || proto === null;
      },
      EH: (x0,x1) => x0.createEvent(x1),
      EI: x0 => x0.iterator,
      EJ: (wasmFunction,f) => finalizeWrapper(f, function(x0,x1) { return wasmFunction(f,arguments.length,x0,x1) }),
      EK: (x0,x1) => { x0.responseType = x1 },
      EL: (x0,x1) => x0.depthMask(x1),
      EM: (x0,x1,x2) => x0.shaderSource(x1,x2),
      EN: (x0,x1) => x0.toDataURL(x1),
      EO: (x0,x1) => ({files: x0,title: x1}),
      EP: (wasmFunction,f) => finalizeWrapper(f, function(x0) { return wasmFunction(f,arguments.length,x0) }),
      EQ: x0 => x0.files,
      F: () => new Error().stack,
      FB: (o, p, v) => o[p] = v,
      FC: o => {
        if (o === null || o === undefined) return 0;
        if (o instanceof Int8Array) return 1;
        return 2;
      },
      FD: (x0,x1) => x0.contains(x1),
      FE: (x0,x1) => x0.getComputedStyle(x1),
      FF: x0 => x0.pressure,
      FG: o => Object.keys(o),
      FH: (x0,x1,x2,x3) => x0.initEvent(x1,x2,x3),
      FI: () => globalThis.Symbol,
      FJ: x0 => new MutationObserver(x0),
      FK: x0 => x0.vendor,
      FL: (x0,x1) => x0.enable(x1),
      FM: (x0,x1) => x0.compileShader(x1),
      FN: (x0,x1,x2,x3) => x0.drawImage(x1,x2,x3),
      FO: x0 => ({files: x0}),
      FP: (x0,x1,x2) => x0.revoke(x1,x2),
      FQ: (x0,x1) => { x0.multiple = x1 },
      G: s => JSON.stringify(s),
      GB: () => [],
      GC: (o, start, length) => new Float64Array(o.buffer, o.byteOffset + start, length),
      GD: x0 => x0.activeElement,
      GE: x0 => x0.documentElement,
      GF: x0 => x0.tiltY,
      GG: x0 => x0.state,
      GH: x0 => x0.readText(),
      GI: (x0,x1) => new Intl.Segmenter(x0,x1),
      GJ: x0 => ({childList: x0}),
      GK: x0 => x0.navigator,
      GL: (x0,x1) => x0.disable(x1),
      GM: (x0,x1,x2) => x0.getShaderParameter(x1,x2),
      GN: (x0,x1) => x0.getContext(x1),
      GO: (x0,x1) => ({title: x0,text: x1}),
      GP: (x0,x1) => x0.getRandomValues(x1),
      GQ: (x0,x1) => { x0.accept = x1 },
      H: Function.prototype.call.bind(Number.prototype.toString),
      HB: (a, i) => a.push(i),
      HC: (o, start, length) => new Float32Array(o.buffer, o.byteOffset + start, length),
      HD: x0 => x0.parentNode,
      HE: x0 => x0.computedStyleMap(),
      HF: x0 => x0.tiltX,
      HG: x0 => x0.hash,
      HH: x0 => x0.clipboard,
      HI: x0 => x0.Segmenter,
      HJ: (x0,x1,x2) => x0.observe(x1,x2),
      HK: () => globalThis.window,
      HL: (x0,x1,x2) => x0.bindSampler(x1,x2),
      HM: (x0,x1) => x0.getShaderInfoLog(x1),
      HN: x0 => x0.format,
      HO: x0 => ({text: x0}),
      HP: (x0,x1,x2,x3) => x0.encrypt(x1,x2,x3),
      HQ: (x0,x1) => { x0.type = x1 },
      I: Function.prototype.call.bind(String.prototype.indexOf),
      IB: x0 => new Int8Array(x0),
      IC: (o, start, length) => new Uint32Array(o.buffer, o.byteOffset + start, length),
      ID: x0 => x0.tagName,
      IE: (x0,x1) => x0.get(x1),
      IF: x0 => x0.pointerType,
      IG: x0 => x0.state,
      IH: (x0,x1) => x0.writeText(x1),
      II: () => new TextDecoder(),
      IJ: (wasmFunction,f) => finalizeWrapper(f, function(x0,x1) { return wasmFunction(f,arguments.length,x0,x1) }),
      IK: (x0,x1) => x0.item(x1),
      IL: (x0,x1) => x0.activeTexture(x1),
      IM: (x0,x1) => x0.deleteVertexArray(x1),
      IN: (x0,x1) => x0.createImageBitmap(x1),
      IO: () => ({}),
      IP: x0 => x0.sessionStorage,
      IQ: x0 => x0.length,
      J: (s, p, i) => s.lastIndexOf(p, i),
      JB: (jsArray, jsArrayOffset, wasmArray, wasmArrayOffset, length) => {
        const getValue = dartInstance.exports.$wasmI8ArrayGet;
        for (let i = 0; i < length; i++) {
          jsArray[jsArrayOffset + i] = getValue(wasmArray, wasmArrayOffset + i);
        }
      },
      JC: (o, start, length) => new Int32Array(o.buffer, o.byteOffset + start, length),
      JD: x0 => x0.target,
      JE: (o, p) => p in o,
      JF: x0 => x0.pointerId,
      JG: (x0,x1) => x0.go(x1),
      JH: x0 => x0.unlock(),
      JI: (a, i) => a.splice(i, 1),
      JJ: x0 => new ResizeObserver(x0),
      JK: (x0,x1) => x0.removeChild(x1),
      JL: (x0,x1,x2) => x0.bindTexture(x1,x2),
      JM: (x0,x1) => x0.deleteBuffer(x1),
      JN: (x0,x1) => x0.getContext(x1),
      JO: (x0,x1,x2) => new File(x0,x1,x2),
      JP: x0 => x0.subtle,
      JQ: x0 => x0.getReader(),
      K: o => o,
      KB: x0 => new Uint8Array(x0),
      KC: (o, start, length) => new Uint16Array(o.buffer, o.byteOffset + start, length),
      KD: x0 => x0.clientY,
      KE: (x0,x1) => { x0.textContent = x1 },
      KF: x0 => x0.getCoalescedEvents(),
      KG: x0 => x0.parentElement,
      KH: (x0,x1) => x0.lock(x1),
      KI: (x0,x1) => x0.revokeObjectURL(x1),
      KJ: (x0,x1) => x0.observe(x1),
      KK: (x0,x1) => x0.appendChild(x1),
      KL: (x0,x1,x2,x3,x4,x5,x6,x7,x8,x9) => x0.texImage2D(x1,x2,x3,x4,x5,x6,x7,x8,x9),
      KM: (x0,x1) => x0.deleteSampler(x1),
      KN: (x0,x1,x2,x3) => x0.drawImage(x1,x2,x3),
      KO: (x0,x1) => { x0.type = x1 },
      KP: (x0,x1,x2,x3,x4,x5,x6,x7) => x0.unwrapKey(x1,x2,x3,x4,x5,x6,x7),
      KQ: x0 => x0.value,
      L: o => {
        if (o === undefined || o === null) return 0;
        if (typeof o === 'number') return 1;
        return 2;
      },
      LB: x0 => new Uint8ClampedArray(x0),
      LC: (o, start, length) => new Int16Array(o.buffer, o.byteOffset + start, length),
      LD: x0 => x0.clientX,
      LE: (wasmFunction,f) => finalizeWrapper(f, function(x0) { return wasmFunction(f,arguments.length,x0) }),
      LF: (x0,x1) => x0.getModifierState(x1),
      LG: (x0,x1) => x0.querySelectorAll(x1),
      LH: x0 => x0.orientation,
      LI: (x0,x1) => { x0.src = x1 },
      LJ: x0 => x0.disconnect(),
      LK: x0 => x0.click(),
      LL: (x0,x1,x2,x3) => x0.texParameteri(x1,x2,x3),
      LM: (x0,x1,x2,x3) => x0.samplerParameteri(x1,x2,x3),
      LN: (wasmFunction,f) => finalizeWrapper(f, function(x0) { return wasmFunction(f,arguments.length,x0) }),
      LO: (wasmFunction,f) => finalizeWrapper(f, function(x0) { return wasmFunction(f,arguments.length,x0) }),
      LP: (x0,x1,x2,x3,x4,x5) => x0.importKey(x1,x2,x3,x4,x5),
      LQ: x0 => x0.done,
      M: x0 => x0.index,
      MB: x0 => new Int16Array(x0),
      MC: (o, start, length) => new Uint8ClampedArray(o.buffer, o.byteOffset + start, length),
      MD: (x0,x1,x2) => x0.setAttribute(x1,x2),
      ME: x0 => x0.matches,
      MF: s => s.trimLeft(),
      MG: (d, digits) => d.toFixed(digits),
      MH: (x0,x1) => x0.querySelector(x1),
      MI: (x0,x1,x2,x3,x4) => globalThis.createImageBitmap(x0,x1,x2,x3,x4),
      MJ: x0 => x0.height,
      MK: x0 => x0.length,
      ML: x0 => x0.getError(),
      MM: (x0,x1) => x0.isSampler(x1),
      MN: (x0,x1,x2,x3) => x0.toBlob(x1,x2,x3),
      MO: (wasmFunction,f) => finalizeWrapper(f, function(x0) { return wasmFunction(f,arguments.length,x0) }),
      MP: (x0,x1,x2,x3) => x0.generateKey(x1,x2,x3),
      MQ: x0 => x0.read(),
      N: o => String(o),
      NB: (jsArray, jsArrayOffset, wasmArray, wasmArrayOffset, length) => {
        const getValue = dartInstance.exports.$wasmI16ArrayGet;
        for (let i = 0; i < length; i++) {
          jsArray[jsArrayOffset + i] = getValue(wasmArray, wasmArrayOffset + i);
        }
      },
      NC: (o, start, length) => new Uint8Array(o.buffer, o.byteOffset + start, length),
      ND: x0 => x0.getBoundingClientRect(),
      NE: (x0,x1) => x0.matchMedia(x1),
      NF: s => s.toUpperCase(),
      NG: x0 => x0.maxHeight,
      NH: (x0,x1) => { x0.title = x1 },
      NI: x0 => x0.naturalHeight,
      NJ: x0 => x0.width,
      NK: x0 => x0.children,
      NL: x0 => x0.createTexture(),
      NM: x0 => x0.createSampler(),
      NN: x0 => x0.arrayBuffer(),
      NO: (x0,x1) => { x0.src = x1 },
      NP: (x0,x1,x2,x3,x4) => x0.wrapKey(x1,x2,x3,x4),
      NQ: x0 => x0.body,
      O: o => o === undefined,
      OB: x0 => new Uint16Array(x0),
      OC: (o, start, length) => new Int8Array(o.buffer, o.byteOffset + start, length),
      OD: (ms, c) =>
      setTimeout(() => dartInstance.exports.$invokeCallback(c),ms),
      OE: x0 => x0.matches,
      OF: x0 => x0.pop(),
      OG: x0 => x0.maxWidth,
      OH: (x0,x1) => x0.vibrate(x1),
      OI: x0 => x0.naturalWidth,
      OJ: x0 => x0.contentRect,
      OK: (x0,x1) => x0.createElement(x1),
      OL: (x0,x1) => x0.cullFace(x1),
      OM: (x0,x1,x2,x3) => x0.bufferData(x1,x2,x3),
      ON: x0 => x0.type,
      OO: (x0,x1) => { x0.type = x1 },
      OP: (x0,x1,x2) => x0.exportKey(x1,x2),
      OQ: x0 => x0.assetBase,
      P: (x0,x1) => x0.exec(x1),
      PB: x0 => new Int32Array(x0),
      PC: (x0,x1) => x0.querySelector(x1),
      PD: s => new Date(s * 1000).getTimezoneOffset() * 60,
      PE: o => typeof o === 'function' && o[jsWrappedDartFunctionSymbol] === true,
      PF: x0 => x0.flags,
      PG: x0 => x0.minHeight,
      PH: x0 => x0.arrayBuffer(),
      PI: x0 => x0.decode(),
      PJ: (x0,x1) => x0.item(x1),
      PK: (x0,x1) => { x0.download = x1 },
      PL: (x0,x1,x2) => x0.bindBuffer(x1,x2),
      PM: (x0,x1) => x0.isBuffer(x1),
      PN: x0 => x0.abort(),
      PO: x0 => x0.head,
      PP: x0 => x0.crypto,
      PQ: x0 => x0.loader,
      Q: (x0,x1) => { x0.lastIndex = x1 },
      QB: (jsArray, jsArrayOffset, wasmArray, wasmArrayOffset, length) => {
        const getValue = dartInstance.exports.$wasmI32ArrayGet;
        for (let i = 0; i < length; i++) {
          jsArray[jsArrayOffset + i] = getValue(wasmArray, wasmArrayOffset + i);
        }
      },
      QC: (x0,x1) => x0.item(x1),
      QD: Date.now,
      QE: f => f.dartFunction,
      QF: (a, s) => a.join(s),
      QG: x0 => x0.minWidth,
      QH: o => {
        if (o === null || o === undefined) return 0;
        if (o instanceof ArrayBuffer) return 1;
        if (globalThis.SharedArrayBuffer !== undefined &&
            o instanceof SharedArrayBuffer) {
          return 2;
        }
        return 3;
      },
      QI: (x0,x1) => { x0.decoding = x1 },
      QJ: x0 => x0.length,
      QK: (x0,x1) => { x0.href = x1 },
      QL: (x0,x1,x2,x3) => x0.bufferSubData(x1,x2,x3),
      QM: x0 => x0.createBuffer(),
      QN: x0 => x0.canvasKitMaximumSurfaces,
      QO: (o) => {
        const typeofValue = typeof o;
        return (typeofValue === 'object') ||
            typeofValue === 'function';
      },
      QP: x0 => x0.isSecureContext,
      QQ: () => globalThis._flutter,
      R: o => o,
      RB: x0 => new Uint32Array(x0),
      RC: x0 => x0.length,
      RD: (handle) => clearTimeout(handle),
      RE: (wasmFunction,f) => finalizeWrapper(f, function(x0) { return wasmFunction(f,arguments.length,x0) }),
      RF: (x0,x1) => x0.error(x1),
      RG: (x0,x1) => x0.removeProperty(x1),
      RH: x0 => x0.status,
      RI: (x0,x1) => { x0.crossOrigin = x1 },
      RJ: x0 => x0.addedNodes,
      RK: () => globalThis.document,
      RL: (x0,x1,x2,x3) => x0.bindBufferBase(x1,x2,x3),
      RM: (x0,x1) => x0.getParameter(x1),
      RN: x0 => x0.nextSibling,
      RO: (x0,x1) => x0.getAttribute(x1),
      RP: (x0,x1,x2,x3) => x0.decrypt(x1,x2,x3),
      S: (s, m) => {
        try {
          return new RegExp(s, m);
        } catch (e) {
          return String(e);
        }
      },
      SB: x0 => new Float32Array(x0),
      SC: (x0,x1) => x0.querySelectorAll(x1),
      SD: (x0,x1) => x0.closest(x1),
      SE: (wasmFunction,f) => finalizeWrapper(f, function(x0,x1) { return wasmFunction(f,arguments.length,x0,x1) }),
      SF: () => globalThis.console,
      SG: (x0,x1) => x0.add(x1),
      SH: (x0,x1) => x0.fetch(x1),
      SI: (x0,x1) => x0.createObjectURL(x1),
      SJ: x0 => x0.firstElementChild,
      SK: (x0,x1) => x0.querySelector(x1),
      SL: (x0,x1) => x0.bindVertexArray(x1),
      SM: (x0,x1) => x0.isVertexArray(x1),
      SN: (x0,x1) => x0.debug(x1),
      SO: (x0,x1) => x0.debug(x1),
      SP: x0 => x0.measurementId,
      T: o => o instanceof RegExp,
      TB: (jsArray, jsArrayOffset, wasmArray, wasmArrayOffset, length) => {
        const getValue = dartInstance.exports.$wasmF32ArrayGet;
        for (let i = 0; i < length; i++) {
          jsArray[jsArrayOffset + i] = getValue(wasmArray, wasmArrayOffset + i);
        }
      },
      TC: (x0,x1) => x0.getAttribute(x1),
      TD: x0 => x0.bottom,
      TE: (p, s, f) => p.then(s, (e) => f(e, e === undefined)),
      TF: s => s.trimRight(),
      TG: x0 => x0.data,
      TH: x0 => x0.content,
      TI: x0 => x0.URL,
      TJ: () => new MessageChannel(),
      TK: x0 => x0.body,
      TL: (x0,x1) => x0.useProgram(x1),
      TM: (x0,x1) => x0.enableVertexAttribArray(x1),
      TN: x0 => x0.hostElement,
      TO: (wasmFunction,f) => finalizeWrapper(f, function(x0) { return wasmFunction(f,arguments.length,x0) }),
      TP: x0 => x0.appId,
      U: (string, times) => string.repeat(times),
      UB: x0 => new Float64Array(x0),
      UC: x0 => x0.remove(),
      UD: x0 => x0.top,
      UE: (o, i) => o[i],
      UF: x0 => x0.blur(),
      UG: (x0,x1) => { x0.scrollTop = x1 },
      UH: x0 => x0.document,
      UI: x0 => new Blob(x0),
      UJ: (wasmFunction,f) => finalizeWrapper(f, function(x0) { return wasmFunction(f,arguments.length,x0) }),
      UK: (x0,x1) => { x0.id = x1 },
      UL: (x0,x1,x2,x3,x4) => x0.viewport(x1,x2,x3,x4),
      UM: (x0,x1,x2,x3,x4,x5,x6) => x0.vertexAttribPointer(x1,x2,x3,x4,x5,x6),
      UN: x0 => x0.location,
      UO: x0 => ({createScriptURL: x0}),
      UP: x0 => x0.messagingSenderId,
      V: o => o,
      VB: (jsArray, jsArrayOffset, wasmArray, wasmArrayOffset, length) => {
        const getValue = dartInstance.exports.$wasmF64ArrayGet;
        for (let i = 0; i < length; i++) {
          jsArray[jsArrayOffset + i] = getValue(wasmArray, wasmArrayOffset + i);
        }
      },
      VC: (x0,x1) => x0.appendChild(x1),
      VD: x0 => x0.right,
      VE: o => o.length,
      VF: x0 => x0.button,
      VG: (x0,x1,x2) => x0.setSelectionRange(x1,x2),
      VH: x0 => new WeakRef(x0),
      VI: x0 => x0.close(),
      VJ: x0 => x0.port2,
      VK: () => globalThis.window.isSecureContext,
      VL: (x0,x1,x2,x3,x4) => x0.clearColor(x1,x2,x3,x4),
      VM: x0 => x0.createVertexArray(),
      VN: (x0,x1) => x0.getModifierState(x1),
      VO: (x0,x1,x2) => x0.createPolicy(x1,x2),
      VP: x0 => x0.storageBucket,
      W: o => {
        if (o === undefined || o === null) return 0;
        if (typeof o === 'boolean') return 1;
        return 2;
      },
      WB: x0 => new ArrayBuffer(x0),
      WC: (x0,x1) => x0.append(x1),
      WD: x0 => x0.left,
      WE: o => {
        if (o === undefined) return 1;
        var type = typeof o;
        if (type === 'boolean') return 2;
        if (type === 'number') return 3;
        if (type === 'string') return 4;
        if (o instanceof Array) return 5;
        if (ArrayBuffer.isView(o)) {
          if (o instanceof Int8Array) return 6;
          if (o instanceof Uint8Array) return 7;
          if (o instanceof Uint8ClampedArray) return 8;
          if (o instanceof Int16Array) return 9;
          if (o instanceof Uint16Array) return 10;
          if (o instanceof Int32Array) return 11;
          if (o instanceof Uint32Array) return 12;
          if (o instanceof Float32Array) return 13;
          if (o instanceof Float64Array) return 14;
          if (o instanceof DataView) return 15;
        }
        if (o instanceof ArrayBuffer) return 16;
        // Feature check for `SharedArrayBuffer` before doing a type-check.
        if (globalThis.SharedArrayBuffer !== undefined &&
            o instanceof SharedArrayBuffer) {
            return 17;
        }
        if (o instanceof Promise) return 18;
        return 19;
      },
      WF: x0 => x0.innerHeight,
      WG: (x0,x1) => { x0.value = x1 },
      WH: x0 => x0.deref(),
      WI: (x0,x1) => ({frameIndex: x0,completeFramesOnly: x1}),
      WJ: (x0,x1) => { x0.onmessage = x1 },
      WK: () => globalThis.crypto.subtle,
      WL: (x0,x1) => x0.clearDepth(x1),
      WM: (wasmFunction,f) => finalizeWrapper(f, function(x0) { return wasmFunction(f,arguments.length,x0) }),
      WN: x0 => x0.metaKey,
      WO: (x0,x1) => x0.createScriptURL(x1),
      WP: x0 => x0.databaseURL,
      X: x0 => x0.dotAll,
      XB: (x0,x1,x2) => new Uint8Array(x0,x1,x2),
      XC: (x0,x1,x2,x3) => x0.setProperty(x1,x2,x3),
      XD: x0 => x0.clientY,
      XE: x0 => x0.language,
      XF: x0 => x0.innerWidth,
      XG: (x0,x1,x2) => x0.setSelectionRange(x1,x2),
      XH: () => globalThis.WeakRef,
      XI: (x0,x1) => x0.decode(x1),
      XJ: x0 => globalThis.Object.keys(x0),
      XK: (x0,x1,x2,x3) => ({name: x0,iv: x1,additionalData: x2,tagLength: x3}),
      XL: (x0,x1) => x0.depthFunc(x1),
      XM: (wasmFunction,f) => finalizeWrapper(f, function(x0) { return wasmFunction(f,arguments.length,x0) }),
      XN: x0 => x0.altKey,
      XO: (x0,x1) => { x0.nonce = x1 },
      XP: x0 => x0.authDomain,
      Y: x0 => x0.unicode,
      YB: (x0,x1,x2) => new DataView(x0,x1,x2),
      YC: x0 => x0.style,
      YD: x0 => x0.clientX,
      YE: (x0,x1,x2,x3) => x0.register(x1,x2,x3),
      YF: x0 => x0.height,
      YG: (x0,x1) => { x0.value = x1 },
      YH: (x0,x1) => x0.error(x1),
      YI: x0 => x0.displayHeight,
      YJ: x0 => x0.length,
      YK: (x0,x1,x2) => globalThis.crypto.subtle.decrypt(x0,x1,x2),
      YL: (x0,x1) => x0.frontFace(x1),
      YM: (x0,x1,x2) => x0.addEventListener(x1,x2),
      YN: x0 => x0.ctrlKey,
      YO: (x0,x1) => x0.querySelectorAll(x1),
      YP: x0 => x0.projectId,
      Z: x0 => x0.ignoreCase,
      ZB: (o, p) => o[p],
      ZC: x0 => x0.debugShowSemanticsNodes,
      ZD: x0 => x0.changedTouches,
      ZE: () => globalThis.window.FinalizationRegistry,
      ZF: x0 => x0.width,
      ZG: s => {
        if (/[[\]{}()*+?.\\^$|]/.test(s)) {
            s = s.replace(/[[\]{}()*+?.\\^$|]/g, '\\$&');
        }
        return s;
      },
      ZH: (x0,x1) => x0.warn(x1),
      ZI: x0 => x0.displayWidth,
      ZJ: (o, t) => typeof o === t,
      ZK: (x0,x1,x2,x3,x4) => globalThis.crypto.subtle.importKey(x0,x1,x2,x3,x4),
      ZL: (x0,x1) => x0.isTexture(x1),
      ZM: (wasmFunction,f) => finalizeWrapper(f, function(x0,x1) { return wasmFunction(f,arguments.length,x0,x1) }),
      ZN: x0 => x0.isComposing,
      ZO: x0 => x0.nonce,
      ZP: x0 => x0.apiKey,
      a: x0 => x0.multiline,
      aB: (o) => new DataView(o.buffer, o.byteOffset, o.byteLength),
      aC: (x0,x1) => x0.warn(x1),
      aD: x0 => x0.offsetY,
      aE: (wasmFunction,f) => finalizeWrapper(f, function(x0) { return wasmFunction(f,arguments.length,x0) }),
      aF: x0 => x0.clientHeight,
      aG: x0 => x0.value,
      aH: () => globalThis.console,
      aI: x0 => x0.duration,
      aJ: x0 => x0.data,
      aK: (x0,x1,x2) => globalThis.crypto.subtle.encrypt(x0,x1,x2),
      aL: (x0,x1,x2) => x0.pixelStorei(x1,x2),
      aM: x0 => x0.isContextLost(),
      aN: x0 => x0.code,
      aO: x0 => x0.document,
      aP: x0 => x0.options,
      b: (exn) => {
        if (exn instanceof Error) {
          return exn.stack;
        } else {
          return null;
        }
      },
      bB: Function.prototype.call.bind(Object.getOwnPropertyDescriptor(DataView.prototype, 'byteLength').get),
      bC: x0 => x0.console,
      bD: x0 => x0.offsetX,
      bE: x0 => new window.FinalizationRegistry(x0),
      bF: x0 => x0.clientWidth,
      bG: x0 => x0.selectionDirection,
      bH: (handle) => clearInterval(handle),
      bI: x0 => x0.image,
      bJ: x0 => x0.port1,
      bK: () => new AbortController(),
      bL: x0 => x0.close(),
      bM: x0 => x0.preventDefault(),
      bN: x0 => x0.repeat,
      bO: (x0,x1) => { x0.src = x1 },
      bP: x0 => x0.name,
      c: (c) =>
      queueMicrotask(() => dartInstance.exports.$invokeCallback(c)),
      cB: o => o.byteOffset,
      cC: () => globalThis.window,
      cD: x0 => x0.type,
      cE: (x0,x1) => x0.unregister(x1),
      cF: (x0,x1) => { x0.content = x1 },
      cG: x0 => x0.selectionStart,
      cH: (ms, c) =>
      setInterval(() => dartInstance.exports.$invokeCallback(c), ms),
      cI: (x0,x1,x2,x3,x4) => ({type: x0,data: x1,premultiplyAlpha: x2,colorSpaceConversion: x3,preferAnimation: x4}),
      cJ: (x0,x1) => new SharedWorker(x0,x1),
      cK: (x0,x1,x2,x3,x4,x5) => ({method: x0,headers: x1,body: x2,credentials: x3,redirect: x4,signal: x5}),
      cL: (x0,x1,x2,x3,x4,x5,x6) => x0.texImage2D(x1,x2,x3,x4,x5,x6),
      cM: (x0,x1,x2,x3,x4,x5,x6) => ({alpha: x0,depth: x1,stencil: x2,antialias: x3,premultipliedAlpha: x4,preserveDrawingBuffer: x5,powerPreference: x6}),
      cN: (wasmFunction,f) => finalizeWrapper(f, function(x0) { return wasmFunction(f,arguments.length,x0) }),
      cO: (x0,x1) => { x0.defer = x1 },
      cP: () => globalThis.firebase_core.getApps(),
      d: (x0,x1) => x0.didCreateEngineInitializer(x1),
      dB: o => o.buffer,
      dC: (o, c) => o instanceof c,
      dD: x0 => x0.maxTouchPoints,
      dE: (x0,x1) => x0.contains(x1),
      dF: (x0,x1) => { x0.name = x1 },
      dG: x0 => x0.selectionEnd,
      dH: () => Date.now(),
      dI: x0 => new window.ImageDecoder(x0),
      dJ: x0 => new Worker(x0),
      dK: (x0,x1) => globalThis.fetch(x0,x1),
      dL: x0 => x0.height,
      dM: (x0,x1,x2) => x0.getContext(x1,x2),
      dN: x0 => x0.userAgent,
      dO: (x0,x1) => { x0.async = x1 },
      dP: x0 => x0.message,
      e: (wasmFunction,f) => finalizeWrapper(f, function(x0) { return wasmFunction(f,arguments.length,x0) }),
      eB: Function.prototype.call.bind(DataView.prototype.getUint8),
      eC: (x0,x1) => x0[x1],
      eD: x0 => x0.platform,
      eE: (s) => +s,
      eF: x0 => x0.head,
      eG: x0 => x0.value,
      eH: (map, o, v) => map.set(o, v),
      eI: x0 => x0.name,
      eJ: (x0,x1,x2) => x0.postMessage(x1,x2),
      eK: (x0,x1) => x0.get(x1),
      eL: x0 => x0.width,
      eM: (x0,x1) => { x0.pointerEvents = x1 },
      eN: (x0,x1,x2,x3) => x0.open(x1,x2,x3),
      eO: x0 => x0.trustedTypes,
      eP: x0 => x0.code,
      f: (wasmFunction,f) => finalizeWrapper(f, function() { return wasmFunction(f,arguments.length) }),
      fB: (b, o) => new DataView(b, o),
      fC: x0 => x0.length,
      fD: x0 => x0.body,
      fE: s => {
        if (!/^\s*[+-]?(?:Infinity|NaN|(?:\.\d+|\d+(?:\.\d*)?)(?:[eE][+-]?\d+)?)\s*$/.test(s)) {
          return NaN;
        }
        return parseFloat(s);
      },
      fF: (x0,x1) => x0.removeChild(x1),
      fG: x0 => x0.selectionDirection,
      fH: () => {
        return typeof process != "undefined" &&
               Object.prototype.toString.call(process) == "[object process]" &&
               process.platform == "win32"
      },
      fI: x0 => x0.repetitionCount,
      fJ: (o, p, v) => o[p] = v,
      fK: (wasmFunction,f) => finalizeWrapper(f, function(x0,x1,x2) { return wasmFunction(f,arguments.length,x0,x1,x2) }),
      fL: (x0,x1,x2) => ({imageOrientation: x0,premultiplyAlpha: x1,colorSpaceConversion: x2}),
      fM: (x0,x1) => { x0.backgroundColor = x1 },
      fN: (x0,x1,x2,x3,x4,x5) => ({clientId: x0,scope: x1,redirectURI: x2,state: x3,nonce: x4,usePopup: x5}),
      fO: x0 => x0.trustedTypes,
      fP: x0 => x0.name,
      g: (x0,x1) => ({initializeEngine: x0,autoStart: x1}),
      gB: (b, o, l) => new DataView(b, o, l),
      gC: (string, token) => string.split(token),
      gD: () => globalThis.document,
      gE: s => s.trim(),
      gF: x0 => x0.firstChild,
      gG: x0 => x0.selectionStart,
      gH: () => {
        // On browsers return `globalThis.location.href`
        if (globalThis.location != null) {
          return globalThis.location.href;
        }
        return null;
      },
      gI: x0 => x0.frameCount,
      gJ: (x0,x1) => { x0.onerror = x1 },
      gK: (x0,x1) => x0.forEach(x1),
      gL: (x0,x1,x2,x3,x4,x5) => ({imageOrientation: x0,premultiplyAlpha: x1,colorSpaceConversion: x2,resizeWidth: x3,resizeHeight: x4,resizeQuality: x5}),
      gM: (x0,x1) => { x0.display = x1 },
      gN: x0 => globalThis.AppleID.auth.init(x0),
      gO: (wasmFunction,f) => finalizeWrapper(f, function() { return wasmFunction(f,arguments.length) }),
      gP: (x0,x1,x2,x3,x4,x5,x6,x7) => ({apiKey: x0,authDomain: x1,databaseURL: x2,projectId: x3,storageBucket: x4,messagingSenderId: x5,measurementId: x6,appId: x7}),
      h: (wasmFunction,f) => finalizeWrapper(f, function(x0,x1) { return wasmFunction(f,arguments.length,x0,x1) }),
      hB: Function.prototype.call.bind(DataView.prototype.getFloat64),
      hC: o => o instanceof Array,
      hD: (x0,x1,x2) => x0.addEventListener(x1,x2),
      hE: x0 => x0.classList,
      hF: x0 => x0.viewConstraints,
      hG: x0 => x0.selectionEnd,
      hH: a => a.pop(),
      hI: x0 => x0.selectedTrack,
      hJ: (wasmFunction,f) => finalizeWrapper(f, function(x0) { return wasmFunction(f,arguments.length,x0) }),
      hK: x0 => x0.name,
      hL: (x0,x1,x2) => x0.createImageBitmap(x1,x2),
      hM: (x0,x1) => { x0.height = x1 },
      hN: () => globalThis.AppleID.auth.signIn(),
      hO: x0 => { globalThis.onGoogleLibraryLoad = x0 },
      hP: (x0,x1) => globalThis.firebase_core.initializeApp(x0,x1),
      i: x0 => new Promise(x0),
      iB: o => {
        if (o === null || o === undefined) return 0;
        if (o instanceof Float64Array) return 1;
        return 2;
      },
      iC: (a, i) => a[i],
      iD: x0 => x0.hasFocus(),
      iE: x0 => x0.preventDefault(),
      iF: x0 => x0.hostElement,
      iG: x0 => x0.keyCode,
      iH: x0 => x0.debugSkipFontRetryDelay,
      iI: x0 => x0.completed,
      iJ: (x0,x1,x2) => x0.postMessage(x1,x2),
      iK: x0 => x0.statusText,
      iL: x0 => x0.clientHeight,
      iM: (x0,x1) => { x0.width = x1 },
      iN: x0 => x0.error,
      iO: x0 => x0.disableAutoSelect(),
      iP: x0 => globalThis.firebase_core.getApp(x0),
      j: (x0,x1,x2) => x0.call(x1,x2),
      jB: Function.prototype.call.bind(DataView.prototype.setFloat64),
      jC: a => a.length,
      jD: x0 => x0.relatedTarget,
      jE: x0 => x0.parent,
      jF: (wasmFunction,f) => finalizeWrapper(f, function(x0) { return wasmFunction(f,arguments.length,x0) }),
      jG: (x0,x1) => x0.scrollIntoView(x1),
      jH: x0 => new Uint8Array(x0),
      jI: x0 => x0.ready,
      jJ: x0 => x0.port,
      jK: x0 => x0.url,
      jL: x0 => x0.clientWidth,
      jM: x0 => x0.style,
      jN: x0 => x0.lastName,
      jO: (x0,x1) => x0.initialize(x1),
      jP: () => globalThis.firebase_core.getApp(),
      k: (constructor, args) => {
        const factoryFunction = constructor.bind.apply(
            constructor, [null, ...args]);
        return new factoryFunction();
      },
      kB: (t, s) => t.set(s),
      kC: (x0,x1) => x0.test(x1),
      kD: x0 => x0.shiftKey,
      kE: x0 => x0.timeStamp,
      kF: x0 => ({runApp: x0}),
      kG: x0 => x0.multiViewEnabled,
      kH: (x0,x1,x2) => x0.set(x1,x2),
      kI: x0 => x0.tracks,
      kJ: (x0,x1) => { x0.onerror = x1 },
      kK: x0 => x0.status,
      kL: x0 => x0.devicePixelRatio,
      kM: x0 => x0.disconnect(),
      kN: x0 => x0.firstName,
      kO: (wasmFunction,f) => finalizeWrapper(f, function(x0) { return wasmFunction(f,arguments.length,x0) }),
      kP: () => globalThis.firebase_core.SDK_VERSION,
      l: x0 => new Array(x0),
      lB: Function.prototype.call.bind(DataView.prototype.setFloat32),
      lC: x0 => x0.userAgent,
      lD: (decoder, codeUnits) => decoder.decode(codeUnits),
      lE: (x0,x1) => x0.hasAttribute(x1),
      lF: Function.prototype.call.bind(DataView.prototype.getBigInt64),
      lG: (x0,x1) => x0.replaceWith(x1),
      lH: x0 => x0.buffer,
      lI: () => globalThis.window.ImageDecoder,
      lJ: (wasmFunction,f) => finalizeWrapper(f, function(x0) { return wasmFunction(f,arguments.length,x0) }),
      lK: x0 => x0.getReader(),
      lL: (x0,x1) => { x0.height = x1 },
      lM: (x0,x1,x2) => x0.removeEventListener(x1,x2),
      lN: x0 => x0.name,
      lO: (x0,x1,x2,x3,x4,x5,x6,x7,x8,x9,x10,x11,x12,x13,x14,x15,x16) => ({client_id: x0,auto_select: x1,callback: x2,login_uri: x3,native_callback: x4,cancel_on_tap_outside: x5,prompt_parent_id: x6,nonce: x7,context: x8,state_cookie_domain: x9,ux_mode: x10,allowed_parent_origin: x11,intermediate_iframe_close_callback: x12,itp_support: x13,login_hint: x14,hd: x15,use_fedcm_for_prompt: x16}),
      lP: (x0,x1,x2) => globalThis.firebase_core.registerVersion(x0,x1,x2),
      m: o => [o],
      mB: Function.prototype.call.bind(DataView.prototype.getFloat32),
      mC: x0 => x0.navigator,
      mD: () => new TextDecoder("utf-8", {fatal: true}),
      mE: x0 => x0.buttons,
      mF: Function.prototype.call.bind(DataView.prototype.setBigInt64),
      mG: (x0,x1) => { x0.type = x1 },
      mH: x0 => x0.wasmMemory,
      mI: (o, offsetInBytes, lengthInBytes) => {
        var dst = new ArrayBuffer(lengthInBytes);
        new Uint8Array(dst).set(new Uint8Array(o, offsetInBytes, lengthInBytes));
        return new DataView(dst);
      },
      mJ: (x0,x1) => x0.getRandomValues(x1),
      mK: x0 => x0.read(),
      mL: (x0,x1) => { x0.width = x1 },
      mM: (x0,x1,x2,x3) => x0.putImageData(x1,x2,x3),
      mN: x0 => x0.email,
      mO: x0 => x0.error,
      mP: (wasmFunction,f) => finalizeWrapper(f, function(x0,x1) { return wasmFunction(f,arguments.length,x0,x1) }),
      n: (o0, o1) => [o0, o1],
      nB: o => {
        if (o === null || o === undefined) return 0;
        if (o instanceof Float32Array) return 1;
        return 2;
      },
      nC: Function.prototype.call.bind(String.prototype.toLowerCase),
      nD: () => new TextDecoder("utf-8", {fatal: false}),
      nE: x0 => x0.ctrlKey,
      nF: (o, start, length) => new BigInt64Array(o.buffer, o.byteOffset + start, length),
      nG: (x0,x1) => { x0.className = x1 },
      nH: () => globalThis.window._flutter_skwasmInstance,
      nI: (a, s, e) => a.slice(s, e),
      nJ: () => globalThis.crypto,
      nK: x0 => x0.value,
      nL: x0 => x0.height,
      nM: x0 => x0.arrayBuffer(),
      nN: x0 => x0.user,
      nO: x0 => x0.credential,
      nP: (wasmFunction,f) => finalizeWrapper(f, function(x0) { return wasmFunction(f,arguments.length,x0) }),
      o: (o0, o1, o2) => [o0, o1, o2],
      oB: Function.prototype.call.bind(DataView.prototype.getUint32),
      oC: Object.is,
      oD: (a, i, v) => a[i] = v,
      oE: x0 => x0.y,
      oF: o => o.byteLength,
      oG: (x0,x1) => { x0.tabIndex = x1 },
      oH: x0 => x0.fontFallbackBaseUrl,
      oI: (x0,x1,x2) => x0.insertBefore(x1,x2),
      oJ: l => new DataView(new ArrayBuffer(l)),
      oK: x0 => x0.done,
      oL: x0 => x0.width,
      oM: (x0,x1) => x0.transferFromImageBitmap(x1),
      oN: x0 => x0.state,
      oO: (o, p) => p in o,
      oP: (x0,x1) => ({createScript: x0,createScriptURL: x1}),
      p: (o0, o1, o2, o3) => [o0, o1, o2, o3],
      pB: o => {
        if (o === null || o === undefined) return 0;
        if (o instanceof Uint32Array) return 1;
        return 2;
      },
      pC: x0 => x0.vendor,
      pD: (jsArray, jsArrayOffset, wasmArray, wasmArrayOffset, length) => {
        const setValue = dartInstance.exports.$wasmI8ArraySet;
        for (let i = 0; i < length; i++) {
          setValue(wasmArray, wasmArrayOffset + i, jsArray[jsArrayOffset + i]);
        }
      },
      pE: x0 => x0.x,
      pF: () => typeof dartUseDateNowForTicks !== "undefined",
      pG: (x0,x1) => { x0.name = x1 },
      pH: (x0,x1,x2) => x0.slice(x1,x2),
      pI: x0 => x0.id,
      pJ: x0 => globalThis.URL.createObjectURL(x0),
      pK: x0 => x0.cancel(),
      pL: x0 => x0.createProgram(),
      pM: x0 => x0.height,
      pN: x0 => x0.id_token,
      pO: x0 => x0.groups,
      pP: (x0,x1) => x0.createScriptURL(x1),
      q: (x0,x1,x2) => { x0[x1] = x2 },
      qB: Function.prototype.call.bind(DataView.prototype.getInt32),
      qC: (x0,x1) => x0.createTextNode(x1),
      qD: (jsArray, jsArrayOffset, wasmArray, wasmArrayOffset, length) => {
        const setValue = dartInstance.exports.$wasmI16ArraySet;
        for (let i = 0; i < length; i++) {
          setValue(wasmArray, wasmArrayOffset + i, jsArray[jsArrayOffset + i]);
        }
      },
      qE: x0 => x0.scrollTop,
      qF: () => Date.now(),
      qG: (x0,x1) => { x0.placeholder = x1 },
      qH: (x0,x1) => x0.decode(x1),
      qI: x0 => x0.offsetHeight,
      qJ: x0 => ({type: x0}),
      qK: x0 => x0.body,
      qL: (x0,x1,x2) => x0.attachShader(x1,x2),
      qM: x0 => x0.width,
      qN: x0 => x0.code,
      qO: x0 => x0.requestAccessToken(),
      qP: (x0,x1,x2) => x0.createScript(x1,x2),
      r: (o, p) => o[p],
      rB: o => {
        if (o === null || o === undefined) return 0;
        if (o instanceof Int32Array) return 1;
        return 2;
      },
      rC: (x0,x1) => { x0.id = x1 },
      rD: (jsArray, jsArrayOffset, wasmArray, wasmArrayOffset, length) => {
        const setValue = dartInstance.exports.$wasmI32ArraySet;
        for (let i = 0; i < length; i++) {
          setValue(wasmArray, wasmArrayOffset + i, jsArray[jsArrayOffset + i]);
        }
      },
      rE: x0 => x0.offsetTop,
      rF: () => 1000 * performance.now(),
      rG: (x0,x1) => { x0.autocomplete = x1 },
      rH: (x0,x1) => x0.adoptText(x1),
      rI: x0 => x0.offsetWidth,
      rJ: (x0,x1) => new Blob(x0,x1),
      rK: x0 => x0.headers,
      rL: (x0,x1) => x0.linkProgram(x1),
      rM: x0 => x0.rasterEndMilliseconds,
      rN: x0 => x0.authorization,
      rO: (x0,x1) => x0.initTokenClient(x1),
      rP: (wasmFunction,f) => finalizeWrapper(f, function(x0) { return wasmFunction(f,arguments.length,x0) }),
      s: () => globalThis,
      sB: o => o instanceof Uint16Array,
      sC: (x0,x1) => { x0.nonce = x1 },
      sD: x0 => x0.visibilityState,
      sE: x0 => x0.scrollLeft,
      sF: (x0,x1) => x0.requestAnimationFrame(x1),
      sG: (x0,x1) => { x0.name = x1 },
      sH: x0 => x0.first(),
      sI: x0 => x0.stopPropagation(),
      sJ: () => new FileReader(),
      sK: x0 => x0.signal,
      sL: (x0,x1,x2) => x0.getProgramParameter(x1,x2),
      sM: x0 => x0.rasterStartMilliseconds,
      sN: (x0,x1) => x0.getItem(x1),
      sO: (wasmFunction,f) => finalizeWrapper(f, function(x0) { return wasmFunction(f,arguments.length,x0) }),
      sP: (o, p) => delete o[p],
      t: (wasmFunction,f) => finalizeWrapper(f, function(x0) { return wasmFunction(f,arguments.length,x0) }),
      tB: Function.prototype.call.bind(DataView.prototype.getUint16),
      tC: x0 => x0.nonce,
      tD: (x0,x1,x2) => x0.removeEventListener(x1,x2),
      tE: x0 => x0.offsetLeft,
      tF: (wasmFunction,f) => finalizeWrapper(f, function(x0) { return wasmFunction(f,arguments.length,x0) }),
      tG: (x0,x1) => { x0.placeholder = x1 },
      tH: x0 => x0.next(),
      tI: x0 => x0.disabled,
      tJ: (x0,x1) => x0.readAsArrayBuffer(x1),
      tK: x0 => new Blob(x0),
      tL: (x0,x1) => x0.getProgramInfoLog(x1),
      tM: x0 => x0.imageBitmaps,
      tN: x0 => x0.localStorage,
      tO: (wasmFunction,f) => finalizeWrapper(f, function(x0) { return wasmFunction(f,arguments.length,x0) }),
      tP: (x0,x1) => { x0.text = x1 },
      u: (wasmFunction,f) => finalizeWrapper(f, function(x0) { return wasmFunction(f,arguments.length,x0) }),
      uB: o => o instanceof Int16Array,
      uC: () => globalThis.window.flutterConfiguration,
      uD: x0 => x0.disconnect(),
      uE: x0 => x0.offsetParent,
      uF: x0 => x0.now(),
      uG: (x0,x1) => { x0.action = x1 },
      uH: x0 => x0.current(),
      uI: (x0,x1) => { x0.min = x1 },
      uJ: x0 => x0.result,
      uK: (x0,x1) => x0.append(x1),
      uL: (x0,x1,x2) => x0.detachShader(x1,x2),
      uM: (x0,x1) => { x0.height = x1 },
      uN: (x0,x1) => x0.key(x1),
      uO: (x0,x1,x2,x3,x4,x5,x6,x7,x8,x9,x10) => ({client_id: x0,callback: x1,scope: x2,include_granted_scopes: x3,prompt: x4,enable_granular_consent: x5,enable_serial_consent: x6,login_hint: x7,hd: x8,state: x9,error_callback: x10}),
      uP: (x0,x1) => { x0.text = x1 },
      v: (x0,x1) => ({addView: x0,removeView: x1}),
      vB: Function.prototype.call.bind(DataView.prototype.getInt16),
      vC: (x0,x1) => x0.attachShadow(x1),
      vD: x0 => new Intl.Locale(x0),
      vE: (o, p, r) => o.replace(p, () => r),
      vF: x0 => x0.performance,
      vG: (x0,x1) => { x0.method = x1 },
      vH: (x0,x1) => new Intl.v8BreakIterator(x0,x1),
      vI: (x0,x1) => { x0.max = x1 },
      vJ: (wasmFunction,f) => finalizeWrapper(f, function(x0) { return wasmFunction(f,arguments.length,x0) }),
      vK: x0 => x0.remove(),
      vL: (x0,x1) => x0.deleteShader(x1),
      vM: (x0,x1) => { x0.width = x1 },
      vN: x0 => x0.length,
      vO: x0 => x0.message,
      vP: x0 => x0.trustedTypes,
      w: (l, r) => l === r,
      wB: o => o instanceof Uint8ClampedArray,
      wC: (x0,x1) => x0.createElement(x1),
      wD: x0 => x0.region,
      wE: (o, p, r) => o.replaceAll(p, () => r),
      wF: (map, o) => map.get(o),
      wG: (x0,x1) => { x0.noValidate = x1 },
      wH: x0 => x0.v8BreakIterator,
      wI: (x0,x1) => { x0.disabled = x1 },
      wJ: (x0,x1,x2,x3) => x0.addEventListener(x1,x2,x3),
      wK: x0 => globalThis.URL.revokeObjectURL(x0),
      wL: (x0,x1) => x0.deleteProgram(x1),
      wM: x0 => x0.convertToBlob(),
      wN: (x0,x1) => x0.removeItem(x1),
      wO: x0 => x0.type,
      wP: (x0,x1) => { x0.crossOrigin = x1 },
      x: x0 => x0.random(),
      xB: o => {
        if (o === null || o === undefined) return 0;
        if (o instanceof Uint8Array) return 1;
        return 2;
      },
      xC: x0 => x0.scale,
      xD: x0 => x0.script,
      xE: x0 => x0.deltaMode,
      xF: () => new WeakMap(),
      xG: (x0,x1) => x0.removeAttribute(x1),
      xH: () => globalThis.Intl,
      xI: (x0,x1) => { x0.scrollLeft = x1 },
      xJ: (x0,x1,x2,x3) => x0.removeEventListener(x1,x2,x3),
      xK: (x0,x1,x2) => x0.setAttribute(x1,x2),
      xL: (x0,x1,x2) => x0.getAttribLocation(x1,x2),
      xM: (x0,x1,x2) => new ImageData(x0,x1,x2),
      xN: (x0,x1,x2) => x0.setItem(x1,x2),
      xO: x0 => x0.error_description,
      xP: (wasmFunction,f) => finalizeWrapper(f, function(x0) { return wasmFunction(f,arguments.length,x0) }),
      y: () => globalThis.Math,
      yB: Function.prototype.call.bind(DataView.prototype.setInt32),
      yC: x0 => x0.visualViewport,
      yD: x0 => x0.language,
      yE: x0 => x0.deltaY,
      yF: (x0,x1,x2,x3) => x0.pushState(x1,x2,x3),
      yG: x0 => x0.isConnected,
      yH: (x0,x1) => x0.segment(x1),
      yI: (x0,x1) => { x0.spellcheck = x1 },
      yJ: (wasmFunction,f) => finalizeWrapper(f, function(x0) { return wasmFunction(f,arguments.length,x0) }),
      yK: (x0,x1) => x0.removeAttribute(x1),
      yL: (x0,x1,x2) => x0.getUniformBlockIndex(x1,x2),
      yM: (x0,x1) => x0.getContext(x1),
      yN: (x0,x1) => x0.canShare(x1),
      yO: x0 => x0.expires_in,
      yP: x0 => x0.message,
      z: (x0,x1) => x0.prepend(x1),
      zB: Function.prototype.call.bind(DataView.prototype.setUint32),
      zC: x0 => x0.devicePixelRatio,
      zD: x0 => x0.languages,
      zE: x0 => x0.deltaX,
      zF: x0 => x0.history,
      zG: x0 => x0.click(),
      zH: x0 => x0.index,
      zI: (x0,x1) => { x0.disabled = x1 },
      zJ: () => new XMLHttpRequest(),
      zK: (x0,x1) => x0.deleteTexture(x1),
      zL: (x0,x1,x2,x3) => x0.getActiveUniformBlockParameter(x1,x2,x3),
      zM: (x0,x1) => new OffscreenCanvas(x0,x1),
      zN: (x0,x1) => x0.share(x1),
      zO: x0 => x0.error,
      zP: x0 => x0.lastModified,

    };

    const baseImports = {
      _: dart2wasm,
      Math: Math,
      Date: Date,
      Object: Object,
      Array: Array,
      Reflect: Reflect,
      WebAssembly: {
        JSTag: WebAssembly.JSTag,
      },
      "": new Proxy({}, { get(_, prop) { return prop; } }),

    };

    const jsStringPolyfill = {
      "charCodeAt": (s, i) => s.charCodeAt(i),
      "compare": (s1, s2) => {
        if (s1 < s2) return -1;
        if (s1 > s2) return 1;
        return 0;
      },
      "concat": (s1, s2) => s1 + s2,
      "equals": (s1, s2) => s1 === s2,
      "fromCharCode": (i) => String.fromCharCode(i),
      "length": (s) => s.length,
      "substring": (s, a, b) => s.substring(a, b),
      "fromCharCodeArray": (a, start, end) => {
        if (end <= start) return '';

        const read = dartInstance.exports.$wasmI16ArrayGet;
        let result = '';
        let index = start;
        const chunkLength = Math.min(end - index, 500);
        let array = new Array(chunkLength);
        while (index < end) {
          const newChunkLength = Math.min(end - index, 500);
          for (let i = 0; i < newChunkLength; i++) {
            array[i] = read(a, index++);
          }
          if (newChunkLength < chunkLength) {
            array = array.slice(0, newChunkLength);
          }
          result += String.fromCharCode(...array);
        }
        return result;
      },
      "intoCharCodeArray": (s, a, start) => {
        if (s === '') return 0;

        const write = dartInstance.exports.$wasmI16ArraySet;
        for (var i = 0; i < s.length; ++i) {
          write(a, start++, s.charCodeAt(i));
        }
        return s.length;
      },
      "test": (s) => typeof s == "string",
    };


    

    dartInstance = await WebAssembly.instantiate(this.module, {
      ...baseImports,
      ...additionalImports,
      
      "wasm:js-string": jsStringPolyfill,
    });

    return new InstantiatedApp(this, dartInstance);
  }
}

class InstantiatedApp {
  constructor(compiledApp, instantiatedModule) {
    this.compiledApp = compiledApp;
    this.instantiatedModule = instantiatedModule;
  }

  // Call the main function with the given arguments.
  invokeMain(...args) {
    this.instantiatedModule.exports.$invokeMain(args);
  }
}
