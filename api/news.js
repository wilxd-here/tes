// Vercel Serverless Function: fetch RSS server-side so the browser does not depend on public CORS proxies.
const FEEDS = [
  { name: 'ANTARA', url: 'https://www.antaranews.com/rss/politik.xml', politicsOnly: false },
  { name: 'ANTARA', url: 'https://www.antaranews.com/rss/terkini.xml', politicsOnly: true },
  { name: 'CNN Indonesia', url: 'https://www.cnnindonesia.com/nasional/rss', politicsOnly: true }
];
const POL = /\b(politik\w*|politisi|presiden|prabowo|gibran|wapres|istana|dpr|dprd|dpd|mpr|menteri|kementerian|kabinet|partai|pemilu|pilkada|pilpres|kpu|bawaslu|mahkamah|mk|kpk|ombudsman|gubernur|bupati|wali ?kota|parlemen|koalisi|legislatif|fraksi|demokrasi|ruu|dewan)\b/i;

function decode(s = '') {
  return String(s)
    .replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g, '$1')
    .replace(/&#(\d+);/g, (_, n) => String.fromCodePoint(Number(n)))
    .replace(/&#x([\da-f]+);/gi, (_, n) => String.fromCodePoint(parseInt(n, 16)))
    .replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"').replace(/&apos;|&#39;/g, "'").trim();
}
function tag(block, name) {
  const escaped = name.replace(':', '\\:');
  const re = new RegExp('<(?:[\\w.-]+:)?' + escaped + '(?:\\s[^>]*)?>([\\s\\S]*?)<\\/(?:[\\w.-]+:)?' + escaped + '\\s*>', 'i');
  const m = block.match(re);
  return m ? decode(m[1]) : '';
}
function imageFrom(block, description) {
  const en = block.match(/<enclosure[^>]+url=["']([^"']+)["']/i);
  const media = block.match(/<(?:media:)?(?:content|thumbnail)[^>]+url=["']([^"']+)["']/i);
  const img = description.match(/<img[^>]+src=["']([^"']+)["']/i);
  return (en && en[1]) || (media && media[1]) || (img && img[1]) || '';
}
function parseFeed(xml, feed) {
  const items = xml.match(/<item(?:\s[^>]*)?>[\s\S]*?<\/item>/gi) || [];
  return items.map(block => {
    const title = tag(block, 'title');
    const link = tag(block, 'link');
    const rawDate = tag(block, 'pubDate') || tag(block, 'dc:date') || tag(block, 'date');
    const description = tag(block, 'description') || tag(block, 'content:encoded');
    const date = new Date(rawDate);
    return {
      title,
      link: link.trim(),
      date: Number.isNaN(date.getTime()) ? null : date.toISOString(),
      desc: description.replace(/<script\b[^>]*>[\s\S]*?<\/script>/gi, '').slice(0, 1200),
      img: imageFrom(block, description),
      src: feed.name,
      f: feed.politicsOnly ? 1 : 0
    };
  }).filter(a => a.title && /^https?:\/\//i.test(a.link) && a.date && (!a.f || POL.test(a.title + ' ' + a.desc)));
}
async function fetchFeed(feed) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 9000);
  try {
    const response = await fetch(feed.url, {
      signal: controller.signal,
      headers: { 'user-agent': 'WillDevNews/1.0 (+https://vercel.com)', 'accept': 'application/rss+xml, application/xml, text/xml, */*' }
    });
    if (!response.ok) throw new Error('RSS HTTP ' + response.status);
    return parseFeed(await response.text(), feed);
  } finally { clearTimeout(timer); }
}
module.exports = async function handler(req, res) {
  res.setHeader('Content-Type', 'application/json; charset=utf-8');
  res.setHeader('Cache-Control', 's-maxage=300, stale-while-revalidate=600');
  res.setHeader('Access-Control-Allow-Origin', '*');
  try {
    const groups = await Promise.all(FEEDS.map(feed => fetchFeed(feed).catch(() => [])));
    const all = groups.flat().sort((a, b) => new Date(b.date) - new Date(a.date));
    const seen = new Set();
    const items = all.filter(a => {
      const key = a.link.split('?')[0].replace(/\/$/, '').toLowerCase();
      if (seen.has(key)) return false;
      seen.add(key); return true;
    }).slice(0, 40);
    if (!items.length) return res.status(502).json({ error: 'Semua sumber RSS gagal merespons.', items: [] });
    return res.status(200).json({ updatedAt: new Date().toISOString(), items });
  } catch (error) {
    return res.status(502).json({ error: 'Gagal mengambil RSS.', items: [] });
  }
};
