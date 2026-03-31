// JSON格式化工具 - 渲染进程脚本

// DOM元素
const jsonInput = document.getElementById('json-input');
const jsonOutput = document.getElementById('json-output');
const charCountEl = document.getElementById('char-count');
const lineCountEl = document.getElementById('line-count');
const sizeCountEl = document.getElementById('size-count');
const lineNumbersInput = document.getElementById('line-numbers-input');
const lineNumbersOutput = document.getElementById('line-numbers-output');

// 按钮 - 左侧
const btnFormat = document.getElementById('btn-format');
const btnCompress = document.getElementById('btn-compress');
const btnValidate = document.getElementById('btn-validate');
const btnCopy = document.getElementById('btn-copy');
const btnClear = document.getElementById('btn-clear');

// 按钮 - 右侧
const btnCopyResult = document.getElementById('btn-copy-result');
const btnCollapseAll = document.getElementById('btn-collapse-all');
const btnExpandAll = document.getElementById('btn-expand-all');
const btnUnescape = document.getElementById('btn-unescape');
const btnEscape = document.getElementById('btn-escape');

// 搜索相关
const searchInput = document.getElementById('search-keyword');
const btnSearch = document.getElementById('btn-search');
const btnSearchPrev = document.getElementById('btn-search-prev');
const btnSearchNext = document.getElementById('btn-search-next');
const searchCountEl = document.getElementById('search-count');

let searchMatches = [];
let currentMatchIndex = -1;
let searchKeyword = '';

// 左侧搜索状态
let leftSearchMatches = [];
let leftCurrentIndex = -1;
let leftSearchKeyword = '';

// 节点ID计数器
let nodeIdCounter = 0;

// 当前解析的JSON数据
let currentParsedData = null;

// 防抖函数
function debounce(func, wait) {
  let timeout;
  return function executedFunction(...args) {
    const later = () => {
      clearTimeout(timeout);
      func(...args);
    };
    clearTimeout(timeout);
    timeout = setTimeout(later, wait);
  };
}

const debouncedHandleInput = debounce(handleInputImpl, 300);

// 初始化
function initApp() {
  initEventListeners();
  updateStatusBar();
  handleInputImpl();
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initApp);
} else {
  initApp();
}

// 初始化事件监听
function initEventListeners() {
  jsonInput.addEventListener('input', debouncedHandleInput);
  jsonInput.addEventListener('scroll', handleScroll);
  jsonInput.addEventListener('keydown', handleTab);
  
  btnFormat.addEventListener('click', formatJSON);
  btnCompress.addEventListener('click', compressJSON);
  btnValidate.addEventListener('click', validateJSON);
  btnCopy.addEventListener('click', copyInput);
  btnClear.addEventListener('click', clearInput);
  
  btnCopyResult.addEventListener('click', copyResult);
  btnCollapseAll.addEventListener('click', () => toggleAllFolds(true));
  btnExpandAll.addEventListener('click', () => toggleAllFolds(false));
  btnUnescape.addEventListener('click', unescapeJSON);
  btnEscape.addEventListener('click', escapeJSON);
  
  // 左侧搜索
  const searchInputLeft = document.getElementById('search-keyword-left');
  const searchCountElLeft = document.getElementById('search-count-left');
  document.getElementById('btn-search-left').addEventListener('click', doSearchLeft);
  document.getElementById('btn-search-prev-left').addEventListener('click', prevMatchLeft);
  document.getElementById('btn-search-next-left').addEventListener('click', nextMatchLeft);
  document.getElementById('btn-search-clear-left').addEventListener('click', clearLeftSearch);
  searchInputLeft.addEventListener('keydown', function(e) {
    if (e.key === 'Enter') { leftSearchMatches.length > 0 ? nextMatchLeft() : doSearchLeft(); }
  });
  searchInputLeft.addEventListener('input', function() {
    if (!this.value.trim()) clearLeftSearch();
  });

  btnSearch.addEventListener('click', doSearch);
  btnSearchPrev.addEventListener('click', prevMatch);
  btnSearchNext.addEventListener('click', nextMatch);
  document.getElementById('btn-search-clear').addEventListener('click', clearRightSearch);
  searchInput.addEventListener('keydown', function(e) {
    if (e.key === 'Enter') { searchMatches.length > 0 ? nextMatch() : doSearch(); }
  });
  searchInput.addEventListener('input', function() {
    if (!this.value.trim()) clearRightSearch();
  });
  
  jsonOutput.addEventListener('scroll', function() {
    lineNumbersOutput.scrollTop = jsonOutput.scrollTop;
  });
}

