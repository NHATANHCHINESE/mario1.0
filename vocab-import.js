'use strict';

// Offline parsing only: no vocabulary text is sent to a service.
const VocabularyImport = (() => {
  const syllables = new Set(('a ai an ang ao ba bai ban bang bao bei ben beng bi bian biao bie bin bing bo bu ca cai can cang cao ce cen ceng cha chai chan chang chao che chen cheng chi chong chou chu chua chuai chuan chuang chui chun chuo ci cong cou cu cuan cui cun cuo da dai dan dang dao de dei den deng di dia dian diao die ding diu dong dou du duan dui dun duo e ei en eng er fa fan fang fei fen feng fo fou fu ga gai gan gang gao ge gei gen geng gong gou gu gua guai guan guang gui gun guo ha hai han hang hao he hei hen heng hong hou hu hua huai huan huang hui hun huo ji jia jian jiang jiao jie jin jing jiong jiu ju juan jue jun ka kai kan kang kao ke kei ken keng kong kou ku kua kuai kuan kuang kui kun kuo la lai lan lang lao le lei leng li lia lian liang liao lie lin ling liu lo long lou lu luan lun luo lv lve ma mai man mang mao me mei men meng mi mian miao mie min ming miu mo mou mu na nai nan nang nao ne nei nen neng ni nian niang niao nie nin ning niu nong nou nu nuan nuo nv nve o ou pa pai pan pang pao pei pen peng pi pian piao pie pin ping po pou pu qi qia qian qiang qiao qie qin qing qiong qiu qu quan que qun ran rang rao re ren reng ri rong rou ru ruan rui run ruo sa sai san sang sao se sen seng sha shai shan shang shao she shei shen sheng shi shou shu shua shuai shuan shuang shui shun shuo si song sou su suan sui sun suo ta tai tan tang tao te teng ti tian tiao tie ting tong tou tu tuan tui tun tuo wa wai wan wang wei wen weng wo wu xi xia xian xiang xiao xie xin xing xiong xiu xu xuan xue xun ya yan yang yao ye yi yin ying yo yong you yu yuan yue yun za zai zan zang zao ze zei zen zeng zha zhai zhan zhang zhao zhe zhei zhen zheng zhi zhong zhou zhu zhua zhuai zhuan zhuang zhui zhun zhuo zi zong zou zu zuan zui zun zuo m n ng hm hng').split(' '));
  const hanPattern = /^[\p{Script=Han}〇\d·・，。！？、…!?]+/u;
  const pinyinChars = /^[a-züāáǎàēéěèīíǐìōóǒòūúǔùǖǘǚǜńňǹḿê\s1-5:'’.-]+$/iu;
  const normalize = value => value.toLowerCase().replace(/ü|ǖ|ǘ|ǚ|ǜ|u:/g, 'v').normalize('NFD').replace(/[\u0300-\u036f\s1-5:'’.-]/g, '');
  const trimEdge = value => value.trim().replace(/^[\s|｜:：;；,，/／–—-]+|[\s|｜]+$/g, '').trim();

  function syllableCounts(value) {
    if (!value || value.length > 80 || !pinyinChars.test(value)) return [];
    const plain = normalize(value);
    if (!/^[a-zv]+$/.test(plain)) return [];
    const ways = Array.from({length: plain.length + 1}, () => new Set());
    ways[0].add(0);
    for (let end = 1; end <= plain.length; end++) {
      for (let start = Math.max(0, end - 6); start < end; start++) {
        if (syllables.has(plain.slice(start, end))) for (const count of ways[start]) ways[end].add(count + 1);
      }
      // Erhua suffix can share a syllable with the preceding word.
      if (plain[end - 1] === 'r' && end === plain.length) for (const count of ways[end - 1]) ways[end].add(count);
    }
    return [...ways[plain.length]].filter(n => n > 0);
  }

  function validate(hanzi, pinyin, meaning) {
    if (!hanzi || !pinyin || !meaning) return 'Thiếu chữ Hán, pinyin hoặc nghĩa tiếng Việt.';
    if (!/\p{Script=Han}/u.test(hanzi) || !/^[\p{Script=Han}〇\d\s·・，。！？、…!?]+$/u.test(hanzi)) return 'Kiểm tra lại cột chữ Hán.';
    if (hanzi.length > 20) return 'Chữ Hán dài quá 20 ký tự.';
    if (pinyin.length > 80 || !syllableCounts(pinyin).length) return 'Pinyin chưa hợp lệ; hãy kiểm tra lại cột pinyin.';
    if (meaning.length > 120) return 'Nghĩa dài quá 120 ký tự; hãy rút gọn.';
    return '';
  }

  function csvColumns(line) {
    const columns = []; let cell = '', quoted = false;
    for (let i = 0; i < line.length; i++) {
      const c = line[i];
      if (c === '"') {
        if (quoted && line[i + 1] === '"') { cell += '"'; i++; }
        else quoted = !quoted;
      } else if (c === ',' && !quoted) { columns.push(cell.trim()); cell = ''; }
      else cell += c;
    }
    columns.push(cell.trim());
    return quoted ? [] : columns;
  }

  function columns(line) {
    let cells;
    if (line.includes('\t')) cells = line.split(/\t+/);
    else if (/[|｜]/.test(line)) cells = line.split(/[|｜]/);
    else if (/[;；]/.test(line)) cells = line.split(/[;；]/);
    else if (line.includes(',')) cells = csvColumns(line);
    else if (line.includes('，')) cells = line.split('，');
    else if (/\s[–—-]\s/.test(line)) cells = line.split(/\s+[–—-]\s+/);
    else if ((line.match(/[-–—]/g) || []).length >= 2) cells = line.split(/[-–—]/);
    else if (/\s[\/／]\s/.test(line)) cells = line.split(/\s+[\/／]\s+/);
    else if (/[：:]/.test(line) && !/u:/i.test(line)) cells = line.split(/[：:]/);
    if (!cells) return null;
    cells = cells.map(s => s.trim());
    while (cells[0] === '') cells.shift();
    while (cells[cells.length - 1] === '') cells.pop();
    if (/^\d+[.)、]?$/.test(cells[0] || '')) cells.shift();
    return cells.length >= 3 ? [cells[0], cells[1], cells.slice(2).join(', ')] : null;
  }

  function parseLine(line) {
    // Remove a list number/bullet and Markdown emphasis, preserving the actual text.
    const clean = line.replace(/^\s*(?:[-*•]\s+|\d+[.)、]\s*|\d+\s+)/, '').replace(/\*\*([^*]+)\*\*/g, '$1').trim();
    const separated = columns(clean);
    if (separated && !validate(...separated)) return separated;

    const han = clean.match(hanPattern);
    if (!han) return separated || ['', '', ''];
    const hanzi = han[0]; let rest = trimEdge(clean.slice(hanzi.length));
    const bracketed = rest.match(/^(?:\[([^\]]+)\]|\(([^)]+)\)|（([^）]+)）|【([^】]+)】)\s*(.*)$/u);
    if (bracketed) return [hanzi, (bracketed[1] || bracketed[2] || bracketed[3] || bracketed[4]).trim(), trimEdge(bracketed[5])];

    const tokens = rest.split(/\s+/), expected = [...hanzi].filter(c => /\p{Script=Han}/u.test(c)).length;
    if (syllableCounts(rest).includes(expected)) return [hanzi, rest, ''];
    let lastPinyinEnd = 0;
    for (let i = 1; i < tokens.length; i++) {
      const pinyin = tokens.slice(0, i).join(' '), counts = syllableCounts(pinyin);
      if (!counts.length) break;
      lastPinyinEnd = i;
      if (Math.min(...counts) === expected) return [hanzi, pinyin, trimEdge(tokens.slice(i).join(' '))];
    }
    if (lastPinyinEnd) return [hanzi, tokens.slice(0, lastPinyinEnd).join(' '), trimEdge(tokens.slice(lastPinyinEnd).join(' '))];
    return separated || [hanzi, '', rest];
  }

  function parse(text) {
    const lines = String(text).replace(/^\uFEFF/, '').normalize('NFC').split(/\r\n?|\n/).map((raw, i) => ({raw: raw.trim(), line: i + 1})).filter(r => r.raw);
    const rows = [];
    for (let i = 0; i < lines.length; i++) {
      const {raw, line} = lines[i];
      if (/^[|\s:\-]+$/.test(raw) || (/pinyin|phiên âm|拼音/i.test(raw) && /chữ hán|tiếng hán|hanzi|chinese|中文|汉字/i.test(raw) && /nghĩa|vietnamese|meaning|越南语/i.test(raw))) continue;
      let fields;
      if (/^[\p{Script=Han}〇·・，。！？、…]+$/u.test(raw) && i + 2 < lines.length && syllableCounts(lines[i + 1].raw).length && !/^[\p{Script=Han}〇]+$/u.test(lines[i + 2].raw)) {
        fields = [raw, lines[i + 1].raw, lines[i + 2].raw]; i += 2;
      } else fields = parseLine(raw);
      fields = fields.map(v => v.trim());
      rows.push({hanzi: fields[0], pinyin: fields[1], meaning: fields[2], line, raw, error: validate(...fields)});
    }
    return rows;
  }
  return {parse, validate};
})();

if (typeof module !== 'undefined' && module.exports) module.exports = VocabularyImport;
