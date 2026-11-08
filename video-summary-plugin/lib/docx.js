/** Minimal, dependency-free Office Open XML writer for one polished summary document. */

import { formatDuration } from './util.js';

const CRC_TABLE = (() => {
  const table = new Uint32Array(256);
  for (let n = 0; n < 256; n += 1) {
    let c = n;
    for (let k = 0; k < 8; k += 1) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    table[n] = c >>> 0;
  }
  return table;
})();

function crc32(buffer) {
  let crc = 0xffffffff;
  for (let i = 0; i < buffer.length; i += 1) crc = CRC_TABLE[(crc ^ buffer[i]) & 0xff] ^ (crc >>> 8);
  return (crc ^ 0xffffffff) >>> 0;
}

function dosDateTime(date) {
  const year = Math.max(1980, date.getFullYear());
  const time = (date.getHours() << 11) | (date.getMinutes() << 5) | Math.floor(date.getSeconds() / 2);
  const day = ((year - 1980) << 9) | ((date.getMonth() + 1) << 5) | date.getDate();
  return { time, day };
}

function zipStore(files) {
  const chunks = [];
  const central = [];
  let offset = 0;
  const now = new Date();
  const { time, day } = dosDateTime(now);
  for (const file of files) {
    const name = Buffer.from(file.name, 'utf8');
    const data = Buffer.isBuffer(file.data) ? file.data : Buffer.from(file.data, 'utf8');
    const crc = crc32(data);
    const local = Buffer.alloc(30);
    local.writeUInt32LE(0x04034b50, 0);
    local.writeUInt16LE(20, 4);
    local.writeUInt16LE(0x0800, 6);
    local.writeUInt16LE(0, 8);
    local.writeUInt16LE(time, 10);
    local.writeUInt16LE(day, 12);
    local.writeUInt32LE(crc, 14);
    local.writeUInt32LE(data.length, 18);
    local.writeUInt32LE(data.length, 22);
    local.writeUInt16LE(name.length, 26);
    local.writeUInt16LE(0, 28);
    chunks.push(local, name, data);

    const entry = Buffer.alloc(46);
    entry.writeUInt32LE(0x02014b50, 0);
    entry.writeUInt16LE(20, 4);
    entry.writeUInt16LE(20, 6);
    entry.writeUInt16LE(0x0800, 8);
    entry.writeUInt16LE(0, 10);
    entry.writeUInt16LE(time, 12);
    entry.writeUInt16LE(day, 14);
    entry.writeUInt32LE(crc, 16);
    entry.writeUInt32LE(data.length, 20);
    entry.writeUInt32LE(data.length, 24);
    entry.writeUInt16LE(name.length, 28);
    entry.writeUInt16LE(0, 30);
    entry.writeUInt16LE(0, 32);
    entry.writeUInt16LE(0, 34);
    entry.writeUInt16LE(0, 36);
    entry.writeUInt32LE(0, 38);
    entry.writeUInt32LE(offset, 42);
    central.push(entry, name);
    offset += local.length + name.length + data.length;
  }
  const centralBuffer = Buffer.concat(central);
  const end = Buffer.alloc(22);
  end.writeUInt32LE(0x06054b50, 0);
  end.writeUInt16LE(0, 4);
  end.writeUInt16LE(0, 6);
  end.writeUInt16LE(files.length, 8);
  end.writeUInt16LE(files.length, 10);
  end.writeUInt32LE(centralBuffer.length, 12);
  end.writeUInt32LE(offset, 16);
  end.writeUInt16LE(0, 20);
  return Buffer.concat([...chunks, centralBuffer, end]);
}

function xmlEscape(value) {
  return String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;')
    .replace(/[\u0000-\u0008\u000b\u000c\u000e-\u001f]/g, '');
}

function run(text, options = {}) {
  const rPr = [];
  rPr.push('<w:rFonts w:ascii="Aptos" w:hAnsi="Aptos" w:eastAsia="Microsoft YaHei"/>');
  if (options.bold) rPr.push('<w:b/><w:bCs/>');
  if (options.italic) rPr.push('<w:i/><w:iCs/>');
  if (options.color) rPr.push(`<w:color w:val="${options.color}"/>`);
  if (options.size) rPr.push(`<w:sz w:val="${options.size}"/><w:szCs w:val="${options.size}"/>`);
  return `<w:r><w:rPr>${rPr.join('')}</w:rPr><w:t xml:space="preserve">${xmlEscape(text)}</w:t></w:r>`;
}