// 处理输入
function handleInputImpl() {
  clearSearchHighlights();
  searchMatches = [];
  currentMatchIndex = -1;
  updateSearchCount();
  
  const text = jsonInput.value;
  
  if (text.trim()) {
    try {
      currentParsedData = JSON.parse(text);
      highlightJSON(text, true);
      updateLineNumbers('output');
    } catch (e) {
      currentParsedData = null;
      const errorInfo = parseJsonError(e, text);
      showErrorInOutput(errorInfo);
    }
  } else {
    currentParsedData = null;
    jsonOutput.innerHTML = '';
    lineNumbersOutput.innerHTML = '';
  }
  
  updateStatusBar();
}

// 更新状态栏
function updateStatusBar() {
  const text = jsonInput.value;
  charCountEl.textContent = text.length;
  lineCountEl.textContent = text ? text.split('\n').length : 0;
  sizeCountEl.textContent = formatBytes(new Blob([text]).size);
}

function formatBytes(bytes) {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

// 解析JSON错误
function parseJsonError(error, text) {
  const message = error.message;
  let lineNumber = 1, columnNumber = 1;
  
  const posMatch = message.match(/position\s*(\d+)/i);
  if (posMatch) {
    const position = parseInt(posMatch[1], 10);
    const textBeforeError = text.substring(0, position);
    lineNumber = (textBeforeError.match(/\n/g) || []).length + 1;
    columnNumber = position - textBeforeError.lastIndexOf('\n');
  }
  
  const lineMatch = message.match(/line\s*(\d+)/i);
  if (lineMatch) lineNumber = parseInt(lineMatch[1], 10);
  
  return {
    message: message,
    line: lineNumber,
    column: columnNumber,
    fullMessage: `${message} (行 ${lineNumber}, 列 ${columnNumber})`
  };
}

function showErrorInOutput(errorInfo) {
  jsonOutput.innerHTML = `<div class="error-message">
    <div>${escapeHtml(errorInfo.fullMessage)}</div>
    <div class="error-line">请检查第 ${errorInfo.line} 行的内容</div>
  </div>`;
  updateLineNumbers('output');
}

// 更新行号
function updateLineNumbers(type) {
  const lineNumbers = type === 'input' ? lineNumbersInput : lineNumbersOutput;
  const editor = type === 'input' ? jsonInput : jsonOutput;
  
  if (type === 'input') {
    const lines = jsonInput.value.split('\n').length;
    let html = '';
    for (let i = 1; i <= lines; i++) html += i + '\n';
    lineNumbers.textContent = html.trim();
  } else {
    if (editor.innerHTML.includes('error-message')) {
      lineNumbers.textContent = '1';
    } else {
      const lines = editor.textContent.split('\n').length;
      let html = '';
      for (let i = 1; i <= lines; i++) html += i + '\n';
      lineNumbers.textContent = html.trim();
    }
  }
}

function escapeHtml(text) {
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}

// JSON语法高亮 + 层级折叠
function highlightJSON(text, expandAll = false) {
  try {
    const parsed = JSON.parse(text);
    nodeIdCounter = 0;
    jsonOutput.innerHTML = renderValue(parsed, 0);
    bindFoldEvents();
    bindEditEvents();
    if (expandAll) expandAllInternal();
  } catch (e) {
    jsonOutput.innerHTML = `<div class="error-message">${escapeHtml(e.message)}</div>`;
  }
}

// 渲染JSON值
function renderValue(value, depth, key = null, isLast = true, path = '') {
  const indent = '  '.repeat(depth);
  
  if (value === null) {
    return `${indent}${renderKey(key, path)}<span class="json-null editable-value" data-path="${escapeHtml(path)}" data-type="null">null</span>${comma(isLast)}`;
  }
  if (typeof value === 'boolean') {
    return `${indent}${renderKey(key, path)}<span class="json-boolean editable-value" data-path="${escapeHtml(path)}" data-type="boolean">${value}</span>${comma(isLast)}`;
  }
  if (typeof value === 'number') {
    return `${indent}${renderKey(key, path)}<span class="json-number editable-value" data-path="${escapeHtml(path)}" data-type="number">${value}</span>${comma(isLast)}`;
  }
  if (typeof value === 'string') {
    return `${indent}${renderKey(key, path)}<span class="json-string editable-value" data-path="${escapeHtml(path)}" data-type="string">"${escapeHtml(value)}"</span>${comma(isLast)}`;
  }
  if (Array.isArray(value)) {
    return renderArray(value, depth, key, isLast, path);
  }
  if (typeof value === 'object') {
    return renderObject(value, depth, key, isLast, path);
  }
  return '';
}

function renderKey(key, path) {
  if (key === null || key === undefined) return '';
  return `<span class="json-key editable-key" data-path="${escapeHtml(path)}" data-key="${escapeHtml(key)}">"${escapeHtml(key)}"</span><span class="json-colon">: </span>`;
}

function comma(isLast) {
  return isLast ? '' : '<span class="json-comma">,</span>';
}

function renderArray(arr, depth, key, isLast, path) {
  const nodeId = `node-${nodeIdCounter++}`;
  const indent = '  '.repeat(depth);
  const closeIndent = '  '.repeat(depth);
  const keyHtml = renderKey(key, path);
  
  if (arr.length === 0) {
    return `${indent}${keyHtml}<span class="json-bracket">[]</span>${comma(isLast)}`;
  }
  
  let html = `${indent}${keyHtml}`;
  html += `<span class="fold-wrapper" data-node-id="${nodeId}">`;
  html += `<span class="fold-trigger" data-folded="false">`;
  html += `<span class="fold-icon">▼</span>`;
  html += `<span class="fold-preview">Array[${arr.length}]</span>`;
  html += `</span>`;
  html += `<span class="json-bracket">[</span>`;
  html += `<div class="fold-content level-${Math.min(depth, 10)}">`;
  
  arr.forEach((item, index) => {
    const itemPath = path ? `${path}[${index}]` : `[${index}]`;
    html += renderValue(item, depth + 1, null, index === arr.length - 1, itemPath);
    if (index !== arr.length - 1) html += '\n';
  });
  
  html += `</div>`;
  html += `${indent}<span class="json-bracket">]</span>${comma(isLast)}`;
  html += `</span>`;
  return html;
}

function renderObject(obj, depth, key, isLast, path) {
  const nodeId = `node-${nodeIdCounter++}`;
  const keys = Object.keys(obj);
  const indent = '  '.repeat(depth);
  const closeIndent = '  '.repeat(depth);
  const keyHtml = renderKey(key, path);
  
  if (keys.length === 0) {
    return `${indent}${keyHtml}<span class="json-bracket">{}</span>${comma(isLast)}`;
  }
  
  let html = `${indent}${keyHtml}`;
  html += `<span class="fold-wrapper" data-node-id="${nodeId}">`;
  html += `<span class="fold-trigger" data-folded="false">`;
  html += `<span class="fold-icon">▼</span>`;
  html += `<span class="fold-preview">Object{${keys.length}}</span>`;
  html += `</span>`;
  html += `<span class="json-bracket">{</span>`;
  html += `<div class="fold-content level-${Math.min(depth, 10)}">`;
  
  keys.forEach((propKey, index) => {
    const propPath = path ? `${path}.${propKey}` : propKey;
    html += renderValue(obj[propKey], depth + 1, propKey, index === keys.length - 1, propPath);
    if (index !== keys.length - 1) html += '\n';
  });
  
  html += `</div>`;
  html += `${indent}<span class="json-bracket">}</span>${comma(isLast)}`;
  html += `</span>`;
  return html;
}

// 绑定折叠事件
function bindFoldEvents() {
  jsonOutput.querySelectorAll('.fold-trigger').forEach(trigger => {
    trigger.addEventListener('click', function(e) {
      e.stopPropagation();
      toggleFold(this);
    });
    trigger.style.cursor = 'pointer';
  });
}

// 绑定编辑事件（使用事件委托）
function bindEditEvents() {
  jsonOutput.removeEventListener('click', handleEditClick);
  jsonOutput.addEventListener('click', handleEditClick);
}

function handleEditClick(e) {
  const el = e.target;
  
  // 编辑 key
  if (el.classList.contains('editable-key')) {
    e.stopPropagation();
    const oldKey = el.dataset.key;
    const path = el.dataset.path;
    startInlineEdit(el, oldKey, function(newVal) {
      if (newVal && newVal !== oldKey) {
        renameKeyInData(path, oldKey, newVal);
      }
    });
    return;
  }
  
  // 编辑 value
  if (el.classList.contains('editable-value')) {
    e.stopPropagation();
    const path = el.dataset.path;
    const type = el.dataset.type;
    const currentVal = getValueByPath(currentParsedData, path);
    const displayVal = (type === 'string') ? currentVal : JSON.stringify(currentVal);
    startInlineEdit(el, displayVal, function(newVal) {
      if (newVal !== null && newVal !== undefined) {
        setValueByPath(currentParsedData, path, parseInputValue(newVal, type));
        syncDataToInput();
      }
    });
    return;
  }
}

function startInlineEdit(el, currentValue, onConfirm) {
  if (el.querySelector('input')) return;
  
  const originalHtml = el.innerHTML;
  
  const measure = document.createElement('span');
  measure.style.cssText = 'position:absolute;visibility:hidden;white-space:pre;font:inherit;padding:1px 4px;';
  document.body.appendChild(measure);
  
  function calcWidth(text) {
    measure.textContent = text || ' ';
    return Math.max(measure.offsetWidth + 8, 32);
  }
  
  const input = document.createElement('input');
  input.type = 'text';
  input.value = currentValue;
  input.className = 'inline-edit-input';
  input.style.width = calcWidth(currentValue) + 'px';
  
  el.innerHTML = '';
  el.appendChild(input);
  input.focus();
  input.select();
  
  input.addEventListener('input', function() {
    input.style.width = calcWidth(input.value) + 'px';
  });
  
  let done = false;
  function finish(confirmed) {
    if (done) return;
    done = true;
    measure.remove();
    const val = input.value;
    el.innerHTML = originalHtml;
    if (confirmed && val !== currentValue) {
      onConfirm(val);
    }
  }
  
  input.addEventListener('keydown', function(e) {
    if (e.key === 'Enter') { e.preventDefault(); finish(true); }
    if (e.key === 'Escape') { e.preventDefault(); finish(false); }
    e.stopPropagation();
  });
  input.addEventListener('blur', function() { finish(true); });
  input.addEventListener('click', function(e) { e.stopPropagation(); });
}

function parseInputValue(input, originalType) {
  if (input === 'null') return null;
  if (input === 'true') return true;
  if (input === 'false') return false;
  const num = Number(input);
  if (!isNaN(num) && input.trim() !== '') return num;
  return input;
}

function getValueByPath(obj, path) {
  if (!path) return obj;
  const parts = parsePath(path);
  let current = obj;
  for (const p of parts) current = current[p];
  return current;
}

function setValueByPath(obj, path, value) {
  if (!path) return;
  const parts = parsePath(path);
  let current = obj;
  for (let i = 0; i < parts.length - 1; i++) current = current[parts[i]];
  current[parts[parts.length - 1]] = value;
}

function renameKeyInData(path, oldKey, newKey) {
  const parts = parsePath(path);
  let parent = currentParsedData;
  for (let i = 0; i < parts.length - 1; i++) parent = parent[parts[i]];
  
  const newObj = {};
  for (const k of Object.keys(parent)) {
    if (k === oldKey) {
      newObj[newKey] = parent[oldKey];
    } else {
      newObj[k] = parent[k];
    }
  }
  
  if (parts.length <= 1) {
    for (const k of Object.keys(currentParsedData)) delete currentParsedData[k];
    Object.assign(currentParsedData, newObj);
  } else {
    let grandParent = currentParsedData;
    for (let i = 0; i < parts.length - 2; i++) grandParent = grandParent[parts[i]];
    grandParent[parts[parts.length - 2]] = newObj;
  }
  
  syncDataToInput();
}

function parsePath(path) {
  const parts = [];
  let current = '';
  for (let i = 0; i < path.length; i++) {
    const ch = path[i];
    if (ch === '.') {
      if (current) { parts.push(current); current = ''; }
    } else if (ch === '[') {
      if (current) { parts.push(current); current = ''; }
    } else if (ch === ']') {
      if (current) { parts.push(parseInt(current)); current = ''; }
    } else {
      current += ch;
    }
  }
  if (current) parts.push(current);
  return parts;
}

function syncDataToInput() {
  jsonInput.value = JSON.stringify(currentParsedData, null, 2);
  handleInputImpl();
  showToast('已更新');
}

function toggleFold(trigger) {
  const wrapper = trigger.closest('.fold-wrapper');
  const isFolded = trigger.dataset.folded === 'true';
  trigger.dataset.folded = !isFolded;
  const icon = trigger.querySelector('.fold-icon');
  const preview = trigger.querySelector('.fold-preview');
  const content = wrapper.querySelector('.fold-content');
  if (!isFolded) {
    icon.textContent = '▶'; preview.style.display = 'inline'; content.style.display = 'none';
  } else {
    icon.textContent = '▼'; preview.style.display = 'none'; content.style.display = '';
  }
}

function collapseAll() {
  jsonOutput.querySelectorAll('.fold-trigger').forEach(t => {
    if (t.dataset.folded === 'false') toggleFold(t);
  });
}

function expandAll() {
  jsonOutput.querySelectorAll('.fold-trigger').forEach(t => {
    if (t.dataset.folded === 'true') toggleFold(t);
  });
}

function expandAllInternal() {
  jsonOutput.querySelectorAll('.fold-trigger').forEach(trigger => {
    const wrapper = trigger.closest('.fold-wrapper');
    trigger.dataset.folded = 'false';
    trigger.querySelector('.fold-icon').textContent = '▼';
    trigger.querySelector('.fold-preview').style.display = 'none';
    wrapper.querySelector('.fold-content').style.display = '';
  });
}

function toggleAllFolds(collapse) {
  collapse ? collapseAll() : expandAll();
}

// ====================
// 功能函数
// ====================

function formatJSON() {
  const text = jsonInput.value.trim();
  if (!text) { showToast('请先输入JSON数据', 'warning'); return; }
  try {
    jsonInput.value = JSON.stringify(JSON.parse(text), null, 2);
    handleInputImpl();
    showToast('格式化成功');
  } catch (e) {
    showErrorInOutput(parseJsonError(e, text));
    showToast('JSON格式无效', 'error');
  }
}

function compressJSON() {
  const text = jsonInput.value.trim();
  if (!text) { showToast('请先输入JSON数据', 'warning'); return; }
  try {
    jsonInput.value = JSON.stringify(JSON.parse(text));
    handleInputImpl();
    showToast('压缩成功');
  } catch (e) {
    showErrorInOutput(parseJsonError(e, text));
    showToast('JSON格式无效', 'error');
  }
}

function validateJSON() {
  const text = jsonInput.value.trim();
  if (!text) { showToast('请先输入JSON数据', 'warning'); return; }
  try {
    JSON.parse(text);
    highlightJSON(text);
    showToast('校验成功');
  } catch (e) {
    showErrorInOutput(parseJsonError(e, text));
    showToast('JSON校验失败', 'error');
  }
}

async function copyInput() {
  const text = jsonInput.value.trim();
  if (!text) { showToast('没有可复制的内容', 'warning'); return; }
  try { await navigator.clipboard.writeText(text); showToast('复制成功'); }
  catch (e) { showToast('复制失败', 'error'); }
}

async function copyResult() {
  if (!currentParsedData) { showToast('没有可复制的内容', 'warning'); return; }
  try {
    const text = JSON.stringify(currentParsedData, null, 2);
    await navigator.clipboard.writeText(text);
    showToast('复制成功');
  } catch (e) { showToast('复制失败', 'error'); }
}

function clearInput() {
  jsonInput.value = '';
  jsonOutput.innerHTML = '';
  updateStatusBar();
  showToast('已清空');
}

function escapeJSON() {
  const text = jsonInput.value.trim();
  if (!text) { showToast('请先输入JSON数据', 'warning'); return; }
  try { jsonInput.value = JSON.stringify(text); handleInputImpl(); showToast('转义成功'); }
  catch (e) { showToast('转义失败', 'error'); }
}

function unescapeJSON() {
  const text = jsonInput.value.trim();
  if (!text) { showToast('请先输入JSON数据', 'warning'); return; }
  try {
    const parsed = JSON.parse(text);
    if (typeof parsed === 'string') { jsonInput.value = parsed; handleInputImpl(); showToast('去除转义成功'); }
    else showToast('不是字符串类型', 'warning');
  } catch (e) { showToast('去除转义失败', 'error'); }
}

function handleScroll() {
  jsonOutput.scrollTop = jsonInput.scrollTop;
  lineNumbersInput.scrollTop = jsonInput.scrollTop;
}

function handleTab(e) {
  if (e.key === 'Tab') {
    e.preventDefault();
    const start = jsonInput.selectionStart;
    const end = jsonInput.selectionEnd;
    jsonInput.value = jsonInput.value.substring(0, start) + '  ' + jsonInput.value.substring(end);
    jsonInput.selectionStart = jsonInput.selectionEnd = start + 2;
    handleInputImpl();
  }
}

function showToast(message, type = 'success') {
  const existing = document.querySelector('.copy-toast');
  if (existing) existing.remove();
  
  const toast = document.createElement('div');
  toast.className = 'copy-toast';
  toast.textContent = message;
  toast.style.backgroundColor = type === 'error' ? '#f5222d' : type === 'warning' ? '#fa8c16' : '#52c41a';
  document.body.appendChild(toast);
  setTimeout(() => toast.remove(), 2000);
}

// ====================
// 搜索功能
// ====================

function clearRightSearch() {
  searchInput.value = '';
  searchKeyword = '';
  clearSearchHighlights();
  searchMatches = [];
  currentMatchIndex = -1;
  updateSearchCount();
}

function doSearch() {
  searchKeyword = searchInput.value.trim();
  if (!searchKeyword) {
    clearSearchHighlights();
    searchMatches = [];
    currentMatchIndex = -1;
    updateSearchCount();
    return;
  }
  
  searchMatches = [];
  const escapedSearch = escapeRegExp(searchKeyword);
  const walker = document.createTreeWalker(jsonOutput, NodeFilter.SHOW_TEXT, null, false);
  const textNodes = [];
  let node;
  while (node = walker.nextNode()) {
    if (node.textContent.trim()) textNodes.push(node);
  }
  
  let globalIndex = 0;
  textNodes.forEach(textNode => {
    const text = textNode.textContent;
    const regex = new RegExp(escapedSearch, 'gi');
    let match;
    while ((match = regex.exec(text)) !== null) {
      searchMatches.push({
        node: textNode, text: text,
        start: match.index, end: match.index + match[0].length,
        matchText: match[0], globalIndex: globalIndex
      });
      globalIndex++;
    }
  });
  
  if (searchMatches.length > 0) {
    currentMatchIndex = 0;
    applySearchHighlights();
  } else {
    currentMatchIndex = -1;
  }
  updateSearchCount();
}

function updateSearchCount() {
  if (searchCountEl) {
    searchCountEl.textContent = searchMatches.length === 0 ? '0/0' : `${currentMatchIndex + 1}/${searchMatches.length}`;
  }
}

function applySearchHighlights() {
  clearSearchHighlights();
  if (!searchKeyword || searchMatches.length === 0) return;
  
  const escapedSearch = escapeRegExp(searchKeyword);
  const nodeGroups = new Map();
  searchMatches.forEach((match, idx) => {
    if (!nodeGroups.has(match.node)) {
      nodeGroups.set(match.node, { node: match.node, originalText: match.text, matches: [] });
    }
    nodeGroups.get(match.node).matches.push({ ...match, index: idx });
  });
  
  nodeGroups.forEach(group => {
    const text = group.originalText;
    const regex = new RegExp(`(${escapedSearch})`, 'gi');
    const fragment = document.createDocumentFragment();
    let lastEnd = 0, match, matchIdx = 0;
    
    group.matches.sort((a, b) => a.start - b.start);
    
    while ((match = regex.exec(text)) !== null) {
      const globalIdx = matchIdx < group.matches.length ? group.matches[matchIdx].index : -1;
      if (match.index > lastEnd) {
        fragment.appendChild(document.createTextNode(text.slice(lastEnd, match.index)));
      }
      const span = document.createElement('span');
      span.className = 'search-highlight';
      span.dataset.globalIndex = globalIdx;
      span.textContent = match[0];
      if (globalIdx === currentMatchIndex) span.classList.add('current');
      fragment.appendChild(span);
      lastEnd = match.index + match[0].length;
      matchIdx++;
    }
    
    if (lastEnd < text.length) {
      fragment.appendChild(document.createTextNode(text.slice(lastEnd)));
    }
    if (group.node.parentNode) {
      group.node.parentNode.replaceChild(fragment, group.node);
    }
  });

  if (currentMatchIndex >= 0) {
    const current = jsonOutput.querySelector('.search-highlight.current');
    if (current) current.scrollIntoView({ behavior: 'smooth', block: 'center' });
  }
}

function clearSearchHighlights() {
  jsonOutput.querySelectorAll('.search-highlight').forEach(el => {
    const parent = el.parentNode;
    if (parent) {
      parent.replaceChild(document.createTextNode(el.textContent), el);
      parent.normalize();
    }
  });
}

function prevMatch() {
  if (searchMatches.length === 0) {
    doSearch();
    if (searchMatches.length === 0) return;
  }
  currentMatchIndex = (currentMatchIndex - 1 + searchMatches.length) % searchMatches.length;
  updateCurrentHighlight();
  updateSearchCount();
}

function nextMatch() {
  if (searchMatches.length === 0) {
    doSearch();
    if (searchMatches.length === 0) return;
  }
  currentMatchIndex = (currentMatchIndex + 1) % searchMatches.length;
  updateCurrentHighlight();
  updateSearchCount();
}

function updateCurrentHighlight() {
  jsonOutput.querySelectorAll('.search-highlight').forEach(el => {
    const idx = parseInt(el.dataset.globalIndex);
    if (idx === currentMatchIndex) {
      el.classList.add('current');
      el.scrollIntoView({ behavior: 'smooth', block: 'center' });
    } else {
      el.classList.remove('current');
    }
  });
}

function escapeRegExp(string) {
  return string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

// ====================
// 左侧搜索功能
// ====================

function doSearchLeft() {
  const searchInputLeft = document.getElementById('search-keyword-left');
  leftSearchKeyword = searchInputLeft.value.trim();
  if (!leftSearchKeyword) { clearLeftSearch(); return; }

  leftSearchMatches = [];
  const text = jsonInput.value;
  const regex = new RegExp(escapeRegExp(leftSearchKeyword), 'gi');
  let match;
  while ((match = regex.exec(text)) !== null) {
    leftSearchMatches.push({ start: match.index, end: match.index + match[0].length });
  }

  leftCurrentIndex = leftSearchMatches.length > 0 ? 0 : -1;
  highlightLeftMatch();
  updateLeftSearchCount();
}

function prevMatchLeft() {
  if (leftSearchMatches.length === 0) {
    doSearchLeft();
    if (leftSearchMatches.length === 0) return;
  }
  leftCurrentIndex = (leftCurrentIndex - 1 + leftSearchMatches.length) % leftSearchMatches.length;
  highlightLeftMatch();
  updateLeftSearchCount();
}

function nextMatchLeft() {
  if (leftSearchMatches.length === 0) {
    doSearchLeft();
    if (leftSearchMatches.length === 0) return;
  }
  leftCurrentIndex = (leftCurrentIndex + 1) % leftSearchMatches.length;
  highlightLeftMatch();
  updateLeftSearchCount();
}

function clearLeftSearch() {
  const searchInputLeft = document.getElementById('search-keyword-left');
  searchInputLeft.value = '';
  leftSearchKeyword = '';
  leftSearchMatches = [];
  leftCurrentIndex = -1;
  updateLeftSearchCount();
}

function highlightLeftMatch() {
  if (leftCurrentIndex < 0 || leftCurrentIndex >= leftSearchMatches.length) return;
  const m = leftSearchMatches[leftCurrentIndex];
  jsonInput.focus();
  jsonInput.setSelectionRange(m.start, m.end);
}

function updateLeftSearchCount() {
  const el = document.getElementById('search-count-left');
  el.textContent = leftSearchMatches.length === 0 ? '0/0' : `${leftCurrentIndex + 1}/${leftSearchMatches.length}`;
}

// ====================
// 时间戳悬浮提示
// ====================

const timestampTooltip = document.getElementById('timestamp-tooltip');

function isTimestamp(num) {
  return num > 1000000000000 && num < 10000000000000;
}

function formatTimestamp(ts) {
  const d = new Date(ts);
  const pad = n => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth()+1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`;
}

jsonOutput.addEventListener('mouseover', function(e) {
  const el = e.target;
  if (el.classList.contains('json-number') || el.classList.contains('json-string')) {
    const text = el.textContent.replace(/"/g, '').trim();
    const num = Number(text);
    if (!isNaN(num) && isTimestamp(num)) {
      timestampTooltip.textContent = formatTimestamp(num);
      timestampTooltip.style.display = 'block';
      const rect = el.getBoundingClientRect();
      timestampTooltip.style.left = rect.left + 'px';
      timestampTooltip.style.top = (rect.top - 30) + 'px';
    }
  }
});

jsonOutput.addEventListener('mouseout', function(e) {
  if (e.target.classList.contains('json-number') || e.target.classList.contains('json-string')) {
    timestampTooltip.style.display = 'none';
  }
});

// ====================
// 可拖动分隔条
// ====================

(function initResizer() {
  const resizer = document.getElementById('resizer');
  const leftPanel = document.querySelector('.left-panel');
  const rightPanel = document.querySelector('.right-panel');
  const container = document.querySelector('.main-content');

  let isResizing = false;

  resizer.addEventListener('mousedown', function(e) {
    isResizing = true;
    resizer.classList.add('active');
    document.body.style.cursor = 'col-resize';
    document.body.style.userSelect = 'none';
    e.preventDefault();
  });

  document.addEventListener('mousemove', function(e) {
    if (!isResizing) return;
    const containerRect = container.getBoundingClientRect();
    const containerLeft = containerRect.left + 15;
    const containerWidth = containerRect.width - 30;
    const resizerWidth = resizer.offsetWidth;

    let offsetX = e.clientX - containerLeft;
    const minWidth = 100;
    offsetX = Math.max(minWidth, Math.min(offsetX, containerWidth - resizerWidth - minWidth));

    leftPanel.style.flex = 'none';
    leftPanel.style.width = offsetX + 'px';
    rightPanel.style.flex = 'none';
    rightPanel.style.width = (containerWidth - resizerWidth - offsetX) + 'px';
  });

  document.addEventListener('mouseup', function() {
    if (!isResizing) return;
    isResizing = false;
    resizer.classList.remove('active');
    document.body.style.cursor = '';
    document.body.style.userSelect = '';
  });
})();

// ====================
// 层级悬停背景色
// ====================

let currentHoverContent = null;

jsonOutput.addEventListener('mouseover', function(e) {
  const foldContent = e.target.closest('.fold-content');
  if (foldContent === currentHoverContent) return;
  if (currentHoverContent) currentHoverContent.classList.remove('level-hover');
  currentHoverContent = foldContent;
  if (foldContent) foldContent.classList.add('level-hover');
});

jsonOutput.addEventListener('mouseleave', function() {
  if (currentHoverContent) {
    currentHoverContent.classList.remove('level-hover');
    currentHoverContent = null;
  }
});
