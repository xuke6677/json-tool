// 选项卡切换 + 工具页面逻辑

// ====================
// 选项卡切换
// ====================
document.querySelectorAll('.tab-item').forEach(tab => {
  tab.addEventListener('click', () => {
    document.querySelectorAll('.tab-item').forEach(t => t.classList.remove('active'));
    document.querySelectorAll('.tab-page').forEach(p => p.classList.remove('active'));
    tab.classList.add('active');
    document.getElementById(tab.dataset.tab).classList.add('active');
  });
});

// ====================
// 时间戳转换
// ====================
let tsTimer = null;
let tsUnitMs = true;

function startTimestamp() {
  updateCurrentTs();
  tsTimer = setInterval(updateCurrentTs, 1);
  document.getElementById('ts-stop').textContent = '停止';
}

function updateCurrentTs() {
  const now = Date.now();
  document.getElementById('ts-current-value').textContent = tsUnitMs ? now : Math.floor(now / 1000);
  const d = new Date(now), pad = n => String(n).padStart(2, '0');
  document.getElementById('ts-current-datetime').textContent =
    `${d.getFullYear()}/${pad(d.getMonth()+1)}/${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`;
}

document.getElementById('ts-switch-unit').addEventListener('click', e => {
  e.preventDefault(); tsUnitMs = !tsUnitMs;
  document.getElementById('ts-unit-label').textContent = tsUnitMs ? '毫秒' : '秒';
});

// 1. 停止/开始切换
document.getElementById('ts-stop').addEventListener('click', () => {
  const btn = document.getElementById('ts-stop');
  if (tsTimer) { clearInterval(tsTimer); tsTimer = null; btn.textContent = '开始'; }
  else startTimestamp();
});

document.getElementById('ts-copy-current').addEventListener('click', () => {
  navigator.clipboard.writeText(document.getElementById('ts-current-value').textContent);
  showToast('复制成功');
});


// 2. 时间戳转日期 - 粘贴/输入自动转换（去掉转换按钮）
function autoConvertTsToDate() {
  let val = parseInt(document.getElementById('ts-input').value);
  if (isNaN(val)) { document.getElementById('ts-date-result').value = ''; return; }
  const unit = document.getElementById('ts-input-unit').value;
  if (unit === 's') val *= 1000;
  const d = new Date(val), pad = n => String(n).padStart(2, '0');
  document.getElementById('ts-date-result').value =
    `${d.getFullYear()}-${pad(d.getMonth()+1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`;
}
document.getElementById('ts-input').addEventListener('input', autoConvertTsToDate);
document.getElementById('ts-input').addEventListener('paste', () => setTimeout(autoConvertTsToDate, 0));
document.getElementById('ts-input-unit').addEventListener('change', autoConvertTsToDate);

// 快捷选择：时间戳转日期时间 - 下拉填充当前时间戳
document.getElementById('ts-quick-ts').addEventListener('change', function() {
  const now = new Date(), pad = n => String(n).padStart(2, '0');
  const unit = document.getElementById('ts-input-unit').value;
  if (this.value === 'date') {
    const d = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    document.getElementById('ts-input').value = unit === 's' ? Math.floor(d.getTime() / 1000) : d.getTime();
  } else if (this.value === 'datetime') {
    document.getElementById('ts-input').value = unit === 's' ? Math.floor(now.getTime() / 1000) : now.getTime();
  } else { document.getElementById('ts-input').value = ''; document.getElementById('ts-date-result').value = ''; return; }
  autoConvertTsToDate();
});

// 日期转时间戳 - 粘贴/输入自动转换
function autoConvertDateToTs() {
  const str = document.getElementById('ts-date-input').value.trim();
  if (!str) { document.getElementById('ts-stamp-result').value = ''; return; }
  const d = new Date(str.replace(/-/g, '/'));
  if (isNaN(d.getTime())) { document.getElementById('ts-stamp-result').value = '无效日期'; return; }
  const unit = document.getElementById('ts-output-unit').value;
  document.getElementById('ts-stamp-result').value = unit === 's' ? Math.floor(d.getTime() / 1000) : d.getTime();
}
document.getElementById('ts-date-input').addEventListener('input', autoConvertDateToTs);
document.getElementById('ts-date-input').addEventListener('paste', () => setTimeout(autoConvertDateToTs, 0));
document.getElementById('ts-output-unit').addEventListener('change', autoConvertDateToTs);

// 快捷选择：日期时间转时间戳 - 下拉填充当前日期/时间
document.getElementById('ts-quick-date').addEventListener('change', function() {
  const now = new Date(), pad = n => String(n).padStart(2, '0');
  if (this.value === 'date') {
    document.getElementById('ts-date-input').value = `${now.getFullYear()}-${pad(now.getMonth()+1)}-${pad(now.getDate())}`;
  } else if (this.value === 'datetime') {
    document.getElementById('ts-date-input').value = `${now.getFullYear()}-${pad(now.getMonth()+1)}-${pad(now.getDate())} ${pad(now.getHours())}:${pad(now.getMinutes())}:${pad(now.getSeconds())}`;
  } else { document.getElementById('ts-date-input').value = ''; document.getElementById('ts-stamp-result').value = ''; return; }
  autoConvertDateToTs();
});

