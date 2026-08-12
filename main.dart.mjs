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
      AI: (o, m, a) => o[m].apply(o, a),
      AJ: (wasmFunction,f) => finalizeWrapper(f, function(x0) { return wasmFunction(f,arguments.length,x0) }),
      AK: (x0,x1) => { x0.id = x1 },
      AL: x0 => x0.metaKey,
      AM: (wasmFunction,f) => finalizeWrapper(f, function(x0) { return wasmFunction(f,arguments.length,x0) }),
      AN: x0 => x0.messagingSenderId,
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
      BI: x0 => x0.iterator,
      BJ: x0 => x0.port2,
      BK: () => new AbortController(),
      BL: x0 => x0.altKey,
      BM: x0 => ({createScriptURL: x0}),
      BN: x0 => x0.storageBucket,
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
      CI: () => globalThis.Symbol,
      CJ: (x0,x1) => { x0.onmessage = x1 },
      CK: (x0,x1,x2,x3,x4,x5) => ({method: x0,headers: x1,body: x2,credentials: x3,redirect: x4,signal: x5}),
      CL: x0 => x0.ctrlKey,
      CM: (x0,x1,x2) => x0.createPolicy(x1,x2),
      CN: x0 => x0.databaseURL,
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
      DI: (x0,x1) => new Intl.Segmenter(x0,x1),
      DJ: x0 => globalThis.Object.keys(x0),
      DK: (x0,x1) => globalThis.fetch(x0,x1),
      DL: x0 => x0.isComposing,
      DM: (x0,x1) => x0.createScriptURL(x1),
      DN: x0 => x0.authDomain,
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
      EI: x0 => x0.Segmenter,
      EJ: x0 => x0.length,
      EK: (x0,x1) => x0.get(x1),
      EL: x0 => x0.code,
      EM: (x0,x1) => { x0.nonce = x1 },
      EN: x0 => x0.projectId,
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
      FI: () => new TextDecoder(),
      FJ: (o, t) => typeof o === t,
      FK: (wasmFunction,f) => finalizeWrapper(f, function(x0,x1,x2) { return wasmFunction(f,arguments.length,x0,x1,x2) }),
      FL: x0 => x0.repeat,
      FM: (x0,x1) => x0.querySelectorAll(x1),
      FN: x0 => x0.apiKey,
      G: s => JSON.stringify(s),
      GB: () => [],
      GC: (o, start, length) => new Float64Array(o.buffer, o.byteOffset + start, length),
      GD: x0 => x0.activeElement,
      GE: x0 => x0.documentElement,
      GF: x0 => x0.tiltY,
      GG: x0 => x0.state,
      GH: x0 => x0.readText(),
      GI: (a, i) => a.splice(i, 1),
      GJ: x0 => x0.data,
      GK: (x0,x1) => x0.forEach(x1),
      GL: (wasmFunction,f) => finalizeWrapper(f, function(x0) { return wasmFunction(f,arguments.length,x0) }),
      GM: (x0,x1) => x0.item(x1),
      GN: x0 => x0.options,
      H: Function.prototype.call.bind(Number.prototype.toString),
      HB: (a, i) => a.push(i),
      HC: (o, start, length) => new Float32Array(o.buffer, o.byteOffset + start, length),
      HD: x0 => x0.parentNode,
      HE: x0 => x0.computedStyleMap(),
      HF: x0 => x0.tiltX,
      HG: x0 => x0.hash,
      HH: x0 => x0.clipboard,
      HI: (x0,x1) => x0.revokeObjectURL(x1),
      HJ: x0 => x0.port1,
      HK: x0 => x0.name,
      HL: x0 => x0.userAgent,
      HM: x0 => x0.nonce,
      HN: x0 => x0.name,
      I: Function.prototype.call.bind(String.prototype.indexOf),
      IB: x0 => new Int8Array(x0),
      IC: (o, start, length) => new Uint32Array(o.buffer, o.byteOffset + start, length),
      ID: x0 => x0.tagName,
      IE: (x0,x1) => x0.get(x1),
      IF: x0 => x0.pointerType,
      IG: x0 => x0.state,
      IH: (x0,x1) => x0.writeText(x1),
      II: (x0,x1) => { x0.src = x1 },
      IJ: (x0,x1) => new SharedWorker(x0,x1),
      IK: x0 => x0.statusText,
      IL: (x0,x1,x2,x3) => x0.open(x1,x2,x3),
      IM: x0 => x0.length,
      IN: () => globalThis.firebase_core.getApps(),
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
      JI: (x0,x1,x2,x3,x4) => globalThis.createImageBitmap(x0,x1,x2,x3,x4),
      JJ: x0 => new Worker(x0),
      JK: x0 => x0.url,
      JL: (x0,x1,x2,x3,x4,x5) => ({clientId: x0,scope: x1,redirectURI: x2,state: x3,nonce: x4,usePopup: x5}),
      JM: x0 => x0.document,
      JN: x0 => x0.message,
      K: o => o,
      KB: x0 => new Uint8Array(x0),
      KC: (o, start, length) => new Uint16Array(o.buffer, o.byteOffset + start, length),
      KD: x0 => x0.clientY,
      KE: (x0,x1) => { x0.textContent = x1 },
      KF: x0 => x0.getCoalescedEvents(),
      KG: x0 => x0.parentElement,
      KH: (x0,x1) => x0.lock(x1),
      KI: x0 => x0.naturalHeight,
      KJ: (x0,x1,x2) => x0.postMessage(x1,x2),
      KK: x0 => x0.status,
      KL: x0 => globalThis.AppleID.auth.init(x0),
      KM: (x0,x1) => { x0.src = x1 },
      KN: x0 => x0.code,
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
      LI: x0 => x0.naturalWidth,
      LJ: (o, p, v) => o[p] = v,
      LK: x0 => x0.getReader(),
      LL: () => globalThis.AppleID.auth.signIn(),
      LM: (x0,x1) => { x0.defer = x1 },
      LN: x0 => x0.name,
      M: x0 => x0.index,
      MB: x0 => new Int16Array(x0),
      MC: (o, start, length) => new Uint8ClampedArray(o.buffer, o.byteOffset + start, length),
      MD: (x0,x1,x2) => x0.setAttribute(x1,x2),
      ME: x0 => x0.matches,
      MF: s => s.trimLeft(),
      MG: (d, digits) => d.toFixed(digits),
      MH: (x0,x1) => x0.querySelector(x1),
      MI: x0 => x0.decode(),
      MJ: (x0,x1) => { x0.onerror = x1 },
      MK: x0 => x0.read(),
      ML: x0 => x0.error,
      MM: (x0,x1) => { x0.async = x1 },
      MN: (x0,x1,x2,x3,x4,x5,x6,x7) => ({apiKey: x0,authDomain: x1,databaseURL: x2,projectId: x3,storageBucket: x4,messagingSenderId: x5,measurementId: x6,appId: x7}),
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
      NI: (x0,x1) => { x0.decoding = x1 },
      NJ: (wasmFunction,f) => finalizeWrapper(f, function(x0) { return wasmFunction(f,arguments.length,x0) }),
      NK: x0 => x0.value,
      NL: x0 => x0.lastName,
      NM: x0 => x0.trustedTypes,
      NN: (x0,x1) => globalThis.firebase_core.initializeApp(x0,x1),
      O: o => o === undefined,
      OB: x0 => new Uint16Array(x0),
      OC: (o, start, length) => new Int8Array(o.buffer, o.byteOffset + start, length),
      OD: (ms, c) =>
      setTimeout(() => dartInstance.exports.$invokeCallback(c),ms),
      OE: x0 => x0.matches,
      OF: x0 => x0.pop(),
      OG: x0 => x0.maxWidth,
      OH: (x0,x1) => x0.vibrate(x1),
      OI: (x0,x1) => { x0.crossOrigin = x1 },
      OJ: (x0,x1,x2) => x0.postMessage(x1,x2),
      OK: x0 => x0.done,
      OL: x0 => x0.firstName,
      OM: x0 => x0.trustedTypes,
      ON: x0 => globalThis.firebase_core.getApp(x0),
      P: (x0,x1) => x0.exec(x1),
      PB: x0 => new Int32Array(x0),
      PC: (x0,x1) => x0.querySelector(x1),
      PD: s => new Date(s * 1000).getTimezoneOffset() * 60,
      PE: o => typeof o === 'function' && o[jsWrappedDartFunctionSymbol] === true,
      PF: x0 => x0.flags,
      PG: x0 => x0.minHeight,
      PH: x0 => x0.arrayBuffer(),
      PI: (x0,x1) => x0.createObjectURL(x1),
      PJ: x0 => x0.port,
      PK: x0 => x0.cancel(),
      PL: x0 => x0.name,
      PM: (wasmFunction,f) => finalizeWrapper(f, function() { return wasmFunction(f,arguments.length) }),
      PN: () => globalThis.firebase_core.getApp(),
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
      QI: x0 => x0.URL,
      QJ: (x0,x1) => { x0.onerror = x1 },
      QK: x0 => x0.body,
      QL: x0 => x0.email,
      QM: x0 => { globalThis.onGoogleLibraryLoad = x0 },
      QN: () => globalThis.firebase_core.SDK_VERSION,
      R: o => o,
      RB: x0 => new Uint32Array(x0),
      RC: x0 => x0.length,
      RD: (handle) => clearTimeout(handle),
      RE: (wasmFunction,f) => finalizeWrapper(f, function(x0) { return wasmFunction(f,arguments.length,x0) }),
      RF: (x0,x1) => x0.error(x1),
      RG: (x0,x1) => x0.removeProperty(x1),
      RH: x0 => x0.status,
      RI: x0 => new Blob(x0),
      RJ: (wasmFunction,f) => finalizeWrapper(f, function(x0) { return wasmFunction(f,arguments.length,x0) }),
      RK: x0 => x0.headers,
      RL: x0 => x0.user,
      RM: (x0,x1,x2) => x0.setAttribute(x1,x2),
      RN: (x0,x1,x2) => globalThis.firebase_core.registerVersion(x0,x1,x2),
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
      SI: x0 => x0.close(),
      SJ: (x0,x1) => x0.getRandomValues(x1),
      SK: x0 => x0.signal,
      SL: x0 => x0.state,
      SM: x0 => x0.disableAutoSelect(),
      SN: (wasmFunction,f) => finalizeWrapper(f, function(x0,x1) { return wasmFunction(f,arguments.length,x0,x1) }),
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
      TI: (x0,x1) => ({frameIndex: x0,completeFramesOnly: x1}),
      TJ: () => globalThis.crypto,
      TK: x0 => new Blob(x0),
      TL: x0 => x0.id_token,
      TM: () => globalThis.google.accounts.id,
      TN: (wasmFunction,f) => finalizeWrapper(f, function(x0) { return wasmFunction(f,arguments.length,x0) }),
      U: (string, times) => string.repeat(times),
      UB: x0 => new Float64Array(x0),
      UC: x0 => x0.remove(),
      UD: x0 => x0.top,
      UE: (o, i) => o[i],
      UF: x0 => x0.blur(),
      UG: (x0,x1) => { x0.scrollTop = x1 },
      UH: x0 => x0.document,
      UI: (x0,x1) => x0.decode(x1),
      UJ: l => new DataView(new ArrayBuffer(l)),
      UK: (x0,x1) => x0.append(x1),
      UL: x0 => x0.code,
      UM: (x0,x1) => x0.initialize(x1),
      UN: (x0,x1) => ({createScript: x0,createScriptURL: x1}),
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
      VI: x0 => x0.displayHeight,
      VJ: () => new FileReader(),
      VK: x0 => x0.remove(),
      VL: x0 => x0.authorization,
      VM: (wasmFunction,f) => finalizeWrapper(f, function(x0) { return wasmFunction(f,arguments.length,x0) }),
      VN: (x0,x1) => x0.createScriptURL(x1),
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
      WI: x0 => x0.displayWidth,
      WJ: (x0,x1) => x0.readAsArrayBuffer(x1),
      WK: x0 => globalThis.URL.revokeObjectURL(x0),
      WL: (x0,x1) => x0.getItem(x1),
      WM: (x0,x1,x2,x3,x4,x5,x6,x7,x8,x9,x10,x11,x12,x13,x14,x15,x16) => ({client_id: x0,auto_select: x1,callback: x2,login_uri: x3,native_callback: x4,cancel_on_tap_outside: x5,prompt_parent_id: x6,nonce: x7,context: x8,state_cookie_domain: x9,ux_mode: x10,allowed_parent_origin: x11,intermediate_iframe_close_callback: x12,itp_support: x13,login_hint: x14,hd: x15,use_fedcm_for_prompt: x16}),
      WN: (x0,x1,x2) => x0.createScript(x1,x2),
      X: x0 => x0.dotAll,
      XB: (x0,x1,x2) => new Uint8Array(x0,x1,x2),
      XC: (x0,x1,x2,x3) => x0.setProperty(x1,x2,x3),
      XD: x0 => x0.clientY,
      XE: x0 => x0.language,
      XF: x0 => x0.innerWidth,
      XG: (x0,x1,x2) => x0.setSelectionRange(x1,x2),
      XH: () => globalThis.WeakRef,
      XI: x0 => x0.duration,
      XJ: x0 => x0.result,
      XK: (x0,x1,x2,x3) => x0.putImageData(x1,x2,x3),
      XL: x0 => x0.localStorage,
      XM: x0 => x0.error,
      XN: (wasmFunction,f) => finalizeWrapper(f, function(x0) { return wasmFunction(f,arguments.length,x0) }),
      Y: x0 => x0.unicode,
      YB: (x0,x1,x2) => new DataView(x0,x1,x2),
      YC: x0 => x0.style,
      YD: x0 => x0.clientX,
      YE: (x0,x1,x2,x3) => x0.register(x1,x2,x3),
      YF: x0 => x0.height,
      YG: (x0,x1) => { x0.value = x1 },
      YH: (handle) => clearInterval(handle),
      YI: x0 => x0.image,
      YJ: (wasmFunction,f) => finalizeWrapper(f, function(x0) { return wasmFunction(f,arguments.length,x0) }),
      YK: x0 => x0.arrayBuffer(),
      YL: (x0,x1) => x0.key(x1),
      YM: x0 => x0.credential,
      YN: (o, p) => delete o[p],
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
      ZH: (ms, c) =>
      setInterval(() => dartInstance.exports.$invokeCallback(c), ms),
      ZI: (x0,x1,x2,x3,x4) => ({type: x0,data: x1,premultiplyAlpha: x2,colorSpaceConversion: x3,preferAnimation: x4}),
      ZJ: (x0,x1,x2,x3) => x0.addEventListener(x1,x2,x3),
      ZK: (x0,x1) => x0.transferFromImageBitmap(x1),
      ZL: x0 => x0.length,
      ZM: (o, p) => p in o,
      ZN: (x0,x1) => { x0.text = x1 },
      a: x0 => x0.multiline,
      aB: (o) => new DataView(o.buffer, o.byteOffset, o.byteLength),
      aC: (x0,x1) => x0.warn(x1),
      aD: x0 => x0.offsetY,
      aE: (wasmFunction,f) => finalizeWrapper(f, function(x0) { return wasmFunction(f,arguments.length,x0) }),
      aF: x0 => x0.clientHeight,
      aG: x0 => x0.value,
      aH: () => Date.now(),
      aI: x0 => new window.ImageDecoder(x0),
      aJ: (x0,x1,x2,x3) => x0.removeEventListener(x1,x2,x3),
      aK: x0 => x0.height,
      aL: (x0,x1) => x0.removeItem(x1),
      aM: x0 => x0.groups,
      aN: (x0,x1) => { x0.text = x1 },
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
      bH: (map, o, v) => map.set(o, v),
      bI: x0 => x0.name,
      bJ: (wasmFunction,f) => finalizeWrapper(f, function(x0) { return wasmFunction(f,arguments.length,x0) }),
      bK: x0 => x0.width,
      bL: (x0,x1,x2) => x0.setItem(x1,x2),
      bM: (wasmFunction,f) => finalizeWrapper(f, function(x0) { return wasmFunction(f,arguments.length,x0) }),
      bN: x0 => x0.trustedTypes,
      c: (c) =>
      queueMicrotask(() => dartInstance.exports.$invokeCallback(c)),
      cB: o => o.byteOffset,
      cC: () => globalThis.window,
      cD: x0 => x0.type,
      cE: (x0,x1) => x0.unregister(x1),
      cF: (x0,x1) => { x0.content = x1 },
      cG: x0 => x0.selectionStart,
      cH: () => {
        return typeof process != "undefined" &&
               Object.prototype.toString.call(process) == "[object process]" &&
               process.platform == "win32"
      },
      cI: x0 => x0.repetitionCount,
      cJ: () => new XMLHttpRequest(),
      cK: x0 => x0.rasterEndMilliseconds,
      cL: (x0,x1) => x0.canShare(x1),
      cM: (x0,x1) => x0.prompt(x1),
      cN: (x0,x1) => { x0.crossOrigin = x1 },
      d: (x0,x1) => x0.didCreateEngineInitializer(x1),
      dB: o => o.buffer,
      dC: (o, c) => o instanceof c,
      dD: x0 => x0.maxTouchPoints,
      dE: (x0,x1) => x0.contains(x1),
      dF: (x0,x1) => { x0.name = x1 },
      dG: x0 => x0.selectionEnd,
      dH: () => {
        // On browsers return `globalThis.location.href`
        if (globalThis.location != null) {
          return globalThis.location.href;
        }
        return null;
      },
      dI: x0 => x0.frameCount,
      dJ: (x0,x1,x2,x3) => x0.open(x1,x2,x3),
      dK: x0 => x0.rasterStartMilliseconds,
      dL: (x0,x1) => x0.share(x1),
      dM: x0 => x0.isSkippedMoment(),
      dN: (wasmFunction,f) => finalizeWrapper(f, function(x0) { return wasmFunction(f,arguments.length,x0) }),
      e: (wasmFunction,f) => finalizeWrapper(f, function(x0) { return wasmFunction(f,arguments.length,x0) }),
      eB: Function.prototype.call.bind(DataView.prototype.getUint8),
      eC: (x0,x1) => x0[x1],
      eD: x0 => x0.platform,
      eE: (s) => +s,
      eF: x0 => x0.head,
      eG: x0 => x0.value,
      eH: a => a.pop(),
      eI: x0 => x0.selectedTrack,
      eJ: x0 => x0.send(),
      eK: x0 => x0.imageBitmaps,
      eL: x0 => x0.message,
      eM: x0 => x0.getDismissedReason(),
      eN: x0 => x0.message,
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
      fH: x0 => x0.debugSkipFontRetryDelay,
      fI: x0 => x0.completed,
      fJ: x0 => x0.type,
      fK: (x0,x1) => { x0.height = x1 },
      fL: (o, a) => o + a,
      fM: x0 => x0.isDismissedMoment(),
      fN: x0 => x0.lastModified,
      g: (x0,x1) => ({initializeEngine: x0,autoStart: x1}),
      gB: (b, o, l) => new DataView(b, o, l),
      gC: (string, token) => string.split(token),
      gD: () => globalThis.document,
      gE: s => s.trim(),
      gF: x0 => x0.firstChild,
      gG: x0 => x0.selectionStart,
      gH: x0 => new Uint8Array(x0),
      gI: x0 => x0.ready,
      gJ: x0 => x0.response,
      gK: (x0,x1) => { x0.width = x1 },
      gL: (x0,x1) => { x0.display = x1 },
      gM: x0 => x0.access_token,
      gN: x0 => x0.size,
      h: (wasmFunction,f) => finalizeWrapper(f, function(x0,x1) { return wasmFunction(f,arguments.length,x0,x1) }),
      hB: Function.prototype.call.bind(DataView.prototype.getFloat64),
      hC: o => o instanceof Array,
      hD: (x0,x1,x2) => x0.addEventListener(x1,x2),
      hE: x0 => x0.classList,
      hF: x0 => x0.viewConstraints,
      hG: x0 => x0.selectionEnd,
      hH: (x0,x1,x2) => x0.set(x1,x2),
      hI: x0 => x0.tracks,
      hJ: (x0,x1) => { x0.responseType = x1 },
      hK: x0 => x0.convertToBlob(),
      hL: x0 => x0.style,
      hM: (x0,x1,x2) => x0.hasGrantedAllScopes(x1,x2),
      hN: x0 => x0.name,
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
      iH: x0 => x0.buffer,
      iI: () => globalThis.window.ImageDecoder,
      iJ: x0 => x0.vendor,
      iK: (x0,x1,x2) => new ImageData(x0,x1,x2),
      iL: (x0,x1,x2) => ({files: x0,title: x1,text: x2}),
      iM: () => globalThis.google.accounts.oauth2,
      iN: x0 => x0.type,
      j: (x0,x1,x2) => x0.call(x1,x2),
      jB: Function.prototype.call.bind(DataView.prototype.setFloat64),
      jC: a => a.length,
      jD: x0 => x0.relatedTarget,
      jE: x0 => x0.parent,
      jF: (wasmFunction,f) => finalizeWrapper(f, function(x0) { return wasmFunction(f,arguments.length,x0) }),
      jG: (x0,x1) => x0.scrollIntoView(x1),
      jH: x0 => x0.wasmMemory,
      jI: (o, offsetInBytes, lengthInBytes) => {
        var dst = new ArrayBuffer(lengthInBytes);
        new Uint8Array(dst).set(new Uint8Array(o, offsetInBytes, lengthInBytes));
        return new DataView(dst);
      },
      jJ: x0 => x0.navigator,
      jK: (x0,x1) => x0.getContext(x1),
      jL: (x0,x1) => ({files: x0,text: x1}),
      jM: (x0,x1) => x0.revoke(x1),
      jN: (x0,x1) => x0.item(x1),
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
      kH: () => globalThis.window._flutter_skwasmInstance,
      kI: (a, s, e) => a.slice(s, e),
      kJ: () => globalThis.window,
      kK: (x0,x1) => new OffscreenCanvas(x0,x1),
      kL: (x0,x1) => ({files: x0,title: x1}),
      kM: (wasmFunction,f) => finalizeWrapper(f, function(x0) { return wasmFunction(f,arguments.length,x0) }),
      kN: x0 => x0.length,
      l: x0 => new Array(x0),
      lB: Function.prototype.call.bind(DataView.prototype.setFloat32),
      lC: x0 => x0.userAgent,
      lD: (decoder, codeUnits) => decoder.decode(codeUnits),
      lE: (x0,x1) => x0.hasAttribute(x1),
      lF: Function.prototype.call.bind(DataView.prototype.getBigInt64),
      lG: (x0,x1) => x0.replaceWith(x1),
      lH: x0 => x0.fontFallbackBaseUrl,
      lI: (x0,x1,x2) => x0.insertBefore(x1,x2),
      lJ: x0 => globalThis.URL.createObjectURL(x0),
      lK: x0 => x0.allocationSize(),
      lL: x0 => ({files: x0}),
      lM: (x0,x1,x2) => x0.revoke(x1,x2),
      lN: x0 => x0.files,
      m: o => [o],
      mB: Function.prototype.call.bind(DataView.prototype.getFloat32),
      mC: x0 => x0.navigator,
      mD: () => new TextDecoder("utf-8", {fatal: true}),
      mE: x0 => x0.buttons,
      mF: Function.prototype.call.bind(DataView.prototype.setBigInt64),
      mG: (x0,x1) => { x0.type = x1 },
      mH: (x0,x1,x2) => x0.slice(x1,x2),
      mI: x0 => x0.id,
      mJ: x0 => ({type: x0}),
      mK: (x0,x1) => x0.copyTo(x1),
      mL: (x0,x1) => ({title: x0,text: x1}),
      mM: (x0,x1) => x0.getRandomValues(x1),
      mN: (x0,x1) => { x0.multiple = x1 },
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
      nH: (x0,x1) => x0.decode(x1),
      nI: x0 => x0.offsetHeight,
      nJ: (x0,x1) => new Blob(x0,x1),
      nK: (x0,x1) => { x0.height = x1 },
      nL: x0 => ({text: x0}),
      nM: (x0,x1,x2,x3) => x0.encrypt(x1,x2,x3),
      nN: (x0,x1) => { x0.accept = x1 },
      o: (o0, o1, o2) => [o0, o1, o2],
      oB: Function.prototype.call.bind(DataView.prototype.getUint32),
      oC: Object.is,
      oD: (a, i, v) => a[i] = v,
      oE: x0 => x0.y,
      oF: o => o.byteLength,
      oG: (x0,x1) => { x0.tabIndex = x1 },
      oH: (x0,x1) => x0.adoptText(x1),
      oI: x0 => x0.offsetWidth,
      oJ: (x0,x1) => x0.item(x1),
      oK: (x0,x1) => { x0.width = x1 },
      oL: () => ({}),
      oM: x0 => x0.sessionStorage,
      oN: (x0,x1) => { x0.type = x1 },
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
      pH: x0 => x0.first(),
      pI: x0 => x0.stopPropagation(),
      pJ: (x0,x1) => x0.removeChild(x1),
      pK: (x0,x1) => x0.toDataURL(x1),
      pL: (x0,x1,x2) => new File(x0,x1,x2),
      pM: x0 => x0.subtle,
      pN: x0 => x0.length,
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
      qH: x0 => x0.next(),
      qI: x0 => x0.disabled,
      qJ: (x0,x1) => x0.appendChild(x1),
      qK: (x0,x1,x2,x3) => x0.drawImage(x1,x2,x3),
      qL: (x0,x1) => { x0.type = x1 },
      qM: (x0,x1,x2,x3,x4,x5,x6,x7) => x0.unwrapKey(x1,x2,x3,x4,x5,x6,x7),
      qN: x0 => x0.getReader(),
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
      rH: x0 => x0.current(),
      rI: (x0,x1) => { x0.min = x1 },
      rJ: x0 => x0.click(),
      rK: (x0,x1) => x0.getContext(x1),
      rL: (wasmFunction,f) => finalizeWrapper(f, function(x0) { return wasmFunction(f,arguments.length,x0) }),
      rM: (x0,x1,x2,x3,x4,x5) => x0.importKey(x1,x2,x3,x4,x5),
      rN: x0 => x0.value,
      s: () => globalThis,
      sB: o => o instanceof Uint16Array,
      sC: (x0,x1) => { x0.nonce = x1 },
      sD: x0 => x0.visibilityState,
      sE: x0 => x0.scrollLeft,
      sF: (x0,x1) => x0.requestAnimationFrame(x1),
      sG: (x0,x1) => { x0.name = x1 },
      sH: (x0,x1) => new Intl.v8BreakIterator(x0,x1),
      sI: (x0,x1) => { x0.max = x1 },
      sJ: x0 => x0.length,
      sK: x0 => x0.format,
      sL: (x0,x1,x2) => x0.addEventListener(x1,x2),
      sM: (x0,x1,x2,x3) => x0.generateKey(x1,x2,x3),
      sN: x0 => x0.done,
      t: (wasmFunction,f) => finalizeWrapper(f, function(x0) { return wasmFunction(f,arguments.length,x0) }),
      tB: Function.prototype.call.bind(DataView.prototype.getUint16),
      tC: x0 => x0.nonce,
      tD: (x0,x1,x2) => x0.removeEventListener(x1,x2),
      tE: x0 => x0.offsetLeft,
      tF: (wasmFunction,f) => finalizeWrapper(f, function(x0) { return wasmFunction(f,arguments.length,x0) }),
      tG: (x0,x1) => { x0.placeholder = x1 },
      tH: x0 => x0.v8BreakIterator,
      tI: (x0,x1) => { x0.disabled = x1 },
      tJ: x0 => x0.children,
      tK: x0 => x0.abort(),
      tL: (wasmFunction,f) => finalizeWrapper(f, function(x0) { return wasmFunction(f,arguments.length,x0) }),
      tM: (x0,x1,x2,x3,x4) => x0.wrapKey(x1,x2,x3,x4),
      tN: x0 => x0.read(),
      u: (wasmFunction,f) => finalizeWrapper(f, function(x0) { return wasmFunction(f,arguments.length,x0) }),
      uB: o => o instanceof Int16Array,
      uC: () => globalThis.window.flutterConfiguration,
      uD: x0 => x0.disconnect(),
      uE: x0 => x0.offsetParent,
      uF: x0 => x0.now(),
      uG: (x0,x1) => { x0.action = x1 },
      uH: () => globalThis.Intl,
      uI: (x0,x1) => { x0.scrollLeft = x1 },
      uJ: (x0,x1) => x0.createElement(x1),
      uK: x0 => x0.canvasKitMaximumSurfaces,
      uL: (x0,x1) => { x0.src = x1 },
      uM: (x0,x1,x2) => x0.exportKey(x1,x2),
      uN: x0 => x0.body,
      v: (x0,x1) => ({addView: x0,removeView: x1}),
      vB: Function.prototype.call.bind(DataView.prototype.getInt16),
      vC: (x0,x1) => x0.attachShadow(x1),
      vD: x0 => new Intl.Locale(x0),
      vE: (o, p, r) => o.replace(p, () => r),
      vF: x0 => x0.performance,
      vG: (x0,x1) => { x0.method = x1 },
      vH: (x0,x1) => x0.segment(x1),
      vI: (x0,x1) => { x0.spellcheck = x1 },
      vJ: (x0,x1) => { x0.download = x1 },
      vK: x0 => x0.nextSibling,
      vL: (x0,x1) => { x0.type = x1 },
      vM: x0 => x0.crypto,
      vN: x0 => x0.assetBase,
      w: (l, r) => l === r,
      wB: o => o instanceof Uint8ClampedArray,
      wC: (x0,x1) => x0.createElement(x1),
      wD: x0 => x0.region,
      wE: (o, p, r) => o.replaceAll(p, () => r),
      wF: (map, o) => map.get(o),
      wG: (x0,x1) => { x0.noValidate = x1 },
      wH: x0 => x0.index,
      wI: (x0,x1) => { x0.disabled = x1 },
      wJ: (x0,x1) => { x0.href = x1 },
      wK: (x0,x1) => x0.debug(x1),
      wL: x0 => x0.head,
      wM: x0 => x0.isSecureContext,
      wN: x0 => x0.loader,
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
      xH: x0 => x0.next(),
      xI: (x0,x1) => x0.error(x1),
      xJ: () => globalThis.document,
      xK: x0 => x0.hostElement,
      xL: (o) => {
        const typeofValue = typeof o;
        return (typeofValue === 'object') ||
            typeofValue === 'function';
      },
      xM: (x0,x1,x2,x3) => x0.decrypt(x1,x2,x3),
      xN: () => globalThis._flutter,
      y: () => globalThis.Math,
      yB: Function.prototype.call.bind(DataView.prototype.setInt32),
      yC: x0 => x0.visualViewport,
      yD: x0 => x0.language,
      yE: x0 => x0.deltaY,
      yF: (x0,x1,x2,x3) => x0.pushState(x1,x2,x3),
      yG: x0 => x0.isConnected,
      yH: x0 => x0.value,
      yI: () => globalThis.console,
      yJ: (x0,x1) => x0.querySelector(x1),
      yK: x0 => x0.location,
      yL: (x0,x1) => x0.getAttribute(x1),
      yM: x0 => x0.measurementId,
      z: (x0,x1) => x0.prepend(x1),
      zB: Function.prototype.call.bind(DataView.prototype.setUint32),
      zC: x0 => x0.devicePixelRatio,
      zD: x0 => x0.languages,
      zE: x0 => x0.deltaX,
      zF: x0 => x0.history,
      zG: x0 => x0.click(),
      zH: x0 => x0.done,
      zI: () => new MessageChannel(),
      zJ: x0 => x0.body,
      zK: (x0,x1) => x0.getModifierState(x1),
      zL: (x0,x1) => x0.debug(x1),
      zM: x0 => x0.appId,

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
