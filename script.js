// THEME CHANGING

(function () {
  var KEY = "bdvault-theme";
  var root = document.documentElement;

  function getSaved() {
    try { return localStorage.getItem(KEY); } catch (e) { return null; }
  }

  function save(theme) {
    try { localStorage.setItem(KEY, theme); } catch (e) {}
  }

  function apply(theme) {
    root.setAttribute("data-theme", theme);

    var buttons = document.querySelectorAll(".theme-toggle");
    for (var i = 0; i < buttons.length; i++) {
      buttons[i].setAttribute("aria-pressed", theme === "light" ? "true" : "false");
    }
  }

  apply(getSaved() === "light" ? "light" : "dark");

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", function () {
      apply(root.getAttribute("data-theme"));
    });
  } else {
    apply(root.getAttribute("data-theme"));
  }

  document.addEventListener("click", function (e) {
    var btn = e.target.closest ? e.target.closest(".theme-toggle") : null;
    if (!btn) return;

    var next = root.getAttribute("data-theme") === "light" ? "dark" : "light";
    apply(next);
    save(next);
  });
})();


// SEARCH
document.addEventListener("submit", function (e) {
  if (!e.target.matches(".search")) return;
  e.preventDefault();

  var q = e.target.q.value.trim().toLowerCase();
  if (!q) return;
  var options = e.target.querySelectorAll("option"), partial = null;

  for (var i = 0; i < options.length; i++) {
    var v = options[i].value.toLowerCase();
    if (v === q) { window.location.href = options[i].dataset.url; return; }
    if (!partial && v.indexOf(q) !== -1) partial = options[i];
  }
  window.location.href = partial ? partial.dataset.url : "categories.html";
});

// SORT BY PRICE
document.addEventListener("DOMContentLoaded", function () {
  var list = document.querySelector(".kb-list");
  if (!list || list.children.length < 2 || !list.querySelector(".kb-item")) return;

  var original = Array.prototype.slice.call(list.children);

  function price(el) {
    var b = el.querySelector(".kb-price b");
    return b ? parseInt(b.textContent.replace(/[^0-9]/g, ""), 10) || 0 : 0;
  }

  var bar = document.createElement("div");
  bar.className = "kb-sort-bar";
  bar.innerHTML =
    '<label for="kb-sort">SORT BY</label>' +
    '<select id="kb-sort" class="kb-sort">' +
    '<option value="default">Default</option>' +
    '<option value="low">Price: Low to High</option>' +
    '<option value="high">Price: High to Low</option>' +
    '</select>';
  list.parentNode.insertBefore(bar, list);

  bar.querySelector("select").addEventListener("change", function () {
    var sorted = original.slice();
    if (this.value === "low") {
      sorted.sort(function (a, b) { return price(a) - price(b); });
    } else if (this.value === "high") {
      sorted.sort(function (a, b) { return price(b) - price(a); });
    }
    for (var i = 0; i < sorted.length; i++) list.appendChild(sorted[i]);
  });
});


// SHOW / HIDE PASSWORD
document.addEventListener("DOMContentLoaded", function () {
  var fields = document.querySelectorAll('.login-input input[type="password"]');

  for (var i = 0; i < fields.length; i++) {
    var input = fields[i];

    var wrap = document.createElement("div");
    wrap.className = "pw-wrap";
    input.parentNode.insertBefore(wrap, input);
    wrap.appendChild(input);

    var btn = document.createElement("button");
    btn.type = "button";
    btn.className = "pw-toggle";
    btn.setAttribute("aria-label", "Show password");
    btn.setAttribute("title", "Show password");
    btn.innerHTML = "&#128065;";
    wrap.appendChild(btn);
  }
});

document.addEventListener("click", function (e) {
  var btn = e.target.closest ? e.target.closest(".pw-toggle") : null;
  if (!btn) return;

  var input = btn.parentNode.querySelector("input");
  var show = input.type === "password";

  input.type = show ? "text" : "password";
  btn.innerHTML = show ? "&#128584;" : "&#128065;";
  btn.setAttribute("aria-label", show ? "Hide password" : "Show password");
  btn.setAttribute("title", show ? "Hide password" : "Show password");
});

