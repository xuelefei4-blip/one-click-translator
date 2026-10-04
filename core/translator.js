/**
 * OneClickTranslator - Translator Engine
 */

class TranslatorEngine {
  constructor(cache) {
    this.cache = cache;
    this.targetLang = "zh-CN";
  }

  async translateAll(textList) {
    const resultMap = new Map();
    if (!textList || textList.length === 0) return resultMap;

    const uniqueTexts = [...new Set(textList.map(t => t.trim()))].filter(Boolean);

    const { hits, misses } = await this.cache.getBatch(uniqueTexts, this.targetLang);
    hits.forEach((tgt, src) => resultMap.set(src, tgt));

    if (misses.length === 0) return resultMap;

    const concurrency = 6;
    for (let i = 0; i < misses.length; i += concurrency) {
      const batch = misses.slice(i, i + concurrency);
      await Promise.all(
        batch.map(async (src) => {
          try {
            const tgt = await this.translateSingleText(src, this.targetLang);
            resultMap.set(src, tgt);
            if (tgt && tgt.trim() !== src.trim()) {
              this.cache.setBatch([{ src, tgt }], this.targetLang);
            }
          } catch (err) {
            resultMap.set(src, src);
          }
        })
      );
    }

    return resultMap;
  }

  async translateSingleText(text, targetLang) {
    const cleanText = text.trim();
    if (!cleanText) return cleanText;

    const url = `https://translate.googleapis.com/translate_a/single?client=gtx&sl=auto&tl=${encodeURIComponent(targetLang)}&dt=t&q=${encodeURIComponent(cleanText)}`;
    const res = await fetch(url);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);

    const data = await res.json();
    let fullTranslated = "";

    if (data && Array.isArray(data[0])) {
      for (const fragment of data[0]) {
        if (fragment && fragment[0]) {
          fullTranslated += fragment[0];
        }
      }
    }

    return fullTranslated.trim() || cleanText;
  }
}

window.TranslatorEngine = TranslatorEngine;