# dosasm.jsonc 与 package.json 对 action 的支持情况

> 调研日期：2026-01-03  
> 项目：masm-tasm (v2.1.3)  
> 涉及文件：`dosasm.jsonc`、`package.json`（`masmtasm.ASM.actions`）、`src/ASM3/` 模块

---

## 一、概述

masm-tasm 扩展通过 **两层配置** 来定义汇编代码的运行/调试行为：

| 配置层级 | 文件 | 作用域 | 优先级 |
|---------|------|--------|--------|
| 全局（默认） | `package.json` → `contributes.configuration.properties["masmtasm.ASM.actions"]` | 工作区 / 全局设置 | 低（被 dosasm.jsonc 覆盖） |
| 项目级 | `dosasm.jsonc` | 当前文件夹及其子目录 | 高（存在即覆盖默认行为） |

运行时，扩展会从当前 `.asm` 文件所在目录**向上递归搜索** `dosasm.jsonc`。如果找到，就使用其中的 `action` 定义；否则回退到 `package.json` 中的默认 action 配置。

---

## 二、package.json 中的 action 定义

### 2.1 配置路径

```
masmtasm.ASM.actions
```

### 2.2 数据结构

```typescript
interface ActionProfile {
  baseBundle: string;          // 必填，jsdos bundle 路径（如 <built-in>/TASM.jsdos）
  before?: string[];           // 可选，run/debug 之前执行的命令
  run: string[];               // 必填，运行代码的命令
  debug: string[];             // 必填，调试代码的命令
  support?: string[];          // 可选，支持的模拟器列表（如 ["jsdos", "jsdos-x"]）
}
```

### 2.3 内置的 action profile（package.json 默认值）

| Profile ID | baseBundle | 说明 |
|-----------|------------|------|
| `TASM` | `<built-in>/TASM.jsdos` | TASM 汇编器 + TLINK + TD 调试器 |
| `MASM-v6.11` | `<built-in>/MASM-v6.11.jsdos` | MASM v6.11 + LINK + DEBUG |
| `MASM-v5.00` | `<built-in>/MASM-v5.00.jsdos` | MASM v5.00 + LINK + DEBUG |

每个 profile 的 `run` / `debug` 命令均使用模板变量（见下文）。

### 2.4 配置项说明

| 配置键 | 类型 | 默认值 | 说明 |
|--------|------|--------|------|
| `masmtasm.ASM.assembler` | string | `"TASM"` | 当前使用的 assembler（必须是 `actions` 的一个 key） |
| `masmtasm.ASM.emulator` | string | `"jsdos-x"` | 模拟器类型：`jsdos` / `jsdos-x` / `dosbox` / `dosbox-x` |
| `masmtasm.ASM.savefirst` | boolean | `true` | 运行前是否先保存文件 |
| `masmtasm.ASM.actions` | object | 见上表 | 自定义 action profile 的映射表 |

### 2.5 工作流程（单文件模式，无 dosasm.jsonc）

```
用户右键 .asm 文件 → 触发命令
  ├─ resolveFile()        // 打开并（如需要）保存文件
  ├─ loadDosasmConfig()  // 向上搜索 dosasm.jsonc → 未找到，返回 null
  ├─ resolveBundleData() // 加载默认 baseBundle
  ├─ buildJsdosAutoexec()// 构建自动执行命令：
  │   ├─ mount c .        // 挂载 bundle 目录为 C 盘
  │   ├─ mount d ./code   // 挂载工作目录为 D 盘
  │   ├─ d:
  │   ├─ before 命令
  │   └─ run/debug 命令
  └─ jsdos_api.runInHost() // 启动模拟器并执行
```

---

## 三、dosasm.jsonc 中的 action 定义

### 3.1 文件定位与解析

- **搜索策略**：从被运行的 `.asm` 文件所在目录开始，逐级向上查找 `dosasm.jsonc`，直到工作区根目录或文件系统根目录。
- **解析器**：`src/ASM3/dosasm-config.ts` 中的 `parseJSONC()` 函数，支持 `//` 单行注释和 `/* */` 多行注释，且不会错误去除字符串内部的注释标记。

### 3.2 顶层结构

```jsonc
{
  "copyFileAs": null,        // 可选，旧版兼容
  "action": {
    "copyFileAs": null,      // 控制是否复制当前文件
    "before": [...],         // 打开模拟器后、run/debug 前执行的命令
    "open": [...],           // 仅打开模拟器时执行的命令
    "run": [...],            // 运行代码的命令
    "debug": [...]           // 调试代码的命令
  }
}
```