document.getElementById('ts-copy-date').addEventListener('click', () => { navigator.clipboard.writeText(document.getElementById('ts-date-result').value); showToast('复制成功'); });
document.getElementById('ts-copy-stamp').addEventListener('click', () => { navigator.clipboard.writeText(document.getElementById('ts-stamp-result').value); showToast('复制成功'); });

startTimestamp();

// ====================
// 翻译（MyMemory免费API + 离线简繁转换）
// ====================
const s2tMap = {}, t2sMap = {};
const s2tPairs = '万萬与與专專业業丛叢东東丝絲丢丟两兩严嚴丧喪个個丰豐临臨为為丽麗举舉么麼义義乌烏乐樂习習书書买買乱亂争爭于於亏虧云雲亚亞产產亲親亿億仅僅从從仓倉仪儀们們价價众眾优優伙夥会會伟偉传傳伤傷伦倫伪偽体體余餘佣傭来來侠俠侣侶侦偵侧側侨僑俩倆俪儷俭儉信信修修俱俱债債倾傾假假偿償傍傍储儲催催像像僵僵儿兒允允元元充充先先光光克克免免兑兌党黨兰蘭关關兴興兹茲养養兽獸内內冈岡册冊写寫军軍农農冲沖决決况況冻凍净淨凉涼减減凑湊凤鳳凭憑凯凱击擊凿鑿刊刊刘劉则則刚剛创創划劃别別利利刮刮到到制製刷刷券券刹剎刺刺剂劑剑劍剥剝剧劇劝勸办辦功功加加务務劣劣动動助助努努劲勁励勵劳勞势勢勤勤勾勾包包化化北北匀勻区區医醫千千升升午午半半华華单單卖賣南南博博卫衛卷卷厂廠厅廳历歷厉厲压壓厌厭厕廁厘釐厢廂厦廈厨廚去去县縣叁參双雙发發变變叠疊口口古古句句叮叮可可台臺叶葉号號司司叹嘆吁籲吃吃各各合合吉吉吊吊同同名名后後吐吐向向吓嚇吗嗎君君吞吞听聽启啟吴吳呆呆呈呈告告员員呜嗚周週味味呼呼命命咏詠咨諮品品哑啞响響哲哲唤喚唯唯商商啊啊善善喷噴嘱囑器器噪噪嚣囂团團园園围圍固固国國图圖圆圓圣聖场場坏壞块塊坚堅坛壇坝壩坟墳坠墜垄壟型型垒壘垦墾垫墊城城域域培培基基堂堂堆堆堕墮塔塔塞塞填填境境墙牆增增墨墨壁壁壮壯声聲壳殼处處备備复復够夠头頭夸誇夹夾夺奪奋奮奖獎奥奧';
for (let i = 0; i < s2tPairs.length; i += 2) { s2tMap[s2tPairs[i]] = s2tPairs[i+1]; t2sMap[s2tPairs[i+1]] = s2tPairs[i]; }
function toTraditional(t) { return t.split('').map(c => s2tMap[c] || c).join(''); }
function toSimplified(t) { return t.split('').map(c => t2sMap[c] || c).join(''); }

// 使用 MyMemory 免费翻译 API
async function translateText(text, from, to) {
  if (!text.trim()) return '';
  try {
    const url = `https://api.mymemory.translated.net/get?q=${encodeURIComponent(text)}&langpair=${from}|${to}`;
    const resp = await fetch(url);
    const data = await resp.json();
    if (data.responseStatus === 200 && data.responseData) {
      return data.responseData.translatedText;
    }
    return '翻译失败: ' + (data.responseDetails || '未知错误');
  } catch (e) {
    return '翻译失败: 网络错误，请检查网络连接';
  }
}

document.getElementById('tr-do').addEventListener('click', doTranslate);
// 自动翻译：输入或粘贴后自动触发
let _trDebounce = null;
document.getElementById('tr-input').addEventListener('input', () => {
  clearTimeout(_trDebounce);
  _trDebounce = setTimeout(doTranslate, 500);
});
document.getElementById('tr-input').addEventListener('paste', () => {
  clearTimeout(_trDebounce);
  _trDebounce = setTimeout(doTranslate, 200);
});

async function doTranslate() {
  const text = document.getElementById('tr-input').value;
  if (!text.trim()) { document.getElementById('tr-result-en').value = ''; document.getElementById('tr-result-tc').value = ''; return; }
  const lang = document.querySelector('.tr-lang.active').dataset.lang;
  const el1 = document.getElementById('tr-result-en'); // 第一个结果框
  const el2 = document.getElementById('tr-result-tc'); // 第二个结果框

  if (lang === 'zh') {
    // 输入中文 → 第一框英文，第二框繁体
    el1.value = '翻译中...';
    el2.value = toTraditional(text);
    el1.value = await translateText(text, 'zh-CN', 'en');
  } else if (lang === 'en') {
    // 输入英文 → 第一框中文，第二框繁体
    el1.value = '翻译中...';
    el2.value = '翻译中...';
    const zhResult = await translateText(text, 'en', 'zh-CN');
    el1.value = zhResult;
    el2.value = toTraditional(zhResult);
  } else if (lang === 'tc') {
    // 输入繁体 → 第一框简体，第二框英文
    const simplified = toSimplified(text);
    el1.value = simplified;
    el2.value = '翻译中...';
    el2.value = await translateText(simplified, 'zh-CN', 'en');
  }
}