function paragraph(text, options = {}) {
  const pPr = [];
  if (options.style) pPr.push(`<w:pStyle w:val="${options.style}"/>`);
  if (options.align) pPr.push(`<w:jc w:val="${options.align}"/>`);
  if (options.keepNext) pPr.push('<w:keepNext/>');
  if (options.spacingBefore != null || options.spacingAfter != null || options.line) {
    pPr.push(
      `<w:spacing${options.spacingBefore != null ? ` w:before="${options.spacingBefore}"` : ''}${
        options.spacingAfter != null ? ` w:after="${options.spacingAfter}"` : ''
      }${options.line ? ` w:line="${options.line}" w:lineRule="auto"` : ''}/>`,
    );
  }
  if (options.indent != null) {
    pPr.push(`<w:ind w:left="${options.indent}"${options.hanging ? ` w:hanging="${options.hanging}"` : ''}/>`);
  }
  if (options.borderLeft) {
    pPr.push(
      `<w:pBdr><w:left w:val="single" w:sz="18" w:space="10" w:color="${options.borderColor ?? 'BFD3EA'}"/></w:pBdr>`,
    );
  }
  const content = Array.isArray(options.runs)
    ? options.runs.join('')
    : run(text, options);
  return `<w:p>${pPr.length > 0 ? `<w:pPr>${pPr.join('')}</w:pPr>` : ''}${content}</w:p>`;
}

function blank() {
  return '<w:p><w:pPr><w:spacing w:after="0"/></w:pPr></w:p>';
}

function bodyParagraphs(value, options = {}) {
  return String(value ?? '')
    .split(/\n+/)
    .map((line) => line.trim())
    .filter(Boolean)
    .map((line) => paragraph(line, options))
    .join('');
}

function bullets(items) {
  return items
    .map((item) => paragraph(`•  ${item}`, { indent: 360, hanging: 220, spacingAfter: 80, line: 280 }))
    .join('');
}

function divider() {
  return (
    '<w:p><w:pPr><w:pBdr><w:bottom w:val="single" w:sz="6" w:space="6" w:color="D7E3F4"/></w:pBdr>' +
    '<w:spacing w:before="140" w:after="220"/></w:pPr></w:p>'
  );
}