### 3.3 各字段详解

#### `action.copyFileAs`（string | null）

| 值 | 行为 |
|----|------|
| `null` | **不复制**文件。直接使用编辑器中当前活动文件的原始路径（如 `D:\2.asm`）。 |
| 字符串（如 `"flash.asm"`） | 将活动文件复制到 action 文件夹下的指定路径。 |

> 在 jsdos 模式下，文件会被注入到 jszip bundle 的 `code/` 目录中；在 DOSBox 模式下，文件会被复制到隔离的临时工作目录。

#### `action.before`（string[]）

在 `run` 或 `debug` 之前执行的命令，典型用途：

- 挂载驱动器：`mount c ${<built-in>/TASM.jsdos}`
- 挂载项目目录：`mount d ${actionFolder}`
- 设置 PATH：`PATH %PATH%;C:\TASM`
- 切换目录：`d:` / `cd d:\`

> 如果存在 dosasm.jsonc，单文件模式下的自动挂载（`mount c .` / `mount d ./code`）会被跳过，完全由 `before` 控制环境。

#### `action.open`（string[]）

仅打开模拟器（不运行/不调试）时执行的命令。可以为空数组。

#### `action.run`（string[]）

运行代码的命令序列。典型流程：

```jsonc
"run": [
  "TASM ${file}",       // 汇编
  "TLINK ${filename}",  // 链接
  ">${filename}"        // 执行（> 前缀防止输出被重定向到诊断信息）
]
```

#### `action.debug`（string[]）

调试代码的命令序列。典型流程：

```jsonc
"debug": [
  "TASM /zi ${file}",          // 汇编（带调试信息）
  "TLINK /v/3 ${filename}.obj",// 链接（详细模式）
  "copy C:\\TASM\\TDC2.TD TDCONFIG.TD",
  "TD -cTDCONFIG.TD ${filename}.exe"  // 启动 Turbo Debugger
]
```

---

## 四、模板变量（Template Variables）

在 `before` / `open` / `run` / `debug` 的命令字符串中，可以使用以下变量，由 `expandCommand()` 函数在运行时替换：

| 变量 | 含义 | 示例 |
|------|------|------|
| `${file}` | 汇编文件在 DOS 中的完整路径 | `D:\test.asm` |
| `${filename}` | 去掉扩展名的文件名 | `D:\test` |
| `${actionFolder}` | dosasm.jsonc 所在目录的路径 | `D:\projects\myapp` |
| `${<built-in>/TASM.jsdos}` | 内置 bundle 的路径 | jsdos 模式下为 `.`；DOSBox 模式下为解压后的实际路径 |

### 4.1 `>` 前缀语法

在 `run` / `debug` 命令中，如果命令以 `>` 开头，扩展程序会剥离该字符，但**阻止该命令的输出被重定向到诊断信息收集器**。这可用于执行不需要捕获输出的命令（如 `pause`、`>flash.exe`）。

---

## 五、两种模式对比

| 特性 | 单文件模式（无 dosasm.jsonc） | dosasm.jsonc 模式 |
|------|------------------------------|-------------------|
| 配置来源 | `package.json` 的 `masmtasm.ASM.actions` | 项目根目录的 `dosasm.jsonc` |
| 挂载方式 | 自动：`mount c .` / `mount d ./code` | 手动：由 `action.before` 自由控制 |
| 文件复制 | 自动复制到隔离目录 | 由 `action.copyFileAs` 控制 |
| 多文件支持 | 有限（仅单个活动文件） | 支持（可挂载整个项目目录） |
| bundle 引用 | 仅使用 `baseBundle` | 可通过 `${<built-in>/xxx.jsdos}` 引用任意 bundle |
| 适用场景 | 单文件快速运行 | 多文件项目、自定义构建流程 |

---

## 六、模拟器支持

### 6.1 四种模拟器

| 枚举值 | 说明 | 平台支持 |
|--------|------|----------|
| `jsdos` | js-dos (Wasm 版 DOSBox) | Web + Desktop |
| `jsdos-x` | js-dos (Wasm 版 DOSBox-X)，默认值 | Web + Desktop |
| `dosbox` | 本地 DOSBox 二进制 | Desktop only |
| `dosbox-x` | 本地 DOSBox-X 二进制 | Desktop only |

### 6.2 action profile 中的 `support` 字段

`ActionProfile.support` 是一个字符串数组，列出该 assembler 支持的模拟器。状态栏的 "selectAssembler" 功能会根据当前模拟器过滤可选的 assembler 列表。如果某个 assembler 的 `support` 数组中不包含当前模拟器，则不会出现在可选列表中。

---

## 七、代码实现概览

### 7.1 关键文件

| 文件 | 职责 |
|------|------|
| `src/ASM3/dosasm-config.ts` | dosasm.jsonc 的查找、解析、模板展开 |
| `src/ASM3/config.ts` | 读取 `masmtasm.*` VSCode 配置，提供 `getAction()` / `getActions()` 等方法 |
| `src/ASM3/run.ts` | jsdos 模式下的执行入口：`runJsdos()`、`buildJsdosAutoexec()` |
| `src/ASM3/main-node.ts` | Desktop 入口：分发到 `runDosbox()` / `runDosboxX()` / `runJsdos()` |
| `src/ASM3/main.ts` | Web 入口：仅支持 jsdos |
| `src/ASM3/types.ts` | 类型定义：`ActionType`、`DosEmulatorType`、`ActionProfile` |
| `src/utils/configuration.ts` | 旧版配置访问封装（已被 `src/ASM3/config.ts` 部分取代） |

### 7.2 核心函数

```
loadDosasmConfig(fileUri)
  └─ findDosasmConfig()        // 向上搜索 dosasm.jsonc
      └─ parseDosasmConfig()  // 读取并解析 JSONC
          └─ parseJSONC()    // 去除注释后 JSON.parse

