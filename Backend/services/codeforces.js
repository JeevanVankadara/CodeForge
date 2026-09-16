const cheerio = require('cheerio');

const USER_AGENT = 'CodeForge/1.0 (+https://github.com/JeevanVankadara/CodeForge)';
const ID_PATTERN = /^(\d{1,5})([A-Z]\d?)$/;

class ProblemError extends Error {
  constructor(status, message) {
    super(message);
    this.status = status;
  }
}

const parseId = (raw) => {
  const match = ID_PATTERN.exec(String(raw || '').trim().toUpperCase());
  if (!match) throw new ProblemError(400, 'Use a Codeforces problem ID like 345A');
  return { id: match[1] + match[2], contestId: Number(match[1]), index: match[2] };
};

const preText = ($, pre) => {
  const lines = pre.find('.test-example-line');
  if (lines.length) return lines.map((_, el) => $(el).text()).get().join('\n') + '\n';
  pre.find('br').replaceWith('\n');
  return pre.text();
};

const sectionHtml = ($, el) => {
  el.find('.section-title').remove();
  return el.html()?.trim() || '';
};

const clean = ($, root) => {
  root.find('script, style, iframe, object, embed').remove();
  root.find('*').each((_, el) => {
    for (const name of Object.keys(el.attribs || {})) {
      if (name.startsWith('on')) $(el).removeAttr(name);
    }
  });
  root.find('img[src^="//"]').each((_, el) => $(el).attr('src', 'https:' + $(el).attr('src')));
};

const parseProblem = (html, meta) => {
  const $ = cheerio.load(html);
  const root = $('.problem-statement').first();
  if (!root.length) throw new ProblemError(404, 'Problem not found');
  clean($, root);

  const header = root.find('.header');
  const limit = (cls) => header.find(cls).contents().last().text().trim();
  const samples = root
    .find('.sample-test')
    .map((_, test) => {
      const inputs = $(test).find('.input pre');
      const outputs = $(test).find('.output pre');
      return inputs.map((i, pre) => ({ input: preText($, $(pre)), output: preText($, outputs.eq(i)) })).get();
    })
    .get()
    .flat();

  return {
    ...meta,
    title: header.find('.title').text().trim(),
    timeLimit: limit('.time-limit'),
    memoryLimit: limit('.memory-limit'),
    legend: sectionHtml($, header.next('div')),
    inputSpec: sectionHtml($, root.find('.input-specification')),
    outputSpec: sectionHtml($, root.find('.output-specification')),
    note: sectionHtml($, root.find('.note')),
    samples,
    url: `https://codeforces.com/problemset/problem/${meta.contestId}/${meta.index}`,
  };
};

const fetchProblem = async (meta) => {
  const url = `https://codeforces.com/problemset/problem/${meta.contestId}/${meta.index}`;
  let res;
  try {
    res = await fetch(url, {
      headers: { 'User-Agent': USER_AGENT, Accept: 'text/html' },
      redirect: 'manual',
      signal: AbortSignal.timeout(15000),
    });
  } catch (err) {
    throw new ProblemError(502, `Could not reach Codeforces: ${err.message}`);
  }
  if (res.status >= 300 && res.status < 400) throw new ProblemError(404, 'Problem not found');
  if (!res.ok) throw new ProblemError(502, `Codeforces answered with ${res.status}`);
  return parseProblem(await res.text(), meta);
};

module.exports = { parseId, parseProblem, fetchProblem, ProblemError };