function documentXml(summary, meta) {
  const english = meta.language === 'en';
  const labels = english
    ? {
        overview: 'Overview',
        keyPoints: 'Key points',
        chapters: 'Chapter map',
        quotes: 'Quotes',
        takeaways: 'Takeaways',
        details: 'Video details',
        transcript: 'Appendix: transcript',
        source: 'Source',
        author: 'Author',
        duration: 'Duration',
        generated: 'Generated',
        chars: 'Transcript characters',
        note: 'This document was generated by AI from captions or a machine transcript. Verify important facts against the original video.',
        truncated: 'The appendix was truncated because the transcript is long. See the original video for the full content.',
      }
    : {
        overview: '视频概览',
        keyPoints: '核心要点',
        chapters: '内容脉络',
        quotes: '金句摘录',
        takeaways: '启发与行动',
        details: '视频信息',
        transcript: '附录：转写文本',
        source: '来源',
        author: '作者 / 频道',
        duration: '时长',
        generated: '生成时间',
        chars: '转写字符数',
        note: '本文档由 AI 根据字幕或机器转写生成，重要事实请以原视频为准。',
        truncated: '转写文本较长，附录已截断；完整内容请回看原视频。',
      };
  const parts = [];
  parts.push(paragraph(summary.oneLine || summary.overview?.slice(0, 80) || meta.title, { style: 'Title' }));
  const metaLine = [meta.author, meta.durationLabel].filter(Boolean).join('  ·  ');
  if (metaLine) parts.push(paragraph(metaLine, { style: 'Subtitle' }));
  parts.push(paragraph(meta.sourceUrl, { align: 'center', color: '2B6CB0', size: 18, spacingAfter: 100 }));
  parts.push(
    paragraph(
      `${labels.generated}：${meta.generatedAt}    ${labels.chars}：${meta.transcriptChars ?? 0}`,
      { align: 'center', color: '7A8699', size: 17, spacingAfter: 160 },
    ),
  );
  parts.push(divider());

  if (summary.overview) {
    parts.push(paragraph(labels.overview, { style: 'Heading1' }));
    parts.push(bodyParagraphs(summary.overview, { line: 300, spacingAfter: 120 }));
  }

  if (summary.keyPoints?.length) {
    parts.push(paragraph(labels.keyPoints, { style: 'Heading1' }));
    parts.push(bullets(summary.keyPoints));
  }

  if (summary.chapters?.length) {
    parts.push(paragraph(labels.chapters, { style: 'Heading1' }));
    for (const chapter of summary.chapters) {
      const heading = [chapter.time, chapter.title].filter(Boolean).join('  ');
      parts.push(
        paragraph(heading, {
          runs: [
            run(chapter.time ? `${chapter.time}  ` : '', { bold: true, color: '2B6CB0', size: 22 }),
            run(chapter.title || '', { bold: true, size: 22, color: '1F3864' }),
          ],
          spacingBefore: 120,
          spacingAfter: 40,
          keepNext: true,
        }),
      );
      if (chapter.summary) parts.push(paragraph(chapter.summary, { indent: 220, spacingAfter: 100, line: 280 }));
    }
  }

  if (summary.quotes?.length) {
    parts.push(paragraph(labels.quotes, { style: 'Heading1' }));
    for (const quote of summary.quotes) {
      parts.push(paragraph(quote, { italic: true, color: '44546A', indent: 240, borderLeft: true, spacingAfter: 100 }));
    }
  }

  if (summary.takeaways?.length) {
    parts.push(paragraph(labels.takeaways, { style: 'Heading1' }));
    parts.push(bullets(summary.takeaways));
  }

  parts.push(paragraph(labels.details, { style: 'Heading1' }));
  const details = [
    [labels.source, meta.sourceUrl],
    [labels.author, meta.author || '—'],
    [labels.duration, meta.durationLabel || '—'],
    ['发布', meta.publishedAt || '—'],
    [labels.chars, String(meta.transcriptChars ?? 0)],
  ];
  for (const [key, value] of details) {
    parts.push(
      paragraph('', {
        runs: [run(`${key}：`, { bold: true, color: '44546A', size: 19 }), run(String(value), { size: 19, color: '44546A' })],
        spacingAfter: 40,
      }),
    );
  }

  if (meta.transcriptText) {
    parts.push(paragraph(labels.transcript, { style: 'Heading1' }));
    const maxChars = english ? 26000 : 30000;
    const text = String(meta.transcriptText);
    const visible = text.length > maxChars ? text.slice(0, maxChars) : text;
    parts.push(bodyParagraphs(visible, { size: 18, color: '595959', line: 260, spacingAfter: 40 }));
    if (text.length > maxChars) parts.push(paragraph(`… ${labels.truncated}`, { italic: true, color: '7A8699', size: 18 }));
  }

  parts.push(divider());
  parts.push(paragraph(labels.note, { italic: true, color: '7A8699', size: 17, align: 'center' }));
  parts.push(
    '<w:sectPr><w:pgSz w:w="11906" w:h="16838"/>' +
      '<w:pgMar w:top="1440" w:right="1440" w:bottom="1440" w:left="1440" w:header="708" w:footer="708" w:gutter="0"/>' +
      '</w:sectPr>',
  );

  return `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships">
<w:body>${parts.join('')}</w:body>
</w:document>`;
}

function stylesXml() {
  return `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<w:styles xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main">
<w:docDefaults>
  <w:rPrDefault><w:rPr><w:rFonts w:ascii="Aptos" w:hAnsi="Aptos" w:eastAsia="Microsoft YaHei"/><w:sz w:val="21"/><w:szCs w:val="21"/><w:lang w:val="en-US" w:eastAsia="zh-CN"/></w:rPr></w:rPrDefault>
  <w:pPrDefault><w:pPr><w:spacing w:after="120" w:line="300" w:lineRule="auto"/></w:pPr></w:pPrDefault>
</w:docDefaults>
<w:style w:type="paragraph" w:default="1" w:styleId="Normal"><w:name w:val="Normal"/><w:qFormat/></w:style>
<w:style w:type="paragraph" w:styleId="Title"><w:name w:val="Title"/><w:basedOn w:val="Normal"/><w:next w:val="Subtitle"/><w:qFormat/><w:pPr><w:spacing w:before="480" w:after="100"/><w:jc w:val="center"/></w:pPr><w:rPr><w:b/><w:color w:val="1F3864"/><w:sz w:val="52"/><w:szCs w:val="52"/></w:rPr></w:style>
<w:style w:type="paragraph" w:styleId="Subtitle"><w:name w:val="Subtitle"/><w:basedOn w:val="Normal"/><w:next w:val="Normal"/><w:qFormat/><w:pPr><w:spacing w:after="80"/><w:jc w:val="center"/></w:pPr><w:rPr><w:color w:val="595959"/><w:sz w:val="21"/><w:szCs w:val="21"/></w:rPr></w:style>
<w:style w:type="paragraph" w:styleId="Heading1"><w:name w:val="heading 1"/><w:basedOn w:val="Normal"/><w:next w:val="Normal"/><w:qFormat/><w:pPr><w:keepNext/><w:spacing w:before="360" w:after="140"/><w:outlineLvl w:val="0"/></w:pPr><w:rPr><w:b/><w:color w:val="1F4E79"/><w:sz w:val="30"/><w:szCs w:val="30"/></w:rPr></w:style>
<w:style w:type="paragraph" w:styleId="Heading2"><w:name w:val="heading 2"/><w:basedOn w:val="Normal"/><w:next w:val="Normal"/><w:qFormat/><w:pPr><w:keepNext/><w:spacing w:before="220" w:after="80"/><w:outlineLvl w:val="1"/></w:pPr><w:rPr><w:b/><w:color w:val="2B6CB0"/><w:sz w:val="24"/><w:szCs w:val="24"/></w:rPr></w:style>
<w:style w:type="paragraph" w:styleId="Quote"><w:name w:val="Quote"/><w:basedOn w:val="Normal"/><w:qFormat/><w:pPr><w:ind w:left="360"/></w:pPr><w:rPr><w:i/><w:color w:val="595959"/></w:rPr></w:style>
</w:styles>`;
}