document.querySelectorAll('.tr-lang').forEach(tab => {
  tab.addEventListener('click', () => {
    document.querySelectorAll('.tr-lang').forEach(t => t.classList.remove('active'));
    tab.classList.add('active');
    const lang = tab.dataset.lang;
    const labels = { en: ['中文：','繁体：'], zh: ['英文：','繁体：'], tc: ['简体：','英文：'] };
    const ls = labels[lang] || labels.zh;
    document.querySelector('.tr-result-block:nth-child(1) label').textContent = ls[0];
    document.querySelector('.tr-result-block:nth-child(2) label').textContent = ls[1];
    doTranslate();
  });
});

// ====================
// SQL拼接工具
// ====================
document.getElementById('sql-input').addEventListener('input', updateSqlResults);
document.getElementById('sql-clear').addEventListener('click', () => { document.getElementById('sql-input').value = ''; updateSqlResults(); });
document.getElementById('sql-merge').addEventListener('click', () => {
  const input = document.getElementById('sql-input');
  input.value = input.value.split('\n').map(l => l.trim()).filter(Boolean).join(' ');
  updateSqlResults();
});
function updateSqlResults() {
  const lines = document.getElementById('sql-input').value.split('\n').map(l => l.trim()).filter(Boolean);
  document.getElementById('sql-r1').value = lines.map(l => `'${l}'`).join(', ');
  document.getElementById('sql-r2').value = lines.map(l => `"${l}"`).join(', ');
  document.getElementById('sql-r3').value = lines.join(', ');
  document.getElementById('sql-r4').value = '[' + lines.join(', ') + ']';
}
document.querySelectorAll('.sql-copy').forEach(btn => {
  btn.addEventListener('click', () => navigator.clipboard.writeText(document.getElementById(btn.dataset.target).value));
});

// SQL去重
document.getElementById('sql-dedup').addEventListener('click', () => {
  const input = document.getElementById('sql-input');
  const lines = input.value.split('\n').map(l => l.trim()).filter(Boolean);
  input.value = [...new Set(lines)].join('\n');
  updateSqlResults();
});

// SQL格式化
document.getElementById('sql-format').addEventListener('click', () => {
  const input = document.getElementById('sql-input');
  const sql = input.value.trim();
  if (!sql) return;
  input.value = formatSQL(sql);
});

// 复制左侧内容
document.getElementById('sql-copy-input').addEventListener('click', () => {
  const text = document.getElementById('sql-input').value;
  if (!text) return;
  navigator.clipboard.writeText(text);
  showToast('复制成功');
});

function formatSQL(sql) {
  // 主要关键字列表（大写化 + 换行）
  const majorKw = ['SELECT','FROM','WHERE','AND','OR','ORDER BY','GROUP BY','HAVING',
    'LEFT JOIN','RIGHT JOIN','INNER JOIN','OUTER JOIN','FULL JOIN','CROSS JOIN','JOIN',
    'ON','SET','VALUES','INSERT INTO','UPDATE','DELETE FROM','CREATE TABLE','ALTER TABLE',
    'DROP TABLE','LIMIT','OFFSET','UNION ALL','UNION','EXCEPT','INTERSECT','CASE','WHEN',
    'THEN','ELSE','END','AS','IN','NOT IN','EXISTS','NOT EXISTS','BETWEEN','LIKE','IS NULL',
    'IS NOT NULL','ASC','DESC','DISTINCT','INTO','WITH'];

  // 先统一空白
  let s = sql.replace(/\s+/g, ' ').trim();

  // 关键字大写化（不区分大小写替换）
  for (const kw of majorKw) {
    const re = new RegExp('\\b' + kw.replace(/ /g, '\\s+') + '\\b', 'gi');
    s = s.replace(re, kw);
  }

  // 在主要关键字前换行
  const breakBefore = ['SELECT','FROM','WHERE','AND','OR','ORDER BY','GROUP BY','HAVING',
    'LEFT JOIN','RIGHT JOIN','INNER JOIN','OUTER JOIN','FULL JOIN','CROSS JOIN','JOIN',
    'ON','SET','VALUES','INSERT INTO','UPDATE','DELETE FROM','LIMIT','OFFSET',
    'UNION ALL','UNION','EXCEPT','INTERSECT','WITH'];

  for (const kw of breakBefore) {
    // 避免重复换行
    const re = new RegExp('(?<!\\n)\\s+(' + kw.replace(/ /g, '\\s+') + ')\\b', 'g');
    s = s.replace(re, '\n$1');
  }

  // 缩进子句
  const lines = s.split('\n');
  const indentKw = ['AND','OR','ON','SET','VALUES','WHEN','THEN','ELSE'];
  const result = lines.map(line => {
    const trimmed = line.trim();
    const firstWord = trimmed.split(/\s/)[0];
    const firstTwo = trimmed.split(/\s/).slice(0, 2).join(' ');
    if (indentKw.includes(firstWord) || indentKw.includes(firstTwo)) {
      return '    ' + trimmed;
    }
    return trimmed;
  });

  let formatted = result.join('\n');
  return formatted;
}