// NEWSLETTER CONFIRMATION
document.addEventListener("submit", function (e) {
  var form = e.target;
  if (!form.closest || !form.closest(".newsletter")) return;
  e.preventDefault();

  var field = form.querySelector('input[type="email"]');
  var email = field ? field.value.trim() : "";

  var box = document.createElement("div");
  box.className = "newsletter-thanks";
  box.setAttribute("role", "status");

  var title = document.createElement("strong");
  title.textContent = "Thanks for subscribing!";
  var note = document.createElement("span");
  note.textContent = email
    ? "We'll send the latest gear updates to " + email + "."
    : "We'll send you the latest gear updates.";

  box.appendChild(title);
  box.appendChild(note);
  form.parentNode.replaceChild(box, form);
});


// CART
(function () {
  var KEY = "bdvault-cart-v2";

  function load() {
    try {
      var data = JSON.parse(localStorage.getItem(KEY));
      return data && typeof data === "object" && !Array.isArray(data) ? data : {};
    } catch (e) { return {}; }
  }

  function save(cart) {
    try { localStorage.setItem(KEY, JSON.stringify(cart)); } catch (e) {}
  }

  function total(cart) {
    var n = 0;
    for (var name in cart) {
      if (Object.prototype.hasOwnProperty.call(cart, name)) n += Number(cart[name].qty) || 0;
    }
    return n;
  }

  function money(n) {
    return "৳" + Number(n).toLocaleString("en-US");
  }

  function el(tag, cls, text) {
    var node = document.createElement(tag);
    if (cls) node.className = cls;
    if (text !== undefined) node.textContent = text;
    return node;
  }

  function renderBadge(count) {
    var links = document.querySelectorAll(".cart");
    for (var i = 0; i < links.length; i++) {
      links[i].setAttribute("href", "cart.html");
      var badge = links[i].querySelector(".cart-count");
      if (!badge) {
        badge = el("span", "cart-count");
        links[i].appendChild(badge);
      }
      badge.textContent = count > 99 ? "99+" : String(count);
      badge.hidden = count === 0;
      links[i].setAttribute(
        "aria-label",
        count ? "Shopping Cart, " + count + (count === 1 ? " item" : " items") : "Shopping Cart"
      );
    }
  }

  function renderPage(cart) {
    var root = document.getElementById("cart-root");
    if (!root) return;
    root.textContent = "";

    var names = Object.keys(cart);
    if (!names.length) {
      var empty = el("div", "cart-empty");
      empty.appendChild(el("p", "", "Your cart is empty"));
      empty.appendChild(el("span", "", "Add some gear and it will show up here."));
      var shop = el("a", "primary", "BROWSE CATEGORIES");
      shop.href = "categories.html";
      empty.appendChild(shop);
      root.appendChild(empty);
      return;
    }

    var layout = el("div", "cart-layout");
    var list = el("div", "cart-list");
    var subtotal = 0;
    var count = 0;

    names.forEach(function (name) {
      var item = cart[name];
      var qty = Number(item.qty) || 1;
      var price = Number(item.price) || 0;
      subtotal += qty * price;
      count += qty;

      var row = el("article", "cart-item");

      var imgBox = el("div", "cart-img");
      if (item.img) {
        var img = document.createElement("img");
        img.src = item.img;
        img.alt = name;
        imgBox.appendChild(img);
      }
      row.appendChild(imgBox);

      var info = el("div", "cart-info");
      info.appendChild(el("h3", "", name));
      if (item.brand) info.appendChild(el("span", "kb-brand", item.brand));
      info.appendChild(el("span", "cart-unit", money(price) + " each"));
      row.appendChild(info);

      var qtyBox = el("div", "cart-qty");
      var dec = el("button", "", "−");
      dec.type = "button";
      dec.setAttribute("aria-label", "Decrease quantity of " + name);
      dec.dataset.cartAction = "dec";
      dec.dataset.name = name;
      var num = el("span", "", String(qty));
      var inc = el("button", "", "+");
      inc.type = "button";
      inc.setAttribute("aria-label", "Increase quantity of " + name);
      inc.dataset.cartAction = "inc";
      inc.dataset.name = name;
      qtyBox.appendChild(dec);
      qtyBox.appendChild(num);
      qtyBox.appendChild(inc);
      row.appendChild(qtyBox);

      var lineBox = el("div", "cart-line");
      lineBox.appendChild(el("b", "", money(qty * price)));
      var rm = el("button", "cart-remove", "Remove");
      rm.type = "button";
      rm.dataset.cartAction = "remove";
      rm.dataset.name = name;
      lineBox.appendChild(rm);
      row.appendChild(lineBox);

      list.appendChild(row);
    });

    var sum = el("aside", "cart-summary");
    sum.appendChild(el("h2", "", "Order Summary"));

    var r1 = el("div", "cart-row");
    r1.appendChild(el("span", "", "Items"));
    r1.appendChild(el("span", "", String(count)));
    sum.appendChild(r1);

    var r2 = el("div", "cart-row cart-total");
    r2.appendChild(el("span", "", "Subtotal"));
    r2.appendChild(el("b", "", money(subtotal)));
    sum.appendChild(r2);

    sum.appendChild(el("p", "cart-note",
      "Delivery: ৳60 inside Dhaka, ৳120 outside Dhaka. Added when you confirm your order."));

    if (BDV.auth.current()) {
      var go = el("button", "primary", "PLACE ORDER");
      go.type = "button";
      go.dataset.cartAction = "checkout";
      sum.appendChild(go);
    } else {
      var lg = el("a", "primary", "LOGIN TO ORDER");
      lg.href = "login.html?next=cart.html";
      sum.appendChild(lg);
    }

    var clear = el("button", "cart-clear", "Clear cart");
    clear.type = "button";
    clear.dataset.cartAction = "clear";
    sum.appendChild(clear);

    layout.appendChild(list);
    layout.appendChild(sum);
    root.appendChild(layout);
  }

  function field(label, id, type, value) {
    var d = el("div", "login-input");
    var l = el("label", "", label); l.setAttribute("for", id);
    var i = type === "textarea" ? document.createElement("textarea") : document.createElement("input");
    if (type !== "textarea") i.type = type;
    i.id = id; i.required = true; i.value = value || "";
    d.appendChild(l); d.appendChild(i);
    return d;
  }

  function renderCheckout(cart) {
    var root = document.getElementById("cart-root");
    if (!root) return;
    root.textContent = "";
    var user = BDV.auth.current() || {};
    var sub = 0;
    Object.keys(cart).forEach(function (n) { sub += (Number(cart[n].qty) || 0) * (Number(cart[n].price) || 0); });

    var form = el("form", "checkout");
    form.appendChild(el("h2", "", "Delivery Details"));
    form.appendChild(field("FULL NAME", "co-name", "text", user.name));
    var ph = field("PHONE NUMBER", "co-phone", "tel", "");
    ph.querySelector("input").placeholder = "01XXXXXXXXX";
    form.appendChild(ph);
    form.appendChild(field("FULL ADDRESS", "co-address", "textarea", ""));
    var area = el("div", "login-input");
    var al = el("label", "", "DELIVERY AREA"); al.setAttribute("for", "co-area");
    var sel = document.createElement("select"); sel.id = "co-area";
    sel.innerHTML = '<option value="60">Inside Dhaka (\u09F360)</option><option value="120">Outside Dhaka (\u09F3120)</option>';
    area.appendChild(al); area.appendChild(sel);
    form.appendChild(area);
    form.appendChild(el("p", "cart-note", "Payment: Cash on Delivery. We will confirm your order by phone before dispatch."));
    var totalRow = el("div", "cart-row cart-total");
    totalRow.appendChild(el("span", "", "Total"));
    var tb = el("b", "", "");
    totalRow.appendChild(tb);
    form.appendChild(totalRow);
    function upd() { tb.textContent = money(sub + Number(sel.value)); }
    sel.addEventListener("change", upd); upd();
    var msg = el("p", "form-msg"); msg.setAttribute("role", "alert");
    form.appendChild(msg);
    var ok = el("button", "primary", "CONFIRM ORDER"); ok.type = "submit";
    var back = el("a", "cart-clear", "Back to cart"); back.href = "cart.html";
    form.appendChild(ok); form.appendChild(back);

    form.addEventListener("submit", function (ev) {
      ev.preventDefault();
      var phone = form.querySelector("#co-phone").value.replace(/[\s-]/g, "");
      if (!/^(\+?88)?01[3-9]\d{8}$/.test(phone)) { msg.textContent = "Please enter a valid Bangladeshi mobile number."; return; }
      var delivery = Number(sel.value);
      var order = {
        id: "BDV-" + Date.now().toString(36).toUpperCase(),
        createdAt: new Date().toISOString(), status: "Pending",
        customer: { name: form.querySelector("#co-name").value.trim(), email: user.email, phone: phone, address: form.querySelector("#co-address").value.trim() },
        items: Object.keys(cart).map(function (n) { return { name: n, qty: cart[n].qty, price: cart[n].price }; }),
        subtotal: sub, delivery: delivery, total: sub + delivery, payment: "Cash on Delivery"
      };
      BDV.orders.add(order);
      save({});
      renderBadge(0);
      root.textContent = "";
      var done = el("div", "cart-empty");
      done.appendChild(el("p", "", "Order placed. Thank you!"));
      done.appendChild(el("span", "", "Your order number is " + order.id + ". Total payable: " + money(order.total) + ". We will call you to confirm."));
      var more = el("a", "primary", "CONTINUE SHOPPING"); more.href = "categories.html";
      done.appendChild(more);
      root.appendChild(done);
    });
    root.appendChild(form);
  }

  function addFromItem(item) {
    var heading = item ? item.querySelector("h3") : null;
    if (!heading) return;
    var title = heading.textContent.trim();
    var priceEl = item.querySelector(".kb-price b");
    var brandEl = item.querySelector(".kb-brand");
    var imgEl = item.querySelector(".kb-img img");
    var data = load();
    if (data[title]) {
      data[title].qty = (Number(data[title].qty) || 0) + 1;
    } else {
      data[title] = {
        qty: 1,
        price: priceEl ? parseInt(priceEl.textContent.replace(/[^0-9]/g, ""), 10) || 0 : 0,
        brand: brandEl ? brandEl.textContent.trim() : "",
        img: imgEl ? imgEl.getAttribute("src") : ""
      };
    }
    save(data);
    refresh();
  }

  function refresh() {
    var cart = load(), live = BDV.products.all(), changed = false;
    live.forEach(function (p) {
      if (cart[p.name]) { var np = BDV.price(p); if (cart[p.name].price !== np) { cart[p.name].price = np; changed = true; } }
    });
    if (changed) save(cart);
    renderBadge(total(cart));
    renderPage(cart);
  }

  document.addEventListener("DOMContentLoaded", function () {
    var orders = document.querySelectorAll(".kb-item .kb-order");
    for (var i = 0; i < orders.length; i++) {
      var btn = el("button", "add-cart", "ADD TO CART");
      btn.type = "button";
      orders[i].appendChild(btn);
    }
    refresh();
  });

  document.addEventListener("click", function (e) {
    var act = e.target.closest ? e.target.closest("[data-cart-action]") : null;
    if (act) {
      var cart = load();
      var name = act.dataset.name;
      var kind = act.dataset.cartAction;
      if (kind === "checkout") { renderCheckout(cart); window.scrollTo(0, 0); return; }
      if (kind === "clear") {
        cart = {};
      } else if (cart[name]) {
        if (kind === "inc") cart[name].qty = (Number(cart[name].qty) || 0) + 1;
        if (kind === "dec") cart[name].qty = (Number(cart[name].qty) || 0) - 1;
        if (kind === "remove" || cart[name].qty < 1) delete cart[name];
      }
      save(cart);
      refresh();
      return;
    }

    var ord = e.target.closest ? e.target.closest(".kb-order .primary") : null;
    if (ord) {
      e.preventDefault();
      addFromItem(ord.closest(".kb-item"));
      window.location.href = BDV.auth.current() ? "cart.html" : "login.html?next=cart.html";
      return;
    }

    var btn = e.target.closest ? e.target.closest(".add-cart") : null;
    if (!btn) return;
    addFromItem(btn.closest(".kb-item"));

    btn.classList.add("added");
    btn.textContent = "ADDED ✓";
    clearTimeout(btn._reset);
    btn._reset = setTimeout(function () {
      btn.classList.remove("added");
      btn.textContent = "ADD TO CART";
    }, 1200);
  });

  window.addEventListener("storage", function (e) {
    if (e.key === KEY) refresh();
  });
})();

