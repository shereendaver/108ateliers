/* <media-slot> — drag-and-drop video/audio placeholder that persists via IndexedDB.
   Attributes: id (required, persistence key), kind="video"|"audio", placeholder="...". */
(function () {
  const DB = 'om-media-slots';
  function idb() {
    return new Promise((res, rej) => {
      const r = indexedDB.open(DB, 1);
      r.onupgradeneeded = () => r.result.createObjectStore('files');
      r.onsuccess = () => res(r.result);
      r.onerror = () => rej(r.error);
    });
  }
  async function dbGet(k) {
    const d = await idb();
    return new Promise((res, rej) => {
      const t = d.transaction('files').objectStore('files').get(k);
      t.onsuccess = () => res(t.result);
      t.onerror = () => rej(t.error);
    });
  }
  async function dbSet(k, v) {
    const d = await idb();
    return new Promise((res, rej) => {
      const t = d.transaction('files', 'readwrite').objectStore('files').put(v, k);
      t.onsuccess = () => res();
      t.onerror = () => rej(t.error);
    });
  }

  class MediaSlot extends HTMLElement {
    connectedCallback() {
      if (this._init) return;
      this._init = true;
      this.kind = (this.getAttribute('kind') || 'video').toLowerCase();
      this.key = 'media-slot:' + (this.getAttribute('id') || 'default');
      if (!this.style.display) this.style.display = 'block';
      this.style.position = this.style.position || 'relative';
      if (!this.style.height) this.style.height = '100%';
      if (!this.style.width) this.style.width = '100%';
      if (this.kind === 'audio' && !this.style.minHeight) this.style.minHeight = '60px';
      this.renderEmpty();
      this.addEventListener('dragover', (e) => { e.preventDefault(); this.style.opacity = '.75'; });
      this.addEventListener('dragleave', () => { this.style.opacity = '1'; });
      this.addEventListener('drop', (e) => {
        e.preventDefault(); this.style.opacity = '1';
        const f = e.dataTransfer && e.dataTransfer.files && e.dataTransfer.files[0];
        if (f) this.accept(f);
      });
      this.addEventListener('click', () => {
        if (this._hasMedia) return;
        const inp = document.createElement('input');
        inp.type = 'file';
        inp.accept = this.kind === 'audio' ? 'audio/*' : 'video/*';
        inp.onchange = () => { if (inp.files[0]) this.accept(inp.files[0]); };
        inp.click();
      });
      dbGet(this.key).then((blob) => { if (blob) this.renderMedia(blob); }).catch(() => {});
    }
    accept(file) {
      dbSet(this.key, file).catch(() => {});
      this.renderMedia(file);
    }
    renderEmpty() {
      this._hasMedia = false;
      const label = this.getAttribute('placeholder') || ('Drop ' + this.kind + ' here, or click to browse');
      const icon = this.kind === 'audio'
        ? '<svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="#B49546" stroke-width="1.3"><path d="M9 18V6l10-2v12"/><circle cx="6.5" cy="18" r="2.5"/><circle cx="16.5" cy="16" r="2.5"/></svg>'
        : '<svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="#B49546" stroke-width="1.3"><rect x="2.5" y="5" width="13" height="14" rx="2"/><path d="M15.5 10.5 21.5 7v10l-6-3.5"/></svg>';
      this.innerHTML =
        '<div style="position:absolute;inset:0;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:12px;' +
        'background:repeating-linear-gradient(-45deg,rgba(61,42,93,.05),rgba(61,42,93,.05) 10px,rgba(61,42,93,.09) 10px,rgba(61,42,93,.09) 20px);' +
        'border:1px dashed rgba(61,42,93,.35);border-radius:inherit;cursor:pointer;text-align:center;padding:20px;box-sizing:border-box">' +
        icon +
        '<span style="font:400 12px/1.5 \'Work Sans\',sans-serif;letter-spacing:.05em;color:rgba(44,34,55,.6);max-width:260px">' + label + '</span>' +
        '</div>';
    }
    renderMedia(blob) {
      this._hasMedia = true;
      const url = URL.createObjectURL(blob);
      if (this.kind === 'audio') {
        this.innerHTML = '<audio controls src="' + url + '" style="width:100%;display:block"></audio>';
      } else {
        this.innerHTML = '<video controls src="' + url + '" style="position:absolute;inset:0;width:100%;height:100%;object-fit:cover;border-radius:inherit;background:#2C2237"></video>';
      }
    }
  }
  if (!customElements.get('media-slot')) customElements.define('media-slot', MediaSlot);
})();