// ====================
// Cron生成器（动态UI，参考 bejson.com）
// ====================
const cronFields = { second: '*', minute: '*', hour: '*', day: '*', month: '*', week: '?', year: '' };
let currentCronField = 'second';
const CY = new Date().getFullYear();
const fieldRanges = { second:[0,59], minute:[0,59], hour:[0,23], day:[1,31], month:[1,12], week:[1,7], year:[CY, CY+6] };
const fieldNames = { second:'秒', minute:'分', hour:'时', day:'日', month:'月', week:'周', year:'年' };
const weekDayNames = ['','周日','周一','周二','周三','周四','周五','周六'];

document.querySelectorAll('.cron-ftab').forEach(tab => {
  tab.addEventListener('click', () => {
    document.querySelectorAll('.cron-ftab').forEach(t => t.classList.remove('active'));
    tab.classList.add('active');
    currentCronField = tab.dataset.field;
    buildCronUI();
  });
});

// 动态构建当前字段的选项UI
function buildCronUI() {
  const container = document.getElementById('cron-options');
  const f = currentCronField;
  const name = fieldNames[f];
  const range = fieldRanges[f];
  const val = cronFields[f];
  let html = '';

  if (f === 'week') {
    html = buildWeekUI(val);
  } else if (f === 'year') {
    html = buildYearUI(val, range);
  } else if (f === 'day' || f === 'month') {
    html = buildDayMonthUI(f, name, val, range);
  } else {
    // 秒、分、时
    html = buildStdUI(f, name, val, range);
  }
  container.innerHTML = html;
  bindCronEvents();
}

function buildStdUI(f, name, val, range) {
  const rv = parseRangeVal(val, range);
  const cv = parseCycleVal(val, range);
  let h = '';
  h += `<div class="cron-opt-row"><label><input type="radio" name="cf-type" value="every" ${val==='*'?'checked':''}> 每${name} 允许的通配符 <code>, - * /</code></label></div>`;
  h += `<div class="cron-opt-row"><label><input type="radio" name="cf-type" value="range" ${val.includes('-')&&!val.includes('/')?'checked':''}> 周期从</label> <input type="number" class="cron-num cf-range-s" min="${range[0]}" max="${range[1]}" value="${rv[0]}"> - <input type="number" class="cron-num cf-range-e" min="${range[0]}" max="${range[1]}" value="${rv[1]}"> ${name}</div>`;
  h += `<div class="cron-opt-row"><label><input type="radio" name="cf-type" value="cycle" ${val.includes('/')?'checked':''}> 从</label> <input type="number" class="cron-num cf-cycle-s" min="${range[0]}" max="${range[1]}" value="${cv[0]}"> ${name}开始，每 <input type="number" class="cron-num cf-cycle-step" min="1" max="${range[1]-range[0]}" value="${cv[1]}"> ${name}执行一次</div>`;
  h += `<div class="cron-opt-row"><label><input type="radio" name="cf-type" value="specify" ${isSpecifyVal(val)?'checked':''}> 指定</label></div>`;
  h += buildSpecifyGrid(f, range, val);
  return h;
}

function buildDayMonthUI(f, name, val, range) {
  const rv = parseRangeVal(val, range);
  const cv = parseCycleVal(val, range);
  let h = '';
  h += `<div class="cron-opt-row"><label><input type="radio" name="cf-type" value="every" ${val==='*'?'checked':''}> 每${name} 允许的通配符 <code>, - * /</code></label></div>`;
  h += `<div class="cron-opt-row"><label><input type="radio" name="cf-type" value="none" ${val==='?'?'checked':''}> 不指定</label></div>`;
  h += `<div class="cron-opt-row"><label><input type="radio" name="cf-type" value="range" ${val.includes('-')&&!val.includes('/')?'checked':''}> 周期从</label> <input type="number" class="cron-num cf-range-s" min="${range[0]}" max="${range[1]}" value="${rv[0]}"> - <input type="number" class="cron-num cf-range-e" min="${range[0]}" max="${range[1]}" value="${rv[1]}"> ${name}</div>`;
  h += `<div class="cron-opt-row"><label><input type="radio" name="cf-type" value="cycle" ${val.includes('/')?'checked':''}> 从</label> <input type="number" class="cron-num cf-cycle-s" min="${range[0]}" max="${range[1]}" value="${cv[0]}"> ${name}开始，每 <input type="number" class="cron-num cf-cycle-step" min="1" max="${range[1]-range[0]}" value="${cv[1]}"> ${name}执行一次</div>`;
  h += `<div class="cron-opt-row"><label><input type="radio" name="cf-type" value="specify" ${isSpecifyVal(val)?'checked':''}> 指定</label></div>`;
  h += buildSpecifyGrid(f, range, val);
  return h;
}

