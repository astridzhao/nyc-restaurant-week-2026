const NYC_CENTER = [40.73061, -73.935242];

const TIER_CONFIG = {
  michelin_star: {
    label: "Michelin-starred",
    color: "var(--michelin)",
    size: 34,
  },
  bib_gourmand_or_critics_pick: {
    label: "Bib Gourmand / critics’ pick",
    color: "var(--bib)",
    size: 29,
  },
  highly_rated: {
    label: "Highly rated",
    color: "var(--highly-rated)",
    size: 25,
  },
  standard: {
    label: "Standard",
    color: "var(--standard)",
    size: 21,
  },
};

const state = {
  restaurants: [],
  markers: new Map(),
  activeTiers: new Set(Object.keys(TIER_CONFIG)),
  map: null,
  markerLayer: null,
};

const elements = {
  tierFilters: document.getElementById("tier-filters"),
  selectedRestaurant: document.getElementById("selected-restaurant"),
  unplacedList: document.getElementById("unplaced-list"),
};

init();

async function init() {
  state.map = L.map("map", {
    scrollWheelZoom: true,
  }).setView(NYC_CENTER, 11);

  L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
    maxZoom: 19,
    attribution:
      '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
  }).addTo(state.map);

  state.markerLayer = L.layerGroup().addTo(state.map);

  try {
    const response = await fetch("./restaurants.json", { cache: "no-store" });
    if (!response.ok) {
      throw new Error(`restaurants.json returned ${response.status}`);
    }
    const payload = await response.json();
    state.restaurants = normalizeRestaurants(payload);
    render();
  } catch (error) {
    showLoadError(error);
  }
}

function normalizeRestaurants(payload) {
  if (Array.isArray(payload)) {
    return payload;
  }
  if (payload && Array.isArray(payload.restaurants)) {
    return payload.restaurants;
  }
  throw new Error("restaurants.json must be an array or an object with a restaurants array");
}

function render() {
  const placed = state.restaurants.filter(isPlaced);
  const unplaced = state.restaurants.filter((restaurant) => !isPlaced(restaurant));

  renderTierFilters();
  renderMarkers(placed);
  renderUnplacedList(unplaced);

  if (placed.length > 0) {
    const bounds = L.latLngBounds(placed.map((restaurant) => [restaurant.lat, restaurant.lng]));
    state.map.fitBounds(bounds.pad(0.18), { maxZoom: 14 });
  } else {
    renderEmptyMapState();
  }
}

function renderTierFilters() {
  const counts = Object.fromEntries(Object.keys(TIER_CONFIG).map((tier) => [tier, 0]));
  for (const restaurant of state.restaurants.filter(isPlaced)) {
    const tier = normalizeTier(restaurant.tier);
    counts[tier] += 1;
  }

  elements.tierFilters.innerHTML = "";
  for (const [tier, config] of Object.entries(TIER_CONFIG)) {
    if (counts[tier] === 0) continue;

    const label = document.createElement("label");
    label.className = "tier-filter";

    const input = document.createElement("input");
    input.type = "checkbox";
    input.checked = state.activeTiers.has(tier);
    input.addEventListener("change", () => {
      if (input.checked) {
        state.activeTiers.add(tier);
      } else {
        state.activeTiers.delete(tier);
      }
      renderMarkers(state.restaurants.filter(isPlaced));
    });

    const tierLabel = document.createElement("span");
    tierLabel.className = "tier-label";

    const dot = document.createElement("span");
    dot.className = "legend-dot";
    dot.style.background = config.color;

    const name = document.createElement("span");
    name.className = "tier-name";
    name.textContent = config.label;

    const count = document.createElement("span");
    count.className = "tier-count";
    count.textContent = counts[tier].toLocaleString();

    tierLabel.append(dot, name);
    label.append(input, tierLabel, count);
    elements.tierFilters.append(label);
  }
}

function renderMarkers(restaurants) {
  state.markerLayer.clearLayers();
  state.markers.clear();

  for (const restaurant of restaurants) {
    const tier = normalizeTier(restaurant.tier);
    if (!state.activeTiers.has(tier)) continue;

    const marker = L.marker([restaurant.lat, restaurant.lng], {
      icon: markerIcon(tier),
      title: restaurant.name,
    });

    marker.bindTooltip(tooltipHtml(restaurant), {
      direction: "top",
      offset: [0, -14],
      opacity: 0.96,
    });
    marker.bindPopup(popupHtml(restaurant));
    marker.on("mouseover", () => renderSelectedRestaurant(restaurant));
    marker.on("click", () => renderSelectedRestaurant(restaurant));

    marker.addTo(state.markerLayer);
    state.markers.set(restaurant.id || restaurant.name, marker);
  }
}

