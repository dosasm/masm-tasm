# Hover Information

```yaml
keyword: 
i18n:
  - zh-cn
```

This file is the an addition to Hover information.
Put hover information here

---

在yaml代码块中定义一些信息，使用keyword需要匹配的关键词，使用i18n定义支持的语言的id。
yaml使用[js-yaml](https://www.npmjs.com/package/js-yaml)进行转换。
插件默认加载yaml块到第一个`---`之间的内容来显示Hover，
假如VSCode的语言与i18n中的一项匹配时，假如匹配i18n中第i个元素，那么会加载第i个`---`和第i+1个`---`之间的内容

---

## Instruction

```yaml
type: 1
keyword: mov
```

Moves value from adress/constant/register to a register or adress.

syntax: `mov [operand], [operand]`

---

```yaml
type: 1
keyword: int
i18n:
  - zh-cn
```

Interrupt call see [list](https://github.com/xsro/masm-tasm/wiki/Interrupt-list-en)

syntax: `int [interruptIndex]`

---

软件中断指令（中断调用指令），[常见中断表](https://gitee.com/dosasm/masm-tasm/wikis/Interrupt-list)

syntax: `int [interruptIndex]`

---

```yaml
type: 1
keyword: into
```

Trap into overflow flag

syntax: `into`

---

```yaml
type: 1
keyword: nop
```

Do nothing

syntax: `nop`

---

```yaml
type: 1
keyword: hlt
```

Enters halt mode

syntax: `hlt`

---

```yaml
type: 1
keyword: iret
i18n:
  - zh-cn
```

syntax: `iret`

---

中断返回指令，从堆栈中依次弹出3个字，分别装入IP、CS和FLAG标志寄存器

syntax: `iret`

---

```yaml
type: 1
keyword: cmp
i18n:
  - zh-cn
```

Compares the 2 operands.

syntax: `cmp [operand], [operand]`

---

比较2个操作数

syntax: `cmp [operand], [operand]`

---

```yaml
type: 1
keyword: in
i18n:
  - zh-cn
```

Reads data from a port

syntax: `in [operand], [operand]`

---

从端口读取数据

syntax: `in [operand], [operand]`

---

```yaml
type: 1
keyword: out
i18n:
  - zh-cn
```

Writes data to a port

syntax: `out [operand], [operand]`

---

向端口写数据

syntax: `out [operand], [operand]`

---

```yaml
type: 1
keyword: or
i18n:
  - zh-cn
```

Or operation on 2 registers.

syntax: `or [operand], [operand]`

---

或操作.

syntax: `or [operand], [operand]`

---

```yaml
type: 1
keyword: and
i18n:
  - zh-cn
```

And operation on 2 registers.

syntax: `and [operand], [operand]`

---

与操作.

syntax: `and [operand], [operand]`

---

```yaml
type: 1
keyword: xor
i18n:
  - zh-cn
```

Xor operation on 2 register

syntax: `xor [operand], [operand]`

---

异或操作

syntax: `xor [operand], [operand]`

---

```yaml
type: 1
keyword: shl
```

Moves all the bits to the left by the second operand.

syntax: `shl [operand], [operand]`

---

```yaml
type: 1
keyword: xchg
```

Exchages regeter or memeory address with register.

syntax: `xchg [operand], [operand]`

---

```yaml
type: 1
keyword: xadd
```

Exchages regeter or memeory address with register and the summary is moved to SI.

syntax: `xadd [operand], [operand]`

---

```yaml
type: 1
keyword: cmpxchg
```

cmp + xchg.

syntax: `cmpxchg [operand], [operand]`

---

```yaml
type: 1
keyword: rcl
```

Rotates left (Carry).

syntax: `rcl [operand], [operand]`

---

```yaml
type: 1
keyword: rcl
```

Rotates left (Carry).

syntax: `rcl [operand], [operand]`

---

```yaml
type: 1
keyword: rcr
```

Rotates right (Carry).

syntax: `rcr [operand], [operand]`

---

```yaml
type: 1
keyword: rol
```

Rotates left.

syntax: `rol [operand], [operand]`

---

```yaml
type: 1
keyword: ror
```

Rotates right.

syntax: `ror [operand], [operand]`

---

```yaml
type: 1
keyword: shld
```

Double precesion shift left.

syntax: `shld [operand], [operand]`

---

```yaml
type: 1
keyword: sal
```

Moves all the bits to the left by the second operand. (Signed)

syntax: `sal [operand], [operand]`

---

```yaml
type: 1
keyword: lea
```

Moves the memory address of operand 2 to operand 1.

syntax: `lea [operand], [operand]`

---

```yaml
type: 1
keyword: shr
```

Moves all the bits to the right by the second operand.

syntax: `shr [operand], [operand]`

---

```yaml
type: 1
keyword: shrd
```

Double precesion shift right.

syntax: `shrd [operand], [operand]`

---

```yaml
type: 1
keyword: sar
```

Moves all the bits to the right by the second operand. (Unsigned)

syntax: `sar [operand], [operand]`

---

```yaml
type: 1
keyword: not
```

Flips all the bits of the operand

syntax: `not [operand]`

---

```yaml
type: 1
keyword: lahf
```

Move flags to ah (SF:ZF:xx:AF:xx:PF:xx:CF)

syntax: `lahf`

---

```yaml
type: 1
keyword: sahf
```

Move ah to flags (SF:ZF:xx:AF:xx:PF:xx:CF)

syntax: `sahf`

---

```yaml
type: 1
keyword: std
```

Set direction flag CF=1

syntax: `std`

---

```yaml
type: 1
keyword: cld
```

Clear direction flag DF=0

syntax: `cld`

---

```yaml
type: 1
keyword: sti
i18n:
  - zh-cn
```

Set interrupt flag IF=1

syntax: `sti`

---

设置i标为1

syntax: `sti`

---

```yaml
type: 1
keyword: cli
i18n:
  - zh-cn
```

Clear interrupt flag IF=0

syntax: `cli`

---

设置i标为0

syntax: `cli`

---

```yaml
type: 1
keyword: stc
```

Set carry flag CF=1

syntax: `stc`

---

```yaml
type: 1
keyword: clc
```

Clear carry flag CF=0

syntax: `clc`

---

```yaml
type: 1
keyword: cmc
```

Complement carry flag CF=!CF

syntax: `cmc`

---

```yaml
type: 1
keyword: add
i18n:
  - zh-cn
```

Adds the second operand to the first one.

syntax: `add [operand], [operand]`

---

将第二个操作数加到第一个操作数.

syntax: `add [operand], [operand]`

---

```yaml
type: 1
keyword: sub
i18n:
  - zh-cn
```

Subtracts the second operand from the first one.

syntax: `sub [operand], [operand]`

---

第一个操作数减去第二个操作数.

syntax: `sub [operand], [operand]`

---

```yaml
type: 1
keyword: inc
i18n:
  - zh-cn
```

Adds 1 to the operand.

syntax: `inc [operand]`

---

操作数加1.

syntax: `inc [operand]`

---

```yaml
type: 1
keyword: dec
i18n:
  - zh-cn
```

Subtracts 1 from the operand.

syntax: `dec [operand]`

---

操作数减1.

syntax: `dec [operand]`

---

```yaml
type: 1
keyword: neg
```

Negates the value of the operand.

syntax: `neg [operand]`

---

```yaml
type: 1
keyword: abs
i18n:
  - zh-cn
```

Turns the value to a positive value. (Not supported)

syntax: `abs [operand]`

---

取绝对值(Not supported)

syntax: `abs [operand]`

---

```yaml
type: 1
keyword: mul
```

Multiplies ax by the operand (Unsigned).

syntax: `mul [operand]`

---

```yaml
type: 1
keyword: imul
```

Multiplies ax by the operand (Signed).

syntax: `imul [operand]`

---

```yaml
type: 1
keyword: div
```

Divides ax by the operand (Unsigned) {Mod at dx (16 bit) or ah (8 bit)}.

syntax: `div [operand]`

---

```yaml
type: 1
keyword: idiv
```

Divides ax by the operand (Signed) {Mod at dx (16 bit) or ah (8 bit)}.

syntax: `idiv [operand]`

---

```yaml
type: 1
keyword: daa
```

After addition ajusts al to be in range of a decimal number

syntax: `daa`

---

```yaml
type: 1
keyword: das
```

After subtraction ajusts al to be in range of a decimal number

syntax: `das`

---

```yaml
type: 1
keyword: aaa
```

Ajust al to decimal number (add/sub)

syntax: `aaa`

---

```yaml
type: 1
keyword: aas
```

Ajust al to decimal number (add/sub)

syntax: `aas`

---

```yaml
type: 1
keyword: aam
```

Ajust al to decimal number (mul)

syntax: `aam`

---

```yaml
type: 1
keyword: aad
```

Ajust al to decimal number (div)

syntax: `aad`

---

```yaml
type: 1
keyword: wait
```

Processor suspends instruction execution until the BUSY # pin is inactive

syntax: `wait`

---

```yaml
type: 1
keyword: fwait
```

Processor checks for pending unmasked numeric exceptions before proceeding.

syntax: `fwait`

---

```yaml
type: 1
keyword: push
```

pushes a value to the stack

syntax: `push [operand]`

---

```yaml
type: 1
keyword: pushf
```

pushes flag data to the stack

syntax: `pushf`

---

```yaml
type: 1
keyword: pushfw
```

pushes flag data to the stack

syntax: `pushfw`

---

```yaml
type: 1
keyword: pushfd
```

pushes flag data to the stack

syntax: `pushfd`

---

```yaml
type: 1
keyword: pop
```

pops a value from the stack

syntax: `pop [operand]`

---

```yaml
type: 1
keyword: popf
```

pops flag data to the stack

syntax: `popf`

---

```yaml
type: 1
keyword: popfw
```

pops flag data to the stack

syntax: `popfw`

---

```yaml
type: 1
keyword: popfd
```

pops flag data to the stack

syntax: `popfd`

---

```yaml
type: 1
keyword: pusha
```

pushes all register to the stack

syntax: `pusha`

---

```yaml
type: 1
keyword: popa
```

pops all register to from the stack stack

syntax: `popa`

---

```yaml
type: 1
keyword: jmp
i18n:
  - zh-cn
```

jump to a part in the code

syntax: `jmp [label]`

---

跳转到给定标号的指令

syntax: `jmp [label]`

---

```yaml
type: 1
keyword:
  - jz
  - je
i18n:
  - zh-cn
```

jump if zero flag on

jump if equal

syntax: `jz [label]`

---

假如z标为1跳转

相等时跳转

syntax: `jz [label]`

---

```yaml
type: 1
keyword:
  - jnz
  - jne
i18n:
  - zh-cn
```

jump if zero flag off

jump if not equal

syntax: `jnz [label]`

---

假如z标为0跳转

不相等时跳转

syntax: `jnz [label]`

---

```yaml
type: 1
keyword: js
i18n:
  - zh-cn
```

jump if sign flag on

syntax: `js [label]`

---

假如s标为1跳转

syntax: `js [label]`

---

```yaml
type: 1
keyword: jns
i18n:
  - zh-cn
```

jump if sign flag off

syntax: `jns [label]`

---

假如s标为0跳转

syntax: `jns [label]`

---

```yaml
type: 1
keyword:
  - jp
  - jpe
i18n:
  - zh-cn
```

jump if parity flag on

syntax: `jp [label]`

---

假如p标为1跳转

syntax: `jp [label]`

---

```yaml
type: 1
keyword:
  - jnp
  - jpo
i18n:
  - zh-cn
```

jump if parity flag off

syntax: `jnp [label]`

---

假如p标为0跳转

syntax: `jnp [label]`

---

```yaml
type: 1
keyword: jo
i18n:
  - zh-cn
```

jump if Overflow flag on

syntax: `jo [label]`

---

假如o标为1跳转

syntax: `jo [label]`

---

```yaml
type: 1
keyword: jno
i18n:
  - zh-cn
```

jump if Overflow flag off

syntax: `jno [label]`

---

假如o标为0跳转

syntax: `jno [label]`

---

```yaml
type: 1
keyword:
  - ja
  - jnbe
i18n:
  - zh-cn
```

jump if greater (Unsinged)

syntax: `ja [label]`

---

（无符号数）大于跳转

syntax: `ja [label]`

---

```yaml
type: 1
keyword:
  - jna
  - jbe
i18n:
  - zh-cn
```

jump if less or equal(Unsinged)

syntax: `ja [label]`

---

（无符号数）不大于跳转

syntax: `ja [label]`

---

```yaml
type: 1
keyword:
  - jc
  - jb
  - jnae
i18n:
  - zh-cn
```

jump if less (Unsinged)

jump if carry flag on

syntax: `jc [label]`

---

（无符号数）小于跳转

syntax: `jc [label]`

---

```yaml
type: 1
keyword:
  - jnc
  - jnb
  - jae
i18n:
  - zh-cn
```

jump if greater or equals(Unsigned)

jump if carry flag off

syntax: `jnc [label]`

---

（无符号数）不小于跳转

syntax: `jnc [label]`

---

```yaml
type: 1
keyword: jg
i18n:
  - zh-cn
```

jump if greater (Singed)

syntax: `jg [label]`

---

（有符号数）大于时跳转

syntax: `jg [label]`

---

```yaml
type: 1
keyword: jge
i18n:
  - zh-cn
```

jump if greater or equals (Signed)

syntax: `jge [label]`

---

（有符号数）大于或等于时跳转

syntax: `jge [label]`

---

```yaml
type: 1
keyword: jl
i18n:
  - zh-cn
```

jump if less (Singed)

syntax: `jl [label]`

---

（有符号数）小于时跳转

syntax: `jl [label]`

---

```yaml
type: 1
keyword: jle
i18n:
  - zh-cn
```

jump if less or equals (Signed)

syntax: `jle [label]`

---

（有符号数）小于或等于时跳转

syntax: `jle [label]`

---

```yaml
type: 1
keyword: jcxz
i18n:
  - zh-cn
```

jump if cx is 0

syntax: `jcxz [label]`

---

假如CX寄存器为0跳转

syntax: `jcxz [label]`

---

```yaml
type: 1
keyword: jecxz
i18n:
  - zh-cn
```

jump if ecx is 0

syntax: `jcxz [label]`

---

假如ECX寄存器为0跳转

syntax: `jcxz [label]`

---

```yaml
type: 1
keyword: call
i18n:
  - zh-cn
```

Calls a procedure

syntax: `call [procName]`

---

调用子程序

syntax: `call [procName]`

---

```yaml
type: 1
keyword: ret
i18n:
  - zh-cn
```

Returns from a procedure

syntax: `ret [op:RemoveStack]`

---

从子程序返回

syntax: `ret [op:RemoveStack]`

---

```yaml
type: 1
keyword: enter
i18n:
  - zh-cn
```

Create dynamic and nested stack

syntax: `enter [dynamic], [nesting]`

---

Create dynamic and nested stack 创建动态嵌套堆栈

syntax: `enter [dynamic], [nesting]`

---

```yaml
type: 1
keyword: leave
```

High level ret

syntax: `leave`

---

```yaml
type: 1
keyword: les
```

Load memory from ES:Pointer 1 to operand 2 from es

syntax: `les [poiner], [register]`

---

```yaml
type: 1
keyword: lds
```

Load memory from DS:Pointer 1 to operand 2 from ds

syntax: `lds [poiner], [register]`

---

```yaml
type: 1
keyword: lfs
```

Load memory from FS:Pointer 1 to operand 2 from fs

syntax: `lfs [poiner], [register]`

---

```yaml
type: 1
keyword: lgs
```

Load memory from GS:Pointer 1 to operand 2 from gs

syntax: `lgs [poiner], [register]`

---

```yaml
type: 1
keyword: lss
```

Load memory from SS:Pointer to operand 2 from ss

syntax: `lss [poiner], [register]`

---

```yaml
type: 1
keyword: rep
i18n:
  - zh-cn
```

Repeat while equals

syntax: `rep [operation]`

---

Repeat while equals 相等时重复

syntax: `rep [operation]`

---

```yaml
type: 1
keyword: repz
i18n:
  - zh-cn
```

Repeat while zero

syntax: `repz [operation]`

---

Repeat while zero 不等于零的时候重复

syntax: `repz [operation]`

---

```yaml
type: 1
keyword: repnz
i18n:
  - zh-cn
```

Repeat while not zero

syntax: `repnz [operation]`

---

Repeat while not zero 非零时重复

syntax: `repnz [operation]`

---

```yaml
type: 1
keyword: xlat
i18n:
  - zh-cn
```

Table lookup to al

syntax: `xlat`

---

Table lookup to al al表查找

syntax: `xlat`

---

```yaml
type: 1
keyword: bound
```

Check the 16-bit signed array index value in the operand 1 against the doubleword with the upper and lower bounds specified by operand 2

syntax: `bound [operand], [operand]`

---

```yaml
type: 1
keyword: scas
```

Compare ES:DI with AX or AL

syntax: `scas`

---

```yaml
type: 1
keyword: scasb
```

Compare ES:DI with AL

syntax: `scasb`

---

```yaml
type: 1
keyword: scasw
```

Compare ES:DI with AX

syntax: `scasw`

---

```yaml
type: 1
keyword: scasd
```

Compare ES:DI with EAX (Not supported)

syntax: `scasd`

---

```yaml
type: 1
keyword: cmps
```

Compare ES:DI with ES:SI

syntax: `cmps`

---

```yaml
type: 1
keyword: cmpsb
```

Compare ES:DI with ES:SI (Byte)

syntax: `cmpsb`

---

```yaml
type: 1
keyword: cmpsw
```

Compare ES:DI with ES:SI

syntax: `cmpsw`

---

```yaml
type: 1
keyword: cmpsd
```

Compare ES:DI with ES:SI (32 bit)

syntax: `cmpsd`

---

```yaml
type: 1
keyword: stos
```

Sets ES:DI to AX AL

syntax: `stos`

---

```yaml
type: 1
keyword: stosb
```

Sets ES:DI to AL

syntax: `stosb`

---

```yaml
type: 1
keyword: stosw
```

Sets ES:DI to AX

syntax: `stosw`

---

```yaml
type: 1
keyword: stosd
```

Sets ES:DI to EAX  (Not supported)

syntax: `stosd`

---

```yaml
type: 1
keyword: lods
```

Sets Ax to ES:DI

syntax: `lods`

---

```yaml
type: 1
keyword: lodsb
```

Sets AL to ES:DI

syntax: `lodsb`

---

```yaml
type: 1
keyword: lodsw
```

Sets AX to ES:DI

syntax: `lodsw`

---

```yaml
type: 1
keyword: lodsd
```

Sets EAX to ES:DI 32-bit (Not supported)

syntax: `lodsd`

---

```yaml
type: 1
keyword: outs
```

syntax: `outs`

---

```yaml
type: 1
keyword: outsb
```

ES:DI -> DL

syntax: `outsb`

---

```yaml
type: 1
keyword: outsw
```

ES:DI -> DX

syntax: `outsw`

---

```yaml
type: 1
keyword: outsd
```

ES:DI -> EDX (Not supported)

syntax: `outsd`

---

```yaml
type: 1
keyword: ins
```

syntax: `ins`

---

```yaml
type: 1
keyword: insb
```

ES:DI <- DL

syntax: `insb`

---

```yaml
type: 1
keyword: insw
```

ES:DI <- DX

syntax: `insw`

---

```yaml
type: 1
keyword: insd
```

ES:DI <- EDX (Not supported)

syntax: `insd`

---

```yaml
type: 1
keyword: movs
```

Sets Ax to ES:DI

syntax: `movs`

---

```yaml
type: 1
keyword: movsb
```

Sets AL to ES:DI

syntax: `movsb`

---

```yaml
type: 1
keyword: movsw
```

Sets AX to ES:DI

syntax: `movsw`

---

```yaml
type: 1
keyword: movsd
```

Sets EAX to ES:DI 32-bit (Not supported)

syntax: `movsd`

---

```yaml
type: 1
keyword: req
```

(Not supported)

syntax: `req`

---

```yaml
type: 1
keyword: c
```

(Not supported)

syntax: `c`

---

```yaml
type: 1
keyword: wrt
```

(Not supported)

syntax: `wrt`

---

```yaml
type: 1
keyword: loop
```

- decrease `CX`

- Jumps to a label if cx is not 0

syntax: `loop [label]`

---

```yaml
type: 1
keyword:
  - loopz
  - loope
```

- decrease `CX`

- Jumps to a label if cx is not 0 **and** Zero flag is 1

syntax: `loope [label]`

---

```yaml
type: 1
keyword:
  - loopnz
  - loopne
```

- decrease `CX`

- Jumps to a label if cx is not 0 **and** zero flag is not 1

syntax: `loopz [label]`

---

## Register

```yaml
type: 5
keyword: al
i18n:
  - zh-cn
```

The lower byte of ax

syntax: `al`

---

寄存器AX的低八位

syntax: `al`

---

```yaml
type: 5
keyword: ah
i18n:
  - zh-cn
```

The upper byte of ax

syntax: `ah`

---

寄存器AX的高八位

syntax: `ah`

---

```yaml
type: 5
keyword: bl
i18n:
  - zh-cn
```

The lower byte of bx

syntax: `bl`

---

寄存器BX的低八位

syntax: `bl`

---

```yaml
type: 5
keyword: bh
i18n:
  - zh-cn
```

The upper byte of bx

syntax: `bh`

---

寄存器BX的高八位

syntax: `bh`

---

```yaml
type: 5
keyword: cl
i18n:
  - zh-cn
```

The lower byte of cx

syntax: `cl`

---

寄存器CX的低八位

syntax: `cl`

---

```yaml
type: 5
keyword: ch
i18n:
  - zh-cn
```

The upper byte of cx

syntax: `ch`

---

寄存器CX的高八位

syntax: `ch`

---

```yaml
type: 5
keyword: dl
i18n:
  - zh-cn
```

The lower byte of dx

syntax: `dl`

---

寄存器DX的低八位

syntax: `dl`

---

```yaml
type: 5
keyword: dh
i18n:
  - zh-cn
```

The upper byte of dx

syntax: `dh`

---

寄存器DX的高八位

syntax: `dh`

---

```yaml
type: 5
keyword: ax
i18n:
  - zh-cn
```

16 bit register used with arithmatic operations

syntax: `ax`

---

16位累加器

syntax: `ax`

---

```yaml
type: 5
keyword: bx
i18n:
  - zh-cn
```

16 bit register used to acess memory data

syntax: `bx`

---

16位基址寄存器

syntax: `bx`

---

```yaml
type: 5
keyword: cx
i18n:
  - zh-cn
```

16 bit register used with loops

syntax: `cx`

---

16位计数器

syntax: `cx`

---

```yaml
type: 5
keyword: dx
i18n:
  - zh-cn
```

16 bit register used with data mangment

syntax: `dx`

---

16位数据寄存器

syntax: `dx`

---

```yaml
type: 5
keyword: sp
i18n:
  - zh-cn
```

16 bit register that points at the stack

syntax: `sp`

---

16位堆栈指针寄存器

syntax: `sp`

---

```yaml
type: 5
keyword: bp
i18n:
  - zh-cn
```

16 bit register that is used to pass arguments

syntax: `bp`

---

16位基址指针寄存器

syntax: `bp`

---

```yaml
type: 5
keyword: di
i18n:
  - zh-cn
```

16 bit register used to acess memory data

syntax: `di`

---

16位目的变址寄存器

syntax: `di`

---

```yaml
type: 5
keyword: si
i18n:
  - zh-cn
```

16 bit register used to acess memory data

syntax: `si`

---

16位变址寄存器

syntax: `si`

---

```yaml
type: 5
keyword: eax
i18n:
  - zh-cn
```

32 bit register used with arithmatic operations

syntax: `eax`

---

32位累加寄存器器

syntax: `eax`

---

```yaml
type: 5
keyword: ebx
i18n:
  - zh-cn
```

32 bit register used to acess memory data

syntax: `ebx`

---

32位基址寄存器

syntax: `ebx`

---

```yaml
type: 5
keyword: ecx
i18n:
  - zh-cn
```

32 bit register used with loops

syntax: `ecx`

---

32位计数器

syntax: `ecx`

---

```yaml
type: 5
keyword: edx
i18n:
  - zh-cn
```

32 bit register used with data mangment

syntax: `edx`

---

32位数据寄存器

syntax: `edx`

---

```yaml
type: 5
keyword: esp
i18n:
  - zh-cn
```

32 bit register that points at the stack

syntax: `esp`

---

32位堆栈指针寄存器

syntax: `esp`

---

```yaml
type: 5
keyword: ebp
i18n:
  - zh-cn
```

32 bit register that is used to pass arguments

syntax: `ebp`

---

32位基址指针寄存器

syntax: `ebp`

---

```yaml
type: 5
keyword: edi
i18n:
  - zh-cn
```

32 bit register used to acess memory data

syntax: `edi`

---

32位目的变址寄存器

syntax: `edi`

---

```yaml
type: 5
keyword: esi
i18n:
  - zh-cn
```

32 bit register used to acess memory data

syntax: `esi`

---

32位源变址寄存器

syntax: `esi`

---

```yaml
type: 5
keyword: rax
i18n:
  - zh-cn
```

64 bit register used with arithmatic operations

syntax: `rax`

---

64位累加器

syntax: `rax`

---

```yaml
type: 5
keyword: rbx
i18n:
  - zh-cn
```

64 bit register used to acess memory data

syntax: `rbx`

---

64位基址寄存器

syntax: `rbx`

---

```yaml
type: 5
keyword: rcx
i18n:
  - zh-cn
```

64 bit register used with loops

syntax: `rcx`

---

64位计数器

syntax: `rcx`

---

```yaml
type: 5
keyword: rdx
i18n:
  - zh-cn
```

64 bit register used with data mangment

syntax: `rdx`

---

64位数据寄存器

syntax: `rdx`

---

```yaml
type: 5
keyword: rsp
i18n:
  - zh-cn
```

64 bit register that points at the stack

syntax: `rsp`

---

64位堆栈指针寄存器

syntax: `rsp`

---

```yaml
type: 5
keyword: rbp
i18n:
  - zh-cn
```

64 bit register that is used to pass arguments

syntax: `rbp`

---

64位基址指针寄存器

syntax: `rbp`

---

```yaml
type: 5
keyword: rdi
i18n:
  - zh-cn
```

64 bit register used to acess memory data

syntax: `rdi`

---

64位目的变址寄存器

syntax: `rdi`

---

```yaml
type: 5
keyword: rsi
i18n:
  - zh-cn
```

64 bit register used to acess memory data

syntax: `rsi`

---

64位源变址寄存器

syntax: `rsi`

---

```yaml
type: 5
keyword: cs
i18n:
  - zh-cn
```

Code segement address

syntax: `cs`

---

代码段寄存器

syntax: `cs`

---

```yaml
type: 5
keyword: ss
i18n:
  - zh-cn
```

Stack segement address

syntax: `ss`

---

堆栈段寄存器

syntax: `ss`

---

```yaml
type: 5
keyword: ds
i18n:
  - zh-cn
```

Data segement address

syntax: `ds`

---

数据段寄存器

syntax: `ds`

---

```yaml
type: 5
keyword: es
i18n:
  - zh-cn
```

Extra segement address

syntax: `es`

---

附加段寄存器

syntax: `es`

---

```yaml
type: 5
keyword: st0
```

Floting point register 0

syntax: `st0`

---

```yaml
type: 5
keyword: st1
```

Floting point register 1

syntax: `st1`

---

```yaml
type: 5
keyword: st2
```

Floting point register 2

syntax: `st2`

---

```yaml
type: 5
keyword: st3
```

Floting point register 3

syntax: `st3`

---

```yaml
type: 5
keyword: st4
```

Floting point register 4

syntax: `st4`

---

```yaml
type: 5
keyword: st5
```

Floting point register 5

syntax: `st5`

---

```yaml
type: 5
keyword: st6
```

Floting point register 6

syntax: `st6`

---

```yaml
type: 5
keyword: st7
```

Floting point register 7

syntax: `st7`

---

```yaml
type: 5
keyword: st
```

Floting point register

syntax: `st`

---

```yaml
type: 5
keyword: db0
```

Debug register 0

syntax: `db0`

---

```yaml
type: 5
keyword: db1
```

Debug register 1

syntax: `db1`

---

```yaml
type: 5
keyword: db2
```

Debug register 2

syntax: `db2`

---

```yaml
type: 5
keyword: db3
```

Debug register 3

syntax: `db3`

---

```yaml
type: 5
keyword: tr6
```

Test register 4

syntax: `tr6`

---

```yaml
type: 5
keyword: tr7
```

Test register 5

syntax: `tr7`

---

```yaml
type: 5
keyword: db6
```

Debug register 6

syntax: `db6`

---

```yaml
type: 5
keyword: db7
```

Debug register 7

syntax: `db7`

---

## SavedWord

```yaml
type: 0
keyword: DATASEG
i18n:
  - zh-cn
```

Start of the data segment

syntax: `DATASEG`

---

数据段的开始

syntax: `DATASEG`

---

```yaml
type: 0
keyword: IDEAL
```

syntax: `IDEAL`

---

```yaml
type: 0
keyword: CODESEG
i18n:
  - zh-cn
```

Start of the code segment

syntax: `CODESEG`

---

代码段的开始

syntax: `CODESEG`

---

```yaml
type: 0
keyword: MODEL
```

Defines the scope of the file

syntax: `MODEL [size]`

---

```yaml
type: 0
keyword: STACK
```

Sets the size of the stack

syntax: `STACK [constant]`

---

```yaml
type: 0
keyword: width
```

syntax: `width`

---

```yaml
type: 0
keyword: this
```

syntax: `this`

---

```yaml
type: 0
keyword: times
```

syntax: `times`

---

```yaml
type: 0
keyword: length
```

syntax: `length`

---

```yaml
type: 0
keyword: le
```

syntax: `le`

---

```yaml
type: 0
keyword: ge
```

syntax: `ge`

---

```yaml
type: 0
keyword: far
```

Turns the procedure into a far procedure

syntax: `[procName] far`

---

```yaml
type: 0
keyword: near
```

Turns the procedure into a near procedure

syntax: `[procName] near`

---
