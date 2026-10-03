/* BD VAULT core data layer: products, accounts, orders.
   Everything lives in localStorage for now. The future admin panel should read/write
   the same keys (or this API) and can later be swapped for a real backend. */
(function () {
  var KEYS = { offer: "bdvault-offer-v1", products: "bdvault-products-v1", orders: "bdvault-orders-v1", users: "bdvault-users-v1", session: "bdvault-session" };
  var CATS = [
    { id: "keyboard", label: "Keyboards", page: "keyboard.html", img: "Image/prdct_keyboard.png" },
    { id: "mouse", label: "Mouse", page: "mouse.html", img: "Image/prdct_mouse.png" },
    { id: "headsets", label: "Headsets", page: "headsets.html", img: "Image/prdct_headset.png" },
    { id: "controller", label: "Controllers", page: "controller.html", img: "Image/prdct_controller.png" },
    { id: "monitor", label: "Monitors", page: "monitor.html", img: "Image/prdct_monitor.png" },
    { id: "accessories", label: "Accessories", page: "accessories.html", img: "Image/prdct_cable.png" }
  ];

  function read(k, fallback) {
    try { var v = JSON.parse(localStorage.getItem(k)); return v == null ? fallback : v; } catch (e) { return fallback; }
  }
  function write(k, v) { try { localStorage.setItem(k, JSON.stringify(v)); return true; } catch (e) { return false; } }
  function el(tag, cls, text) {
    var n = document.createElement(tag);
    if (cls) n.className = cls;
    if (text !== undefined) n.textContent = text;
    return n;
  }
  function cat(id) { for (var i = 0; i < CATS.length; i++) if (CATS[i].id === id) return CATS[i]; return null; }

  function hash(s) {
    if (window.crypto && crypto.subtle && window.TextEncoder) {
      return crypto.subtle.digest("SHA-256", new TextEncoder().encode(s)).then(function (b) {
        return Array.prototype.map.call(new Uint8Array(b), function (x) { return ("0" + x.toString(16)).slice(-2); }).join("");
      });
    }
    return Promise.resolve("b64:" + btoa(unescape(encodeURIComponent(s))));
  }

  var BDV = window.BDV = {
    categories: CATS,
    hash: hash,
    products: {
      all: function () { var l = read(KEYS.products, []); return Array.isArray(l) ? l : []; },
      save: function (list) { return write(KEYS.products, list); },
      byCategory: function (id) { return this.all().filter(function (p) { return p.category === id; }); }
    },
    offer: {
      get: function () { var o = read(KEYS.offer, null); return o && typeof o === "object" ? o : {}; },
      save: function (o) { return write(KEYS.offer, o); },
      active: function () {
        var o = this.get();
        if (!o.enabled || !o.headline) return false;
        return !o.endsAt || Date.parse(o.endsAt) > Date.now();
      }
    },
    price: function (p) {
      var s = Number(p.salePrice) || 0;
      return BDV.offer.active() && s > 0 && s < Number(p.price) ? s : Number(p.price) || 0;
    },
    orders: {
      all: function () { var l = read(KEYS.orders, []); return Array.isArray(l) ? l : []; },
      add: function (o) { var l = this.all(); l.push(o); return write(KEYS.orders, l); },
      save: function (list) { return write(KEYS.orders, list); }
    },
    auth: {
      current: function () {
        try { return JSON.parse(sessionStorage.getItem(KEYS.session) || localStorage.getItem(KEYS.session)); } catch (e) { return null; }
      },
      register: function (name, email, pw) {
        email = email.trim().toLowerCase();
        var users = read(KEYS.users, {});
        if (users[email]) return Promise.resolve({ ok: false, error: "An account with this email already exists." });
        return hash(pw).then(function (h) {
          users[email] = { name: name.trim(), hash: h };
          write(KEYS.users, users);
          return { ok: true };
        });
      },
      login: function (email, pw, remember) {
        email = email.trim().toLowerCase();
        var u = read(KEYS.users, {})[email];
        if (!u) return Promise.resolve({ ok: false, error: "Incorrect email or password." });
        return hash(pw).then(function (h) {
          if (h !== u.hash) return { ok: false, error: "Incorrect email or password." };
          var s = JSON.stringify({ name: u.name, email: email });
          try { (remember ? localStorage : sessionStorage).setItem(KEYS.session, s); } catch (e) {}
          return { ok: true };
        });
      },
      logout: function () {
        try { sessionStorage.removeItem(KEYS.session); localStorage.removeItem(KEYS.session); } catch (e) {}
      }
    }
  };

  function card(p) {
    var c = cat(p.category) || {};
    var art = el("article", "kb-item");
    art.dataset.id = p.id;
    var img = el("div", "kb-img"), im = document.createElement("img");
    im.src = p.image || c.img || ""; im.alt = p.name; im.loading = "lazy";
    img.appendChild(im);
    var info = el("div", "kb-info");
    info.appendChild(el("h3", "", p.name));
    info.appendChild(el("span", "kb-brand", String(p.brand || "").toUpperCase()));
    var ul = el("ul");
    (p.specs || []).forEach(function (s) { if (s) ul.appendChild(el("li", "", s)); });
    info.appendChild(ul);
    var price = el("div", "kb-price");
    var now = BDV.price(p);
    price.appendChild(el("b", "", "\u09F3" + now.toLocaleString("en-US")));
    if (now < Number(p.price)) {
      var old = el("small"); old.appendChild(el("s", "", "\u09F3" + Number(p.price).toLocaleString("en-US")));
      old.appendChild(document.createTextNode(" offer price"));
      price.appendChild(old);
    }
    var order = el("div", "kb-order"), a = el("a", "primary", "ORDER NOW");
    a.href = "login.html";
    order.appendChild(a);
    [img, info, price, order].forEach(function (n) { art.appendChild(n); });
    return art;
  }

  function empty(msg, sub) {
    var d = el("div", "empty-state");
    d.appendChild(el("p", "", msg));
    d.appendChild(el("span", "", sub));
    var a = el("a", "primary", "BROWSE CATEGORIES");
    a.href = "categories.html";
    d.appendChild(a);
    return d;
  }

  document.addEventListener("DOMContentLoaded", function () {
    var all = BDV.products.all();

    var lists = document.querySelectorAll("[data-category]");
    for (var i = 0; i < lists.length; i++) {
      var items = BDV.products.byCategory(lists[i].dataset.category);
      if (!items.length) {
        lists[i].appendChild(empty("No products here yet", "New gear is on its way. Check back soon."));
      } else {
        items.forEach(function (p) { this.appendChild(card(p)); }, lists[i]);
      }
    }

    var deal = document.getElementById("deals");
    if (deal) {
      var of = BDV.offer.get();
      if (BDV.offer.active()) {
        document.getElementById("deal-label").textContent = of.label || "LIMITED TIME OFFER";
        document.getElementById("deal-title").textContent = of.headline;
        document.getElementById("deal-highlight").textContent = of.highlight || "";
        var btn = document.getElementById("deal-btn");
        btn.textContent = of.buttonText || "SHOP NOW";
        btn.href = /^[a-z_]+\.html$/.test(of.buttonLink || "") ? of.buttonLink : "categories.html";
        deal.hidden = false;
        var t = document.getElementById("deal-timer");
        if (of.endsAt) {
          var end = Date.parse(of.endsAt);
          (function tick() {
            var ms = end - Date.now();
            if (ms <= 0) { window.location.reload(); return; }
            var d = Math.floor(ms / 864e5), h = Math.floor(ms % 864e5 / 36e5), m = Math.floor(ms % 36e5 / 6e4), s = Math.floor(ms % 6e4 / 1e3);
            t.textContent = "Ends in " + (d ? d + "d " : "") + h + "h " + m + "m " + s + "s";
            setTimeout(tick, 1000);
          })();
        }
      }
    }

    var feat = document.getElementById("featured-root");
    if (feat) {
      var pick = all.filter(function (p) { return p.featured; });
      if (!pick.length) pick = all.slice(-4).reverse();
      if (!pick.length) feat.appendChild(empty("The vault is being stocked", "Featured gear will appear here soon."));
      else pick.slice(0, 4).forEach(function (p) { feat.appendChild(card(p)); });
    }

    var lists2 = document.querySelectorAll("datalist");
    for (var d = 0; d < lists2.length; d++) {
      all.forEach(function (p) {
        var c = cat(p.category);
        if (!c) return;
        var o = document.createElement("option");
        o.value = p.name; o.dataset.url = c.page;
        this.appendChild(o);
      }, lists2[d]);
    }
  });
})();
