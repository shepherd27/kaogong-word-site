(function () {
  'use strict';

  var HKEY = 'wordHistoryV1';
  var HISTORY = loadHistory();

  function loadHistory() {
    try {
      var j = JSON.parse(localStorage.getItem(HKEY) || 'null');
      if (j && j.words && typeof j.words === 'object') return j;
    } catch (e) {}
    return { words: {} };
  }
  function saveHistory() {
    try { localStorage.setItem(HKEY, JSON.stringify(HISTORY)); } catch (e) {}
  }

  var ROWS = null, HAYS = null, BY_ID = null, DATA_PROMISE = null;
  var HIT_CACHE = new Map();

  function recordSearch(data, scope, bump) {
  const now = Date.now();
  for (const w of data.words || []) {
    const st = data.stats[w] || {};
    const co = data.collocations[w] || { left: [], right: [] };
    const sc = data.scenes[w] || {};
    const prev = HISTORY.words[w];
    HISTORY.words[w] = {
      word: w,
      count: bump ? (((prev && prev.count) || 0) + 1) : ((prev && prev.count) || 1),
      first: (prev && prev.first) || now,
      last: now,
      scope,
      stats: {
        total: st.total || 0,
        sampled: st.sampled || 0,
        unique: st.sampled || st.unique || 0,
        asCorrect: st.asCorrect || 0,
        asDistractor: st.asDistractor || 0,
        inStem: st.inStem || 0,
        inMaterial: st.inMaterial || 0,
        inAnalysis: st.inAnalysis || 0
      },
      left: (co.left || []).slice(0, 4),
      right: (co.right || []).slice(0, 4),
      domains: (sc.domains || []).slice(0, 2),
      kaofa: (sc.kaofa || []).slice(0, 3),
      senti: sc.sentiment || { neg: 0, pos: 0, neu: 0 }
    };
  }
  saveHistory();
}

  const DOMAINS = [
  ['政治/治理', ['政府', '政策', '改革', '治国', '政党', '干部', '制度', '治理', '廉政', '腐败', '作风', '基层', '群众', '战略', '部署', '落实', '机制', '体制', '职能', '党建', '监督', '执法', '法治', '政务', '大局', '中央', '地方', '部门', '职责', '担当', '使命']],
  ['经济/产业', ['经济', '市场', '企业', '产业', '金融', '投资', '消费', '增长', '价格', '房价', '贸易', '就业', '产能', '成本', '效益', '资本', '财政', '税收', '供需', '融资', '利润', '商业', '生产', '经营', '营收']],
  ['社会民生', ['社会', '民生', '教育', '医疗', '养老', '住房', '城乡', '人口', '保障', '福利', '社区', '公共服务', '扶贫', '脱贫', '社保', '医保', '户籍', '收入', '家庭', '儿童', '老年', '残疾', '救助', '公益']],
  ['生态环保', ['生态', '环境', '污染', '碳排放', '环保', '资源', '气候', '绿色', '节能', '减排', '雾霾', '水质', '土壤', '生物多样性', '森林', '湿地', '垃圾', '能耗', '低碳']],
  ['医疗卫生', ['疾病', '病毒', '疫情', '医疗', '健康', '治疗', '药物', '免疫', '临床', '细菌', '感染', '疫苗', '医院', '患者', '症状', '诊断', '手术', '护理', '卫生', '防控']],
  ['科技/信息', ['科技', '技术', '创新', '数字', '人工智能', '网络', '数据', '信息', '研发', '智能', '算法', '芯片', '互联网', '平台', '信息化', '自动化', '大数据', '云计算', '软件', '系统']],
  ['人际/心理', ['心理', '情绪', '情感', '人际', '沟通', '态度', '性格', '感受', '焦虑', '压力', '关系', '交往', '信任', '理解', '尊重', '孤独', '心态', '认知', '认同', '共情']],
  ['文化/文艺', ['文化', '文学', '艺术', '作品', '创作', '传统', '历史', '审美', '语言', '诗词', '小说', '绘画', '音乐', '戏剧', '影视', '经典', '文脉', '传承', '人文', '书香']],
  ['职场/管理', ['管理', '团队', '员工', '工作', '效率', '组织', '领导', '执行', '考核', '项目', '任务', '协作', '绩效', '培训', '岗位', '流程', '决策', '运营']],
];

const STYLES = [
  ['公文/时评', ['坚决', '必须', '进一步', '切实', '全面', '推动', '加强', '落实', '有关', '各地', '部门', '深入', '持续', '着力', '统筹', '推进']],
  ['学术/科技', ['研究', '数据', '实验', '分析', '机制', '效应', '临床', '统计', '指标', '模型', '理论', '验证']],
  ['文学/描写', ['仿佛', '宛如', '心境', '暮色', '岁月', '眼神', '微笑', '沉默', '记忆', '风景']],
  ['口语', ['咱', '啥', '吧', '呢', '挺', '老是', '反正', '大伙', '咋', '呗', '嘛']],
];

const NEG_WORDS = ['问题', '困难', '风险', '危机', '下滑', '腐败', '污染', '恶性', '矛盾', '挑战', '不足', '缺失', '恶化', '蔓延', '上涨', '压力', '隐患', '损害', '阻碍', '困境', '威胁', '衰退'];
const POS_WORDS = ['发展', '进步', '提升', '改善', '成效', '优势', '机遇', '繁荣', '稳定', '成就', '突破', '活力', '和谐', '幸福', '成功'];

function escLike(s) {
  return s.replace(/[\\%_]/g, (m) => '\\' + m);
}

function safeJson(s, fallback) {
  try { return JSON.parse(s); } catch { return fallback; }
}

function answerIdx(row) {
  let i = Number(row.answerIndex);
  if (Number.isInteger(i) && i >= 0) return i;
  const a = String(row.answer ?? '').trim();
  if (/^[A-Ha-h]$/.test(a)) return a.toUpperCase().charCodeAt(0) - 65;
  const n = parseInt(a, 10);
  return Number.isInteger(n) ? n : -1;
}

const PUNCT = /[\s，。；：！？、“”‘’（）《》〈〉【】—…·,.;:!?"'()\[\]{}<>\/\\|@#$%^&*+=~`0-9A-Za-z]/;
const STOP = /[的了是在与和而其他此该这那也都就着过并或及]/;

function countOcc(text, kw) {
  let n = 0, from = 0;
  while (true) {
    const i = text.indexOf(kw, from);
    if (i < 0) break;
    n++; from = i + kw.length;
  }
  return n;
}

function collectCollocations(texts, word, leftMap, rightMap) {
  for (const text of texts) {
    let from = 0;
    while (true) {
      const i = text.indexOf(word, from);
      if (i < 0) break;
      const l = text.slice(Math.max(0, i - 6), i);
      const r = text.slice(i + word.length, i + word.length + 6);
      const lm = l.match(/[\u4e00-\u9fa5]{2}$/);
      if (lm) {
        const k = lm[0];
        if (!PUNCT.test(k) && !STOP.test(k[k.length - 1])) leftMap.set(k, (leftMap.get(k) || 0) + 1);
      }
      const rm = r.match(/^[\u4e00-\u9fa5]{2}/);
      if (rm) {
        const k = rm[0];
        if (!PUNCT.test(k) && !STOP.test(k[0])) rightMap.set(k, (rightMap.get(k) || 0) + 1);
      }
      from = i + word.length;
    }
  }
}

function sentencesWith(text, word) {
  if (!text) return [];
  return text.split(/[。！？\n；]/).map((s) => s.trim()).filter((s) => s && s.includes(word));
}

function clip(s, n) {
  s = String(s || '').replace(/\s+/g, ' ').trim();
  return s.length > n ? s.slice(0, n) + '…' : s;
}

function dedupeList(arr, keyFn, limit) {
  const seen = new Set();
  const out = [];
  for (const it of arr) {
    const k = keyFn(it);
    if (seen.has(k)) continue;
    seen.add(k);
    out.push(it);
    if (out.length >= limit) break;
  }
  return out;
}

function competitorFor(opts, ai, w) {
  if (ai < 0 || opts[ai] == null) return '';
  const ansParts = splitSlots(opts[ai]);
  let slot = -1;
  for (const o of opts) {
    const s = String(o);
    if (!s.includes(w)) continue;
    const parts = splitSlots(s);
    const idx = parts.findIndex((p) => p.includes(w));
    if (idx >= 0) { slot = idx; break; }
  }
  if (slot >= 0 && ansParts[slot] && ansParts[slot].length <= 14) return clip(ansParts[slot], 24);
  return '';
}

function splitSlots(s) {
  const str = String(s || '');
  let parts = str.split(/[\u3000 ]{2,}/).filter(Boolean);
  if (parts.length === 1) parts = str.split(/\s+/).filter(Boolean);
  return parts;
}

function slotIndexFor(opts, ai, w) {
  for (let i = 0; i < opts.length; i++) {
    const s = String(opts[i]);
    if (!s.includes(w)) continue;
    const parts = splitSlots(s);
    const idx = parts.findIndex((p) => p.includes(w));
    if (idx >= 0) return idx;
  }
  return -1;
}

function buildFill(content, slots, targetIdx, markVal) {
  const re = /[\u00A0 \u3000]{2,}|_{2,}|＿{2,}/g;
  let out = '', last = 0, idx = 0, m;
  while ((m = re.exec(content)) !== null) {
    out += content.slice(last, m.index);
    let val = idx < slots.length ? slots[idx] : m[0];
    if (idx === targetIdx) val = '[[' + (markVal || val) + ']]';
    out += val;
    last = m.index + m[0].length;
    idx++;
  }
  out += content.slice(last);
  return { text: out, blanks: idx };
}

function stripInstr(s) {
  return String(s || '')
    .replace(/(?:依次)?填入[^。！？\n]{0,25}?是[：:]/g, '')
    .replace(/(?:依次)?填入[^。！？\n]{0,25}?(?:一项|一组|选项)[。！？]?/g, '')
    .replace(/[。\s]*是[（(]\s*[）)][。.]?/g, '');
}

function isDefinition(s, w) {
  if (s.includes('出处')) return false;
  const quoted = s.includes('“' + w + '”') || s.includes('"' + w + '"') || s.includes('「' + w + '」');
  return quoted && /指|是指|意为|表示/.test(s);
}

function buildOptionNotes(analysis, opts) {
  const notes = {};
  if (!analysis) return notes;
  const re = /([A-H])\s*(?:项|选项|[.．])/g;
  const marks = [];
  let m;
  while ((m = re.exec(analysis)) !== null) {
    if (m.index > 0 && /[、,，]/.test(analysis[m.index - 1])) continue;
    marks.push({ L: m[1], idx: m.index, end: m.index + m[0].length });
  }
  for (let i = 0; i < marks.length; i++) {
    const stop = i + 1 < marks.length ? marks[i + 1].idx : analysis.length;
    let seg = analysis.slice(marks[i].end, stop).trim();
    const segs = seg.split(/[。；;\n]/).map((s) => s.replace(/^[，,、\s]+/, '').trim()).filter(Boolean);
    seg = segs[0] || '';
    if (seg.length < 10 && segs[1]) seg += '；' + segs[1];
    const cut = seg.search(/[A-H]\s*(?:项|选项|三项)/);
    if (cut > 0) seg = seg.slice(0, cut).trim();
    seg = seg.replace(/[，,、；;\s]+$/, '');
    if (seg.length < 4) continue;
    (notes[marks[i].L] = notes[marks[i].L] || []).push(clip(seg, 110));
  }
  for (const L of Object.keys(notes)) notes[L] = dedupeList(notes[L], (x) => x.slice(0, 20), 2);
  for (let i = 0; i < opts.length; i++) {
    const L = String.fromCharCode(65 + i);
    if (notes[L] && notes[L].length) continue;
    const parts = splitSlots(opts[i]).filter((w) => w.length >= 2);
    for (const w of parts) {
      const idx = analysis.indexOf(w);
      if (idx < 0) continue;
      const seg = analysis.slice(idx, idx + 90).split(/[。；\n]/)[0].trim();
      if (/指|比喻|形容|意为|表示|侧重|强调|用于/.test(seg)) { notes[L] = [clip(seg, 110)]; break; }
    }
  }
  return notes;
}

function clipAround(text, radius) {
  text = stripInstr(text);
  const i = text.indexOf('[[');
  if (i < 0) return clip(text, radius * 2);
  let start = Math.max(0, i - radius);
  let end = Math.min(text.length, i + radius * 2);
  const before = text.slice(0, start);
  const p = Math.max(before.lastIndexOf('。'), before.lastIndexOf('！'), before.lastIndexOf('？'), before.lastIndexOf('\n'));
  if (p >= 0) start = p + 1;
  const after = text.slice(end);
  const qs = [after.indexOf('。'), after.indexOf('！'), after.indexOf('？'), after.indexOf('\n')].filter((x) => x >= 0).sort((a, b) => a - b);
  if (qs.length) end = end + qs[0] + 1;
  return (start > 0 ? '…' : '') + text.slice(start, end).trim() + (end < text.length ? '…' : '');
}

const KAOFA = [
  ['固定搭配', ['搭配', '固定搭配', '惯用', '组合']],
  ['程度轻重', ['程度', '过重', '过轻', '轻重', '语气过']],
  ['感情色彩', ['褒贬', '感情色彩', '贬义', '褒义', '色彩']],
  ['适用对象', ['适用对象', '修饰对象', '用于', '适用']],
  ['语义侧重', ['侧重', '侧重点', '强调', '语义差异', '语义']],
  ['语境呼应', ['语境', '呼应', '对应', '照应']],
  ['语体色彩', ['语体', '书面语', '口语']],
  ['望文生义', ['望文生义']],
  ['语义重复', ['重复', '赘余']],
  ['语法功能', ['词性', '语法', '作谓语', '作宾语', '成分']],
];

function kaofaOf(analysis, w) {
  const sents = sentencesWith(analysis, w);
  const pool = sents.length ? sents.join(' ') : analysis;
  const tags = [];
  for (const [name, kws] of KAOFA) if (kws.some((k) => pool.includes(k))) tags.push(name);
  return tags.length ? tags : ['语境辨析'];
}

function pickReason(analysis, w) {
  const sents = sentencesWith(analysis, w);
  const keys = ['不当', '不恰当', '不符', '排除', '程度', '过重', '过轻', '搭配不当', '误用', '不宜', '不能', '对象'];
  const hit = sents.find((s) => keys.some((k) => s.includes(k)));
  return clip(hit || sents[0] || '', 120);
}

  function fnv(s) {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619); }
  return h >>> 0;
}

  function sampleIds(list, cap, seed) {
  if (list.length <= cap) return { picked: list };
  const scored = list.map((r) => ({ r, k: fnv(seed + '|' + (r.questionId || r.id)) }));
  scored.sort((a, b) => a.k - b.k);
  return { picked: scored.slice(0, cap).map((x) => x.r) };
}

  function hitIds(word) {
    var c = HIT_CACHE.get(word);
    if (c) return c;
    var out = [];
    for (var i = 0; i < ROWS.length; i++) {
      if (HAYS[i].indexOf(word) >= 0) out.push({ id: ROWS[i].id, questionId: ROWS[i].questionId });
    }
    if (HIT_CACHE.size > 300) HIT_CACHE.clear();
    HIT_CACHE.set(word, out);
    return out;
  }

  function fetchRows(ids) {
    var out = [];
    for (var i = 0; i < ids.length; i++) {
      var r = BY_ID.get(ids[i]);
      if (r) out.push(r);
    }
    return out;
  }

  function cleanDefinition(s, w) {
  let t = String(s || '');
  const we = w.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const qi = t.search(new RegExp('[“"「]' + we + '[”"」]'));
  if (qi >= 0) {
    t = t.slice(qi).replace(new RegExp('^[“"「]' + we + '[”"」]\\s*'), '');
  } else {
    t = t.replace(/^[A-H]\s*(?:项|选项)?\s*[、，,]?\s*/, '');
  }
  t = t.replace(/^而?\s*/, '').replace(/^[，,、：:\s]+/, '');
  t = t.split(/[，,]\s*(?:与|和)[^，,]{0,30}(?:语义重复|重复|不符|矛盾|无关)/)[0];
  t = t.split(/[，,]\s*(?:与|和)?(?:文意|语境|文段|题意|语义)[^，,]{0,10}(?:不符|不合)/)[0];
  t = t.split(/[，,]\s*(?:文段|材料|题干)[^，,]{0,12}(?:并未|没有|未)/)[0];
  t = t.split(/[，,]\s*(?:并未|没有体现|未曾)/)[0];
  t = t.split(/[，,]\s*(?:故)?(?:排除|不选|错误|不当|不宜)/)[0];
  t = t.replace(/[，,；;、\s]+$/, '');
  return clip(t, 78);
}

function pickFocus(anaSents, w) {
  const usable = (s) => /指|意为|是指|形容|表示|侧重|强调/.test(s);
  const cleanHit = anaSents.find((s) => isDefinition(s, w) && usable(s) && !/排除|不符|不当/.test(s));
  const softHit = anaSents.find((s) => usable(s) && !/排除|不符|不当/.test(s));
  const anyHit = anaSents.find((s) => isDefinition(s, w));
  const pick = cleanHit || softHit || anyHit;
  return pick ? cleanDefinition(pick, w) : '';
}

function runSearch(rawQ, scope) {
  const words = [...new Set(String(rawQ || '').split(/[,，、;；\s]+/).map((s) => s.trim()).filter(Boolean))];
  if (!words.length) return { words: [], stats: {}, collocations: {}, cooccur: [], scenes: {}, questions: [], total: 0 };

  const stats = {};
  const collocations = {};
  const scenes = {};
  const questions = [];
  const candidates = [];
  const seen = new Set();
  const optionSets = [];
  const SAMPLE = 300;

  for (const w of words) {
    const hits = hitIds(w, scope);
    const total = hits.length;
    const { picked } = sampleIds(hits, SAMPLE, w);
    const rows = picked.length ? fetchRows(picked.map((r) => r.id)) : [];

    const st = { word: w, total, sampled: rows.length, asCorrect: 0, asDistractor: 0, inStem: 0, inMaterial: 0, inAnalysis: 0, unique: rows.length };
    const leftMap = new Map();
    const rightMap = new Map();
    const localSeen = new Set();
    const scene = { sample: 0, domains: new Map(), styles: new Map(), neg: 0, pos: 0, neu: 0, examples: [], contexts: [], contrasts: [], defs: [], kaofa: new Map(), loseTo: new Map(), degree: '', focus: '' };

    for (const row of rows) {
      if (localSeen.has(row.questionId)) continue;
      localSeen.add(row.questionId);
      const opts = Array.isArray(row.options) ? row.options : safeJson(row.options, []);
      const ai = answerIdx(row);
      const content = row.content || '';
      const material = row.material || '';
      const analysis = row.analysis || '';
      const optHit = opts.map((o, i) => (String(o).includes(w) ? i : -1)).filter((i) => i >= 0);
      const stemHit = content.includes(w);
      const matHit = material.includes(w);
      const anaHit = analysis.includes(w);
      const correctHit = optHit.includes(ai);
      const distractorHit = optHit.some((i) => i !== ai);
      if (correctHit) st.asCorrect++;
      if (distractorHit) st.asDistractor++;
      if (stemHit) st.inStem++;
      if (matHit) st.inMaterial++;
      if (anaHit) st.inAnalysis++;

      const anaSents = sentencesWith(analysis, w);
      const contentSents = sentencesWith(content, w);
      const matSents = sentencesWith(material, w);
      const evidence = [...contentSents, ...matSents, ...anaSents];
      let sentiLabel = 'neu';
      let qDomains = [];
      let kaoTags = [];

      if (correctHit || distractorHit || evidence.length) {
        scene.sample++;
        let sceneText = '';
        let exampleSents = [];
        if (correctHit) {
          sceneText = content + ' ' + anaSents.join(' ');
          exampleSents = anaSents.length ? anaSents : [content];
        } else if (distractorHit) {
          sceneText = anaSents.join(' ') || content;
          exampleSents = anaSents;
          const ans = competitorFor(opts, ai, w);
          if (ans && !ans.includes(w)) scene.loseTo.set(ans, (scene.loseTo.get(ans) || 0) + 1);
        } else {
          sceneText = evidence.join(' ');
          exampleSents = evidence;
        }

        for (const [name, kws] of DOMAINS) {
          if (kws.some((k) => sceneText.includes(k))) {
            scene.domains.set(name, (scene.domains.get(name) || 0) + 1);
            qDomains.push(name);
          }
        }
        for (const [name, kws] of STYLES) {
          const c = kws.reduce((n, k) => n + countOcc(sceneText, k), 0);
          if (c > 0) scene.styles.set(name, (scene.styles.get(name) || 0) + c);
        }
        let ng = 0, ps = 0;
        for (const k of NEG_WORDS) ng += countOcc(sceneText, k);
        for (const k of POS_WORDS) ps += countOcc(sceneText, k);
        if (ng > ps) { scene.neg++; sentiLabel = 'neg'; }
        else if (ps > ng) { scene.pos++; sentiLabel = 'pos'; }
        else { scene.neu++; sentiLabel = 'neu'; }

        kaoTags = kaofaOf(analysis, w);
        for (const k of kaoTags) scene.kaofa.set(k, (scene.kaofa.get(k) || 0) + 1);

        if ((correctHit || distractorHit) && ai >= 0 && opts[ai] != null) {
          const slots = splitSlots(opts[ai]);
          const tIdx = slotIndexFor(opts, ai, w);
          const isCloze = slots.length >= 1 && slots.every((s) => s.length <= 8) && /填入|横线|划横线/.test(content);
          if (tIdx >= 0 && slots.length && isCloze) {
            if (correctHit) {
              const f = buildFill(content, slots, tIdx, null);
              if (f.text.includes('[[')) scene.contexts.push({ text: clipAround(f.text, 70), paper: row.paperName, qid: row.questionId, kaofa: kaoTags });
            } else {
              const f = buildFill(content, slots, tIdx, null);
              const c = buildFill(content, slots, tIdx, '×' + w);
              if (f.text.includes('[[') && c.text.includes('[[')) {
                scene.contrasts.push({ text: clipAround(c.text, 70), correct: clipAround(f.text, 70), answer: slots[tIdx], reason: pickReason(analysis, w), paper: row.paperName, qid: row.questionId, kaofa: kaoTags });
              }
            }
          }
        }
        for (const s of anaSents) {
          if (isDefinition(s, w)) { scene.defs.push({ text: clip(s, 140), paper: row.paperName, qid: row.questionId }); break; }
        }

        for (const s of exampleSents) {
          if (!s || s.length < 6) continue;
          if (scene.examples.length < 30) scene.examples.push({ text: clip(s, 160), paper: row.paperName, role: correctHit ? 'correct' : distractorHit ? 'distractor' : 'stem' });
        }
        collectCollocations(evidence, w, leftMap, rightMap);
        if (!scene.focus) {
          const fS = anaSents.length ? pickFocus(anaSents, w) : '';
          if (fS) scene.focus = fS;
        }
        if (!scene.degree) {
          const dS = anaSents.find((s) => /过重|过轻|偏重|偏轻|程度较轻|程度较重|较重|较轻/.test(s));
          if (dS) scene.degree = clip(dS, 78);
        }
      }

      if (seen.has(row.questionId)) continue;
      seen.add(row.questionId);
      optionSets.push({ qid: row.questionId, opts: opts.map(String) });

      let role = 'analysis';
      if (correctHit) role = 'correct';
      else if (distractorHit) role = 'distractor';
      else if (stemHit) role = 'stem';
      else if (matHit) role = 'material';

      candidates.push({
        id: row.id,
        qid: row.questionId,
        word: w,
        role,
        senti: sentiLabel,
        domains: qDomains,
        kaofa: kaoTags,
        chapter: row.chapter,
        paper: row.paperName,
        category: row.paperCategory,
        content: content.slice(0, 600),
        materialSnippet: matHit ? (matSents[0] || material.slice(0, 160)) : '',
        options: opts.map(String).slice(0, 8),
        optionNotes: buildOptionNotes(analysis, opts),
        answerIndex: ai,
        answerText: ai >= 0 && opts[ai] != null ? String(opts[ai]) : '',
        analysisSnippet: (anaSents.join(' ') || analysis.slice(0, 180)).slice(0, 200),
        hasAnalysis: !!analysis
      });
    }
    st.unique = localSeen.size;
    stats[w] = st;

    const top = (m) => [...m.entries()].sort((a, b) => b[1] - a[1]).slice(0, 12).map(([s, c]) => ({ s, c }));
    collocations[w] = { left: top(leftMap), right: top(rightMap) };

    const seenEx = new Set();
    const examples = [];
    for (const e of scene.examples) {
      if (seenEx.has(e.text)) continue;
      seenEx.add(e.text);
      examples.push(e);
      if (examples.length >= 6) break;
    }
    scenes[w] = {
      sample: scene.sample,
      hitTotal: total,
      sampled: rows.length,
      focus: scene.focus || '',
      degree: scene.degree || '',
      domains: [...scene.domains.entries()].sort((a, b) => b[1] - a[1]).slice(0, 4).map(([name, count]) => ({ name, count })),
      styles: [...scene.styles.entries()].sort((a, b) => b[1] - a[1]).slice(0, 3).map(([name, count]) => ({ name, count })),
      sentiment: { neg: scene.neg, pos: scene.pos, neu: scene.neu },
      kaofa: [...scene.kaofa.entries()].sort((a, b) => {
        const order = ['固定搭配', '程度轻重', '感情色彩', '适用对象', '语义侧重', '语体色彩', '望文生义', '语义重复', '语法功能', '语境呼应', '语境辨析'];
        const ia = order.indexOf(a[0]), ib = order.indexOf(b[0]);
        return (ia - ib) || (b[1] - a[1]);
      }).slice(0, 6).map(([name, count]) => ({ name, count })),
      loseTo: [...scene.loseTo.entries()].sort((a, b) => b[1] - a[1]).slice(0, 5).map(([s, c]) => ({ s, c })),
      contexts: dedupeList(scene.contexts, (x) => x.text.replace(/[^\u4e00-\u9fa5]/g, '').slice(0, 24), 3),
      contrasts: dedupeList(scene.contrasts, (x) => x.text.replace(/[^\u4e00-\u9fa5]/g, '').slice(0, 24), 3),
      definitions: dedupeList(scene.defs, (x) => x.text.slice(0, 30), 2),
      examples
    };
  }

  const cooccur = [];
  if (words.length > 1) {
    for (let i = 0; i < words.length; i++) {
      for (let j = i + 1; j < words.length; j++) {
        const a = words[i], b = words[j];
        let n = 0;
        for (const o of optionSets) {
          if (o.opts.some((x) => x.includes(a)) && o.opts.some((x) => x.includes(b))) n++;
        }
        if (n > 0) cooccur.push({ a, b, count: n });
      }
    }
    cooccur.sort((x, y) => y.count - x.count);
  }

  const rank = { correct: 0, distractor: 1, stem: 2, material: 3, analysis: 4 };
  const QUOTA = { correct: 20, distractor: 12, stem: 8, material: 6, analysis: 5 };
  const byRole = { correct: [], distractor: [], stem: [], material: [], analysis: [] };
  for (const q of candidates) (byRole[q.role] || byRole.analysis).push(q);
  for (const k of Object.keys(byRole)) {
    const arr = byRole[k].sort((a, b) => fnv(a.word + '|' + a.id) - fnv(b.word + '|' + b.id));
    questions.push(...arr.slice(0, QUOTA[k] || 3));
  }
  questions.sort((a, b) => rank[a.role] - rank[b.role] || (a.paper || '').localeCompare(b.paper || ''));

  const diff = buildDiff(words, stats, collocations, scenes);

  return { words, stats, collocations, cooccur, scenes, questions, diff, total: questions.length, sampled: true };
}

// 近义词差异对照：全部来自真题证据（释义/解析原话、搭配统计、情感分布、反例胜负）
function buildDiff(words, stats, collocations, scenes) {
  if (words.length < 2) return null;
  const rows = words.map((w) => {
    const st = stats[w] || {};
    const sc = scenes[w] || {};
    const co = collocations[w] || { left: [], right: [] };
    const s = sc.sentiment || { neg: 0, pos: 0, neu: 0 };
    const tot = (s.neg || 0) + (s.pos || 0) + (s.neu || 0);
    let color = '中性';
    if (tot) {
      const ratio = ((s.neg || 0) - (s.pos || 0)) / tot;
      color = ratio > 0.15 ? '偏贬' : ratio < -0.15 ? '偏褒' : '中性';
    }
    return {
      word: w,
      hitTotal: st.total || 0,
      sampled: st.sampled || 0,
      focus: sc.focus || '',
      degree: sc.degree || '',
      color,
      colorStat: '贬' + (s.neg || 0) + '/褒' + (s.pos || 0) + '/中' + (s.neu || 0),
      // 只保留重复出现的搭配，避免自动切分出的偶发二字噪声
      objects: (function () {
        const arr = (co.right && co.right.length) ? co.right : (co.left || []);
        const strong = arr.filter((x) => (x.c || 0) >= 2);
        return strong.length ? strong : arr.slice(0, 2);
      })(),
      colloc: co.left || [],
      rival: sc.loseTo || [],
      asCorrect: st.asCorrect || 0,
      asDistractor: st.asDistractor || 0
    };
  });
  return { rows };
}

  function mdFmt(t) {
  return String(t || '').replace(/\[\[([\s\S]*?)\]\]/g, '**$1**');
}

function mdReport(data, rawQ) {
  const lines = [];
  lines.push('# 词条：' + (data.words[0] || rawQ));
  lines.push('');
  lines.push('## 词群');
  lines.push(data.words.join(' / '));
  lines.push('');
  lines.push('## 使用场景卡（均基于真题统计）');
  for (const w of data.words) {
    const sc = data.scenes[w];
    const c = data.collocations[w] || { left: [], right: [] };
    lines.push('');
    lines.push('### ' + w + '（样本 ' + sc.sampled + ' / 命中 ' + sc.hitTotal + ' 题）');
    lines.push('- 主题领域：' + (sc.domains.map((d) => d.name + '(' + d.count + ')').join('、') || '样本不足，未能归类'));
    lines.push('- 语体倾向：' + (sc.styles.map((d) => d.name + '(' + d.count + ')').join('、') || '无明显标记'));
    lines.push('- 情感语境：负面 ' + sc.sentiment.neg + ' / 正面 ' + sc.sentiment.pos + ' / 中性 ' + sc.sentiment.neu);
    lines.push('- 常见对象：左 ' + (c.left.map((x) => x.s + '(' + x.c + ')').join('、') || '—') + '；右 ' + (c.right.map((x) => x.s + '(' + x.c + ')').join('、') || '—'));
    if (sc.kaofa && sc.kaofa.length) lines.push('- 考法分布：' + sc.kaofa.map((x) => x.name + '(' + x.count + ')').join('、'));
    if (sc.loseTo.length) lines.push('- 反例（作干扰项时败给）：' + sc.loseTo.map((x) => x.s + '(' + x.c + ')').join('、'));
    if (sc.contexts && sc.contexts.length) {
      lines.push('- 正确语境（原题回填）：');
      for (const e of sc.contexts) lines.push('  - ' + mdFmt(e.text) + '　——' + (e.paper || '') + '｜' + (e.kaofa || []).join('/'));
    }
    if (sc.contrasts && sc.contrasts.length) {
      lines.push('- 反例对照：');
      for (const e of sc.contrasts) lines.push('  - ' + mdFmt(e.text) + '（本题正解：' + e.answer + '）' + (e.reason ? '　理由：' + e.reason : '') + '　——' + (e.paper || ''));
    }
    if (sc.definitions && sc.definitions.length) {
      lines.push('- 释义原话：');
      for (const e of sc.definitions) lines.push('  - ' + e.text + '　——' + (e.paper || ''));
    }
  }
  lines.push('');
  if (data.diff && data.diff.rows.length) {
    lines.push('## 近义词差异对照（自动归纳，均取真题证据）');
    lines.push('');
    lines.push('| 词 | 语义侧重 | 程度轻重 | 感情色彩 | 典型搭配 | 常败给 |');
    lines.push('|---|---|---|---|---|---|');
    for (const r of data.diff.rows) {
      const obj = (r.objects || []).slice(0, 3).map((x) => x.s + '(' + x.c + ')').join('、') || '—';
      const riv = (r.rival || []).slice(0, 2).map((x) => x.s + '(' + x.c + ')').join('、') || '—';
      lines.push('| ' + [r.word, r.focus || '—', r.degree || '—', r.color + '（' + r.colorStat + '）', obj, riv].join(' | ') + ' |');
    }
    lines.push('');
    lines.push('> 侧重/程度取自解析原话，色彩按命中语境统计，对象为右邻搭配频次。');
  }
  lines.push('');
  if (data.cooccur.length) {
    lines.push('## 同组共现（命题人对照考查）');
    for (const c of data.cooccur) lines.push(`- ${c.a} ↔ ${c.b}：${c.count} 题`);
    lines.push('');
  }
  lines.push('## 真题语境');
  const groups = { correct: '作为正确项', distractor: '作为干扰项', stem: '题干/材料命中', material: '题干/材料命中', analysis: '仅解析命中' };
  const shown = { correct: 12, distractor: 8, stem: 5, material: 3, analysis: 2 };
  const used = {};
  for (const q of data.questions) {
    const k = groups[q.role];
    used[k] = used[k] || 0;
    if (used[k] >= (shown[q.role] || 0)) continue;
    used[k]++;
    lines.push('');
    lines.push(`### [${k}] ${q.paper || ''} · ${q.chapter || ''}`);
    lines.push(q.content.replace(/\n/g, ' '));
    q.options.forEach((o, i) => {
      const L = String.fromCharCode(65 + i);
      const nt = ((q.optionNotes || {})[L] || []).join('；');
      lines.push(`- ${L}. ${o}${i === q.answerIndex ? '  ✔' : ''}${nt ? '　（' + nt + '）' : ''}`);
    });
    if (q.analysisSnippet) lines.push('> ' + q.analysisSnippet.replace(/\n/g, ' '));
  }
  lines.push('');
  lines.push('## 易错点');
  lines.push('- ');
  lines.push('');
  lines.push(`> 统计：${data.words.map((w) => `${w} 命中${data.stats[w].total}题／抽样${data.stats[w].sampled}题(正确项${data.stats[w].asCorrect}/干扰项${data.stats[w].asDistractor})`).join('；')}`);
  return lines.join('\n');
}

  /* ---------- 静态数据加载 ---------- */
  var LOAD_EL = null;
  var STYLE_ADDED = false;

  function ensureStyle() {
    if (STYLE_ADDED) return;
    STYLE_ADDED = true;
    var st = document.createElement('style');
    st.textContent = '#__loadbar{position:fixed;left:0;right:0;top:0;z-index:99999;background:#0d1117;border-bottom:1px solid #30363d;padding:8px 12px;font:12px/1.45 -apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif;color:#c9d1d9;box-shadow:0 2px 8px rgba(0,0,0,.35)}#__loadbar .t{margin-bottom:5px}#__loadbar .b{height:5px;background:#21262d;border-radius:3px;overflow:hidden}#__loadbar .b i{display:block;height:100%;background:linear-gradient(90deg,#2f81f7,#3fb950);transition:width .2s}#__loadbar .c{float:right;color:#8b949e;cursor:pointer;margin-left:10px}';
    document.head.appendChild(st);
  }

  function showLoad(text, pct, canClose) {
    ensureStyle();
    if (!LOAD_EL) {
      LOAD_EL = document.createElement('div');
      LOAD_EL.id = '__loadbar';
      document.body.appendChild(LOAD_EL);
    }
    LOAD_EL.innerHTML = '<div class="t">' + text + (canClose ? '<span class="c" id="__loadclose">收起</span>' : '') + '</div>' +
      '<div class="b"><i style="width:' + Math.max(0, Math.min(100, pct || 0)) + '%"></i></div>';
    var c = document.getElementById('__loadclose');
    if (c) c.onclick = function () { hideLoad(); };
  }

  function hideLoad() {
    if (LOAD_EL) { LOAD_EL.remove(); LOAD_EL = null; }
  }

  function idbOpen() {
    return new Promise(function (res, rej) {
      try {
        var r = indexedDB.open('word-static', 1);
        r.onupgradeneeded = function () { try { r.result.createObjectStore('kv'); } catch (e) {} };
        r.onsuccess = function () { res(r.result); };
        r.onerror = function () { rej(r.error); };
      } catch (e) { rej(e); }
    });
  }
  function idbGet(k) {
    return idbOpen().then(function (db) {
      return new Promise(function (res, rej) {
        var t = db.transaction('kv', 'readonly');
        var q = t.objectStore('kv').get(k);
        q.onsuccess = function () { res(q.result); };
        q.onerror = function () { rej(q.error); };
      });
    }).catch(function () { return null; });
  }
  function idbSet(k, v) {
    return idbOpen().then(function (db) {
      return new Promise(function (res, rej) {
        var t = db.transaction('kv', 'readwrite');
        t.objectStore('kv').put(v, k);
        t.oncomplete = function () { res(); };
        t.onerror = function () { rej(t.error); };
      });
    }).catch(function () {});
  }

  function getVersion() {
    return fetch('data/version.json', { cache: 'no-store' })
      .then(function (r) { return r.ok ? r.json() : null; })
      .then(function (j) { return (j && j.v) || '1'; })
      .catch(function () { return '1'; });
  }

  function dataUrls(v) {
    var local = 'data/words.json.gz?v=' + encodeURIComponent(v);
    var cdn = 'https://cdn.jsdelivr.net/gh/shepherd27/kaogong-word-site@main/data/words.json.gz?v=' + encodeURIComponent(v);
    return /\.github\.io$/.test(location.hostname) ? [cdn, local] : [local, cdn];
  }

  function decompressBlob(blob) {
    if (typeof DecompressionStream === 'undefined') {
      return Promise.reject(new Error('当前浏览器不支持 gzip 解压，请升级浏览器'));
    }
    return new Response(blob.stream().pipeThrough(new DecompressionStream('gzip'))).text();
  }

  function fetchOne(url, onProgress) {
    return new Promise(function (resolve, reject) {
      var ctrl = new AbortController();
      var timer = setTimeout(function () { ctrl.abort(); }, 10000);
      fetch(url, { cache: 'no-store', signal: ctrl.signal }).then(function (res) {
        clearTimeout(timer);
        if (!res.ok) throw new Error('HTTP ' + res.status);
        if (!res.body || !res.body.getReader) {
          return res.blob().then(decompressBlob);
        }
        var total = Number(res.headers.get('content-length') || 0);
        var reader = res.body.getReader();
        var chunks = [];
        var got = 0;
        function pump() {
          return reader.read().then(function (x) {
            if (x.done) return decompressBlob(new Blob(chunks));
            chunks.push(x.value);
            got += x.value.length;
            onProgress(got, total);
            return pump();
          });
        }
        return pump();
      }).then(resolve).catch(reject);
    });
  }

  function initData(text) {
    var d = JSON.parse(text);
    var ch = d.chapters || [];
    var pa = d.papers || [];
    var rows = new Array(d.rows.length);
    for (var i = 0; i < d.rows.length; i++) {
      var r = d.rows[i];
      rows[i] = {
        id: r[0],
        questionId: r[1],
        chapter: ch[r[2]] || '',
        content: r[3] || '',
        options: r[4] || [],
        answerIndex: r[5],
        material: r[6] || '',
        analysis: r[7] || '',
        paperName: pa[r[8]] || ''
      };
    }
    ROWS = rows;
    BY_ID = new Map();
    for (var j = 0; j < rows.length; j++) BY_ID.set(rows[j].id, rows[j]);
    HAYS = rows.map(function (r) {
      return [r.content, JSON.stringify(r.options), r.material, r.analysis].filter(Boolean).join('\n');
    });
    HIT_CACHE.clear();
  }

  function loadData() {
    var version = '1';
    return getVersion().then(function (v) {
      version = v;
      return idbGet('words:' + v);
    }).then(function (cached) {
      if (cached) {
        initData(cached);
        hideLoad();
        return;
      }
      var urls = dataUrls(version);
      var idx = 0;
      function tryNext(lastErr) {
        if (idx >= urls.length) throw lastErr || new Error('题库加载失败');
        var u = urls[idx++];
        showLoad('首次加载题库…（约 5.8MB，之后会缓存）', 0);
        return fetchOne(u, function (got, total) {
          var pct = total ? Math.round(got / total * 100) : 0;
          showLoad('首次加载题库 ' + (got / 1048576).toFixed(1) + (total ? ' / ' + (total / 1048576).toFixed(1) : '') + ' MB（' + pct + '%）', pct);
        }).then(function (text) {
          showLoad('正在解析题库…', 100);
          initData(text);
          hideLoad();
          idbSet('words:' + version, text);
        }).catch(function (e) {
          return tryNext(e);
        });
      }
      return tryNext();
    });
  }

  function ensureData() {
    if (ROWS) return Promise.resolve();
    if (DATA_PROMISE) return DATA_PROMISE;
    DATA_PROMISE = loadData().catch(function (e) {
      DATA_PROMISE = null;
      hideLoad();
      throw e;
    });
    return DATA_PROMISE;
  }

  /* ---------- /api 兼容层 ---------- */
  var nativeFetch = window.fetch ? window.fetch.bind(window) : null;

  function jsonRes(obj, status) {
    return new Response(JSON.stringify(obj), {
      status: status || 200,
      headers: { 'Content-Type': 'application/json; charset=utf-8' }
    });
  }

  function handleApi(u, init) {
    var p = u.pathname;
    if (p === '/api/history') {
      var method = String((init && init.method) || 'GET').toUpperCase();
      if (method === 'DELETE') {
        var w = u.searchParams.get('w');
        if (w) delete HISTORY.words[w];
        else HISTORY = { words: {} };
        saveHistory();
        return Promise.resolve(jsonRes({ ok: true, count: Object.keys(HISTORY.words).length }));
      }
      var list = Object.keys(HISTORY.words).map(function (k) { return HISTORY.words[k]; });
      list.sort(function (a, b) { return (b.last || 0) - (a.last || 0); });
      return Promise.resolve(jsonRes({ count: list.length, words: list }));
    }
    return ensureData().then(function () {
      if (p === '/api/search') {
        var q = u.searchParams.get('q') || '';
        var data = runSearch(q, 'verbal');
        if (u.searchParams.get('record') !== '0' && data.words.length) recordSearch(data, 'verbal', true);
        return jsonRes(data);
      }
      if (p === '/api/word') {
        var word = (u.searchParams.get('w') || '').trim();
        if (!word) return jsonRes({ error: '缺少 w 参数' }, 400);
        var wd = runSearch(word, 'verbal');
        recordSearch(wd, 'verbal', false);
        return jsonRes(wd);
      }
      if (p === '/api/analysis') {
        var id = Number(u.searchParams.get('id'));
        var qid = u.searchParams.get('qid') || '';
        var row = null;
        if (Number.isInteger(id) && id > 0) row = BY_ID.get(id) || null;
        if (!row && qid) {
          for (var i = 0; i < ROWS.length; i++) {
            if (String(ROWS[i].questionId) === qid) { row = ROWS[i]; break; }
          }
        }
        return jsonRes({ analysis: (row && row.analysis) || '' });
      }
      return jsonRes({ error: 'not found' }, 404);
    }).catch(function (e) {
      return jsonRes({ error: String((e && e.message) || e) }, 500);
    });
  }

  window.fetch = function (input, init) {
    var url = typeof input === 'string' ? input : (input && input.url) || '';
    var u;
    try { u = new URL(url, location.href); } catch (e) {
      return nativeFetch ? nativeFetch(input, init) : Promise.reject(e);
    }
    if (u.pathname.indexOf('/api/') !== 0) {
      return nativeFetch ? nativeFetch(input, init) : Promise.reject(new Error('fetch 不可用'));
    }
    return handleApi(u, init || {});
  };

  /* 导出 Markdown：页面原来是 location.href='/api/export'，这里改成本地 Blob 下载 */
  document.addEventListener('click', function (e) {
    var b = e.target && e.target.closest ? e.target.closest('#exp') : null;
    if (!b) return;
    e.preventDefault();
    e.stopImmediatePropagation();
    var input = document.getElementById('q');
    var q = input ? input.value.trim() : '';
    if (!q) return;
    b.disabled = true;
    ensureData().then(function () {
      var data = runSearch(q, 'verbal');
      var md = mdReport(data, q);
      var blob = new Blob([md], { type: 'text/markdown;charset=utf-8' });
      var a = document.createElement('a');
      a.href = URL.createObjectURL(blob);
      a.download = '词条-' + (data.words[0] || 'report') + '.md';
      document.body.appendChild(a);
      a.click();
      a.remove();
      setTimeout(function () { URL.revokeObjectURL(a.href); }, 2000);
    }).catch(function (e2) {
      alert('导出失败：' + ((e2 && e2.message) || e2));
    }).then(function () { b.disabled = false; });
  }, true);

  window.__wordStatic = {
    ensureData: ensureData,
    search: function (q) { return runSearch(q, 'verbal'); },
    md: function (q) { return mdReport(runSearch(q, 'verbal'), q); },
    rows: function () { return ROWS; }
  };

  function preload() {
    setTimeout(function () { ensureData().catch(function () {}); }, 600);
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', preload);
  else preload();
})();