// 解析区间值，返回 [start, end]
function parseRangeVal(val, range) {
  if (val.includes('-') && !val.includes('/')) {
    const parts = val.split('-').map(Number);
    if (parts.length === 2 && !isNaN(parts[0]) && !isNaN(parts[1])) return parts;
  }
  return [range[0], range[1]];
}
// 解析周期值，返回 [start, step]
function parseCycleVal(val, range) {
  if (val.includes('/')) {
    const parts = val.split('/').map(Number);
    if (parts.length === 2 && !isNaN(parts[0]) && !isNaN(parts[1])) return parts;
  }
  return [range[0], 1];
}
// 判断是否为指定模式（逗号分隔或单个数字，排除 * ? 和含 - /）
function isSpecifyVal(val) {
  if (['*', '?', ''].includes(val)) return false;
  if (val.includes('-') || val.includes('/') || val.includes('#') || val.includes('L')) return false;
  return true;
}


function buildYearUI(val, range) {
  const rv = parseRangeVal(val, range);
  let h = '';
  h += `<div class="cron-opt-row"><label><input type="radio" name="cf-type" value="none" ${!val||val===''?'checked':''}> 不指定 允许的通配符 <code>, - * /</code> 非必填</label></div>`;
  h += `<div class="cron-opt-row"><label><input type="radio" name="cf-type" value="every" ${val==='*'?'checked':''}> 每年</label></div>`;
  h += `<div class="cron-opt-row"><label><input type="radio" name="cf-type" value="range" ${val.includes('-')?'checked':''}> 周期从</label> <input type="number" class="cron-num cf-range-s" min="${range[0]}" max="${range[1]}" value="${rv[0]}"> - <input type="number" class="cron-num cf-range-e" min="${range[0]}" max="${range[1]}" value="${rv[1]}"></div>`;
  return h;
}

function buildWeekUI(val) {
  // 解析当前值来回填
  let rsVal=1, reVal=7, nthVal=1, ndayVal=1, lastVal=1;
  if (val.includes('-') && !val.includes('#') && !val.includes('L')) {
    const parts = val.split('-').map(Number);
    if (parts.length===2) { rsVal=parts[0]; reVal=parts[1]; }
  }
  if (val.includes('#')) {
    const parts = val.split('#').map(Number);
    if (parts.length===2) { ndayVal=parts[0]; nthVal=parts[1]; }
  }
  if (val.endsWith('L') && !val.includes('-')) {
    lastVal = parseInt(val) || 1;
  }

  let h = '';
  h += `<div class="cron-opt-row"><label><input type="radio" name="cf-type" value="every" ${val==='*'?'checked':''}> 每周 允许的通配符 <code>, - * /</code></label></div>`;
  h += `<div class="cron-opt-row"><label><input type="radio" name="cf-type" value="none" ${val==='?'?'checked':''}> 不指定</label></div>`;
  h += `<div class="cron-opt-row"><label><input type="radio" name="cf-type" value="range" ${val.includes('-')&&!val.includes('#')&&!val.includes('L')?'checked':''}> 周期从</label> ${weekSelect('cf-wk-rs',rsVal)} - ${weekSelect('cf-wk-re',reVal)}</div>`;
  h += `<div class="cron-opt-row"><label><input type="radio" name="cf-type" value="nth" ${val.includes('#')?'checked':''}> 第</label> <select class="tool-select cron-num" id="cf-wk-nth">${[1,2,3,4,5].map(i=>`<option value="${i}"${i===nthVal?' selected':''}>${i}</option>`).join('')}</select> 星期的星期 ${weekSelect('cf-wk-nday',ndayVal)}</div>`;
  h += `<div class="cron-opt-row"><label><input type="radio" name="cf-type" value="last" ${val.includes('L')?'checked':''}> 本月最后一个星期</label> ${weekSelect('cf-wk-last',lastVal)}</div>`;
  h += `<div class="cron-opt-row"><label><input type="radio" name="cf-type" value="specify" ${isSpecifyVal(val)?'checked':''}> 指定</label></div>`;
  h += '<div class="cron-spec-grid" id="cf-spec-grid">';
  for (let i = 1; i <= 7; i++) {
    const ck = val.split(',').includes(String(i)) ? ' checked' : '';
    h += `<label><input type="checkbox" value="${i}" class="cf-spec-cb"${ck}> ${i} (${weekDayNames[i]})</label>`;
  }
  h += '</div>';
  return h;
}

function weekSelect(id, defVal) {
  let h = `<select class="tool-select cron-num" id="${id}">`;
  for (let i = 1; i <= 7; i++) h += `<option value="${i}"${i===defVal?' selected':''}>${i} (${weekDayNames[i]})</option>`;
  return h + '</select>';
}