buildJsdosAutoexec(actionType, cfg, fileInJsdos)
  ├─ cfg != null: 使用 cfg.action.before + getCommands(actionType, cfg)
  └─ cfg == null: 使用自动挂载 + config.getAction()
      └─ expandCommands()  // 展开模板变量
          └─ expandCommand()
```

---

## 八、示例

### 8.1 单文件模式（package.json 默认）

用户无需任何配置，右键 `.asm` 文件即可运行。扩展使用 `TASM`（默认 assembler）和 `jsdos-x`（默认 emulator）。

### 8.2 dosasm.jsonc 模式（samples/multi）

```jsonc
{
  "action": {
    "before": [
      "mount c ${<built-in>/TASM.jsdos}",
      "mount d ${actionFolder}",
      "PATH %PATH%;C:\\TASM",
      "d:",
      "cd d:\\"
    ],
    "run": [
      "TASM ${file}",
      "TLINK ${filename}",
      ">${filename}"
    ]
  }
}
```

### 8.3 自定义 assembler（README 示例）

在 `package.json` 中添加新的 action profile：

```json
"masmtasm.ASM.actions": {
  "TASM-com": {
    "baseBundle": "<built-in>/TASM.jsdos",
    "before": ["PATH %PATH%;C:\\TASM"],
    "run": [
      "TASM ${file}",
      "TLINK /t ${filename}",
      "${filename}"
    ],
    "debug": [
      "TASM /zi ${file}",
      "TLINK /t/v/3 ${filename}.obj",
      "TD ${filename}.exe"
    ]
  }
}
```

然后在设置中将 `masmtasm.ASM.assembler` 设为 `TASM-com`。

---

## 九、限制与注意事项

1. **DOS 8.3 文件名限制**：DOS 模拟器通常只支持 8.3 格式的文件名，长文件名可能在模拟器内不可见。
2. **单文件模式的局限**：默认模式会将文件复制到隔离目录，因此无法引用同目录下的其他文件（如 `include` 的其他 `.inc` 文件）。多文件项目应使用 `dosasm.jsonc`。
3. **path 路径分隔符**：在 `before` 命令中移动目录时，必须使用 DOS 风格的反斜杠（`\`），且注意在 JSONC 中需要转义（`\\`）。
4. **bundle 路径解析**：`${<built-in>/xxx.jsdos}` 中的 bundle 必须存在于扩展的 `resources/` 目录下。
5. **DOSBox 日志监控**：在 DOSBox 模式下，扩展会监控日志文件以收集诊断信息。如果 autoexec 中包含 `exit` 命令，将自动切换到不监控日志的模式。

---

## 十、当前实现中可能存在的问题

> 以下问题基于对 `src/ASM3/` 源码的静态分析得出，部分问题已在生产环境复现，部分为逻辑推断。

### 10.1 🔴 jsdos 模式下 `copyFileAs: null` 导致文件缺失（严重）

**位置**：`src/ASM3/run.ts` → `runJsdos()`

**现象**：当 `dosasm.jsonc` 中 `action.copyFileAs` 设为 `null` 时，文件不会被注入到 jszip bundle 中，但 `fileInJsdos` 仍被设为 `"D:\\" + path.basename(resolved.doc.uri.fsPath)`。后续 `action.run` / `action.debug` 命令通过 `${file}` 引用的路径在 jsdos 虚拟文件系统中并不存在。

**根本原因**：
- `copyFileAs === null` 分支跳过了 `jszip.file("code/" + targetPath, ...)` 注入逻辑
- 代码假设文件已通过 `mount d ${actionFolder}` 从 action folder 可访问
- 但若 `.asm` 文件不在 action folder 中，或在 action folder 的子目录中，路径拼接将不正确

**影响**：用户在 `dosasm.jsonc` 中设置 `copyFileAs: null` 后，run/debug 会失败（汇编器找不到文件）。

**建议修复**：
- 当 `copyFileAs` 为 `null` 时，仍需将文件注入 jszip，但使用原始文件名而非默认的 `test.asm`
- 或者在 `copyFileAs: null` 时，自动推导文件在 action folder 中的相对路径并注入

### 10.2 🔴 多 bundle 引用只加载第一个（严重）

**位置**：`src/ASM3/run.ts` → `resolveBundleData()`

**现象**：`findBundleRefs()` 会从 `before` / `run` / `debug` / `open` 四个命令数组中提取所有 `${<built-in>/xxx.jsdos}` 引用并去重。但 `resolveBundleData()` 只取 `refs[0]` 加载，忽略其余 bundle。

**代码**：
	src
const refs = findBundleRefs(allCommands);
if (refs.length > 0) {
    logger.channel(`Using jsonc bundle: ${refs[0]}`);
    return vscode.workspace.fs.readFile(getBundleUri(context.extensionUri, refs[0]));
}


**影响**：如果用户在 `before` 中引用了一个 bundle（如 TASM 工具集），在 `run` 中引用了另一个 bundle（如自定义工具），只有第一个 bundle 被加载，第二个 bundle 文件在模拟器中不存在。

**注意**：DOSBox 模式下的 `extractConfigBundles()`（`main-node.ts`）正确处理了多 bundle，但 jsdos 模式下的 `resolveBundleData()` 没有。

### 10.3 🟡 DOSBox 模式下 `copyFileAs: null` 时路径解析可能失败（中等）

**位置**：`src/ASM3/main-node.ts` → `buildDosboxAutoexec()`

**现象**：当 `copyFileAs` 为 `null` 时，`fileUri` 回退到原始文件 URI。`vars.file` 初始值为 `fileUri.fsPath`（主机文件系统路径，如 `D:\projects\app\2.asm`）。仅当该路径以某个 `mount` 命令的目标路径开头时，`vars.file` 才会被更新为 DOS 路径。

**根本原因**：
- 如果 dosasm.jsonc 中没有 `mount` 命令覆盖包含该文件的目录，`vars.file` 将保持为宿主机路径
- 在 DOS 虚拟环境中，宿主机路径无效，命令如 `TASM ${file}` 将失败

**影响**：依赖 `mount` 命令顺序和文件位置，行为不确定。

**建议修复**：在 `makeDosboxContext` 中，当 `copyFileAs` 为 `null` 时，至少将文件复制到 `seperateSpaceFolder`（与单文件模式保持一致），或至少提供一个 fallback 路径。

### 10.4 🟡 单文件模式不支持 `open` 自定义命令（中等）

**位置**：`src/ASM3/run.ts` & `src/ASM3/main-node.ts` → `getCommands()`

**现象**：
- dosasm.jsonc 模式：`getCommands(ActionType.open, cfg)` 返回 `cfg.action.open ?? []`
- 单文件模式：`getCommands(ActionType.open, null)` 返回 `[]`（空数组）

**影响**：在单文件模式下，"打开模拟器"操作不会执行 `ActionProfile.open` 中的任何命令（实际上 `ActionProfile` 接口甚至没有 `open` 字段）。如果用户期望在打开模拟器时自动挂载某些目录或执行预设命令，此功能缺失。

### 10.5 🟡 `getAction()` / `getAssembler()` 未捕获的异常（中等）

**位置**：`src/ASM3/config.ts` → `getAction()` / `getAssembler()`

**现象**：`getAssembler()` 在 assembler 未在 `masmtasm.ASM.actions` 中定义时直接 `throw new Error`。`getAction()` 调用 `getAssembler()`，因此也可能抛出异常。

**调用方未处理**：
- `resolveBundleData()`（`run.ts`）调用 `config.getBaseBundle()` → `getAction()`
- `buildJsdosAutoexec()`（`run.ts`）调用 `config.getAction().before`
- `makeDosboxContext()`（`main-node.ts`）调用 `config.getAssembler()`

**影响**：如果用户误删了所有 action profile，或 `masmtasm.ASM.actions` 配置被破坏，运行/调试时会抛出未捕获的异常，扩展完全不可用。

### 10.6 🟡 `findDosasmConfig()` 的 URI 比较可能不准确（低-中）

**位置**：`src/ASM3/dosasm-config.ts` → `findDosasmConfig()`

**现象**：使用 `startsWith` 判断文件是否在工作区文件夹内：
	src
const workspaceFolder = vscode.workspace.workspaceFolders?.find(
    wf => startUri.toString().startsWith(wf.uri.toString())
);

**问题**：
- URI 尾部斜杠差异（`file:///workspace` vs `file:///workspace/`）可能导致 `startsWith` 失败
- 如果文件不在任何工作区文件夹下（如从文件管理器拖入的单个文件），`stopUri` 为 `undefined`，搜索会一直进行到文件系统根目录，可能产生不必要的 IO 开销

