// JSON格式化工具 - 渲染进程脚本（虚拟滚动版）
// DOM元素
const jsonInput = document.getElementById('json-input');
const jsonOutput = document.getElementById('json-output');
const charCountEl = document.getElementById('char-count');
const lineCountEl = document.getElementById('line-count');
const sizeCountEl = document.getElementById('size-count');
const lineNumbersInput = document.getElementById('line-numbers-input');
const lineNumbersOutput = document.getElementById('line-numbers-output');
const btnFormat = document.getElementById('btn-format');
const btnCompress = document.getElementById('btn-compress');
const btnValidate = document.getElementById('btn-validate');
const btnCopy = document.getElementById('btn-copy');
const btnClear = document.getElementById('btn-clear');
const btnCopyResult = document.getElementById('btn-copy-result');
const btnCollapseAll = document.getElementById('btn-collapse-all');
const btnExpandAll = document.getElementById('btn-expand-all');
const btnToJavaBean = document.getElementById('btn-to-javabean');
const btnUnescape = document.getElementById('btn-unescape');
const btnEscape = document.getElementById('btn-escape');
const searchInput = document.getElementById('search-keyword');
const btnSearch = document.getElementById('btn-search');
const btnSearchPrev = document.getElementById('btn-search-prev');
const btnSearchNext = document.getElementById('btn-search-next');
const searchCountEl = document.getElementById('search-count');
const timestampTooltip = document.getElementById('timestamp-tooltip');
let searchMatches = [], currentMatchIndex = -1, searchKeyword = '';
let leftSearchMatches = [], leftCurrentIndex = -1, leftSearchKeyword = '';
let currentParsedData = null;
let currentOutputText = null; // 右侧当前显示的纯文本（用于复制）
// 虚拟滚动
const LINE_HEIGHT = 22.4;
const BUFFER_LINES = 15;
let allLines = [];
let visibleLineIndices = [];
const foldState = new Map();
let vsContainer, vsSpacer, vsContent;
let lastRenderedRange = { start: -1, end: -1 };

