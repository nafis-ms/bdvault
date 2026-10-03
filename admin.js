/* BD VAULT admin panel. Uses the BDV data layer from store.js. */
(function () {
  var AK = "bdvault-admin", AS = "bdvault-admin-session";
  var STATUSES = ["Pending", "Confirmed", "Shipped", "Delivered", "Cancelled"];
  var $ = function (s) { return document.querySelector(s); };
  function el(tag, cls, text) { var n = document.createElement(tag); if (cls) n.className = cls; if (text !== undefined) n.textContent = text; return n; }
  function money(n) { return "\u09F3" + Number(n || 0).toLocaleString("en-US"); }
  function catLabel(id) { var c = BDV.categories.filter(function (x) { return x.id === id; })[0]; return c ? c.label : id; }
  function catImg(id) { var c = BDV.categories.filter(function (x) { return x.id === id; })[0]; return c ? c.img : ""; }
  function getAdmin() { try { return JSON.parse(localStorage.getItem(AK)); } catch (e) { return null; } }
  function loggedIn() { try { return sessionStorage.getItem(AS) === "1"; } catch (e) { return false; } }

  /* ---------- gate ---------- */
  function showGate() {
    var setup = !getAdmin();
    $("#app").hidden = true; $("#gate").hidden = false; $("#logout").hidden = true;
    $("#gate-title").textContent = setup ? "Create admin password" : "Admin Login";
    $("#gate-text").textContent = setup ? "First time here. Choose a password (at least 8 characters) to protect this panel." : "Enter your admin password to continue.";
    $("#g-confirm-wrap").hidden = !setup;
    $("#g-pass2").required = setup;
    $("#g-btn").textContent = setup ? "CREATE PASSWORD" : "LOGIN";
    $("#g-pass").autocomplete = setup ? "new-password" : "current-password";
  }
  $("#gate-form").addEventListener("submit", function (e) {
    e.preventDefault();
    var msg = $("#g-msg"), pw = $("#g-pass").value, admin = getAdmin();
    msg.textContent = "";
    if (!admin) {
      if (pw.length < 8) { msg.textContent = "Password must be at least 8 characters."; return; }
      if (pw !== $("#g-pass2").value) { msg.textContent = "Passwords do not match."; return; }
      BDV.hash(pw).then(function (h) {
        localStorage.setItem(AK, JSON.stringify({ hash: h }));
        sessionStorage.setItem(AS, "1"); start();
      });
    } else {
      BDV.hash(pw).then(function (h) {
        if (h !== admin.hash) { msg.textContent = "Incorrect password."; return; }
        sessionStorage.setItem(AS, "1"); start();
      });
    }
  });
  $("#logout").addEventListener("click", function () { sessionStorage.removeItem(AS); $("#g-pass").value = ""; showGate(); });

  /* ---------- dashboard ---------- */
  function start() {
    $("#gate").hidden = true; $("#app").hidden = false; $("#logout").hidden = false;
    var sel = $("#p-cat"), es = $("#e-cat");
    if (!sel.options.length) {
      sel.appendChild(new Option("All categories", ""));
      BDV.categories.forEach(function (c) { sel.appendChild(new Option(c.label, c.id)); es.appendChild(new Option(c.label, c.id)); });
    }
    renderAll(); loadOffer();
  }
  function renderAll() { renderStats(); renderProducts(); renderOrders(); }

  function renderStats() {
    var o = BDV.orders.all(), rev = 0, pend = 0;
    o.forEach(function (x) { if (x.status !== "Cancelled") rev += Number(x.total) || 0; if (x.status === "Pending") pend++; });
    var data = [[BDV.products.all().length, "Products"], [o.length, "Orders"], [pend, "Pending orders"], [money(rev), "Revenue (excl. cancelled)"]];
    var box = $("#stats"); box.textContent = "";
    data.forEach(function (d) { var s = el("div", "adm-stat"); s.appendChild(el("b", "", String(d[0]))); s.appendChild(el("span", "", d[1])); box.appendChild(s); });
  }

  $(".adm-tabs").addEventListener("click", function (e) {
    var b = e.target.closest("button[data-tab]"); if (!b) return;
    document.querySelectorAll(".adm-tabs button").forEach(function (x) { x.classList.toggle("on", x === b); });
    ["products", "offer", "orders", "data"].forEach(function (t) { $("#tab-" + t).hidden = t !== b.dataset.tab; });
  });

  /* ---------- products ---------- */
  function renderProducts() {
    var q = $("#p-search").value.trim().toLowerCase(), c = $("#p-cat").value, list = $("#p-list");
    list.textContent = "";
    var items = BDV.products.all().filter(function (p) {
      return (!c || p.category === c) && (!q || (p.name + " " + p.brand).toLowerCase().indexOf(q) !== -1);
    });
    if (!items.length) {
      list.appendChild(el("div", "adm-empty", BDV.products.all().length ? "No products match your search." : "No products yet. Click \u201C+ ADD PRODUCT\u201D to add your first one."));
      return;
    }
    items.forEach(function (p) {
      var row = el("article", "adm-item");
      var im = document.createElement("img"); im.src = p.image || catImg(p.category); im.alt = ""; im.loading = "lazy";
      var info = el("div"); var h = el("h3", "", p.name);
      if (p.featured) h.appendChild(el("span", "adm-badge", "FEATURED"));
      info.appendChild(h); info.appendChild(el("small", "", (p.brand || "No brand") + " \u2022 " + catLabel(p.category)));
      var acts = el("div", "adm-acts");
      var ed = el("button", "adm-btn", "Edit"), del = el("button", "adm-btn adm-btn-danger", "Delete");
      ed.type = del.type = "button"; ed.dataset.act = "edit"; del.dataset.act = "del"; ed.dataset.id = del.dataset.id = p.id;
      acts.appendChild(ed); acts.appendChild(del);
      var pr = el("div", "adm-price", money(p.price));
      if (p.salePrice) pr.appendChild(el("small", "", " \u2192 " + money(p.salePrice)));
      [im, info, pr, acts].forEach(function (n) { row.appendChild(n); });
      list.appendChild(row);
    });
  }
  $("#p-search").addEventListener("input", renderProducts);
  $("#p-cat").addEventListener("change", renderProducts);
  $("#p-list").addEventListener("click", function (e) {
    var b = e.target.closest("[data-act]"); if (!b) return;
    var all = BDV.products.all();
    if (b.dataset.act === "edit") {
      var p = all.filter(function (x) { return x.id === b.dataset.id; })[0]; if (p) openEditor(p);
    } else if (confirm("Delete this product? This cannot be undone.")) {
      BDV.products.save(all.filter(function (x) { return x.id !== b.dataset.id; })); renderAll();
    }
  });

  /* ---------- editor ---------- */
  var image = "";
  function setPreview(src) {
    image = src || "";
    $("#e-prev").hidden = !image; $("#e-noimg").hidden = !image;
    if (image) $("#e-prev").src = image;
  }
  function openEditor(p) {
    p = p || {};
    $("#e-title").textContent = p.id ? "Edit product" : "Add product";
    $("#e-id").value = p.id || ""; $("#e-name").value = p.name || ""; $("#e-brand").value = p.brand || "";
    $("#e-price").value = p.price != null ? p.price : ""; $("#e-sale").value = p.salePrice || ""; $("#e-cat").value = p.category || BDV.categories[0].id;
    $("#e-specs").value = (p.specs || []).join("\n"); $("#e-feat").checked = !!p.featured;
    $("#e-img").value = ""; $("#e-msg").textContent = ""; setPreview(p.image);
    $("#editor").hidden = false; document.body.style.overflow = "hidden"; $("#e-name").focus();
  }
  function closeEditor() { $("#editor").hidden = true; document.body.style.overflow = ""; }
  $("#p-add").addEventListener("click", function () { openEditor(); });
  $("#e-cancel").addEventListener("click", closeEditor);
  document.addEventListener("keydown", function (e) { if (e.key === "Escape" && !$("#editor").hidden) closeEditor(); });
  $("#e-noimg").addEventListener("click", function () { $("#e-img").value = ""; setPreview(""); });
  $("#e-img").addEventListener("change", function () {
    var f = this.files[0]; if (!f) return;
    var rd = new FileReader();
    rd.onload = function () {
      var im = new Image();
      im.onload = function () {
        var s = Math.min(1, 800 / Math.max(im.width, im.height)), c = document.createElement("canvas");
        c.width = Math.round(im.width * s); c.height = Math.round(im.height * s);
        c.getContext("2d").drawImage(im, 0, 0, c.width, c.height);
        setPreview(c.toDataURL("image/jpeg", 0.82));
      };
      im.onerror = function () { $("#e-msg").textContent = "That file is not a valid image."; };
      im.src = rd.result;
    };
    rd.readAsDataURL(f);
  });
  $("#e-form").addEventListener("submit", function (e) {
    e.preventDefault();
    var all = BDV.products.all(), id = $("#e-id").value;
    var rec = {
      id: id || "p-" + Date.now().toString(36), category: $("#e-cat").value, name: $("#e-name").value.trim(),
      brand: $("#e-brand").value.trim(), price: Math.max(0, parseInt($("#e-price").value, 10) || 0), salePrice: Math.max(0, parseInt($("#e-sale").value, 10) || 0), image: image,
      specs: $("#e-specs").value.split("\n").map(function (x) { return x.trim(); }).filter(Boolean), featured: $("#e-feat").checked
    };
    if (rec.salePrice && rec.salePrice >= rec.price) { $("#e-msg").textContent = "Offer price must be lower than the normal price."; return; }
    if (!rec.name) { $("#e-msg").textContent = "Product name is required."; return; }
    var idx = -1; all.forEach(function (x, i) { if (x.id === id) idx = i; });
    if (idx > -1) all[idx] = rec; else all.push(rec);
    if (!BDV.products.save(all)) { $("#e-msg").textContent = "Storage is full. Use a smaller image or delete unused products."; return; }
    closeEditor(); renderAll();
  });

  /* ---------- offer ---------- */
  function loadOffer() {
    var o = BDV.offer.get(), link = $("#of-link");
    if (!link.options.length) {
      link.appendChild(new Option("All categories", "categories.html"));
      BDV.categories.forEach(function (c) { link.appendChild(new Option(c.label, c.page)); });
    }
    $("#of-on").checked = !!o.enabled; $("#of-label").value = o.label || ""; $("#of-head").value = o.headline || "";
    $("#of-high").value = o.highlight || ""; $("#of-btn").value = o.buttonText || ""; $("#of-link").value = o.buttonLink || "categories.html";
    $("#of-end").value = o.endsAt || "";
  }
  $("#offer-form").addEventListener("submit", function (e) {
    e.preventDefault();
    var o = { enabled: $("#of-on").checked, label: $("#of-label").value.trim(), headline: $("#of-head").value.trim(), highlight: $("#of-high").value.trim(),
      buttonText: $("#of-btn").value.trim(), buttonLink: $("#of-link").value, endsAt: $("#of-end").value };
    if (o.enabled && !o.headline) { note("#of-msg", "Add a headline before activating the offer.", true); return; }
    if (o.enabled && o.endsAt && Date.parse(o.endsAt) <= Date.now()) { note("#of-msg", "The end time is already in the past.", true); return; }
    note("#of-msg", BDV.offer.save(o) ? (o.enabled ? "Offer saved and live on the home page." : "Offer saved (inactive).") : "Could not save.", false);
  });

  /* ---------- orders ---------- */
  function renderOrders() {
    var list = $("#o-list"), orders = BDV.orders.all().slice().reverse();
    list.textContent = "";
    if (!orders.length) { list.appendChild(el("div", "adm-empty", "No orders yet.")); return; }
    orders.forEach(function (o) {
      var card = el("article", "adm-order"), top = el("div", "adm-order-top");
      top.appendChild(el("h3", "", o.id + " \u2022 " + money(o.total)));
      var sel = document.createElement("select"); sel.dataset.id = o.id; sel.setAttribute("aria-label", "Order status");
      STATUSES.forEach(function (s) { sel.appendChild(new Option(s, s, false, s === o.status)); });
      top.appendChild(sel); card.appendChild(top);
      var c = o.customer || {};
      card.appendChild(el("p", "", new Date(o.createdAt).toLocaleString() + " \u2022 " + (o.payment || "")));
      card.appendChild(el("p", "", [c.name, c.phone, c.email].filter(Boolean).join(" \u2022 ")));
      card.appendChild(el("p", "", c.address || ""));
      card.appendChild(el("p", "", (o.items || []).map(function (i) { return i.qty + " \u00D7 " + i.name; }).join(", ") + " \u2022 Delivery " + money(o.delivery)));
      var d = el("button", "adm-btn adm-btn-danger", "Delete order"); d.type = "button"; d.dataset.del = o.id; card.appendChild(d);
      list.appendChild(card);
    });
  }
  $("#o-list").addEventListener("change", function (e) {
    if (e.target.tagName !== "SELECT") return;
    var all = BDV.orders.all(); all.forEach(function (o) { if (o.id === e.target.dataset.id) o.status = e.target.value; });
    BDV.orders.save(all); renderStats();
  });
  $("#o-list").addEventListener("click", function (e) {
    var b = e.target.closest("[data-del]"); if (!b || !confirm("Delete this order record?")) return;
    BDV.orders.save(BDV.orders.all().filter(function (o) { return o.id !== b.dataset.del; })); renderAll();
  });

  /* ---------- data & security ---------- */
  function note(id, text, bad) { var m = $(id); m.textContent = text; m.style.color = bad ? "#ff6b6b" : "#4ade80"; }
  $("#d-export").addEventListener("click", function () {
    var blob = new Blob([JSON.stringify(BDV.products.all(), null, 2)], { type: "application/json" });
    var a = document.createElement("a"); a.href = URL.createObjectURL(blob); a.download = "bdvault-products.json";
    document.body.appendChild(a); a.click(); a.remove(); setTimeout(function () { URL.revokeObjectURL(a.href); }, 1000);
  });
  $("#d-file").addEventListener("change", function () {
    var f = this.files[0], input = this; if (!f) return;
    var rd = new FileReader();
    rd.onload = function () {
      try {
        var data = JSON.parse(rd.result), ids = BDV.categories.map(function (c) { return c.id; });
        if (!Array.isArray(data)) throw new Error("File must contain a list of products.");
        var clean = data.filter(function (p) { return p && typeof p.name === "string" && ids.indexOf(p.category) !== -1; }).map(function (p, i) {
          return { id: String(p.id || "p-" + Date.now().toString(36) + i), category: p.category, name: p.name, brand: String(p.brand || ""),
            price: Math.max(0, Number(p.price) || 0), salePrice: Math.max(0, Number(p.salePrice) || 0), image: String(p.image || ""), specs: Array.isArray(p.specs) ? p.specs.map(String) : [], featured: !!p.featured };
        });
        if (!clean.length) throw new Error("No valid products found in that file.");
        var merged = $("#d-mode").value === "replace" ? clean : BDV.products.all().concat(clean.filter(function (n) {
          return !BDV.products.all().some(function (o) { return o.id === n.id; });
        }));
        if (!BDV.products.save(merged)) throw new Error("Storage is full.");
        note("#d-msg", clean.length + " products imported.", false); renderAll();
      } catch (err) { note("#d-msg", err.message || "Could not read that file.", true); }
      input.value = "";
    };
    rd.readAsText(f);
  });
  $("#d-clear").addEventListener("click", function () {
    if (confirm("Delete ALL products? This cannot be undone.") && confirm("Last check: really delete every product?")) { BDV.products.save([]); renderAll(); note("#d-msg", "All products deleted.", false); }
  });
  $("#pw-form").addEventListener("submit", function (e) {
    e.preventDefault();
    var pw = $("#pw-new").value;
    if (pw.length < 8) { note("#pw-msg", "Password must be at least 8 characters.", true); return; }
    BDV.hash(pw).then(function (h) { localStorage.setItem(AK, JSON.stringify({ hash: h })); $("#pw-new").value = ""; note("#pw-msg", "Password updated.", false); });
  });

  if (loggedIn() && getAdmin()) start(); else showGate();
})();
