(() => {
  "use strict";

  const CONFIG = window.CATALOG_CONFIG || {};
  const STORAGE_KEY = "bioplus-catalog-cart-v1";
  const state = {
    catalog: null,
    products: [],
    filtered: [],
    category: "Todos",
    query: "",
    sort: "featured",
    visible: Number(CONFIG.pageSize || 24),
    cart: loadCart(),
    modalProduct: null,
    modalOfferId: null,
    toastTimer: null
  };

  const $ = (selector) => document.querySelector(selector);
  const elements = {
    search: $("#searchInput"),
    categoryRow: $("#categoryRow"),
    sort: $("#sortSelect"),
    productGrid: $("#productGrid"),
    resultsText: $("#resultsText"),
    emptyState: $("#emptyState"),
    clearFilters: $("#clearFilters"),
    loadMore: $("#loadMore"),
    heroGrid: $("#heroGrid"),
    heroProductCount: $("#heroProductCount"),
    heroCategoryCount: $("#heroCategoryCount"),
    overlay: $("#overlay"),
    cartDrawer: $("#cartDrawer"),
    cartTrigger: $("#cartTrigger"),
    cartClose: $("#cartClose"),
    cartCount: $("#cartCount"),
    cartItems: $("#cartItems"),
    cartEmpty: $("#cartEmpty"),
    cartSummary: $("#cartSummary"),
    cartUnits: $("#cartUnits"),
    cartTotal: $("#cartTotal"),
    checkoutButton: $("#checkoutButton"),
    checkoutNote: $("#checkoutNote"),
    productModal: $("#productModal"),
    modalClose: $("#modalClose"),
    modalImage: $("#modalImage"),
    thumbRow: $("#thumbRow"),
    modalCategory: $("#modalCategory"),
    modalTitle: $("#modalTitle"),
    modalSku: $("#modalSku"),
    modalPrice: $("#modalPrice"),
    modalTerms: $("#modalTerms"),
    modalDescription: $("#modalDescription"),
    modalOffers: $("#modalOffers"),
    modalImageBadge: $("#modalImageBadge"),
    modalOfferSummary: $("#modalOfferSummary"),
    modalQuantity: $("#modalQuantity"),
    modalMinus: $("#modalMinus"),
    modalPlus: $("#modalPlus"),
    modalAdd: $("#modalAdd"),
    orderModal: $("#orderModal"),
    orderClose: $("#orderClose"),
    orderForm: $("#orderForm"),
    orderShipping: $("#orderShipping"),
    customerDepartment: $("#customerDepartment"),
    customerCity: $("#customerCity"),
    departmentOptions: $("#departmentOptions"),
    cityOptions: $("#cityOptions"),
    heroHelp: $("#heroHelp"),
    footerHelp: $("#footerHelp"),
    toast: $("#toast")
  };

  function loadCart() {
    try {
      const cart = JSON.parse(localStorage.getItem(STORAGE_KEY) || "{}");
      return cart && typeof cart === "object" ? cart : {};
    } catch {
      return {};
    }
  }

  function saveCart() {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state.cart));
  }

  function formatPrice(value) {
    return new Intl.NumberFormat(CONFIG.locale || "es-CO", {
      style: "currency",
      currency: CONFIG.currency || "COP",
      maximumFractionDigits: 0
    }).format(Number(value || 0));
  }

  function offersFor(product) {
    if (Array.isArray(product?.offers) && product.offers.length) return product.offers;
    return [{ id: "2-units", label: "Paga 1 · Lleva 2", units: 2, price: Number(product?.price || 0), badge: "Oferta 2x1" }];
  }

  function baseOffer(product) {
    return offersFor(product)[0];
  }

  function cartKey(productId, offerId) {
    return `${productId}::${offerId}`;
  }

  function parseCartKey(key) {
    const separator = key.lastIndexOf("::");
    return separator < 0
      ? { productId: key, offerId: "2-units" }
      : { productId: key.slice(0, separator), offerId: key.slice(separator + 2) };
  }

  function migrateCart() {
    const migrated = {};
    Object.entries(state.cart).forEach(([key, quantity]) => {
      const { productId, offerId } = parseCartKey(key);
      const product = state.products.find((item) => item.id === productId);
      if (!product) return;
      const validOffer = offersFor(product).find((item) => item.id === offerId) || baseOffer(product);
      const nextKey = cartKey(product.id, validOffer.id);
      migrated[nextKey] = Math.min(99, Number(migrated[nextKey] || 0) + Math.max(0, Number(quantity || 0)));
    });
    state.cart = migrated;
    saveCart();
  }

  function populateDepartments() {
    const locations = Array.isArray(window.COLOMBIA_LOCATIONS) ? window.COLOMBIA_LOCATIONS : [];
    locations.forEach(({ name }) => {
      const option = document.createElement("option");
      option.value = name;
      elements.departmentOptions.append(option);
    });
  }

  function selectedDepartment() {
    const locations = Array.isArray(window.COLOMBIA_LOCATIONS) ? window.COLOMBIA_LOCATIONS : [];
    const query = normalize(elements.customerDepartment.value);
    return locations.find(({ name }) => normalize(name) === query);
  }

  function populateCities() {
    const department = selectedDepartment();
    elements.cityOptions.replaceChildren();
    elements.customerDepartment.setCustomValidity(
      elements.customerDepartment.value && !department ? "Selecciona un departamento de la lista." : ""
    );
    elements.customerCity.value = "";
    elements.customerCity.disabled = !department;
    elements.customerCity.placeholder = department ? "Escribe para buscar…" : "Primero selecciona el departamento";
    (department?.cities || []).forEach((city) => {
      const option = document.createElement("option");
      option.value = city;
      elements.cityOptions.append(option);
    });
  }

  function validateCity() {
    const department = selectedDepartment();
    const city = normalize(elements.customerCity.value);
    const valid = department?.cities.some((name) => normalize(name) === city);
    elements.customerCity.setCustomValidity(
      elements.customerCity.value && !valid ? "Selecciona una ciudad o municipio de la lista." : ""
    );
  }

  function normalize(value) {
    return String(value || "")
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .toLowerCase();
  }

  function imageOrPlaceholder(product) {
    return product.images?.[0] ? resolveAsset(product.images[0]) : makePlaceholder(product.name);
  }

  function resolveAsset(source) {
    if (!source || /^(data:|https?:)/i.test(source)) return source;
    return new URL(String(source).replace(/^\/+/, ""), document.baseURI).href;
  }

  function makePlaceholder(name) {
    const initials = String(name || "B+").split(/\s+/).slice(0, 2).map((word) => word[0] || "").join("");
    const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="800" height="800"><rect width="100%" height="100%" fill="#ffffff"/><text x="50%" y="50%" text-anchor="middle" dominant-baseline="central" fill="#0d5b4b" font-family="Arial" font-size="110" font-weight="700">${initials}</text></svg>`;
    return `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`;
  }

  function createButton(text, className, onClick) {
    const button = document.createElement("button");
    button.type = "button";
    button.className = className;
    button.textContent = text;
    button.addEventListener("click", onClick);
    return button;
  }

  function showToast(message) {
    elements.toast.textContent = message;
    elements.toast.classList.add("show");
    clearTimeout(state.toastTimer);
    state.toastTimer = setTimeout(() => elements.toast.classList.remove("show"), 2200);
  }

  function renderHero() {
    elements.heroProductCount.textContent = String(state.catalog.meta.product_count);
    elements.heroCategoryCount.textContent = String(state.catalog.meta.category_count);
    const heroProducts = state.products.filter((item) => item.images?.length).slice(2, 5);
    elements.heroGrid.replaceChildren();
    heroProducts.forEach((product) => {
      const tile = document.createElement("div");
      tile.className = "hero-tile";
      const image = document.createElement("img");
      image.src = imageOrPlaceholder(product);
      image.alt = "";
      image.loading = "eager";
      tile.append(image);
      elements.heroGrid.append(tile);
    });
  }

  function renderCategories() {
    elements.categoryRow.replaceChildren();
    const categories = ["Todos", ...state.catalog.categories];
    categories.forEach((category) => {
      const button = createButton(category, `category-chip${state.category === category ? " active" : ""}`, () => {
        state.category = category;
        state.visible = Number(CONFIG.pageSize || 24);
        renderCategories();
        applyFilters();
      });
      button.setAttribute("aria-pressed", state.category === category ? "true" : "false");
      elements.categoryRow.append(button);
    });
  }

  function applyFilters() {
    const needle = normalize(state.query);
    let products = state.products.filter((product) => {
      const matchesCategory = state.category === "Todos" || product.category === state.category;
      const haystack = normalize(`${product.name} ${product.sku} ${product.category} ${product.description}`);
      return matchesCategory && (!needle || haystack.includes(needle));
    });

    products = [...products].sort((a, b) => {
      if (state.sort === "name-asc") return a.name.localeCompare(b.name, "es");
      if (state.sort === "price-asc") return a.price - b.price;
      if (state.sort === "price-desc") return b.price - a.price;
      return Number(b.featured) - Number(a.featured);
    });

    state.filtered = products;
    renderProducts();
  }

  function productCard(product) {
    const article = document.createElement("article");
    article.className = "product-card";
    article.dataset.productId = product.id;
    const offer = baseOffer(product);

    const imageButton = createButton("", "product-image-button", () => openProduct(product.id));
    imageButton.setAttribute("aria-label", `Ver ${product.name}`);
    const image = document.createElement("img");
    image.src = imageOrPlaceholder(product);
    image.alt = `${product.name}, oferta de dos unidades`;
    image.loading = "lazy";
    image.decoding = "async";
    imageButton.append(image);

    const badge = document.createElement("span");
    badge.className = "product-badge promotion-badge";
    badge.textContent = "PAGA 1 · LLEVA 2";
    const shipping = document.createElement("span");
    shipping.className = "shipping-badge";
    shipping.textContent = "ENVÍO GRATIS";
    imageButton.append(badge, shipping);

    const quickAdd = createButton("＋", "quick-add", (event) => {
      event.stopPropagation();
      addToCart(product.id, offer.id, 1);
    });
    quickAdd.setAttribute("aria-label", `Agregar oferta 2x1 de ${product.name} al carrito`);
    imageButton.append(quickAdd);

    const body = document.createElement("div");
    body.className = "product-body";
    const category = document.createElement("p");
    category.className = "product-category";
    category.textContent = product.category;
    const title = createButton(product.name, "product-title-button", () => openProduct(product.id));
    const offerLine = document.createElement("p");
    offerLine.className = "product-offer-line";
    offerLine.textContent = offersFor(product).length > 1 ? "2x1 + ofertas por cantidad" : "2x1 · Recibes 2 unidades";
    const sku = document.createElement("p");
    sku.className = "product-sku";
    sku.textContent = `Ref. ${product.sku}`;
    const restriction = product.payment_terms ? document.createElement("p") : null;
    if (restriction) {
      restriction.className = "product-restriction";
      restriction.textContent = product.payment_terms;
    }
    const bottom = document.createElement("div");
    bottom.className = "product-bottom";
    const priceBox = document.createElement("div");
    priceBox.className = "product-price-box";
    const price = document.createElement("strong");
    price.className = "product-price";
    price.textContent = formatPrice(offer.price);
    const priceNote = document.createElement("small");
    priceNote.textContent = "Precio total 2x1";
    priceBox.append(price, priceNote);
    const details = createButton("Elegir oferta", "view-link", () => openProduct(product.id));
    bottom.append(priceBox, details);
    body.append(category, title, offerLine, sku);
    if (restriction) body.append(restriction);
    body.append(bottom);
    article.append(imageButton, body);
    return article;
  }

  function renderProducts() {
    const visibleProducts = state.filtered.slice(0, state.visible);
    elements.productGrid.replaceChildren(...visibleProducts.map(productCard));
    const total = state.filtered.length;
    elements.resultsText.textContent = `${total} producto${total === 1 ? "" : "s"}${state.category === "Todos" ? "" : ` en ${state.category}`}`;
    elements.emptyState.hidden = total !== 0;
    elements.productGrid.hidden = total === 0;
    elements.loadMore.hidden = state.visible >= total || total === 0;
    if (!elements.loadMore.hidden) {
      const remaining = total - state.visible;
      elements.loadMore.textContent = `Mostrar más (${remaining})`;
    }
  }

  function openProduct(productId) {
    const product = state.products.find((item) => item.id === productId);
    if (!product) return;
    state.modalProduct = product;
    state.modalOfferId = baseOffer(product).id;
    elements.modalCategory.textContent = product.category;
    elements.modalTitle.textContent = product.name;
    elements.modalSku.textContent = `Referencia: ${product.sku}`;
    elements.modalTerms.textContent = product.payment_terms || "";
    elements.modalTerms.hidden = !product.payment_terms;
    elements.modalDescription.textContent = product.description || "Consulta disponibilidad y detalles con nuestro equipo.";
    elements.modalQuantity.value = "1";
    renderOfferOptions(product);
    renderGallery(product);
    updateModalOffer();
    openLayer("modal");
    elements.modalClose.focus();
  }

  function selectedModalOffer() {
    if (!state.modalProduct) return null;
    return offersFor(state.modalProduct).find((offer) => offer.id === state.modalOfferId) || baseOffer(state.modalProduct);
  }

  function renderOfferOptions(product) {
    elements.modalOffers.replaceChildren();
    offersFor(product).forEach((offer) => {
      const button = createButton("", `offer-option${offer.id === state.modalOfferId ? " active" : ""}`, () => {
        state.modalOfferId = offer.id;
        renderOfferOptions(product);
        updateModalOffer();
      });
      button.setAttribute("aria-pressed", offer.id === state.modalOfferId ? "true" : "false");
      const heading = document.createElement("strong");
      heading.textContent = offer.label;
      const price = document.createElement("span");
      price.textContent = formatPrice(offer.price);
      const badge = document.createElement("small");
      badge.textContent = offer.badge || `${offer.units} unidades`;
      button.append(heading, price, badge);
      elements.modalOffers.append(button);
    });
  }

  function updateModalOffer() {
    const offer = selectedModalOffer();
    if (!offer) return;
    const quantity = Math.max(1, Number(elements.modalQuantity.value || 1));
    const totalUnits = offer.units * quantity;
    elements.modalPrice.textContent = formatPrice(offer.price * quantity);
    elements.modalImageBadge.textContent = `${offer.units} UNIDADES`;
    elements.modalOfferSummary.textContent = `${quantity} oferta${quantity === 1 ? "" : "s"} · Recibes ${totalUnits} unidades`;
    elements.modalAdd.textContent = `Agregar · ${formatPrice(offer.price * quantity)}`;
  }

  function renderGallery(product) {
    const images = product.images?.length ? product.images.map(resolveAsset) : [makePlaceholder(product.name)];
    elements.modalImage.src = images[0];
    elements.modalImage.alt = product.name;
    elements.thumbRow.replaceChildren();
    images.forEach((src, index) => {
      const button = createButton("", `thumb-button${index === 0 ? " active" : ""}`, () => {
        elements.modalImage.src = src;
        elements.thumbRow.querySelectorAll(".thumb-button").forEach((item) => item.classList.remove("active"));
        button.classList.add("active");
      });
      const image = document.createElement("img");
      image.src = src;
      image.alt = `${product.name}, imagen ${index + 1}`;
      button.append(image);
      elements.thumbRow.append(button);
    });
  }

  function closeModal() {
    elements.productModal.hidden = true;
    state.modalProduct = null;
    state.modalOfferId = null;
    closeOverlayIfIdle();
  }

  function openLayer(type) {
    clearTimeout(state.toastTimer);
    elements.toast.classList.remove("show");
    elements.overlay.hidden = false;
    document.body.classList.add("no-scroll");
    if (type === "cart") {
      elements.cartDrawer.classList.add("open");
      elements.cartDrawer.setAttribute("aria-hidden", "false");
    } else {
      elements.productModal.hidden = false;
    }
  }

  function closeCart() {
    elements.cartDrawer.classList.remove("open");
    elements.cartDrawer.setAttribute("aria-hidden", "true");
    closeOverlayIfIdle();
  }

  function closeOrder() {
    elements.orderModal.hidden = true;
    closeOverlayIfIdle();
  }

  function openOrderForm() {
    const entries = cartEntries();
    const total = entries.reduce((sum, entry) => sum + entry.offer.price * entry.quantity, 0);
    if (!entries.length) return;
    elements.cartDrawer.classList.remove("open");
    elements.cartDrawer.setAttribute("aria-hidden", "true");
    elements.orderShipping.textContent = `ENVÍO GRATIS · Total de productos ${formatPrice(total)}`;
    elements.overlay.hidden = false;
    document.body.classList.add("no-scroll");
    elements.orderModal.hidden = false;
    $("#customerName").focus();
  }

  function closeOverlayIfIdle() {
    const cartOpen = elements.cartDrawer.classList.contains("open");
    const modalOpen = !elements.productModal.hidden;
    const orderOpen = !elements.orderModal.hidden;
    if (!cartOpen && !modalOpen && !orderOpen) {
      elements.overlay.hidden = true;
      document.body.classList.remove("no-scroll");
    }
  }

  function addToCart(productId, offerId, quantity) {
    const product = state.products.find((item) => item.id === productId);
    if (!product) return;
    const offer = offersFor(product).find((item) => item.id === offerId) || baseOffer(product);
    const key = cartKey(product.id, offer.id);
    const current = Number(state.cart[key] || 0);
    state.cart[key] = Math.min(99, current + Math.max(1, Number(quantity || 1)));
    saveCart();
    renderCart();
    showToast(`${offer.label} de ${product.name} agregado`);
  }

  function setQuantity(key, quantity) {
    const next = Math.max(0, Math.min(99, Number(quantity || 0)));
    if (next === 0) delete state.cart[key];
    else state.cart[key] = next;
    saveCart();
    renderCart();
  }

  function cartEntries() {
    return Object.entries(state.cart)
      .map(([key, quantity]) => {
        const { productId, offerId } = parseCartKey(key);
        const product = state.products.find((item) => item.id === productId);
        const offer = product ? offersFor(product).find((item) => item.id === offerId) : null;
        return { key, product, offer, quantity: Number(quantity) };
      })
      .filter((entry) => entry.product && entry.offer && entry.quantity > 0);
  }

  function renderCart() {
    const entries = cartEntries();
    const units = entries.reduce((sum, entry) => sum + entry.offer.units * entry.quantity, 0);
    const offerCount = entries.reduce((sum, entry) => sum + entry.quantity, 0);
    const total = entries.reduce((sum, entry) => sum + entry.offer.price * entry.quantity, 0);
    elements.cartCount.textContent = String(offerCount);
    elements.cartItems.replaceChildren();

    entries.forEach(({ key, product, offer, quantity }) => {
      const item = document.createElement("article");
      item.className = "cart-item";
      const image = document.createElement("img");
      image.src = imageOrPlaceholder(product);
      image.alt = "";
      const info = document.createElement("div");
      const name = document.createElement("p");
      name.className = "cart-item-name";
      name.textContent = product.name;
      const offerName = document.createElement("p");
      offerName.className = "cart-item-offer";
      offerName.textContent = offer.label;
      const received = document.createElement("p");
      received.className = "cart-item-received";
      received.textContent = `Recibes ${offer.units * quantity} unidades`;
      const price = document.createElement("p");
      price.className = "cart-item-price";
      price.textContent = formatPrice(offer.price * quantity);
      const controls = document.createElement("div");
      controls.className = "item-quantity";
      const minus = createButton("−", "", () => setQuantity(key, quantity - 1));
      const value = document.createElement("span");
      value.textContent = String(quantity);
      value.title = "Número de ofertas";
      const plus = createButton("＋", "", () => setQuantity(key, quantity + 1));
      controls.append(minus, value, plus);
      info.append(name, offerName, received, price);
      if (product.payment_terms) {
        const terms = document.createElement("p");
        terms.className = "product-restriction";
        terms.textContent = product.payment_terms;
        info.append(terms);
      }
      info.append(controls);
      const remove = createButton("×", "remove-item", () => setQuantity(key, 0));
      remove.setAttribute("aria-label", `Eliminar ${product.name}`);
      item.append(image, info, remove);
      elements.cartItems.append(item);
    });

    elements.cartEmpty.hidden = entries.length > 0;
    elements.cartSummary.hidden = entries.length === 0;
    elements.cartUnits.textContent = `${units} unidad${units === 1 ? "" : "es"}`;
    elements.cartTotal.textContent = formatPrice(total);
    const configured = Boolean(String(CONFIG.whatsapp || "").replace(/\D/g, ""));
    elements.checkoutButton.disabled = !configured;
    elements.checkoutNote.textContent = configured
      ? "El total corresponde a las ofertas elegidas. El envío es gratis."
      : "Configura WhatsApp para habilitar pedidos.";
  }

  function checkoutWhatsApp(event) {
    event?.preventDefault();
    const phone = String(CONFIG.whatsapp || "").replace(/\D/g, "");
    if (!phone) {
      showToast("La recepción de pedidos aún no está habilitada");
      return;
    }
    validateCity();
    if (!elements.orderForm.reportValidity()) return;
    const entries = cartEntries();
    if (!entries.length) return;
    const total = entries.reduce((sum, entry) => sum + entry.offer.price * entry.quantity, 0);
    const totalUnits = entries.reduce((sum, entry) => sum + entry.offer.units * entry.quantity, 0);
    const data = new FormData(elements.orderForm);
    const value = (key) => String(data.get(key) || "").trim();
    const neighborhood = value("customerNeighborhood");
    const lines = [
      "*Nuevo pedido | BIO PLUS*",
      "",
      "*Cliente*",
      `Nombre: ${value("customerName")}`,
      `Celular: ${value("customerPhone")}`,
      `Ubicación: ${value("customerCity")}, ${value("customerDepartment")}`,
      `Dirección: ${value("customerAddress")}${neighborhood ? ` · ${neighborhood}` : ""}`,
    ];
    if (value("customerNotes")) lines.push(`Indicaciones: ${value("customerNotes")}`);
    lines.push("", "*Ofertas elegidas*");
    entries.forEach(({ product, offer, quantity }, index) => {
      const received = offer.units * quantity;
      lines.push(`*${index + 1}. ${product.name}*`);
      lines.push(`Oferta: ${offer.label}`);
      lines.push(`Cantidad de ofertas: ${quantity} · Recibe: ${received} unidades`);
      lines.push(`Precio por oferta: ${formatPrice(offer.price)}`);
      lines.push(`Subtotal: ${formatPrice(offer.price * quantity)}`);
      if (product.payment_terms) lines.push(`Condición: ${product.payment_terms}`);
    });
    lines.push("", "--------------------", `*Unidades que recibe: ${totalUnits}*`, `*Total productos: ${formatPrice(total)}*`);
    lines.push("*ENVÍO GRATIS* · Sin costo adicional");
    lines.push("", "_Confirma disponibilidad y tiempo de entrega, por favor._");
    window.open(`https://wa.me/${phone}?text=${encodeURIComponent(lines.join("\n"))}`, "_blank", "noopener,noreferrer");
  }

  function openHelp() {
    const phone = String(CONFIG.whatsapp || "").replace(/\D/g, "");
    if (!phone) {
      showToast("La atención por WhatsApp se habilitará después de aprobar el catálogo");
      return;
    }
    const message = encodeURIComponent("Hola BIO PLUS, necesito ayuda con el catálogo.");
    window.open(`https://wa.me/${phone}?text=${message}`, "_blank", "noopener,noreferrer");
  }

  function bindEvents() {
    let searchTimer;
    elements.search.addEventListener("input", () => {
      clearTimeout(searchTimer);
      searchTimer = setTimeout(() => {
        state.query = elements.search.value.trim();
        state.visible = Number(CONFIG.pageSize || 24);
        applyFilters();
      }, 180);
    });
    elements.sort.addEventListener("change", () => {
      state.sort = elements.sort.value;
      applyFilters();
    });
    elements.loadMore.addEventListener("click", () => {
      state.visible += Number(CONFIG.pageSize || 24);
      renderProducts();
    });
    elements.clearFilters.addEventListener("click", () => {
      state.query = "";
      state.category = "Todos";
      elements.search.value = "";
      renderCategories();
      applyFilters();
    });
    elements.cartTrigger.addEventListener("click", () => openLayer("cart"));
    elements.cartClose.addEventListener("click", closeCart);
    elements.modalClose.addEventListener("click", closeModal);
    elements.orderClose.addEventListener("click", closeOrder);
    elements.customerDepartment.addEventListener("input", populateCities);
    elements.customerCity.addEventListener("input", validateCity);
    elements.overlay.addEventListener("click", () => {
      closeCart();
      closeModal();
      closeOrder();
    });
    elements.modalMinus.addEventListener("click", () => {
      elements.modalQuantity.value = String(Math.max(1, Number(elements.modalQuantity.value || 1) - 1));
      updateModalOffer();
    });
    elements.modalPlus.addEventListener("click", () => {
      elements.modalQuantity.value = String(Math.min(99, Number(elements.modalQuantity.value || 1) + 1));
      updateModalOffer();
    });
    elements.modalQuantity.addEventListener("change", () => {
      elements.modalQuantity.value = String(Math.max(1, Math.min(99, Number(elements.modalQuantity.value || 1))));
      updateModalOffer();
    });
    elements.modalAdd.addEventListener("click", () => {
      const offer = selectedModalOffer();
      if (!state.modalProduct || !offer) return;
      addToCart(state.modalProduct.id, offer.id, Number(elements.modalQuantity.value || 1));
      closeModal();
      openLayer("cart");
    });
    elements.checkoutButton.addEventListener("click", openOrderForm);
    elements.orderForm.addEventListener("submit", checkoutWhatsApp);
    elements.heroHelp.addEventListener("click", openHelp);
    elements.footerHelp.addEventListener("click", openHelp);
    document.addEventListener("keydown", (event) => {
      if (event.key !== "Escape") return;
      closeCart();
      closeModal();
      closeOrder();
    });
  }

  async function init() {
    populateDepartments();
    bindEvents();
    try {
      const response = await fetch("data/catalog.json", { cache: "no-store" });
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      state.catalog = await response.json();
      state.products = state.catalog.products.filter((product) => product.available !== false && product.price >= 0);
      migrateCart();
      renderHero();
      renderCategories();
      applyFilters();
      renderCart();
    } catch (error) {
      console.error("No se pudo cargar el catálogo", error);
      elements.resultsText.textContent = "No se pudo cargar el catálogo";
      elements.emptyState.hidden = false;
      elements.emptyState.querySelector("strong").textContent = "El catálogo no está disponible";
      elements.emptyState.querySelector("p").textContent = "Recarga la página para intentarlo de nuevo.";
    }
  }

  init();
})();
