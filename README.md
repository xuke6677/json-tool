# JSON 工具箱 - Windows 本地版

一个轻量级的本地 JSON 处理工具，支持格式化、压缩、验证、转换等功能。

## 功能特性

- ✅ JSON 格式化/美化
- ✅ JSON 压缩
- ✅ JSON 语法验证
- ✅ JSON 转 XML
- ✅ JSON 转 YAML
- ✅ JSON 转 CSV
- ✅ JSON 排序（按键名）
- ✅ 文件读写支持
- ✅ 复制到剪贴板

## 环境要求

- Python 3.8+
- 无需额外依赖（使用内置库）

## 安装与运行

### 方式一：直接运行源码

```bash
python json_tool.py
```

### 方式二：打包为 EXE（可选）

```bash
pip install pyinstaller
pyinstaller --onefile --windowed json_tool.py
```

打包后的 EXE 在 `dist` 目录中。

## 使用说明

1. **输入 JSON**: 在左侧文本框粘贴或输入 JSON 内容
2. **选择操作**: 点击顶部按钮执行相应功能
3. **查看结果**: 转换后的结果显示在右侧文本框
4. **保存/复制**: 可以复制结果或保存到文件

### 快捷键

- `Ctrl+V`: 粘贴
- `Ctrl+C`: 复制
- `Ctrl+O`: 打开文件
- `Ctrl+S`: 保存文件
- `Ctrl+Enter`: 格式化

## 依赖库

- `tkinter` - GUI（Python 内置）
- `xmltodict` - JSON/XML 转换（如需转换功能）
- `pyyaml` - JSON/YAML 转换（如需转换功能）

可选依赖安装：
```bash
pip install xmltodict pyyaml
```

## 许可证

MIT License