function buildSpecifyGrid(f, range, val) {
  let h = '<div class="cron-spec-grid" id="cf-spec-grid">';
  if (f === 'hour') {
    h += '<span class="spec-group-label">AM:</span>';
    for (let i = 0; i <= 12; i++) { const ck = val.split(',').includes(String(i)) ? ' checked' : ''; h += `<label><input type="checkbox" value="${i}" class="cf-spec-cb"${ck}> ${i}</label>`; }
    h += '<br><span class="spec-group-label">PM:</span>';
    for (let i = 13; i <= 23; i++) { const ck = val.split(',').includes(String(i)) ? ' checked' : ''; h += `<label><input type="checkbox" value="${i}" class="cf-spec-cb"${ck}> ${i}</label>`; }
  } else {
    for (let i = range[0]; i <= range[1]; i++) { const ck = val.split(',').includes(String(i)) ? ' checked' : ''; h += `<label><input type="checkbox" value="${i}" class="cf-spec-cb"${ck}> ${i}</label>`; }
  }
  return h + '</div>';
}


// 绑定动态生成的事件（用命名函数避免重复绑定）
function bindCronEvents() {
  const container = document.getElementById('cron-options');
  container.removeEventListener('change', onCronOptChange);
  container.removeEventListener('input', onCronOptInput);
  container.removeEventListener('focusout', onCronOptBlur);
  container.addEventListener('change', onCronOptChange);
  container.addEventListener('input', onCronOptInput);
  container.addEventListener('focusout', onCronOptBlur);
}

// blur时修正空值
function onCronOptBlur(e) {
  if (e.target.classList.contains('cron-num') && e.target.type === 'number') {
    if (e.target.value === '' || isNaN(parseInt(e.target.value))) {
      e.target.value = e.target.min || '0';
      collectCronValue();
    }
  }
}

function onCronOptChange(e) {
  if (e.target.name === 'cf-type' || e.target.classList.contains('cf-spec-cb')) {
    collectCronValue();
  }
  // 周下拉框
  if (e.target.id && e.target.id.startsWith('cf-wk-')) collectCronValue();
}

function onCronOptInput(e) {
  if (e.target.classList.contains('cron-num') && e.target.type === 'number') {
    const min = parseInt(e.target.min), max = parseInt(e.target.max);
    let v = parseInt(e.target.value);
    // 空值不处理，等blur时修正
    if (e.target.value === '') return;
    if (!isNaN(v) && !isNaN(min) && v < min) { e.target.value = min; v = min; }
    if (!isNaN(v) && !isNaN(max) && v > max) { e.target.value = max; v = max; }
    // 区间约束：开始<结束
    const rs = document.querySelector('.cf-range-s'), re = document.querySelector('.cf-range-e');
    if (rs && re) {
      let s = parseInt(rs.value), en = parseInt(re.value);
      if (!isNaN(s) && !isNaN(en) && s >= en) {
        if (e.target === rs) rs.value = Math.max(parseInt(rs.min)||0, en - 1);
        else re.value = Math.min(parseInt(re.max)||99, s + 1);
      }
    }
    collectCronValue();
  }
}

function collectCronValue() {
  const type = document.querySelector('input[name="cf-type"]:checked');
  if (!type) return;
  const f = currentCronField;
  const range = fieldRanges[f];
  let val = '*';

  switch (type.value) {
    case 'every': val = '*'; break;
    case 'none': val = (f === 'year') ? '' : '?'; break;
    case 'range': {
      if (f === 'week') {
        const wrs = document.getElementById('cf-wk-rs'), wre = document.getElementById('cf-wk-re');
        if (wrs && wre) val = wrs.value + '-' + wre.value;
      } else {
        const rs = document.querySelector('.cf-range-s'), re = document.querySelector('.cf-range-e');
        if (rs && re) {
          const sv = parseInt(rs.value); const ev = parseInt(re.value);
          const s = isNaN(sv) ? range[0] : sv;
          const e = isNaN(ev) ? range[1] : ev;
          val = s + '-' + e;
        }
      }
      break;
    }
    case 'cycle': {
      const cs = document.querySelector('.cf-cycle-s'), step = document.querySelector('.cf-cycle-step');
      if (cs && step) {
        const sv = parseInt(cs.value) || fieldRanges[f][0];
        const stv = parseInt(step.value) || 1;
        val = sv + '/' + stv;
      }
      break;
    }
    case 'nth': {
      const nth = document.getElementById('cf-wk-nth'), nday = document.getElementById('cf-wk-nday');
      if (nth && nday) val = nday.value + '#' + nth.value;
      break;
    }
    case 'last': {
      const ld = document.getElementById('cf-wk-last');
      if (ld) val = ld.value + 'L';
      break;
    }
    case 'specify': {
      const cbs = [...document.querySelectorAll('.cf-spec-cb:checked')].map(c => c.value);
      val = cbs.length > 0 ? cbs.join(',') : (f === 'week' ? '?' : '*');
      break;
    }
  }
  cronFields[f] = val;
  updateCronExpr();
}