**影响**：在某些工作区配置下可能错误地判断为"不在工作区内"，导致搜索范围过大或过小。

### 10.7 🟡 `addFolderToJszip()` 无目录过滤（低-中）

**位置**：`src/ASM3/run.ts` → `addFolderToJszip()`

**现象**：递归遍历 action folder 并将所有文件添加到 jszip，不过滤 `node_modules`、`.git`、`.vscode` 等目录。

**影响**：
- 如果 action folder 包含大型依赖目录，jsdos bundle 体积会急剧膨胀
- 在 Web 环境中可能导致内存问题或加载超时
- 用户可能意外将敏感信息（如 `.env`）打入 bundle

**建议**：参考 `masmtasm.jsdos.ignore` 配置（已在 `package.json` 中定义），对 action folder 的遍历应用相同的忽略规则。

### 10.8 🟢 `expandCommand()` 中 `>` 前缀剥离时机（低）

**位置**：`src/ASM3/dosasm-config.ts` → `expandCommand()`

**现象**：`>` 剥离在变量展开**之前**执行：
	src
if (output.startsWith(">")) output=output.substring(1);
if (vars.bundlePath){
    output = output.replace(/\$\{<built-in>\/[^}]+\}/g, vars.bundlePath);
}

**分析**：这实际上是合理的——用户写 `>${filename}` 时，`>` 应被剥离，然后 `${filename}` 被展开。但如果变量值本身以 `>` 开头（如 `${file}` 解析为 `>something`），`>` 不会被剥离（因为剥离已发生），这恰好是正确行为。