// MOBILE MENU
document.addEventListener("DOMContentLoaded", function () {
  var header = document.querySelector(".header");
  var nav = header ? header.querySelector("nav") : null;
  if (!nav) return;
  nav.id = nav.id || "site-nav";

  var btn = document.createElement("button");
  btn.type = "button";
  btn.className = "nav-toggle";
  btn.setAttribute("aria-label", "Open menu");
  btn.setAttribute("aria-expanded", "false");
  btn.setAttribute("aria-controls", nav.id);
  btn.innerHTML = "<span></span><span></span><span></span>";
  header.appendChild(btn);

  function set(open) {
    header.classList.toggle("nav-open", open);
    btn.setAttribute("aria-expanded", open ? "true" : "false");
    btn.setAttribute("aria-label", open ? "Close menu" : "Open menu");
  }
  btn.addEventListener("click", function () { set(!header.classList.contains("nav-open")); });
  document.addEventListener("keydown", function (e) { if (e.key === "Escape") set(false); });
  window.addEventListener("resize", function () { if (window.innerWidth > 900) set(false); });
});


// ACCOUNT: header icon, login, register
document.addEventListener("DOMContentLoaded", function () {
  var user = BDV.auth.current();
    var icon = document.querySelector('.actions a[href="login.html"]');
  if (icon) {
    var menu = document.createElement("div");
    menu.className = "account-menu";
    menu.setAttribute("role", "menu");

    var addItem = function (tag, text, href, cls) {
      var n = document.createElement(tag);
      n.textContent = text;
      n.className = cls || "";
      n.setAttribute("role", "menuitem");
      if (href) n.href = href; else n.type = "button";
      menu.appendChild(n);
      return n;
    };

    if (user) {
      var first = String(user.name || "Account").trim().split(/\s+/)[0];
      icon.classList.add("logged-in");
      icon.innerHTML = '<span class="avatar"></span><span class="uname"></span>';
      icon.querySelector(".avatar").textContent = first.charAt(0).toUpperCase();
      icon.querySelector(".uname").textContent = first;

      var head = document.createElement("div");
      head.className = "account-head";
      var nm = document.createElement("strong"); nm.textContent = user.name;
      var em = document.createElement("span");   em.textContent = user.email;
      head.appendChild(nm); head.appendChild(em);
      menu.appendChild(head);

      addItem("button", "Log out", null, "am-logout").addEventListener("click", function () {
        BDV.auth.logout();
        window.location.reload();
      });
    } else {
      addItem("a", "Sign Up", "register.html", "am-primary");
      addItem("a", "Log in", "login.html");
    }

    icon.parentNode.appendChild(menu);
    icon.setAttribute("role", "button");
    icon.setAttribute("aria-haspopup", "true");
    icon.setAttribute("aria-expanded", "false");
    icon.setAttribute("aria-label", user ? "Account: " + user.name : "Account");
    icon.title = user ? user.name : "Account";

    var setOpen = function (open) {
      menu.classList.toggle("open", open);
      icon.setAttribute("aria-expanded", open ? "true" : "false");
    };
    icon.addEventListener("click", function (e) {
      e.preventDefault();
      setOpen(!menu.classList.contains("open"));
    });
    document.addEventListener("click", function (e) {
      if (!menu.contains(e.target) && !icon.contains(e.target)) setOpen(false);
    });
    document.addEventListener("keydown", function (e) {
      if (e.key === "Escape") setOpen(false);
    });
  }

  var form = document.querySelector(".login-card form, .register-card form");
  if (!form) return;
  var isRegister = !!form.closest(".register-card");
  var msg = document.createElement("p");
  msg.className = "form-msg";
  msg.setAttribute("role", "alert");
  form.insertBefore(msg, form.querySelector(".login-button"));

  function next() {
    var n = new URLSearchParams(window.location.search).get("next");
    return n && /^[a-z_]+\.html$/.test(n) ? n : "index.html";
  }

  form.addEventListener("submit", function (e) {
    e.preventDefault();
    msg.textContent = "";
    var email = form.querySelector("#email").value;
    var pw = form.querySelector("#password").value;
    if (isRegister) {
      if (pw.length < 8) { msg.textContent = "Password must be at least 8 characters."; return; }
      if (pw !== form.querySelector("#confirm-password").value) { msg.textContent = "Passwords do not match."; return; }
      BDV.auth.register(form.querySelector("#name").value, email, pw).then(function (r) {
        if (!r.ok) { msg.textContent = r.error; return; }
        window.location.href = "login.html" + (window.location.search || "");
      });
    } else {
      var rem = form.querySelector('input[type="checkbox"]');
      BDV.auth.login(email, pw, rem && rem.checked).then(function (r) {
        if (!r.ok) { msg.textContent = r.error; return; }
        window.location.href = next();
      });
    }
  });
});