function updateCronExpr() {
  const parts = [cronFields.second, cronFields.minute, cronFields.hour, cronFields.day, cronFields.month, cronFields.week];
  if (cronFields.year) parts.push(cronFields.year);
  document.getElementById('cron-expr').value = parts.join(' ');
  document.getElementById('cf-second').textContent = cronFields.second;
  document.getElementById('cf-minute').textContent = cronFields.minute;
  document.getElementById('cf-hour').textContent = cronFields.hour;
  document.getElementById('cf-day').textContent = cronFields.day;
  document.getElementById('cf-month').textContent = cronFields.month;
  document.getElementById('cf-week').textContent = cronFields.week;
  document.getElementById('cf-year').textContent = cronFields.year;
  generateNextRuns(parts.join(' '));
}

function generateNextRuns(expr) {
  const div = document.getElementById('cron-next-runs');
  try {
    const parts = expr.split(' '); const runs = []; let t = new Date(); t.setMilliseconds(0);
    for (let i = 0; i < 100000 && runs.length < 8; i++) {
      t = new Date(t.getTime() + 1000);
      if (matchCron(t, parts)) {
        const p = n => String(n).padStart(2,'0');
        runs.push(`${t.getFullYear()}-${p(t.getMonth()+1)}-${p(t.getDate())} ${p(t.getHours())}:${p(t.getMinutes())}:${p(t.getSeconds())}`);
      }
    }
    div.textContent = runs.length > 0 ? runs.join('\n') : '无法计算';
  } catch(e) { div.textContent = '表达式无效'; }
}
function mf(f,v,date,fieldIdx) {
  if(f==='*'||f==='?') return true;
  if(f.includes(',')) return f.split(',').some(x=>mf(x.trim(),v,date,fieldIdx));
  if(f.includes('#') && fieldIdx===5) {
    // 周#N: dayOfWeek#weekOfMonth
    const [dow,n]=f.split('#').map(Number);
    if(v!==dow) return false;
    const d=date.getDate();
    return Math.ceil(d/7)===n;
  }
  if(f.endsWith('L') && fieldIdx===5) {
    // 周L: 本月最后一个星期X
    const dow=parseInt(f);
    if(v!==dow) return false;
    const lastDay=new Date(date.getFullYear(),date.getMonth()+1,0).getDate();
    return date.getDate()+7>lastDay;
  }
  if(f==='L' && fieldIdx===3) {
    // 日L: 本月最后一天
    const lastDay=new Date(date.getFullYear(),date.getMonth()+1,0).getDate();
    return v===lastDay;
  }
  if(f.includes('-')&&!f.includes('/')) { const [a,b]=f.split('-').map(Number); return v>=a&&v<=b; }
  if(f.includes('/')) { const [s,st]=f.split('/').map(Number); return v>=s&&(v-s)%st===0; }
  return parseInt(f)===v;
}
function matchCron(d, p) {
  const s=d.getSeconds(),m=d.getMinutes(),h=d.getHours(),dy=d.getDate(),mo=d.getMonth()+1,w=d.getDay()||7;
  return mf(p[0],s,d,0)&&mf(p[1],m,d,1)&&mf(p[2],h,d,2)&&mf(p[3],dy,d,3)&&mf(p[4],mo,d,4)&&mf(p[5],w,d,5);
}

document.getElementById('cron-copy').addEventListener('click', () => navigator.clipboard.writeText(document.getElementById('cron-expr').value));
document.getElementById('cron-clear').addEventListener('click', () => {
  cronFields.second='*'; cronFields.minute='*'; cronFields.hour='*';
  cronFields.day='*'; cronFields.month='*'; cronFields.week='?'; cronFields.year='';
  currentCronField='second';
  document.querySelectorAll('.cron-ftab').forEach(t=>t.classList.remove('active'));
  document.querySelector('.cron-ftab[data-field="second"]').classList.add('active');
  buildCronUI(); updateCronExpr();
});
document.getElementById('cron-expr').removeAttribute('readonly');
document.getElementById('cron-parse').addEventListener('click', parseCronExpr);
document.getElementById('cron-expr').addEventListener('keydown', e => { if(e.key==='Enter') parseCronExpr(); });
function parseCronExpr() {
  const input = document.getElementById('cron-expr');
  const expr = input.value.trim();
  const parts = expr.split(/\s+/);

  // 基本格式校验
  if (parts.length < 6 || parts.length > 7) {
    showToast('Cron表达式需要6或7个字段（秒 分 时 日 月 周 [年]）', 'error');
    return;
  }

  const errors = [];
  const validators = [
    { name: '秒', val: parts[0], range: [0, 59] },
    { name: '分', val: parts[1], range: [0, 59] },
    { name: '时', val: parts[2], range: [0, 23] },
    { name: '日', val: parts[3], range: [1, 31], allowQ: true, allowL: true },
    { name: '月', val: parts[4], range: [1, 12] },
    { name: '周', val: parts[5], range: [1, 7], allowQ: true, allowL: true, allowHash: true },
  ];
  if (parts[6]) validators.push({ name: '年', val: parts[6], range: [1970, 2099] });

  for (const v of validators) {
    const err = validateCronField(v.val, v.range, v.allowQ, v.allowL, v.allowHash);
    if (err) errors.push(`${v.name}: ${err}`);
  }

  if (errors.length > 0) {
    showToast('Cron表达式错误:\n' + errors.join('\n'), 'error');
    return;
  }

  cronFields.second=parts[0]; cronFields.minute=parts[1]; cronFields.hour=parts[2];
  cronFields.day=parts[3]; cronFields.month=parts[4]; cronFields.week=parts[5];
  cronFields.year=parts[6]||'';
  updateCronExpr(); buildCronUI();
  showToast('解析成功');
}

