# -*- coding: utf-8 -*-
"""
JSON 工具箱 - Windows 本地版
一个轻量级的本地 JSON 处理工具
"""

import json
import tkinter as tk
from tkinter import ttk, scrolledtext, messagebox, filedialog
import os
import sys

# 尝试导入可选依赖
try:
    import xmltodict
    HAS_XMLTODICT = True
except ImportError:
    HAS_XMLTODICT = False

try:
    import yaml
    HAS_YAML = True
except ImportError:
    HAS_YAML = False


class JSONToolApp:
    """JSON 工具箱主应用"""
    
    def __init__(self, root):
        self.root = root
        self.root.title("JSON 工具箱 v1.0")
        self.root.geometry("1200x700")
        self.root.minsize(800, 500)
        
        # 设置样式
        self.setup_styles()
        
        # 创建界面
        self.create_widgets()
        
        # 绑定快捷键
        self.bind_shortcuts()
        
        # 状态变量
        self.current_file = None
        self.is_modified = False
    
    def setup_styles(self):
        """设置样式"""
        style = ttk.Style()
        style.theme_use('clam')
        
        # 配置按钮样式
        style.configure('Primary.TButton', font=('微软雅黑', 10))
        style.configure('Tool.TButton', font=('微软雅黑', 9))
        
    def create_widgets(self):
        """创建界面组件"""
        # 顶部工具栏
        toolbar = ttk.Frame(self.root)
        toolbar.pack(side=tk.TOP, fill=tk.X, padx=5, pady=5)
        
        # 功能按钮组
        btn_frame = ttk.LabelFrame(toolbar, text="功能", padding=5)
        btn_frame.pack(side=tk.LEFT, fill=tk.Y)
        
        buttons = [
            ("格式化", self.format_json),
            ("压缩", self.compress_json),
            ("验证", self.validate_json),
            ("美化", self.beautify_json),
            ("排序", self.sort_json),
        ]
        
        for text, cmd in buttons:
            btn = ttk.Button(btn_frame, text=text, command=cmd, style='Tool.TButton', width=8)
            btn.pack(side=tk.LEFT, padx=2)
        
        # 分隔符
        ttk.Separator(btn_frame, orient=tk.VERTICAL).pack(side=tk.LEFT, fill=tk.Y, padx=5)
        
        # 转换按钮组
        convert_frame = ttk.LabelFrame(toolbar, text="转换", padding=5)
        convert_frame.pack(side=tk.LEFT, fill=tk.Y)
        
        convert_buttons = [
            ("转XML", self.json_to_xml),
            ("转YAML", self.json_to_yaml),
            ("转CSV", self.json_to_csv),
        ]
        
        for text, cmd in convert_buttons:
            btn = ttk.Button(convert_frame, text=text, command=cmd, style='Tool.TButton', width=8)
            btn.pack(side=tk.LEFT, padx=2)
        
        # 提示信息
        if not HAS_XMLTODICT:
            tip = ttk.Label(toolbar, text="安装 xmltodict: pip install xmltodict", foreground='gray')
            tip.pack(side=tk.LEFT, padx=10)
        
        # 文件操作按钮
        file_frame = ttk.Frame(toolbar)
        file_frame.pack(side=tk.RIGHT)
        
        ttk.Button(file_frame, text="Open", command=self.open_file, width=8).pack(side=tk.RIGHT, padx=2)
        ttk.Button(file_frame, text="Save", command=self.save_file, width=8).pack(side=tk.RIGHT, padx=2)
        
        # 主内容区
        content = ttk.PanedWindow(self.root, orient=tk.HORIZONTAL)
        content.pack(fill=tk.BOTH, expand=True, padx=5, pady=5)
        
        # 左侧输入区
        left_frame = ttk.LabelFrame(content, text="输入 JSON", padding=5)
        content.add(left_frame, weight=1)
        
        self.input_text = scrolledtext.ScrolledText(
            left_frame, 
            font=('Consolas', 11),
            wrap=tk.NONE,
            undo=True
        )
        self.input_text.pack(fill=tk.BOTH, expand=True)
        
        # 添加行号显示（右侧显示）
        self.input_text.bind('<<Modified>>', self.on_text_change)
        
        # 中间操作区
        mid_frame = ttk.Frame(content)
        content.add(mid_frame, weight=0)
        
        op_frame = ttk.LabelFrame(mid_frame, text="操作", padding=10)
        op_frame.pack()
        
        ttk.Button(op_frame, text="→ 格式化 →", command=self.format_json, width=15).pack(pady=5)
        ttk.Button(op_frame, text="← 复制输入 ←", command=self.copy_input, width=15).pack(pady=5)
        ttk.Button(op_frame, text="清空", command=self.clear_all, width=15).pack(pady=5)
        
        # 右侧输出区
        right_frame = ttk.LabelFrame(content, text="输出结果", padding=5)
        content.add(right_frame, weight=1)
        
        self.output_text = scrolledtext.ScrolledText(
            right_frame, 
            font=('Consolas', 11),
            wrap=tk.NONE,
            state=tk.DISABLED
        )
        self.output_text.pack(fill=tk.BOTH, expand=True)
        
        # 底部状态栏
        self.status_label = ttk.Label(
            self.root, 
            text="就绪 | 行: 0, 列: 0", 
            relief=tk.SUNKEN,
            anchor=tk.W
        )
        self.status_label.pack(side=tk.BOTTOM, fill=tk.X)
        
        # 绑定鼠标位置追踪
        self.input_text.bind('<Motion>', self.update_cursor_pos)
        
    def bind_shortcuts(self):
        """绑定快捷键"""
        self.root.bind('<Control-o>', lambda e: self.open_file())
        self.root.bind('<Control-s>', lambda e: self.save_file())
        self.root.bind('<Control-v>', lambda e: self.paste_and_format())
        self.root.bind('<Control-Return>', lambda e: self.format_json())
        self.root.bind('<Control-a>', lambda e: self.select_all())
        
    def update_cursor_pos(self, event):
        """更新光标位置显示"""
        try:
            row, col = self.input_text.index(tk.INSERT).split('.')
            self.status_label.config(text=f"就绪 | 行: {row}, 列: {int(col)+1}")
        except:
            pass
    
    def on_text_change(self, event):
        """文本变化回调"""
        self.is_modified = True
        
    def get_input(self):
        """获取输入内容"""
        return self.input_text.get('1.0', tk.END).strip()
    
    def set_output(self, text):
        """设置输出内容"""
        self.output_text.config(state=tk.NORMAL)
        self.output_text.delete('1.0', tk.END)
        self.output_text.insert('1.0', text)
        self.output_text.config(state=tk.DISABLED)
    
    def show_error(self, title, message):
        """显示错误信息"""
        messagebox.showerror(title, message)
    
    def show_info(self, title, message):
        """显示信息"""
        messagebox.showinfo(title, message)
    
    # ===== 功能方法 =====
    
    def parse_json(self, text):
        """解析 JSON，返回解析后的对象和错误信息"""
        try:
            return json.loads(text), None
        except json.JSONDecodeError as e:
            return None, f"JSON 解析错误 (第 {e.lineno} 行, 第 {e.colno} 列):\n{e.msg}"
    
    def format_json(self):
        """格式化 JSON"""
        text = self.get_input()
        if not text:
            self.show_error("错误", "请输入 JSON 内容")
            return
        
        obj, error = self.parse_json(text)
        if error:
            self.show_error("JSON 格式错误", error)
            return
        
        # 格式化输出
        formatted = json.dumps(obj, ensure_ascii=False, indent=2)
        self.set_output(formatted)
        self.status_label.config(text="格式化成功 ✓")
    
    def beautify_json(self):
        """美化 JSON（带颜色高亮效果，使用简单格式化）"""
        self.format_json()
    
    def compress_json(self):
        """压缩 JSON"""
        text = self.get_input()
        if not text:
            self.show_error("错误", "请输入 JSON 内容")
            return
        
        obj, error = self.parse_json(text)
        if error:
            self.show_error("JSON 格式错误", error)
            return
        
        compressed = json.dumps(obj, ensure_ascii=False, separators=(',', ':'))
        self.set_output(compressed)
        self.status_label.config(text="压缩成功 ✓")
    
    def validate_json(self):
        """验证 JSON"""
        text = self.get_input()
        if not text:
            self.show_error("错误", "请输入 JSON 内容")
            return
        
        obj, error = self.parse_json(text)
        if error:
            self.show_error("JSON 验证失败", error)
            return
        
        # 验证成功，显示统计信息
        info = f"✓ JSON 格式正确！\n\n"
        info += f"数据类型: {type(obj).__name__}\n"
        
        if isinstance(obj, dict):
            info += f"对象数量: {len(obj)} 个键\n"
        elif isinstance(obj, list):
            info += f"数组长度: {len(obj)} 个元素\n"
        
        # 估算大小
        size_bytes = len(text.encode('utf-8'))
        info += f"原始大小: {size_bytes} 字节\n"
        
        self.set_output(info)
        self.status_label.config(text="验证成功 ✓")
    
    def sort_json(self):
        """排序 JSON（按键名）"""
        text = self.get_input()
        if not text:
            self.show_error("错误", "请输入 JSON 内容")
            return
        
        obj, error = self.parse_json(text)
        if error:
            self.show_error("JSON 格式错误", error)
            return
        
        # 递归排序
        sorted_obj = self._sort_object(obj)
        sorted_str = json.dumps(sorted_obj, ensure_ascii=False, indent=2)
        self.set_output(sorted_str)
        self.status_label.config(text="排序成功 ✓")
    
    def _sort_object(self, obj):
        """递归排序对象"""
        if isinstance(obj, dict):
            return {k: self._sort_object(v) for k, v in sorted(obj.items())}
        elif isinstance(obj, list):
            return [self._sort_object(item) for item in obj]
        else:
            return obj
    
    def json_to_xml(self):
        """JSON 转 XML"""
        if not HAS_XMLTODICT:
            self.show_error("缺少依赖", "请先安装 xmltodict:\npip install xmltodict")
            return
        
        text = self.get_input()
        if not text:
            self.show_error("错误", "请输入 JSON 内容")
            return
        
        obj, error = self.parse_json(text)
        if error:
            self.show_error("JSON 格式错误", error)
            return
        
        try:
            xml_dict = {'root': obj}
            xml_str = xmltodict.unparse(xml_dict, pretty=True, encoding='utf-8')
            self.set_output(xml_str)
            self.status_label.config(text="转换为 XML 成功 ✓")
        except Exception as e:
            self.show_error("转换错误", str(e))
    
    def json_to_yaml(self):
        """JSON 转 YAML"""
        if not HAS_YAML:
            self.show_error("缺少依赖", "请先安装 pyyaml:\npip install pyyaml")
            return
        
        text = self.get_input()
        if not text:
            self.show_error("错误", "请输入 JSON 内容")
            return
        
        obj, error = self.parse_json(text)
        if error:
            self.show_error("JSON 格式错误", error)
            return
        
        try:
            yaml_str = yaml.dump(obj, allow_unicode=True, default_flow_style=False)
            self.set_output(yaml_str)
            self.status_label.config(text="转换为 YAML 成功 ✓")
        except Exception as e:
            self.show_error("转换错误", str(e))
    
    def json_to_csv(self):
        """JSON 转 CSV"""
        text = self.get_input()
        if not text:
            self.show_error("错误", "请输入 JSON 内容")
            return
        
        obj, error = self.parse_json(text)
        if error:
            self.show_error("JSON 格式错误", error)
            return
        
        # 只处理数组形式
        if not isinstance(obj, list):
            self.show_error("错误", "JSON 必须是数组格式才能转换为 CSV")
            return
        
        if not obj:
            self.set_output("数组为空")
            return
        
        # 获取所有键
        all_keys = set()
        for item in obj:
            if isinstance(item, dict):
                all_keys.update(item.keys())
        
        if not all_keys:
            self.show_error("错误", "数组元素必须是对象才能转换为 CSV")
            return
        
        # 生成 CSV
        import csv
        import io
        
        output = io.StringIO()
        writer = csv.DictWriter(output, fieldnames=sorted(all_keys))
        writer.writeheader()
        
        for item in obj:
            if isinstance(item, dict):
                writer.writerow(item)
        
        self.set_output(output.getvalue())
        self.status_label.config(text="转换为 CSV 成功 ✓")
    
    # ===== 文件操作 =====
    
    def open_file(self):
        """打开文件"""
        filepath = filedialog.askopenfilename(
            title="打开 JSON 文件",
            filetypes=[
                ("JSON 文件", "*.json"),
                ("所有文件", "*.*")
            ]
        )
        
        if filepath:
            try:
                with open(filepath, 'r', encoding='utf-8') as f:
                    content = f.read()
                self.input_text.delete('1.0', tk.END)
                self.input_text.insert('1.0', content)
                self.current_file = filepath
                self.is_modified = False
                self.status_label.config(text=f"已打开: {os.path.basename(filepath)}")
            except Exception as e:
                self.show_error("打开文件失败", str(e))
    
    def save_file(self):
        """保存文件"""
        # 获取输出内容
        output = self.output_text.get('1.0', tk.END).strip()
        if not output:
            self.show_error("错误", "没有可保存的内容")
            return
        
        filepath = filedialog.asksaveasfilename(
            title="保存文件",
            defaultextension=".json",
            filetypes=[
                ("JSON 文件", "*.json"),
                ("XML 文件", "*.xml"),
                ("YAML 文件", "*.yaml"),
                ("CSV 文件", "*.csv"),
                ("所有文件", "*.*")
            ]
        )
        
        if filepath:
            try:
                with open(filepath, 'w', encoding='utf-8') as f:
                    f.write(output)
                self.status_label.config(text=f"已保存: {os.path.basename(filepath)}")
            except Exception as e:
                self.show_error("保存文件失败", str(e))
    
    # ===== 编辑操作 =====
    
    def clear_all(self):
        """清空所有"""
        self.input_text.delete('1.0', tk.END)
        self.output_text.config(state=tk.NORMAL)
        self.output_text.delete('1.0', tk.END)
        self.output_text.config(state=tk.DISABLED)
        self.status_label.config(text="已清空")
    
    def copy_input(self):
        """复制输入框内容"""
        text = self.get_input()
        if text:
            self.root.clipboard_clear()
            self.root.clipboard_append(text)
            self.status_label.config(text="已复制到剪贴板 ✓")
    
    def copy_output(self):
        """复制输出框内容"""
        text = self.output_text.get('1.0', tk.END).strip()
        if text:
            self.root.clipboard_clear()
            self.root.clipboard_append(text)
            self.status_label.config(text="已复制到剪贴板 ✓")
    
    def paste_and_format(self):
        """粘贴并尝试格式化"""
        # 先执行默认粘贴
        return
    
    def select_all(self):
        """全选"""
        self.input_text.tag_add(tk.SEL, '1.0', tk.END)
        self.input_text.mark_set(tk.INSERT, '1.0')
        self.input_text.see(tk.INSERT)
        return 'break'


def main():
    """主函数"""
    root = tk.Tk()
    
    # 设置 DPI 缩放（Windows）
    try:
        from ctypes import windll
        windll.shcore.SetProcessDpiAwareness(1)
    except:
        pass
    
    app = JSONToolApp(root)
    root.mainloop()


if __name__ == '__main__':
    main()
