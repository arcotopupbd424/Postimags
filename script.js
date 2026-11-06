(() => {
  const C = window.PI_CONFIG, $ = s => document.querySelector(s);
  const drop = $("#upload"), input = $("#file"), queue = $("#queue"), grid = $("#grid"), empty = $("#empty");
  const KEY = "postimages_history";
  ["#logo", "#flogo"].forEach(s => $(s).src = C.LOGO);
  $("#maxmb").textContent = C.MAX_MB; $("#yr").textContent = new Date().getFullYear();

  const load = () => { try { return JSON.parse(localStorage.getItem(KEY)) || []; } catch { return []; } };
  const save = a => { try { localStorage.setItem(KEY, JSON.stringify(a.slice(0, 100))); } catch {} };
  let history = load();

  function toast(t) { const e = $("#toast"); e.textContent = t; e.classList.add("show"); clearTimeout(toast.t); toast.t = setTimeout(() => e.classList.remove("show"), 1800); }
  async function copy(text, btn) {
    try { await navigator.clipboard.writeText(text); } catch { const t = document.createElement("textarea"); t.value = text; document.body.append(t); t.select(); document.execCommand("copy"); t.remove(); }
    toast("কপি হয়েছে ✓");
    if (btn) { const o = btn.textContent; btn.textContent = "কপি হয়েছে"; btn.classList.add("done"); setTimeout(() => { btn.textContent = o; btn.classList.remove("done"); }, 1200); }
  }
  const esc = s => s.replace(/[&<>"]/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));

  function renderHistory() {
    grid.innerHTML = ""; empty.style.display = history.length ? "none" : "block";
    history.forEach((h, i) => {
      const d = document.createElement("div"); d.className = "cut tile";
      d.innerHTML = `<img src="${esc(h.url)}" alt="${esc(h.name)}" loading="lazy"><div class="meta"><button data-c>লিংক</button><button data-x>মুছুন</button></div>`;
      d.querySelector("[data-c]").onclick = e => copy(h.url, e.target);
      d.querySelector("[data-x]").onclick = () => { history.splice(i, 1); save(history); renderHistory(); };
      grid.append(d);
    });
  }
  $("#clear").onclick = () => { if (history.length && confirm("সব তালিকা মুছবেন? (সার্ভার থেকে ছবি মুছবে না)")) { history = []; save(history); renderHistory(); } };

  function field(label, value) {
    const f = document.createElement("div"); f.className = "field";
    f.innerHTML = `<span>${label}</span><input readonly value="${esc(value)}"><button class="copy">কপি</button>`;
    f.querySelector("input").onfocus = e => e.target.select();
    f.querySelector("button").onclick = e => copy(value, e.target);
    return f;
  }

  function send(file, onProgress) {
    return new Promise((res, rej) => {
      const fd = new FormData(), xhr = new XMLHttpRequest();
      let url;
      if (C.MODE === "imgbb") {
        const k = C.IMGBB_KEY || localStorage.getItem("postimages_key") || "";
        if (!k) { const e = new Error("ImgBB API key দেওয়া হয়নি। সেটিংস থেকে key বসান।"); e.noKey = true; return rej(e); }
        fd.append("image", file); url = "https://api.imgbb.com/1/upload?key=" + encodeURIComponent(k);
      } else { fd.append("image", file); url = C.PHP_ENDPOINT; }
      xhr.open("POST", url);
      xhr.upload.onprogress = e => e.lengthComputable && onProgress(e.loaded / e.total * 100);
      xhr.onerror = () => rej(new Error("নেটওয়ার্ক সমস্যা। আবার চেষ্টা করুন।"));
      xhr.onload = () => {
        try {
          const j = JSON.parse(xhr.responseText);
          if (C.MODE === "imgbb") j.success ? res(j.data.url) : rej(new Error(j.error?.message || "আপলোড ব্যর্থ"));
          else j.url ? res(new URL(j.url, location.href).href) : rej(new Error(j.error || "আপলোড ব্যর্থ"));
        } catch { rej(new Error("সার্ভার থেকে সঠিক উত্তর আসেনি।")); }
      };
      xhr.send(fd);
    });
  }

  async function handle(file) {
    const it = document.createElement("div"); it.className = "cut item";
    const prev = URL.createObjectURL(file);
    it.innerHTML = `<img src="${prev}" alt=""><div><div class="name">${esc(file.name)}</div><div class="bar"><i></i></div><div class="status muted" style="padding:6px 0;text-align:left">আপলোড হচ্ছে…</div></div>`;
    queue.prepend(it);
    const bar = it.querySelector(".bar i"), st = it.querySelector(".status");
    const fail = m => { it.querySelector(".bar").remove(); st.className = "err"; st.textContent = m; };
    if (!file.type.startsWith("image/")) return fail("শুধু ছবি আপলোড করা যাবে।");
    if (file.size > C.MAX_MB * 1048576) return fail(`ছবি ${C.MAX_MB} MB এর বেশি হতে পারবে না।`);
    try {
      const url = await send(file, p => bar.style.width = p + "%");
      bar.style.width = "100%"; it.querySelector(".bar").remove(); st.remove();
      const f = it.lastElementChild.appendChild(document.createElement("div")); f.className = "fields";
      f.append(field("ডাইরেক্ট লিংক", url), field("HTML", `<img src="${url}" alt="">`), field("লোগো কোড", `<a href="/"><img src="${url}" alt="Logo" height="48"></a>`), field("BBCode", `[img]${url}[/img]`), field("Markdown", `![](${url})`));
      history.unshift({ url, name: file.name, t: Date.now() }); save(history); renderHistory();
    } catch (e) { fail(e.message); if (e.noKey) $("#dlg").showModal(); }
  }

  const take = files => [...files].forEach(handle);
  drop.onclick = () => input.click();
  drop.onkeydown = e => (e.key === "Enter" || e.key === " ") && (e.preventDefault(), input.click());
  input.onchange = () => { take(input.files); input.value = ""; };
  ["dragenter", "dragover"].forEach(t => drop.addEventListener(t, e => { e.preventDefault(); drop.classList.add("over"); }));
  ["dragleave", "drop"].forEach(t => drop.addEventListener(t, e => { e.preventDefault(); drop.classList.remove("over"); }));
  drop.addEventListener("drop", e => take(e.dataTransfer.files));
  document.addEventListener("paste", e => { const f = [...(e.clipboardData?.files || [])]; if (f.length) take(f); });
  const dlg = $("#dlg");
  $("#cfg").onclick = () => { $("#keyin").value = localStorage.getItem("postimages_key") || ""; dlg.showModal(); };
  $("#keycancel").onclick = () => dlg.close();
  $("#keysave").onclick = () => { const v = $("#keyin").value.trim(); v ? localStorage.setItem("postimages_key", v) : localStorage.removeItem("postimages_key"); dlg.close(); toast("সেভ হয়েছে ✓"); };
  renderHistory();
})();