function coreXml(meta) {
  const created = new Date().toISOString();
  return `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<cp:coreProperties xmlns:cp="http://schemas.openxmlformats.org/package/2006/metadata/core-properties" xmlns:dc="http://purl.org/dc/elements/1.1/" xmlns:dcterms="http://purl.org/dc/terms/" xmlns:dcmitype="http://purl.org/dc/dcmitype/" xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance">
<dc:title>${xmlEscape(meta.title)}</dc:title>
<dc:creator>DSH Video Summary</dc:creator>
<cp:lastModifiedBy>DSH Video Summary</cp:lastModifiedBy>
<dc:description>${xmlEscape(meta.sourceUrl)}</dc:description>
<dcterms:created xsi:type="dcterms:W3CDTF">${created}</dcterms:created>
<dcterms:modified xsi:type="dcterms:W3CDTF">${created}</dcterms:modified>
</cp:coreProperties>`;
}

function appXml() {
  return `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Properties xmlns="http://schemas.openxmlformats.org/officeDocument/2006/extended-properties" xmlns:vt="http://schemas.openxmlformats.org/officeDocument/2006/docPropsVTypes">
<Application>DSH Video Summary</Application>
<DocSecurity>0</DocSecurity>
<ScaleCrop>false</ScaleCrop>
<Company></Company>
<LinksUpToDate>false</LinksUpToDate>
<SharedDoc>false</SharedDoc>
<HyperlinksChanged>false</HyperlinksChanged>
<AppVersion>1.0</AppVersion>
</Properties>`;
}

export function buildDocx(summary, meta) {
  const document = documentXml(summary, meta);
  const files = [
    {
      name: '[Content_Types].xml',
      data: `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">
<Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/>
<Default Extension="xml" ContentType="application/xml"/>
<Override PartName="/word/document.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.document.main+xml"/>
<Override PartName="/word/styles.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.styles+xml"/>
<Override PartName="/docProps/core.xml" ContentType="application/vnd.openxmlformats-package.core-properties+xml"/>
<Override PartName="/docProps/app.xml" ContentType="application/vnd.openxmlformats-officedocument.extended-properties+xml"/>
</Types>`,
    },
    {
      name: '_rels/.rels',
      data: `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
<Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="word/document.xml"/>
<Relationship Id="rId2" Type="http://schemas.openxmlformats.org/package/2006/relationships/metadata/core-properties" Target="docProps/core.xml"/>
<Relationship Id="rId3" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/extended-properties" Target="docProps/app.xml"/>
</Relationships>`,
    },
    {
      name: 'word/_rels/document.xml.rels',
      data: `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
<Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/styles" Target="styles.xml"/>
</Relationships>`,
    },
    { name: 'word/document.xml', data: document },
    { name: 'word/styles.xml', data: stylesXml() },
    { name: 'docProps/core.xml', data: coreXml(meta) },
    { name: 'docProps/app.xml', data: appXml() },
  ];
  return zipStore(files);
}

export function docxMetaFromSource(source, summary, extra = {}) {
  return {
    title: source.title || '视频总结',
    author: source.author || '',
    durationLabel: source.duration ? formatDuration(source.duration) : '',
    sourceUrl: source.sourceUrl,
    publishedAt: source.publishedAt || '',
    generatedAt: extra.generatedAt || new Date().toLocaleString('zh-CN', { hour12: false }),
    transcriptSource: source.transcript?.source || '',
    transcriptChars: source.transcript?.text?.length || 0,
    transcriptText: source.transcript?.text || '',
    language: extra.language === 'en' ? 'en' : 'zh',
    ...extra,
  };
}