**潜在问题**：如果用户在 `before` 命令中使用了 `${<built-in>/xxx.jsdos}` 且该值以 `>` 开头（不太可能但理论上），`>` 不会被剥离。此为边缘情况，影响极小。

### 10.9 🟢 `ActionProfile` 类型重复定义（低）

**位置**：`src/ASM3/types.ts` 和 `src/utils/configuration.ts`

**现象**：两个文件分别定义了结构相同的 `ActionProfile` 接口：
- `src/ASM3/types.ts`：`ActionProfile { baseBundle; before?; run; debug; support? }`
- `src/utils/configuration.ts`：`ActionProfile { baseBundle; before?; run; debug; support? }`

**影响**：维护风险——修改一个定义而不修改另一个会导致类型不一致。新代码应统一使用 `src/ASM3/types.ts` 中的定义。

### 10.10 🟢 `parseDosasmConfig()` 对 `copyFileAs` 的类型宽容度不足（低）

**位置**：`src/ASM3/dosasm-config.ts` → `parseDosasmConfig()`

**现象**：
	src
copyFileAs: typeof s.copyFileAs === "string" ? s.copyFileAs : null,

**分析**：如果用户在 `dosasm.jsonc` 中写 `"copyFileAs": false` 或 `"copyFileAs": 0`，这些值会被静默转换为 `null`。空字符串 `""` 也会被转换为 `null`（因为 `typeof "" === "string"` 为 `true`，但空字符串在 DOS 路径中无意义）。

**影响**：用户可能期望 `false` 表示"不复制"，但实际行为与 `null` 相同（都跳过注入），这不算错误但可能引起困惑。空字符串作为路径没有意义，应拒绝或报错。