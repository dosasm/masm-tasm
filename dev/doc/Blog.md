# Developping Blog

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
