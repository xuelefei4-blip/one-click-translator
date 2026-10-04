/**
 * OneClickTranslator - Cache Layer (纯原生两级缓存)
 */

class TranslationCache {
  constructor() {
    this.memoryCache = new Map();
    this.dbName = "OneClickTranslatorDB_v2";
    this.storeName = "translations";
    this.imageStoreName = "image_translations";
    this.dbVersion = 2;
    this.db = null;
    this.dbReadyPromise = this.initDB();
  }

  initDB() {
    return new Promise((resolve) => {
      const request = indexedDB.open(this.dbName, this.dbVersion);
      request.onupgradeneeded = (event) => {
        const db = event.target.result;
        if (!db.objectStoreNames.contains(this.storeName)) {
          db.createObjectStore(this.storeName, { keyPath: "key" });
        }
        if (!db.objectStoreNames.contains(this.imageStoreName)) {
          db.createObjectStore(this.imageStoreName, { keyPath: "hash" });
        }
      };
      request.onsuccess = (event) => {
        this.db = event.target.result;
        resolve(this.db);
      };
      request.onerror = () => resolve(null);
    });
  }

  generateKey(text, targetLang = "zh") {
    return `${targetLang}:::${(text || "").trim().toLowerCase()}`;
  }

  // 【补全缺失的单条查询方法：解决 this.cache.get is not a function】
  async get(text, targetLang = "zh") {
    if (!text) return null;
    await this.dbReadyPromise;
    const key = this.generateKey(text, targetLang);

    // 1. 优先查内存
    if (this.memoryCache.has(key)) {
      return this.memoryCache.get(key);
    }

    // 2. 查 IndexedDB
    if (this.db) {
      try {
        const val = await this.getFromDB(key);
        if (val) {
          this.memoryCache.set(key, val);
          return val;
        }
      } catch (e) {}
    }
    return null;
  }

  // 【补全缺失的单条写入方法】
  async set(src, tgt, targetLang = "zh") {
    if (!src || !tgt) return;
    await this.setBatch([{ src, tgt }], targetLang);
  }

  // 【新增：一键清空两级缓存】
  async clear() {
    await this.dbReadyPromise;
    this.memoryCache.clear();
    if (this.db) {
      try {
        const tx = this.db.transaction([this.storeName, this.imageStoreName], "readwrite");
        tx.objectStore(this.storeName).clear();
        tx.objectStore(this.imageStoreName).clear();
      } catch (e) {}
    }
  }

  async getBatch(texts, targetLang = "zh") {
    await this.dbReadyPromise;
    const hits = new Map();
    const misses = [];

    const checkPromises = texts.map(async (text) => {
      const key = this.generateKey(text, targetLang);
      if (this.memoryCache.has(key)) {
        const val = this.memoryCache.get(key);
        if (val && val !== text) {
          hits.set(text, val);
          return;
        }
      }
      if (this.db) {
        try {
          const val = await this.getFromDB(key);
          if (val && val.trim().toLowerCase() !== text.trim().toLowerCase()) {
            this.memoryCache.set(key, val);
            hits.set(text, val);
            return;
          }
        } catch {}
      }
      misses.push(text);
    });

    await Promise.all(checkPromises);
    return { hits, misses: [...new Set(misses)] };
  }

  async setBatch(items, targetLang = "zh") {
    await this.dbReadyPromise;
    items.forEach(({ src, tgt }) => {
      if (!tgt || tgt.trim().toLowerCase() === src.trim().toLowerCase()) return;
      const key = this.generateKey(src, targetLang);
      this.memoryCache.set(key, tgt);
      if (this.db) {
        this.saveToDB({ key, src, tgt, targetLang, time: Date.now() });
      }
    });
  }

  async getImageTranslation(imageHash) {
    await this.dbReadyPromise;
    if (!this.db) return null;
    return new Promise((resolve) => {
      try {
        const transaction = this.db.transaction([this.imageStoreName], "readonly");
        const store = transaction.objectStore(this.imageStoreName);
        const request = store.get(imageHash);
        request.onsuccess = () => resolve(request.result ? request.result.regions : null);
        request.onerror = () => resolve(null);
      } catch {
        resolve(null);
      }
    });
  }

  async saveImageTranslation(imageHash, regions) {
    await this.dbReadyPromise;
    if (!this.db) return;
    try {
      const transaction = this.db.transaction([this.imageStoreName], "readwrite");
      const store = transaction.objectStore(this.imageStoreName);
      store.put({ hash: imageHash, regions, time: Date.now() });
    } catch {}
  }

  getFromDB(key) {
    return new Promise((resolve) => {
      if (!this.db) return resolve(null);
      const transaction = this.db.transaction([this.storeName], "readonly");
      const store = transaction.objectStore(this.storeName);
      const request = store.get(key);
      request.onsuccess = () => resolve(request.result ? request.result.tgt : null);
      request.onerror = () => resolve(null);
    });
  }

  saveToDB(data) {
    if (!this.db) return;
    try {
      const transaction = this.db.transaction([this.storeName], "readwrite");
      const store = transaction.objectStore(this.storeName);
      store.put(data);
    } catch {}
  }
}

window.TranslationCache = TranslationCache;