function validateCronField(val, range, allowQ, allowL, allowHash) {
  if (val === '*' || (val === '?' && allowQ)) return null;
  if (val === 'L' && allowL) return null;

  // 逗号分隔的多值
  const segments = val.split(',');
  for (const seg of segments) {
    const err = validateCronSegment(seg.trim(), range, allowL, allowHash);
    if (err) return `"${seg}" ${err}`;
  }
  return null;
}

function validateCronSegment(seg, range, allowL, allowHash) {
  // L后缀: 如 6L
  if (allowL && /^\d+L$/.test(seg)) {
    const n = parseInt(seg);
    if (n < range[0] || n > range[1]) return `值${n}超出范围${range[0]}-${range[1]}`;
    return null;
  }
  // #: 如 5#3
  if (allowHash && /^\d+#\d+$/.test(seg)) {
    const [d, w] = seg.split('#').map(Number);
    if (d < range[0] || d > range[1]) return `值${d}超出范围${range[0]}-${range[1]}`;
    if (w < 1 || w > 5) return `第${w}周超出范围1-5`;
    return null;
  }
  // 区间: 如 5-30
  if (/^\d+-\d+$/.test(seg)) {
    const [a, b] = seg.split('-').map(Number);
    if (a < range[0] || a > range[1]) return `起始值${a}超出范围${range[0]}-${range[1]}`;
    if (b < range[0] || b > range[1]) return `结束值${b}超出范围${range[0]}-${range[1]}`;
    if (a >= b) return `起始值${a}应小于结束值${b}`;
    return null;
  }
  // 周期: 如 0/5
  if (/^\d+\/\d+$/.test(seg)) {
    const [s, step] = seg.split('/').map(Number);
    if (s < range[0] || s > range[1]) return `起始值${s}超出范围${range[0]}-${range[1]}`;
    if (step < 1) return `步长${step}应大于0`;
    return null;
  }
  // 固定数字
  if (/^\d+$/.test(seg)) {
    const n = parseInt(seg);
    if (n < range[0] || n > range[1]) return `值${n}超出范围${range[0]}-${range[1]}`;
    return null;
  }
  return `格式无效`;
}

buildCronUI();
updateCronExpr();

// ====================
// 文本处理
// ====================
const txtInput = document.getElementById('txt-input');
const txtResult = document.getElementById('txt-result');
const txtCharCount = document.getElementById('txt-char-count');
const txtResultCount = document.getElementById('txt-result-count');

txtInput.addEventListener('input', () => { txtCharCount.textContent = txtInput.value.length; });

function setTxtResult(val) {
  txtResult.value = val;
  txtResultCount.textContent = val.length;
}

document.getElementById('txt-rm-spaces').addEventListener('click', () => {
  setTxtResult(txtInput.value.replace(/ /g, ''));
});

document.getElementById('txt-rm-empty').addEventListener('click', () => {
  setTxtResult(txtInput.value.replace(/\r?\n/g, ''));
});

document.getElementById('txt-dedup').addEventListener('click', () => {
  const lines = txtInput.value.split(/\r?\n/).map(l => l.trim()).filter(Boolean);
  setTxtResult([...new Set(lines)].join('\n'));
});

document.getElementById('txt-unicode2cn').addEventListener('click', () => {
  try {
    const result = txtInput.value.replace(/\\u([0-9a-fA-F]{4})/g, (_, hex) => String.fromCharCode(parseInt(hex, 16)));
    setTxtResult(result);
  } catch (e) { setTxtResult('转换失败: ' + e.message); }
});

document.getElementById('txt-cn2unicode').addEventListener('click', () => {
  const result = Array.from(txtInput.value).map(ch => {
    const code = ch.charCodeAt(0);
    return code > 127 ? '\\u' + code.toString(16).padStart(4, '0') : ch;
  }).join('');
  setTxtResult(result);
});

document.getElementById('txt-copy-result').addEventListener('click', () => {
  navigator.clipboard.writeText(txtResult.value);
});

document.getElementById('txt-clear').addEventListener('click', () => {
  txtInput.value = '';
  txtResult.value = '';
  txtCharCount.textContent = '0';
  txtResultCount.textContent = '0';
});