// HEADER SHADOW ON SCROLL
(function () {
  function update() {
    var h = document.querySelector(".header");
    if (h) h.classList.toggle("scrolled", window.scrollY > 8);
  }
  window.addEventListener("scroll", update, { passive: true });
  document.addEventListener("DOMContentLoaded", update);
})();

// HERO GRID CELL GLOW
(function () {
  var CELL = 48;          // must match background-size in .hero::after
  var HOLD = 1000;        // ms the cell stays lit
  var FADE = 900;         // ms the fade-out takes (match the CSS)

  document.addEventListener("DOMContentLoaded", function () {
    var hero = document.querySelector(".hero");
    if (!hero) return;
    if (window.matchMedia("(hover: none)").matches) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

    var layer = document.createElement("div");
    layer.className = "hero-cells";
    layer.setAttribute("aria-hidden", "true");
    hero.insertBefore(layer, hero.firstChild);

    var live = {}, last = "";

    function light(c, r, key) {
      var n = live[key];
      if (!n) {
        n = document.createElement("i");
        n.style.left = c * CELL + "px";
        n.style.top = r * CELL + "px";
        layer.appendChild(n);
        live[key] = n;
        void n.offsetWidth;               // so the glow animates in
      }
      n.classList.add("on");
      clearTimeout(n._t);
      n._t = setTimeout(function () {
        n.classList.remove("on");
        n._t = setTimeout(function () {
          if (n.parentNode) n.parentNode.removeChild(n);
          delete live[key];
        }, FADE);
      }, HOLD);
    }

    hero.addEventListener("mousemove", function (e) {
      var rect = hero.getBoundingClientRect();
      var c = Math.floor((e.clientX - rect.left) / CELL);
      var r = Math.floor((e.clientY - rect.top) / CELL);
      var key = c + "," + r;
      if (key === last) return;
      last = key;
      light(c, r, key);
    });
    hero.addEventListener("mouseleave", function () { last = ""; });
  });
})();

// CATEGORY CARD SPOTLIGHT
document.addEventListener("pointermove", function (e) {
  var card = e.target.closest ? e.target.closest(".cat") : null;
  if (!card) return;
  var r = card.getBoundingClientRect();
  card.style.setProperty("--mx", (e.clientX - r.left) + "px");
  card.style.setProperty("--my", (e.clientY - r.top) + "px");
});
