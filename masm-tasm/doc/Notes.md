# Notes

## 1

VSCode 类型与汇编类型的对应

| assembly symbol | vscode symbol | 汇编关键字 | vscode 关键字 |
| --------------- | ------------- | ---------- | ------------- |
| macro           | Module        | 宏         | 模块          |
| segment         | Class         | 段         | 类            |
| procedure       | Function      | 子程序     | 函数          |
| struct          | Struct        | 结构体     | 结构体        |
| label           | Key           | 标号       | 键            |
| variable        | Variable      | 变量       | 变量          |

## d1

Concat all typescript files

```powershell
Get-ChildItem -Recurse src/**.ts | ForEach-Object  {
    echo "`n## $(Resolve-Path -Path $_ -Relative)`n`n``````typescript" ;
    Get-Content $_ -Encoding utf8;
    echo "``````"

    } | Out-File  .\all.md
```