function markerIcon(tier) {
  const config = TIER_CONFIG[tier];
  const size = config.size;
  return L.divIcon({
    className: "",
    html: `<span class="restaurant-marker ${tier}" style="width: ${size}px; height: ${size}px;" aria-hidden="true"></span>`,
    iconSize: [size, size],
    iconAnchor: [size / 2, size],
    popupAnchor: [0, -size],
  });
}

function renderSelectedRestaurant(restaurant) {
  const tier = normalizeTier(restaurant.tier);
  elements.selectedRestaurant.innerHTML = `
    <h3>${escapeHtml(restaurant.name)}</h3>
    <p>${escapeHtml([restaurant.cuisine, restaurant.neighborhood, restaurant.borough].filter(Boolean).join(" · "))}</p>
    <p>${escapeHtml(formatOffers(restaurant.offers))}</p>
    <p>${escapeHtml(restaurant.address || "Address needs review")}</p>
    <span class="badge">
      <span class="legend-dot" style="background: ${TIER_CONFIG[tier].color}"></span>
      ${escapeHtml(TIER_CONFIG[tier].label)}
    </span>
    ${restaurant.tier_source ? `<p>${escapeHtml(restaurant.tier_source)}</p>` : ""}
    ${
      restaurant.reservation_url
        ? `<p><a href="${escapeAttribute(restaurant.reservation_url)}" target="_blank" rel="noreferrer">Reserve or view menu</a></p>`
        : ""
    }
  `;
}

function renderUnplacedList(unplaced) {
  elements.unplacedList.innerHTML = "";

  if (unplaced.length === 0) {
    const item = document.createElement("li");
    item.textContent = "No unplaced records.";
    elements.unplacedList.append(item);
    return;
  }

  for (const restaurant of unplaced.slice(0, 20)) {
    const item = document.createElement("li");
    item.textContent = `${restaurant.name || "Unnamed restaurant"} — ${
      restaurant.notes || restaurant.geocode_confidence || restaurant.status || "needs review"
    }`;
    elements.unplacedList.append(item);
  }

  if (unplaced.length > 20) {
    const item = document.createElement("li");
    item.textContent = `${unplaced.length - 20} more listed in restaurants.json.`;
    elements.unplacedList.append(item);
  }
}

function renderEmptyMapState() {
  const emptyControl = L.control({ position: "topright" });
  emptyControl.onAdd = () => {
    const container = L.DomUtil.create("div", "empty-state-inner");
    container.innerHTML = `
      <h2>No placed restaurants yet</h2>
      <p>Add records with <code>status: "placed"</code> and numeric coordinates to restaurants.json.</p>
    `;
    return container;
  };
  emptyControl.addTo(state.map);
}

function showLoadError(error) {
  elements.unplacedList.innerHTML = `<li>Could not load restaurants.json: ${escapeHtml(error.message)}</li>`;
  const emptyControl = L.control({ position: "topright" });
  emptyControl.onAdd = () => {
    const container = L.DomUtil.create("div", "empty-state-inner");
    container.innerHTML = `
      <h2>Dataset did not load</h2>
      <p>Start a local server from restaurant-week-map, then open http://localhost:8000/.</p>
    `;
    return container;
  };
  emptyControl.addTo(state.map);
}

function isPlaced(restaurant) {
  return (
    restaurant &&
    restaurant.status === "placed" &&
    Number.isFinite(restaurant.lat) &&
    Number.isFinite(restaurant.lng)
  );
}

function normalizeTier(tier) {
  return Object.prototype.hasOwnProperty.call(TIER_CONFIG, tier) ? tier : "standard";
}

function formatOffers(offers) {
  if (!Array.isArray(offers) || offers.length === 0) {
    return "Offer details need review";
  }

  return offers
    .map((offer) => {
      if (typeof offer === "string") {
        return offer;
      }
      const price = offer.price ? `$${offer.price}` : "price TBD";
      const meal = offer.meal || "meal";
      const courses = offer.courses ? `${offer.courses}-course ` : "";
      const sunday = offer.sunday_available ? " · Sunday optional" : "";
      return `${price} ${courses}${meal}${sunday}`;
    })
    .join("; ");
}

function tooltipHtml(restaurant) {
  return `<span class="tooltip-title">${escapeHtml(restaurant.name)}</span>`;
}

function popupHtml(restaurant) {
  const link = restaurant.reservation_url
    ? `<p><a href="${escapeAttribute(restaurant.reservation_url)}" target="_blank" rel="noreferrer">Reserve or view menu</a></p>`
    : "";

  return `
    <p class="popup-title">${escapeHtml(restaurant.name)}</p>
    <p class="popup-meta">${escapeHtml(restaurant.address || "Address needs review")}</p>
    <p class="popup-meta">${escapeHtml(formatOffers(restaurant.offers))}</p>
    ${link}
  `;
}

function escapeHtml(value) {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function escapeAttribute(value) {
  return escapeHtml(value).replaceAll("`", "&#096;");
}