// 工具函数
function debounce(fn, w) { let t; return (...a) => { clearTimeout(t); t = setTimeout(() => fn(...a), w); }; }
const debouncedHandleInput = debounce(handleInputImpl, 300);
function escapeHtml(t) { return typeof t !== 'string' ? String(t) : t.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;'); }
function formatBytes(b) { if(!b) return '0 B'; const k=1024,s=['B','KB','MB','GB'],i=Math.floor(Math.log(b)/Math.log(k)); return parseFloat((b/Math.pow(k,i)).toFixed(2))+' '+s[i]; }
function escapeRegExp(s) { return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'); }
function parsePath(p) {
  const r=[]; let c='';
  for(let i=0;i<p.length;i++){const ch=p[i]; if(ch==='.'){if(c){r.push(c);c='';}} else if(ch==='['){if(c){r.push(c);c='';}} else if(ch===']'){if(c){r.push(parseInt(c));c='';}} else c+=ch;}
  if(c) r.push(c); return r;
}
function getValueByPath(o,p) { if(!p) return o; let c=o; for(const k of parsePath(p)) c=c[k]; return c; }
function setValueByPath(o,p,v) { if(!p) return; const ps=parsePath(p); let c=o; for(let i=0;i<ps.length-1;i++) c=c[ps[i]]; c[ps[ps.length-1]]=v; }
function renameKeyInData(path, oldKey, newKey) {
  const parts = parsePath(path); let parent = currentParsedData;
  for (let i = 0; i < parts.length - 1; i++) parent = parent[parts[i]];
  const newObj = {}; for (const k of Object.keys(parent)) { newObj[k === oldKey ? newKey : k] = parent[k]; }
  if (newObj[newKey] === undefined) { newObj[newKey] = parent[oldKey]; }
  if (parts.length <= 1) { for (const k of Object.keys(currentParsedData)) delete currentParsedData[k]; Object.assign(currentParsedData, newObj); }
  else { let gp = currentParsedData; for (let i=0;i<parts.length-2;i++) gp=gp[parts[i]]; gp[parts[parts.length-2]]=newObj; }
  syncDataToInput();
}

// 初始化
function initApp() { initVirtualScroll(); initEventListeners(); updateStatusBar(); handleInputImpl(); }
if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', initApp); else initApp();

function initVirtualScroll() {
  vsContainer = jsonOutput;
  vsContainer.innerHTML = '';
  vsSpacer = document.createElement('div');
  vsSpacer.className = 'vs-spacer';
  vsContainer.appendChild(vsSpacer);
  vsContent = document.createElement('div');
  vsContent.className = 'vs-content';
  vsContainer.appendChild(vsContent);
  vsContainer.addEventListener('scroll', onVirtualScroll);
  // 事件委托：折叠、编辑、时间戳
  vsContent.addEventListener('click', onOutputClick);
  vsContainer.addEventListener('mouseover', onOutputMouseOver);
  vsContainer.addEventListener('mouseout', onOutputMouseOut);
}

function onVirtualScroll() {
  renderVisibleLines();
  renderVisibleLineNumbers();
}

function initEventListeners() {
  jsonInput.addEventListener('input', debouncedHandleInput);
  jsonInput.addEventListener('scroll', function() { lineNumbersInput.scrollTop = jsonInput.scrollTop; });
  jsonInput.addEventListener('keydown', handleTab);
  btnFormat.addEventListener('click', formatJSON);
  btnCompress.addEventListener('click', compressJSON);
  btnValidate.addEventListener('click', validateJSON);
  btnCopy.addEventListener('click', copyInput);
  btnClear.addEventListener('click', clearInput);
  btnCopyResult.addEventListener('click', copyResult);
  btnCollapseAll.addEventListener('click', () => toggleAllFolds(true));
  btnExpandAll.addEventListener('click', () => toggleAllFolds(false));
  btnToJavaBean.addEventListener('click', toJavaBean);
  btnUnescape.addEventListener('click', unescapeJSON);
  btnEscape.addEventListener('click', escapeJSON);
  const sil = document.getElementById('search-keyword-left');
  document.getElementById('btn-search-left').addEventListener('click', doSearchLeft);
  document.getElementById('btn-search-prev-left').addEventListener('click', prevMatchLeft);
  document.getElementById('btn-search-next-left').addEventListener('click', nextMatchLeft);
  document.getElementById('btn-search-clear-left').addEventListener('click', clearLeftSearch);
  sil.addEventListener('keydown', e => { if(e.key==='Enter'){leftSearchMatches.length>0?nextMatchLeft():doSearchLeft();} });
  sil.addEventListener('input', function() { if(!this.value.trim()) clearLeftSearch(); });
  btnSearch.addEventListener('click', doSearch);
  btnSearchPrev.addEventListener('click', prevMatch);
  btnSearchNext.addEventListener('click', nextMatch);
  document.getElementById('btn-search-clear').addEventListener('click', clearRightSearch);
  searchInput.addEventListener('keydown', e => { if(e.key==='Enter'){searchMatches.length>0?nextMatch():doSearch();} });
  searchInput.addEventListener('input', function() { if(!this.value.trim()) clearRightSearch(); });
}

// ====================
// JSON -> 扁平行数据
// ====================
// 每行: { html, depth, foldId?, foldType?, foldChildStart?, foldChildEnd?, foldLabel?, path?, text }
// foldType: 'open' = 开始行(可折叠), 'close' = 结束括号行
// foldChildStart/End: 折叠时隐藏的行范围 [start, end)

let _foldIdCounter = 0;
function flattenJSON(value) {
  allLines = [];
  foldState.clear();
  currentOutputText = null; // 恢复为JSON模式
  _foldIdCounter = 0;
  searchMatches = [];
  currentMatchIndex = -1;
  searchKeyword = '';
  flattenValue(value, 0, null, true, '');
  rebuildVisibleLines();
}

function flattenValue(value, depth, key, isLast, path) {
  const indent = '  '.repeat(depth);
  const keyHtml = key !== null ? `<span class="json-key editable-key" data-path="${escapeHtml(path)}" data-key="${escapeHtml(key)}">"${escapeHtml(key)}"</span><span class="json-colon">: </span>` : '';
  const comma = isLast ? '' : '<span class="json-comma">,</span>';

  if (value === null) {
    allLines.push({ html: indent + keyHtml + `<span class="json-null editable-value" data-path="${escapeHtml(path)}" data-type="null">null</span>` + comma, depth, path, text: (key ? key+': ' : '') + 'null' });
    return;
  }
  const t = typeof value;
  if (t === 'boolean' || t === 'number') {
    const cls = t === 'boolean' ? 'json-boolean' : 'json-number';
    allLines.push({ html: indent + keyHtml + `<span class="${cls} editable-value" data-path="${escapeHtml(path)}" data-type="${t}">${value}</span>` + comma, depth, path, text: (key ? key+': ' : '') + String(value) });
    return;
  }
  if (t === 'string') {
    allLines.push({ html: indent + keyHtml + `<span class="json-string editable-value" data-path="${escapeHtml(path)}" data-type="string">"${escapeHtml(value)}"</span>` + comma, depth, path, text: (key ? key+': ' : '') + '"'+value+'"' });
    return;
  }

  const isArr = Array.isArray(value);
  const entries = isArr ? value : Object.keys(value);
  const openBracket = isArr ? '[' : '{';
  const closeBracket = isArr ? ']' : '}';
  const label = isArr ? `Array[${entries.length}]` : `Object{${entries.length}}`;

  if (entries.length === 0) {
    allLines.push({ html: indent + keyHtml + `<span class="json-bracket">${openBracket}${closeBracket}</span>` + comma, depth, path, text: (key ? key+': ' : '') + openBracket+closeBracket });
    return;
  }

  const foldId = 'f' + (_foldIdCounter++);
  const openLineIdx = allLines.length;
  // 开始行
  allLines.push({
    html: indent + keyHtml + `<span class="fold-trigger" data-fold-id="${foldId}"><span class="fold-icon expanded">▶</span><span class="fold-label" style="display:none">${label}</span></span><span class="json-bracket">${openBracket}</span>`,
    depth, foldId, foldType: 'open', foldLabel: label, path,
    text: (key ? key+': ' : '') + openBracket
  });

  // 子元素
  const childStart = allLines.length;
  if (isArr) {
    for (let i = 0; i < value.length; i++) {
      const ip = path ? `${path}[${i}]` : `[${i}]`;
      flattenValue(value[i], depth + 1, null, i === value.length - 1, ip);
    }
  } else {
    for (let i = 0; i < entries.length; i++) {
      const k = entries[i];
      const pp = path ? `${path}.${k}` : k;
      flattenValue(value[k], depth + 1, k, i === entries.length - 1, pp);
    }
  }
  const childEnd = allLines.length;

  // 关闭行
  allLines.push({
    html: indent + `<span class="json-bracket">${closeBracket}</span>` + comma,
    depth, foldType: 'close', path, text: closeBracket
  });

  // 记录折叠范围到开始行
  allLines[openLineIdx].foldChildStart = childStart;
  allLines[openLineIdx].foldChildEnd = childEnd; // childEnd 是关闭行的索引
  foldState.set(foldId, false); // 默认展开
}

// 根据折叠状态重建可见行索引
function rebuildVisibleLines() {
  visibleLineIndices = [];
  const skipUntil = []; // 栈：跳过到哪个行索引
  for (let i = 0; i < allLines.length; i++) {
    // 检查是否在被折叠的范围内
    while (skipUntil.length > 0 && i >= skipUntil[skipUntil.length - 1]) skipUntil.pop();
    if (skipUntil.length > 0 && i < skipUntil[skipUntil.length - 1]) continue;

    const line = allLines[i];
    if (line.foldType === 'open' && line.foldId && foldState.get(line.foldId)) {
      // 折叠：跳过子内容和关闭括号行（关闭括号合并到开始行显示）
      visibleLineIndices.push(i);
      skipUntil.push(line.foldChildEnd + 1); // +1 跳过关闭括号行
    } else {
      visibleLineIndices.push(i);
    }
  }
  updateVirtualScroll();
}

function updateVirtualScroll() {
  const totalHeight = visibleLineIndices.length * LINE_HEIGHT;
  vsSpacer.style.height = totalHeight + 'px';
  lastRenderedRange = { start: -1, end: -1 };
  renderVisibleLines();
  updateOutputLineNumbers();
}

// 渲染可视区域的行
function renderVisibleLines() {
  if (visibleLineIndices.length === 0) { vsContent.innerHTML = ''; return; }
  const scrollTop = vsContainer.scrollTop;
  const viewHeight = vsContainer.clientHeight;
  const startIdx = Math.max(0, Math.floor(scrollTop / LINE_HEIGHT) - BUFFER_LINES);
  const endIdx = Math.min(visibleLineIndices.length, Math.ceil((scrollTop + viewHeight) / LINE_HEIGHT) + BUFFER_LINES);

  if (startIdx === lastRenderedRange.start && endIdx === lastRenderedRange.end) return;
  lastRenderedRange = { start: startIdx, end: endIdx };

  const parts = [];
  for (let i = startIdx; i < endIdx; i++) {
    const lineIdx = visibleLineIndices[i];
    const line = allLines[lineIdx];
    let html = line.html;

    // 折叠状态：替换图标和标签显示，合并关闭括号
    if (line.foldType === 'open' && line.foldId) {
      const collapsed = foldState.get(line.foldId);
      if (collapsed) {
        // 移除expanded类显示▶朝右，显示标签，追加关闭括号
        html = html.replace('fold-icon expanded', 'fold-icon').replace('style="display:none"', 'style="display:inline"');
        // 获取关闭括号行的内容（去掉缩进，只取括号和逗号）
        const closeLine = allLines[line.foldChildEnd];
        if (closeLine) {
          const closeHtml = closeLine.html.trim();
          html += ' <span class="json-collapsed-dots">...</span> ' + closeHtml;
        }
      }
    }

    // 搜索高亮
    if (searchKeyword && line.text) {
      const re = new RegExp(escapeRegExp(searchKeyword), 'gi');
      if (re.test(line.text)) {
        html = highlightHtmlText(html, searchKeyword);
      }
    }
    parts.push(`<div class="vs-line" data-vi="${i}" data-li="${lineIdx}" style="top:${i * LINE_HEIGHT}px">${html}</div>`);
  }
  vsContent.innerHTML = parts.join('');
}

// 在HTML字符串中高亮纯文本（不破坏标签）
function highlightHtmlText(html, keyword) {
  const esc = escapeRegExp(escapeHtml(keyword));
  const re = new RegExp('(' + esc + ')', 'gi');
  // 分割为标签和文本
  let result = '', inTag = false, textBuf = '';
  for (let i = 0; i < html.length; i++) {
    if (html[i] === '<') { result += textBuf.replace(re, '<mark class="sh">$1</mark>'); textBuf = ''; inTag = true; result += '<'; }
    else if (html[i] === '>' && inTag) { inTag = false; result += '>'; }
    else if (inTag) { result += html[i]; }
    else { textBuf += html[i]; }
  }
  result += textBuf.replace(re, '<mark class="sh">$1</mark>');
  return result;
}

// 行号 - 虚拟渲染，和内容同步
function updateOutputLineNumbers() {
  // 初始化行号容器为虚拟滚动结构
  lineNumbersOutput.innerHTML = '';
  lineNumbersOutput.style.position = 'relative';
  lineNumbersOutput.style.overflow = 'hidden';

  const spacer = document.createElement('div');
  spacer.className = 'ln-spacer';
  spacer.style.height = (visibleLineIndices.length * LINE_HEIGHT) + 'px';
  lineNumbersOutput.appendChild(spacer);

  const content = document.createElement('div');
  content.className = 'ln-content';
  content.style.position = 'absolute';
  content.style.top = '0';
  content.style.left = '0';
  content.style.right = '0';
  lineNumbersOutput.appendChild(content);

  renderVisibleLineNumbers();
}

let _lastLnRange = { start: -1, end: -1 };
function renderVisibleLineNumbers() {
  const lnContent = lineNumbersOutput.querySelector('.ln-content');
  if (!lnContent || visibleLineIndices.length === 0) return;

  const scrollTop = vsContainer.scrollTop;
  const viewHeight = vsContainer.clientHeight;
  const startIdx = Math.max(0, Math.floor(scrollTop / LINE_HEIGHT) - BUFFER_LINES);
  const endIdx = Math.min(visibleLineIndices.length, Math.ceil((scrollTop + viewHeight) / LINE_HEIGHT) + BUFFER_LINES);

  if (startIdx === _lastLnRange.start && endIdx === _lastLnRange.end) return;
  _lastLnRange = { start: startIdx, end: endIdx };

  // 同步行号容器的滚动偏移（用transform模拟）
  lineNumbersOutput.scrollTop = scrollTop;

  const parts = [];
  for (let i = startIdx; i < endIdx; i++) {
    const lineNum = visibleLineIndices[i] + 1;
    parts.push(`<div class="ln-line" style="position:absolute;top:${i * LINE_HEIGHT}px;height:${LINE_HEIGHT}px;line-height:${LINE_HEIGHT}px;right:8px;text-align:right">${lineNum}</div>`);
  }
  lnContent.innerHTML = parts.join('');
}

function updateInputLineNumbers() {
  const lines = jsonInput.value.split('\n').length;
  const nums = [];
  for (let i = 1; i <= lines; i++) nums.push(i);
  lineNumbersInput.textContent = nums.join('\n');
}

// ====================
// 折叠
// ====================
function toggleFoldById(foldId) {
  const current = foldState.get(foldId);
  foldState.set(foldId, !current);
  rebuildVisibleLines();
}

function toggleAllFolds(collapse) {
  for (const [id] of foldState) foldState.set(id, collapse);
  rebuildVisibleLines();
}

// ====================
// 事件委托处理
// ====================
function onOutputClick(e) {
  // 折叠
  const trigger = e.target.closest('.fold-trigger');
  if (trigger) {
    e.stopPropagation();
    const foldId = trigger.dataset.foldId;
    if (foldId) toggleFoldById(foldId);
    return;
  }
  // 编辑key
  if (e.target.classList.contains('editable-key')) {
    e.stopPropagation();
    const el = e.target, oldKey = el.dataset.key, path = el.dataset.path;
    startInlineEdit(el, oldKey, function(nv) { if(nv && nv !== oldKey) { renameKeyInData(path, oldKey, nv); } });
    return;
  }
  // 编辑value
  if (e.target.classList.contains('editable-value')) {
    e.stopPropagation();
    const el = e.target, path = el.dataset.path, type = el.dataset.type;
    const cv = getValueByPath(currentParsedData, path);
    const dv = type === 'string' ? cv : JSON.stringify(cv);
    startInlineEdit(el, dv, function(nv) {
      if (nv !== null && nv !== undefined) { setValueByPath(currentParsedData, path, parseInputValue(nv, type)); syncDataToInput(); }
    });
    return;
  }
}

function onOutputMouseOver(e) {
  const el = e.target;
  if (el.classList.contains('json-number') || el.classList.contains('json-string')) {
    const text = el.textContent.replace(/"/g, '').trim();
    const num = Number(text);
    if (!isNaN(num) && num > 1e12 && num < 1e13) {
      const d = new Date(num), pad = n => String(n).padStart(2,'0');
      timestampTooltip.textContent = `${d.getFullYear()}-${pad(d.getMonth()+1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`;
      timestampTooltip.style.display = 'block';
      const r = el.getBoundingClientRect();
      timestampTooltip.style.left = r.left + 'px';
      timestampTooltip.style.top = (r.top - 30) + 'px';
    }
  }
}
function onOutputMouseOut(e) {
  if (e.target.classList.contains('json-number') || e.target.classList.contains('json-string'))
    timestampTooltip.style.display = 'none';
}

// 内联编辑
function startInlineEdit(el, currentValue, onConfirm) {
  if (el.querySelector('input')) return;
  const originalHtml = el.innerHTML;
  const measure = document.createElement('span');
  measure.style.cssText = 'position:absolute;visibility:hidden;white-space:pre;font:inherit;padding:1px 4px;';
  document.body.appendChild(measure);
  function calcW(t) { measure.textContent = t || ' '; return Math.max(measure.offsetWidth + 8, 32); }
  const input = document.createElement('input');
  input.type = 'text'; input.value = currentValue; input.className = 'inline-edit-input';
  input.style.width = calcW(currentValue) + 'px';
  el.innerHTML = ''; el.appendChild(input); input.focus(); input.select();
  input.addEventListener('input', () => { input.style.width = calcW(input.value) + 'px'; });
  let done = false;
  function finish(ok) {
    if (done) return; done = true; measure.remove();
    const v = input.value; el.innerHTML = originalHtml;
    if (ok && v !== currentValue) onConfirm(v);
  }
  input.addEventListener('keydown', e => { if(e.key==='Enter'){e.preventDefault();finish(true);} if(e.key==='Escape'){e.preventDefault();finish(false);} e.stopPropagation(); });
  input.addEventListener('blur', () => finish(true));
  input.addEventListener('click', e => e.stopPropagation());
}

function parseInputValue(input) {
  if (input === 'null') return null;
  if (input === 'true') return true;
  if (input === 'false') return false;
  const n = Number(input);
  if (!isNaN(n) && input.trim() !== '') return n;
  return input;
}

function syncDataToInput() {
  jsonInput.value = JSON.stringify(currentParsedData, null, 2);
  handleInputImpl();
  showToast('已更新');
}

// ====================
// 输入处理
// ====================
function handleInputImpl() {
  searchMatches = []; currentMatchIndex = -1; searchKeyword = '';
  updateSearchCount();
  const text = jsonInput.value;
  if (text.trim()) {
    try {
      currentParsedData = JSON.parse(text);
      flattenJSON(currentParsedData);
    } catch (e) {
      currentParsedData = null;
      const ei = parseJsonError(e, text);
      showErrorInOutput(ei);
    }
  } else {
    currentParsedData = null;
    allLines = []; visibleLineIndices = [];
    vsSpacer.style.height = '0'; vsContent.innerHTML = '';
    lineNumbersOutput.textContent = '';
  }
  updateStatusBar();
  updateInputLineNumbers();
}

function updateStatusBar() {
  const t = jsonInput.value;
  charCountEl.textContent = t.length;
  lineCountEl.textContent = t ? t.split('\n').length : 0;
  sizeCountEl.textContent = formatBytes(new TextEncoder().encode(t).length);
}

function parseJsonError(error, text) {
  const msg = error.message; let ln = 1, col = 1;
  const pm = msg.match(/position\s*(\d+)/i);
  if (pm) { const pos = parseInt(pm[1],10), before = text.substring(0,pos); ln = (before.match(/\n/g)||[]).length+1; col = pos - before.lastIndexOf('\n'); }
  const lm = msg.match(/line\s*(\d+)/i); if (lm) ln = parseInt(lm[1],10);
  return { message: msg, line: ln, column: col, fullMessage: `${msg} (行 ${ln}, 列 ${col})` };
}

function showErrorInOutput(ei) {
  vsContent.innerHTML = `<div class="error-message"><div>${escapeHtml(ei.fullMessage)}</div><div class="error-line">请检查第 ${ei.line} 行的内容</div></div>`;
  vsSpacer.style.height = '0';
  lineNumbersOutput.textContent = '1';
}

// ====================
// 功能按钮
// ====================
function formatJSON() {
  const t = jsonInput.value.trim(); if(!t){showToast('请先输入JSON数据','warning');return;}
  try { jsonInput.value = JSON.stringify(JSON.parse(t),null,2); handleInputImpl(); showToast('格式化成功'); }
  catch(e) { showErrorInOutput(parseJsonError(e,t)); showToast('JSON格式无效','error'); }
}
function compressJSON() {
  const t = jsonInput.value.trim(); if(!t){showToast('请先输入JSON数据','warning');return;}
  try { jsonInput.value = JSON.stringify(JSON.parse(t)); handleInputImpl(); showToast('压缩成功'); }
  catch(e) { showErrorInOutput(parseJsonError(e,t)); showToast('JSON格式无效','error'); }
}
function validateJSON() {
  const t = jsonInput.value.trim(); if(!t){showToast('请先输入JSON数据','warning');return;}
  try { JSON.parse(t); showToast('校验成功'); }
  catch(e) { showErrorInOutput(parseJsonError(e,t)); showToast('JSON校验失败','error'); }
}
async function copyInput() {
  const t = jsonInput.value.trim(); if(!t){showToast('没有可复制的内容','warning');return;}
  try{await navigator.clipboard.writeText(t);showToast('复制成功');}catch(e){showToast('复制失败','error');}
}
async function copyResult() {
  // 优先复制右侧当前显示内容（Java Bean等），否则复制格式化JSON
  const text = currentOutputText || (currentParsedData ? JSON.stringify(currentParsedData, null, 2) : '');
  if(!text){showToast('没有可复制的内容','warning');return;}
  try{await navigator.clipboard.writeText(text);showToast('复制成功');}catch(e){showToast('复制失败','error');}
}
function clearInput() { jsonInput.value=''; handleInputImpl(); showToast('已清空'); }

function escapeJSON() {
  const t = jsonInput.value.trim(); if(!t){showToast('请先输入JSON数据','warning');return;}
  try{jsonInput.value=JSON.stringify(t);handleInputImpl();showToast('转义成功');}catch(e){showToast('转义失败','error');}
}
function unescapeJSON() {
  const t = jsonInput.value.trim(); if(!t){showToast('请先输入JSON数据','warning');return;}
  try{const p=JSON.parse(t);if(typeof p==='string'){jsonInput.value=p;handleInputImpl();showToast('去除转义成功');}else showToast('不是字符串类型','warning');}
  catch(e){showToast('去除转义失败','error');}
}
function handleTab(e) {
  if(e.key==='Tab'){e.preventDefault();const s=jsonInput.selectionStart,d=jsonInput.selectionEnd;
  jsonInput.value=jsonInput.value.substring(0,s)+'  '+jsonInput.value.substring(d);
  jsonInput.selectionStart=jsonInput.selectionEnd=s+2;handleInputImpl();}
}
function showToast(msg, type='success') {
  const ex = document.querySelector('.copy-toast'); if(ex) ex.remove();
  const t = document.createElement('div'); t.className='copy-toast'; t.textContent=msg;
  t.style.backgroundColor = type==='error'?'#f5222d':type==='warning'?'#fa8c16':'#52c41a';
  document.body.appendChild(t); setTimeout(()=>t.remove(),2000);
}

// ====================
// 右侧搜索
// ====================
function clearRightSearch() {
  searchInput.value=''; searchKeyword=''; searchMatches=[]; currentMatchIndex=-1;
  updateSearchCount(); lastRenderedRange={start:-1,end:-1}; renderVisibleLines();
}
function doSearch() {
  searchKeyword = searchInput.value.trim();
  if(!searchKeyword){clearRightSearch();return;}
  searchMatches = [];
  const re = new RegExp(escapeRegExp(searchKeyword),'gi');
  for(let i=0;i<allLines.length;i++){
    const line = allLines[i]; if(!line.text) continue;
    let m; re.lastIndex=0;
    while((m=re.exec(line.text))!==null) searchMatches.push({lineIndex:i, start:m.index, end:m.index+m[0].length});
  }
  currentMatchIndex = searchMatches.length>0 ? 0 : -1;
  updateSearchCount();
  if(currentMatchIndex>=0) scrollToSearchMatch();
  lastRenderedRange={start:-1,end:-1}; renderVisibleLines();
}
function updateSearchCount() {
  if(searchCountEl) searchCountEl.textContent = searchMatches.length===0?'0/0':`${currentMatchIndex+1}/${searchMatches.length}`;
}
function prevMatch() {
  if(!searchMatches.length){doSearch();if(!searchMatches.length)return;}
  currentMatchIndex=(currentMatchIndex-1+searchMatches.length)%searchMatches.length;
  updateSearchCount(); scrollToSearchMatch(); lastRenderedRange={start:-1,end:-1}; renderVisibleLines();
}
function nextMatch() {
  if(!searchMatches.length){doSearch();if(!searchMatches.length)return;}
  currentMatchIndex=(currentMatchIndex+1)%searchMatches.length;
  updateSearchCount(); scrollToSearchMatch(); lastRenderedRange={start:-1,end:-1}; renderVisibleLines();
}

function scrollToSearchMatch() {
  if(currentMatchIndex<0) return;
  const match = searchMatches[currentMatchIndex];
  // 找到该行在可见行中的位置
  const vi = visibleLineIndices.indexOf(match.lineIndex);
  if(vi < 0) {
    // 行被折叠了，展开包含它的折叠
    expandToLine(match.lineIndex);
    const vi2 = visibleLineIndices.indexOf(match.lineIndex);
    if(vi2 >= 0) vsContainer.scrollTop = vi2 * LINE_HEIGHT - vsContainer.clientHeight / 2;
  } else {
    vsContainer.scrollTop = vi * LINE_HEIGHT - vsContainer.clientHeight / 2;
  }
}
function expandToLine(lineIdx) {
  // 找到所有包含该行的折叠节点并展开
  for(let i=0;i<allLines.length;i++){
    const line = allLines[i];
    if(line.foldType==='open' && line.foldId && line.foldChildStart<=lineIdx && line.foldChildEnd>lineIdx){
      foldState.set(line.foldId, false);
    }
  }
  rebuildVisibleLines();
}

// ====================
// 左侧搜索
// ====================
function doSearchLeft() {
  const si = document.getElementById('search-keyword-left');
  leftSearchKeyword = si.value.trim(); if(!leftSearchKeyword){clearLeftSearch();return;}
  leftSearchMatches = []; const t = jsonInput.value;
  const re = new RegExp(escapeRegExp(leftSearchKeyword),'gi'); let m;
  while((m=re.exec(t))!==null) leftSearchMatches.push({start:m.index,end:m.index+m[0].length});
  leftCurrentIndex = leftSearchMatches.length>0?0:-1;
  highlightLeftMatch(); updateLeftSearchCount();
}
function prevMatchLeft() {
  if(!leftSearchMatches.length){doSearchLeft();if(!leftSearchMatches.length)return;}
  leftCurrentIndex=(leftCurrentIndex-1+leftSearchMatches.length)%leftSearchMatches.length;
  highlightLeftMatch(); updateLeftSearchCount();
}
function nextMatchLeft() {
  if(!leftSearchMatches.length){doSearchLeft();if(!leftSearchMatches.length)return;}
  leftCurrentIndex=(leftCurrentIndex+1)%leftSearchMatches.length;
  highlightLeftMatch(); updateLeftSearchCount();
}
function clearLeftSearch() {
  const si=document.getElementById('search-keyword-left'); si.value='';
  leftSearchKeyword=''; leftSearchMatches=[]; leftCurrentIndex=-1; updateLeftSearchCount();
}
function highlightLeftMatch() {
  if(leftCurrentIndex<0||leftCurrentIndex>=leftSearchMatches.length) return;
  const m=leftSearchMatches[leftCurrentIndex]; jsonInput.focus(); jsonInput.setSelectionRange(m.start,m.end);
}
function updateLeftSearchCount() {
  const el=document.getElementById('search-count-left');
  el.textContent=leftSearchMatches.length===0?'0/0':`${leftCurrentIndex+1}/${leftSearchMatches.length}`;
}

// ====================
// 可拖动分隔条
// ====================
(function initResizer() {
  const resizer=document.getElementById('resizer'), lp=document.querySelector('.left-panel'),
    rp=document.querySelector('.right-panel'), ct=document.querySelector('.main-content');
  let isR=false;
  resizer.addEventListener('mousedown',e=>{isR=true;resizer.classList.add('active');document.body.style.cursor='col-resize';document.body.style.userSelect='none';e.preventDefault();});
  document.addEventListener('mousemove',e=>{
    if(!isR)return; const cr=ct.getBoundingClientRect(),cl=cr.left+15,cw=cr.width-30,rw=resizer.offsetWidth;
    let ox=e.clientX-cl; ox=Math.max(100,Math.min(ox,cw-rw-100));
    lp.style.flex='none'; lp.style.width=ox+'px'; rp.style.flex='none'; rp.style.width=(cw-rw-ox)+'px';
  });
  document.addEventListener('mouseup',()=>{if(!isR)return;isR=false;resizer.classList.remove('active');document.body.style.cursor='';document.body.style.userSelect='';});
})();

// ====================
// 转 Java Bean
// ====================
function toJavaBean() {
  const text = jsonInput.value.trim();
  if (!text) { showToast('请先输入JSON数据', 'warning'); return; }
  try {
    const parsed = JSON.parse(text);
    const classes = [];
    generateJavaClass(parsed, 'Root', classes);
    const imports = new Set();
    const code = classes.map(c => c.code).join('\n\n');
    if (code.includes('List<')) { imports.add('import java.util.List;'); imports.add('import java.util.ArrayList;'); }
    const result = (imports.size > 0 ? [...imports].join('\n') + '\n\n' : '') + code;
    showJavaBeanResult(result);
  } catch (e) {
    showJavaBeanError('JSON解析失败: ' + e.message);
  }
}

function generateJavaClass(obj, className, classes) {
  if (Array.isArray(obj)) {
    if (obj.length > 0 && typeof obj[0] === 'object' && obj[0] !== null) {
      generateJavaClass(obj[0], className, classes);
    }
    return;
  }
  if (typeof obj !== 'object' || obj === null) return;

  const fields = [];
  const keys = Object.keys(obj);
  for (const key of keys) {
    const val = obj[key];
    const javaType = inferJavaType(val, key, classes);
    fields.push({ name: key, type: javaType });
  }

  let code = `public class ${className} {\n`;
  for (const f of fields) code += `    private ${f.type} ${f.name};\n`;
  code += '\n    // Constructors\n';
  code += `    public ${className}() {}\n`;
  code += '\n    // Getters and Setters\n';
  for (const f of fields) {
    const cap = f.name.charAt(0).toUpperCase() + f.name.slice(1);
    code += `    public ${f.type} get${cap}() {\n        return ${f.name};\n    }\n\n`;
    code += `    public void set${cap}(${f.type} ${f.name}) {\n        this.${f.name} = ${f.name};\n    }\n\n`;
  }
  code += '}';
  classes.push({ name: className, code });
}

function inferJavaType(value, key, classes) {
  if (value === null) return 'Object';
  if (typeof value === 'string') return 'String';
  if (typeof value === 'boolean') return 'Boolean';
  if (typeof value === 'number') {
    if (Number.isInteger(value)) {
      return (Math.abs(value) > 2147483647) ? 'Long' : 'Integer';
    }
    return 'Double';
  }
  if (Array.isArray(value)) {
    if (value.length === 0) return 'List<Object>';
    const itemType = inferJavaType(value[0], key, classes);
    if (typeof value[0] === 'object' && value[0] !== null && !Array.isArray(value[0])) {
      const subClass = capitalize(key) + 'Type';
      generateJavaClass(value[0], subClass, classes);
      return `List<${subClass}>`;
    }
    return `List<${itemType}>`;
  }
  if (typeof value === 'object') {
    const subClass = capitalize(key) + 'Type';
    generateJavaClass(value, subClass, classes);
    return subClass;
  }
  return 'Object';
}

function capitalize(s) { return s.charAt(0).toUpperCase() + s.slice(1); }

function showJavaBeanResult(code) {
  currentOutputText = code; // 记录用于复制
  const lines = code.split('\n');
  allLines = [];
  foldState.clear();
  for (let i = 0; i < lines.length; i++) {
    allLines.push({ html: escapeHtml(lines[i]), depth: 0, path: '', text: lines[i] });
  }
  visibleLineIndices = [];
  for (let i = 0; i < allLines.length; i++) visibleLineIndices.push(i);
  updateVirtualScroll();
}

function showJavaBeanError(msg) {
  allLines = [{ html: `<span style="color:#f44336">${escapeHtml(msg)}</span>`, depth: 0, path: '', text: msg }];
  visibleLineIndices = [0];
  updateVirtualScroll();
}
