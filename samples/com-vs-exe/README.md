# .COM vs .EXE — Difference and How to Build Each

This sample demonstrates the difference between DOS `.COM` and `.EXE` executable
formats, and shows how to write assembly code that targets each format.

---

## Quick Comparison

| Property | `.COM` | `.EXE` |
|----------|--------|--------|
| **File header** | None (raw binary) | 256-byte header with relocation table, segment sizes, entry point, stack info |
| **Maximum size** | 65,280 bytes (64 KB − 256 for PSP) | Up to ~65535 segments, effectively unlimited |
| **Memory layout** | Single segment; everything (code, data, stack) in one 64 KB block | Multiple segments; CS, DS, SS, ES can point to different segments |
| **Entry point** | Fixed at offset `0x0100` (right after the PSP) | Specified in the header (`CS:IP`) |
| **Relocation** | None (loaded at a fixed address relative to PSP) | Relocation table in header; loader fixes up far pointers |
| **Assembly directive** | `.model tiny` + `org 100h` | `.model small` / `.model large` etc. |
| **Linker** | None needed (single-pass assembler output) | Linker required (combines multiple object files) |

---

## Why `.COM` Exists

`.COM` is the **original** DOS executable format, dating back to CP/M. It is
simply a raw binary blob loaded into memory starting at offset `0x0100`
(the 256-byte Program Segment Prefix, or PSP, occupies offsets `0x0000`–`0x00FF`).

Because there is no header, the assembler/linker cannot encode complex memory
models. Everything — code, data, stack — must fit within a single 64 KB segment.

---

## How to Build a `.COM` File with TASM

### Source structure

To produce a `.COM`, use the **`.model tiny`** memory model and set the origin
to `org 100h`:

```asm
.model tiny          ; single segment, all registers near
.code
    org 100h         ; entry point (PSP is 0x0000–0x00FF)
main:
    ; ... your code ...
    mov ah, 4Ch      ; terminate program
    int 21h
end main
```

### TASM command line

```bash
tasm myprog.asm      ; produces myprog.obj
tlink myprog.obj     ; produces myprog.com (tiny model → .com)
```

Or with a single step using the `/j` flag (TASM 4.x+):

```bash
tasm /j myprog.asm   ; assembles directly to myprog.com
```

### Key rules for `.COM` programs

1. **Always start with `org 100h`** — the PSP is 256 bytes, and execution
   begins at `CS:0100`.
2. **Use `.model tiny`** — this tells TASM that all segments are the same,
   so no far pointers or relocation are needed.
3. **Set `DS` correctly** — unlike `.EXE` where the loader sets `DS` for you,
   in a `.COM` you must manually load `DS` from the PSP:
   ```asm
   mov ax, es      ; PSP segment is in ES at entry
   mov ds, ax
   ```
   Actually, for `.model tiny`, TASM/TLINK handles this automatically.
4. **Terminate with `int 21h` / `AH=4Ch`** — return control to DOS.
5. **Keep total size under ~65,280 bytes** — the PSP + program must fit in
   one 64 KB segment.

---

## How to Build an `.EXE` File with TASM

### Source structure

For `.EXE`, use **`.model small`** (or larger) and let the linker handle
segmentation:

```asm
.model small
.stack 1024
.data
    message db 'hello', 0Ah, '$'
.code
main:
    mov ax, @data
    mov ds, ax
    ; ... your code ...
    mov ah, 4Ch
    int 21h
end main
```

### TASM command line

```bash
tasm myprog.asm     ; produces myprog.obj
tlink myprog.obj    ; produces myprog.exe
```

The `.EXE` header is written by the linker, not the assembler.

---

## When to Use Which

| Scenario | Recommended format |
|----------|-------------------|
| Small utility, single purpose | `.COM` — simpler, faster to load |
| Program > 64 KB | `.EXE` — supports multiple segments |
| Program with separate data/code segments | `.EXE` — linker manages segments |
| Learning DOS internals | `.COM` — forces understanding of memory layout |
| CP/M compatibility | `.COM` — same format works on CP/M |

---

## This Sample

`comhello.asm` is a minimal `.COM` program that prints "Hello from .COM!"
to the console. It demonstrates:

- `.model tiny` memory model
- `org 100h` entry point
- Direct string output via `int 21h / AH=9`
- Clean termination via `int 21h / AH=4Ch`

Compile it and compare the resulting file sizes and structures with an
equivalent `.EXE` program.