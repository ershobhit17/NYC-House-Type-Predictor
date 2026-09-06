const API_BASE_URL = "https://nyc-airbnb-room-type-predictor.onrender.com";
const PREDICT_ENDPOINT = `${API_BASE_URL}/predict`;
const HEALTH_ENDPOINT = `${API_BASE_URL}/`;

const classes = ["Entire home/apt", "Private room", "Shared room"];

const form = document.getElementById("predictForm");
const btn = document.getElementById("predictBtn");
const error = document.getElementById("formError");

// Quick-start sample listings
const examples = [
  {
    latitude: 40.7233,
    longitude: -74.0030,
    price: 285,
    minimum_nights: 3,
    number_of_reviews: 84,
    reviews_per_month: 2.45,
    calculated_host_listings_count: 1,
    availability_365: 240,
    neighbourhood_group: "Manhattan",
    neighbourhood: "SoHo"
  },
  {
    latitude: 40.7144,
    longitude: -73.9553,
    price: 165,
    minimum_nights: 2,
    number_of_reviews: 142,
    reviews_per_month: 3.8,
    calculated_host_listings_count: 2,
    availability_365: 180,
    neighbourhood_group: "Brooklyn",
    neighbourhood: "Williamsburg"
  },
  {
    latitude: 40.7282,
    longitude: -73.7949,
    price: 58,
    minimum_nights: 1,
    number_of_reviews: 32,
    reviews_per_month: 1.1,
    calculated_host_listings_count: 1,
    availability_365: 285,
    neighbourhood_group: "Queens",
    neighbourhood: "Flushing"
  }
];

// Switch sample buttons
document.querySelectorAll("[data-example]").forEach(x => {
  x.onclick = () => {
    document.querySelectorAll("[data-example]").forEach(y => {
      y.classList.toggle("active", y === x);
    });

    const selected = examples[+x.dataset.example];
    Object.entries(selected).forEach(([k, v]) => {
      if (form.elements[k]) {
        form.elements[k].value = v;
      }
    });

    error.textContent = "";
  };
});

// Handle form submission
form.onsubmit = async (e) => {
  e.preventDefault();
  error.textContent = "";

  if (!form.reportValidity()) return;

  const d = new FormData(form);
  const payload = {
    name: d.get("name") || "NYC Listing",
    latitude: +d.get("latitude"),
    longitude: +d.get("longitude"),
    price: +d.get("price"),
    minimum_nights: +d.get("minimum_nights"),
    number_of_reviews: +d.get("number_of_reviews"),
    reviews_per_month: +d.get("reviews_per_month"),
    calculated_host_listings_count: +d.get("calculated_host_listings_count"),
    availability_365: +d.get("availability_365"),
    neighbourhood_group: d.get("neighbourhood_group"),
    neighbourhood: d.get("neighbourhood")
  };

  btn.disabled = true;
  btn.classList.add("loading");
  btn.querySelector(".buttonText").textContent = "Classifying listing";

  try {
    const response = await fetch(PREDICT_ENDPOINT, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload)
    });

    if (!response.ok) {
      throw new Error(`Request failed (${response.status})`);
    }

    const data = await response.json();
    render(data);

    document.getElementById("cityCoords").textContent = 
      `${payload.latitude.toFixed(4)}° N · ${Math.abs(payload.longitude).toFixed(4)}° W`;

  } catch (err) {
    error.textContent = err.message.includes("fetch")
      ? "Prediction service is unavailable right now. Please try again shortly."
      : err.message;
  } finally {
    btn.disabled = false;
    btn.classList.remove("loading");
    btn.querySelector(".buttonText").textContent = "Run classification";
  }
};

// Render results
function render(res) {
  // Support both key formats from API response
  const predictedRoom = res["Predicted Room Type"] || res.Predicted_room_type || "Unknown";
  const rawProb = res["Probability"] || res.Probability || [];

  const probabilities = classes
    .map((name, i) => ({
      name,
      value: +(rawProb?.[i] || 0)
    }))
    .sort((a, b) => b.value - a.value);

  const best = probabilities.find(x => x.name === predictedRoom) || probabilities[0];
  const pct = Math.round(best.value * 100);

  document.getElementById("resultEmpty").hidden = true;
  document.getElementById("resultContent").hidden = false;
  document.getElementById("predictedName").textContent = predictedRoom;
  document.getElementById("resultTime").textContent = "Just computed";
  document.getElementById("confidenceValue").textContent = `${pct}% confidence`;

  const bar = document.getElementById("confidenceBar");
  bar.style.width = "0";
  requestAnimationFrame(() => {
    bar.style.width = `${pct}%`;
  });

  const list = document.getElementById("probList");
  list.innerHTML = "";

  probabilities.forEach((item, index) => {
    const valuePct = Math.round(item.value * 100);
    const row = document.createElement("div");

    row.className = `prob ${item.name === predictedRoom ? "top" : ""}`;
    row.innerHTML = `
      <div>
        <span>${item.name}</span>
        <b>0%</b>
      </div>
      <i class="track"><em class="fill"></em></i>
    `;
    list.append(row);

    requestAnimationFrame(() => {
      setTimeout(() => {
        row.querySelector(".fill").style.width = `${valuePct}%`;
        count(row.querySelector("b"), valuePct);
      }, index * 90);
    });
  });
}

// Smooth percentage counter animation
function count(el, target) {
  const start = performance.now();
  
  (function update(now) {
    const progress = Math.min(1, (now - start) / 650);
    el.textContent = Math.round(target * (1 - Math.pow(1 - progress, 3))) + "%";
    
    if (progress < 1) {
      requestAnimationFrame(update);
    }
  })(start);
}

// Accordion details toggle
document.getElementById("detailsBtn").onclick = () => {
  const detailsEl = document.querySelector(".details");
  const isOpen = detailsEl.classList.toggle("open");
  document.getElementById("detailsBtn").setAttribute("aria-expanded", isOpen);
};

// Healthcheck listener
(async () => {
  const statusBadge = document.getElementById("apiStatus");
  try {
    const check = await fetch(HEALTH_ENDPOINT);
    if (!check.ok) throw 0;
    statusBadge.querySelector("b").textContent = "Model online";
  } catch {
    statusBadge.classList.add("offline");
    statusBadge.querySelector("b").textContent = "Model offline";
  }
})();