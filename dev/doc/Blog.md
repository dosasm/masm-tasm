# Developping Blog

### where-are-extensions-installed

According to [VSCode-doc](https://code.visualstudio.com/docs/editor/extension-gallery#_where-are-extensions-installed), the extension will be installed in following folder:

- Windows `%USERPROFILE%\.vscode\extensions`
- mac-OS `~/.vscode/extensions`
- Linux `~/.vscode/extensions`

## 2026/1/3 Happy New Year

- to test the sound, we can use `ctrl`+`G`.
- In js, `uint8Arr.buffer` has a type `ArrayBufferLike` but not `ArrayBuffer`, we need a function to convert between them like:

```typescript
function uint8ArrayToArrayBuffer(uint8Arr: Uint8Array): ArrayBuffer {
    return uint8Arr.buffer.slice(uint8Arr.byteOffset, uint8Arr.byteOffset + uint8Arr.byteLength);
}
```


The Core Reason for Avoiding Direct Use of `uint8Arr.buffer`  
A `Uint8Array` is a **view** (not a standalone data container) that references an underlying `ArrayBuffer`—it does not store data itself, but points to a segment of an `ArrayBuffer` via two key properties:  
- `byteOffset`: The starting position (in bytes) of the `Uint8Array` within the parent `ArrayBuffer`.  
- `byteLength`: The number of bytes the `Uint8Array` occupies in the parent `ArrayBuffer`.  

The `uint8Arr.buffer` property returns the **entire parent `ArrayBuffer`** (not just the segment the `Uint8Array` uses). If the `Uint8Array` is a subset of a larger `ArrayBuffer` (e.g., a slice of a 100-byte buffer from byte 10 to byte 20), directly using `uint8Arr.buffer` would return the full 100-byte buffer—including irrelevant data outside the `Uint8Array`’s range. This leads to:  
- Unintended inclusion of extra bytes (e.g., prefixes/suffixes in the original buffer).  
- Wasted memory (processing larger buffers than needed).  
- Incorrect data parsing (e.g., magic word detection or text decoding fails due to extra bytes).  


# `this.func(x)` vs. `let f = this.func; f(x)` in JavaScript
## Core Difference
Rooted in JavaScript’s **dynamic `this` binding**:
- `this.func(x)`: Function is called as an object method → `this` binds to the owning object.
- `let f = this.func; f(x)`: Function reference is assigned to a variable and called standalone → `this` binds to the global object (browser: `window`; Node.js: `global`), or `undefined` in strict mode.

## Solutions to Achieve Consistent Behavior
Enforce explicit `this` binding via three methods:
1. **`bind()` (Permanent Binding)**:  
   `let f = this.func.bind(this); f(x);`
2. **`call()`/`apply()` (Temporary Binding for Immediate Calls)**:  
   `f.call(this, x);` / `f.apply(this, [x]);`
3. **Arrow Function (ES6+, Lexical `this` Inheritance)**:  
   `let f = (x) => this.func(x); f(x);`

## Scenario Quick Reference
| Method       | Features                                  | Use Case                          |
|--------------|-------------------------------------------|-----------------------------------|
| `bind()`     | Permanent binding, reusable function      | Repeated calls with same context  |
| `call()`/`apply()` | Temporary binding, one-time execution | Single call with discrete/array args |
| Arrow Function | Concise, inherits outer `this`         | Simple ES6+ binding scenarios     |

## Summary
The two call styles differ because of `this` binding rules at call time. Explicit binding with `bind()`, `call()`, `apply()`, or arrow functions ensures consistent behavior.

是否需要我帮你把这份精简说明**提炼成一张速记卡片**，方便快速查阅？