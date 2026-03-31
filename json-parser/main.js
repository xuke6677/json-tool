const { app, BrowserWindow, ipcMain, clipboard, Menu } = require('electron');
const path = require('path');

// 设置缓存目录到用户目录
app.setPath('userData', path.join(process.env.APPDATA || process.env.HOME, 'json-parser-data'));

function createWindow() {
  const mainWindow = new BrowserWindow({
    width: 1400,
    height: 900,
    minWidth: 1000,
    minHeight: 700,
    webPreferences: {
      nodeIntegration: true,
      contextIsolation: false
    },
    title: 'JSON格式化工具',
    backgroundColor: '#ffffff',
    show: false
  });

  mainWindow.once('ready-to-show', () => {
    mainWindow.maximize();
    mainWindow.show();
  });

  // 创建菜单
  const menuTemplate = [
    {
      label: '文件',
      submenu: [
        { role: 'quit', label: '退出' }
      ]
    },
    {
      label: '编辑',
      submenu: [
        { role: 'undo', label: '撤销' },
        { role: 'redo', label: '重做' },
        { type: 'separator' },
        { role: 'cut', label: '剪切' },
        { role: 'copy', label: '复制' },
        { role: 'paste', label: '粘贴' },
        { role: 'selectAll', label: '全选' }
      ]
    },
    {
      label: '视图',
      submenu: [
        { role: 'reload', label: '刷新' },
        { role: 'toggleDevTools', label: '开发者工具' },
        { type: 'separator' },
        { role: 'zoomIn', label: '放大' },
        { role: 'zoomOut', label: '缩小' },
        { role: 'resetZoom', label: '重置缩放' },
        { type: 'separator' },
        { role: 'togglefullscreen', label: '全屏' }
      ]
    },
    {
      label: '窗口',
      submenu: [
        { role: 'minimize', label: '最小化' },
        { role: 'close', label: '关闭' }
      ]
    },
    {
      label: '帮助',
      submenu: [
        {
          label: '关于',
          click: () => {
            const aboutWin = new BrowserWindow({
              width: 520, height: 420, parent: mainWindow, modal: true,
              resizable: false, minimizable: false, maximizable: false,
              webPreferences: { nodeIntegration: true, contextIsolation: false }
            });
            aboutWin.setMenu(null);
            aboutWin.loadURL('data:text/html;charset=utf-8,' + encodeURIComponent(`<!DOCTYPE html><html><head><meta charset="utf-8">
<style>body{font-family:"Microsoft YaHei",sans-serif;margin:0;padding:30px 40px;text-align:center;background:#fff;color:#333;}
h2{font-size:20px;margin-bottom:20px;}p{font-size:15px;line-height:1.8;color:#555;margin:10px 0;}
.email{color:#1890ff;}.btn{display:inline-block;margin-top:24px;padding:10px 40px;background:#1890ff;color:#fff;border:none;border-radius:6px;font-size:16px;cursor:pointer;}
.btn:hover{background:#40a9ff;}</style></head><body>
<h2>序言：与代码的温柔对话</h2>
<p>数据本是冰冷的符号，却因结构而有了生命。<br>愿作您与数据之间的诗人，将杂乱的字符谱成清丽的诗行。<br>我们不止解析格式，更诠释秩序之美；不止验证语法，更守护逻辑的纯粹。</p>
<p>遇到问题或建议请发送到作者邮箱<br><span class="email">xuke6677@qq.com</span></p>
<button class="btn" onclick="window.close()">关闭</button>
</body></html>`));
          }
        },
        {
          label: '功能使用说明',
          click: () => {
            const helpWin = new BrowserWindow({
              width: 700, height: 560, parent: mainWindow, modal: true,
              resizable: true, minimizable: false, maximizable: false,
              webPreferences: { nodeIntegration: true, contextIsolation: false }
            });
            helpWin.setMenu(null);
            helpWin.loadURL('data:text/html;charset=utf-8,' + encodeURIComponent(`<!DOCTYPE html><html><head><meta charset="utf-8">
<style>body{font-family:"Microsoft YaHei",sans-serif;margin:0;padding:30px 40px;background:#fff;color:#333;line-height:1.8;}
h2{font-size:20px;border-bottom:2px solid #333;padding-bottom:8px;margin-bottom:20px;}
p{font-size:14px;margin:12px 0;}ul{margin:12px 0 12px 20px;}li{margin:4px 0;}
code{background:#f5f5f5;padding:2px 6px;border-radius:3px;font-family:Consolas,monospace;font-size:13px;}
.qa{background:#4facfe;color:#fff;border-radius:6px;padding:16px 20px;margin-top:20px;}
.qa p{margin:6px 0;color:#fff;}.qa code{background:rgba(255,255,255,0.25);color:#fff;}
</style></head><body>
<h2>功能使用说明</h2>
<p>JSON是一种取代XML的数据结构，与xml相比，它更小巧，但描述能力却不差。JSON就是一串字符串，只不过元素会使用特定的符号标注：</p>
<ul>
<li><code>{}</code> 双括号表示对象；</li>
<li><code>[]</code> 中括号表示数组；</li>
<li><code>""</code> 双引号内是属性或值；</li>
<li><code>:</code> 冒号表示后者是前者的值(这个值可以是字符串、数字、也可以是另一个数组或对象)</li>
</ul>
<p>所以 <code>{"name": "Tom"}</code> 可以理解为是一个包含name为Tom的对象，而 <code>[{"name": "Tom"}, {"name": "Jerry"}]</code> 就表示包含两个对象的数组。</p>
<div class="qa">
<p><strong>问：</strong>为什么 <code>{name:'json'}</code> 在检验时通过不了？</p>
<p><strong>答：</strong>JSON官网规范规定，如果是字符串，那不管是键或值最好都用双引号引起来，所以上面的代码就是 <code>{"name":"json"}</code>。</p>
</div>
</body></html>`));
          }
        }
      ]
    }
  ];

  const menu = Menu.buildFromTemplate(menuTemplate);
  Menu.setApplicationMenu(menu);

  mainWindow.loadFile('index.html');
}

app.whenReady().then(() => {
  createWindow();

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    }
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

// 处理复制到剪贴板
ipcMain.handle('copy-to-clipboard', (event, text) => {
  clipboard.writeText(text);
  return true;
});

// 从剪贴板获取
ipcMain.handle('get-from-clipboard', () => {
  return clipboard.readText();
});
