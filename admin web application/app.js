(() => {
  "use strict";

  const STORAGE_KEY = "quickbite-admin-demo-v1";
  const dateString = (offset = 0) => {
    const date = new Date();
    date.setDate(date.getDate() + offset);
    return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
  };
  const activeOrder = (order) => !["Delivered", "Cancelled"].includes(order.status);
  const roleDefinitions = [
    { name: "Super Admin", description: "Full demo access to every portal area.", permissions: ["Dashboard", "Orders", "Customers", "Riders", "Employees", "Menu", "Inventory", "Reports", "Notifications"] },
    { name: "Manager", description: "Day-to-day operations, menu and business reporting.", permissions: ["Dashboard", "Orders", "Customers", "Riders", "Menu", "Inventory", "Reports", "Notifications"] },
    { name: "Staff", description: "Limited operational view for order and menu work.", permissions: ["Dashboard", "Orders", "Menu", "Inventory"] }
  ];
  const pageNames = {
    dashboard: "Dashboard", orders: "Orders", customers: "Customers", riders: "Riders",
    employees: "Employees", roles: "Roles & access", menu: "Menu management", inventory: "Inventory",
    reports: "Sales & reports", notifications: "Notifications"
  };
  const seed = {
    customers: [
      { id: "CUS-1042", name: "Olivia Bennett", email: "olivia.bennett@email.test", phone: "+1 (415) 555-0182", joined: "2025-03-08", orders: 18, spend: 426.5, status: "Active" },
      { id: "CUS-1041", name: "Noah Williams", email: "noah.w@email.test", phone: "+1 (415) 555-0137", joined: "2025-03-06", orders: 12, spend: 312.8, status: "Active" },
      { id: "CUS-1040", name: "Ava Thompson", email: "ava.thompson@email.test", phone: "+1 (415) 555-0194", joined: "2025-03-04", orders: 9, spend: 208.25, status: "Active" },
      { id: "CUS-1039", name: "Liam Chen", email: "liam.chen@email.test", phone: "+1 (415) 555-0173", joined: "2025-03-01", orders: 24, spend: 689.1, status: "Active" },
      { id: "CUS-1038", name: "Mia Robinson", email: "mia.robinson@email.test", phone: "+1 (415) 555-0126", joined: "2025-02-26", orders: 4, spend: 96.4, status: "Inactive" },
      { id: "CUS-1037", name: "Ethan Patel", email: "ethan.p@email.test", phone: "+1 (415) 555-0168", joined: "2025-02-22", orders: 15, spend: 374.75, status: "Active" }
    ],
    riders: [
      { id: "RID-208", name: "Daniel Brooks", email: "daniel.b@email.test", phone: "+1 (415) 555-0141", vehicle: "E-bike", availability: "Available", status: "Active", deliveries: 186, rating: 4.9 },
      { id: "RID-207", name: "Sofia Garcia", email: "sofia.g@email.test", phone: "+1 (415) 555-0176", vehicle: "Scooter", availability: "On delivery", status: "Active", deliveries: 152, rating: 4.8 },
      { id: "RID-206", name: "Marcus Lee", email: "marcus.lee@email.test", phone: "+1 (415) 555-0118", vehicle: "Bicycle", availability: "Available", status: "Active", deliveries: 128, rating: 4.9 },
      { id: "RID-205", name: "Priya Shah", email: "priya.s@email.test", phone: "+1 (415) 555-0159", vehicle: "E-bike", availability: "Off duty", status: "Active", deliveries: 97, rating: 4.7 },
      { id: "RID-204", name: "James Wilson", email: "james.w@email.test", phone: "+1 (415) 555-0122", vehicle: "Scooter", availability: "Available", status: "Inactive", deliveries: 74, rating: 4.6 }
    ],
    employees: [
      { id: "EMP-031", name: "Maya Johnson", email: "maya.j@email.test", phone: "+1 (415) 555-0160", role: "Kitchen lead", accessRole: "Staff", shift: "Morning", status: "Active", joined: "2024-06-12" },
      { id: "EMP-030", name: "Leo Martinez", email: "leo.m@email.test", phone: "+1 (415) 555-0135", role: "Chef", accessRole: "Staff", shift: "Evening", status: "Active", joined: "2024-08-03" },
      { id: "EMP-029", name: "Grace Kim", email: "grace.k@email.test", phone: "+1 (415) 555-0191", role: "Cashier", accessRole: "Staff", shift: "Morning", status: "Active", joined: "2024-09-22" },
      { id: "EMP-028", name: "Oliver Davis", email: "oliver.d@email.test", phone: "+1 (415) 555-0146", role: "Kitchen assistant", accessRole: "Staff", shift: "Evening", status: "On leave", joined: "2024-10-10" },
      { id: "EMP-027", name: "Chloe Nguyen", email: "chloe.n@email.test", phone: "+1 (415) 555-0180", role: "Store manager", accessRole: "Manager", shift: "Day", status: "Active", joined: "2023-12-01" }
    ],
    menu: [
      { id: "FOOD-015", name: "Garden Avocado Bowl", category: "Healthy bowls", price: 14.5, description: "Creamy avocado, quinoa, greens and lemon tahini.", image: "", emoji: "🥗", available: true, sold: 142 },
      { id: "FOOD-014", name: "Classic Smash Burger", category: "Burgers", price: 16.0, description: "Grass-fed beef, aged cheddar and our house sauce.", image: "", emoji: "🍔", available: true, sold: 128 },
      { id: "FOOD-013", name: "Truffle Mushroom Pasta", category: "Pasta", price: 18.5, description: "Silky parmesan cream, wild mushrooms and truffle.", image: "", emoji: "🍝", available: true, sold: 96 },
      { id: "FOOD-012", name: "Crispy Chicken Wrap", category: "Wraps", price: 13.0, description: "Buttermilk chicken, crunchy slaw and herb dressing.", image: "", emoji: "🌯", available: false, sold: 81 },
      { id: "FOOD-011", name: "Berry Cheesecake", category: "Desserts", price: 8.5, description: "Vanilla bean cheesecake with fresh berry compote.", image: "", emoji: "🍰", available: true, sold: 74 },
      { id: "FOOD-010", name: "Iced Matcha Latte", category: "Drinks", price: 6.0, description: "Ceremonial matcha, oat milk and a touch of honey.", image: "", emoji: "🍵", available: true, sold: 68 }
    ],
    inventory: [
      { id: "ING-021", name: "Ripe avocados", category: "Produce", unit: "pieces", quantity: 24, minimum: 12, supplier: "Green Valley Farms", updated: "Today" },
      { id: "ING-020", name: "Free-range eggs", category: "Dairy & eggs", unit: "dozen", quantity: 8, minimum: 10, supplier: "Sunny Side Co.", updated: "Today" },
      { id: "ING-019", name: "Organic baby spinach", category: "Produce", unit: "bags", quantity: 5, minimum: 8, supplier: "Green Valley Farms", updated: "Yesterday" },
      { id: "ING-018", name: "Aged cheddar", category: "Dairy & eggs", unit: "kg", quantity: 12, minimum: 5, supplier: "Creamery House", updated: "Yesterday" },
      { id: "ING-017", name: "Ground coffee beans", category: "Pantry", unit: "kg", quantity: 2, minimum: 4, supplier: "Roast & Co.", updated: "Mar 7" },
      { id: "ING-016", name: "Chicken breast", category: "Meat & poultry", unit: "kg", quantity: 0, minimum: 6, supplier: "Oak Farms", updated: "Mar 7" },
      { id: "ING-015", name: "Quinoa", category: "Pantry", unit: "kg", quantity: 14, minimum: 5, supplier: "Harvest Pantry", updated: "Mar 6" }
    ],
    orders: [
      { id: "QB-2841", customerId: "CUS-1042", customer: "Olivia Bennett", items: [{ name: "Garden Avocado Bowl", quantity: 1, price: 14.5 }, { name: "Iced Matcha Latte", quantity: 1, price: 6 }], total: 20.5, status: "Preparing", riderId: "", time: "11:42 AM", date: dateString(), payment: "Paid" },
      { id: "QB-2840", customerId: "CUS-1041", customer: "Noah Williams", items: [{ name: "Classic Smash Burger", quantity: 2, price: 16 }, { name: "Berry Cheesecake", quantity: 1, price: 8.5 }], total: 40.5, status: "On delivery", riderId: "RID-207", time: "11:28 AM", date: dateString(), payment: "Paid" },
      { id: "QB-2839", customerId: "CUS-1040", customer: "Ava Thompson", items: [{ name: "Truffle Mushroom Pasta", quantity: 1, price: 18.5 }], total: 18.5, status: "Delivered", riderId: "RID-208", time: "11:10 AM", date: dateString(), payment: "Paid" },
      { id: "QB-2838", customerId: "CUS-1039", customer: "Liam Chen", items: [{ name: "Crispy Chicken Wrap", quantity: 2, price: 13 }], total: 26.0, status: "New", riderId: "", time: "10:54 AM", date: dateString(), payment: "Paid" },
      { id: "QB-2837", customerId: "CUS-1038", customer: "Mia Robinson", items: [{ name: "Garden Avocado Bowl", quantity: 1, price: 14.5 }, { name: "Berry Cheesecake", quantity: 1, price: 8.5 }], total: 23.0, status: "Delivered", riderId: "RID-206", time: "10:39 AM", date: dateString(), payment: "Paid" },
      { id: "QB-2836", customerId: "CUS-1037", customer: "Ethan Patel", items: [{ name: "Classic Smash Burger", quantity: 1, price: 16 }, { name: "Iced Matcha Latte", quantity: 2, price: 6 }], total: 28.0, status: "Cancelled", riderId: "", time: "10:20 AM", date: dateString(), payment: "Refunded" },
      { id: "QB-2835", customerId: "CUS-1042", customer: "Olivia Bennett", items: [{ name: "Truffle Mushroom Pasta", quantity: 1, price: 18.5 }], total: 18.5, status: "Delivered", riderId: "RID-207", time: "Yesterday", date: dateString(-1), payment: "Paid" }
    ],
    notifications: [
      { id: "NTF-05", title: "Low stock: Organic baby spinach", message: "Only 5 bags left — below your 8 bag minimum. Add stock before the evening rush.", time: "8 min ago", kind: "inventory", read: false },
      { id: "NTF-04", title: "New order received", message: "Order QB-2841 from Olivia Bennett is ready for preparation.", time: "14 min ago", kind: "order", read: false },
      { id: "NTF-03", title: "Rider shift updated", message: "Sofia Garcia is now on a delivery. There are 2 riders available.", time: "32 min ago", kind: "rider", read: false },
      { id: "NTF-02", title: "Daily sales goal reached", message: "You reached 80% of your weekday sales goal. Keep up the great work!", time: "1 hour ago", kind: "sales", read: true },
      { id: "NTF-01", title: "Welcome to QuickBite Admin", message: "Your local demo portal is ready. Changes save in this browser only.", time: "Yesterday", kind: "system", read: true }
    ],
    nextIds: { customers: 1043, riders: 209, employees: 32, menu: 16, inventory: 22, notifications: 6 },
  };

  const $ = (selector, root = document) => root.querySelector(selector);
  const $$ = (selector, root = document) => Array.from(root.querySelectorAll(selector));
  const escapeHtml = (value) => String(value ?? "").replace(/[&<>"']/g, (char) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[char]));
  const money = (value) => `$${Number(value || 0).toFixed(2)}`;
  const initials = (name) => String(name || "?").split(/\s+/).slice(0, 2).map((part) => part[0] || "").join("").toUpperCase();
  const shortDate = (value) => value === "Today" ? "Today" : value;

  let state = loadState();
  syncAllRiderAvailability();
  let activePage = "dashboard";
  let orderStatusFilter = "All statuses";
  let inventoryFilter = "All categories";
  let reportPeriod = "This week";
  let dashboardPeriod = "This week";

  function loadState() {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (!saved) return structuredClone(seed);
      const parsed = JSON.parse(saved);
      const loaded = { ...structuredClone(seed), ...parsed };
      loaded.employees = loaded.employees.map((employee) => ({ accessRole: "Staff", ...employee }));
      return loaded;
    } catch (error) {
      console.error("Could not load QuickBite demo data.", error);
      return structuredClone(seed);
    }
  }

  function persist() {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    } catch (error) {
      console.error("Could not save QuickBite demo data.", error);
      toast("Changes could not be saved in this browser.", true);
    }
  }

  function init() {
    const now = new Date();
    $("#todayLabel").textContent = now.toLocaleDateString(undefined, { weekday: "short", month: "short", day: "numeric" });
    $("#yearLabel").textContent = now.getFullYear();
    $("#passwordToggle").addEventListener("click", togglePassword);
    $("#loginForm").addEventListener("submit", login);
    $("#mainNav").addEventListener("click", handleNavigation);
    $("#pageContent").addEventListener("click", handlePageClick);
    $("#pageContent").addEventListener("input", handleSearchInput);
    $("#pageContent").addEventListener("change", handlePageChange);
    $("#modalRoot").addEventListener("click", handleModalClick);
    $("#modalRoot").addEventListener("submit", submitRecordForm);
    $("#logoutButton").addEventListener("click", logout);
    $("#menuToggle").addEventListener("click", openSidebar);
    $("#sidebarClose").addEventListener("click", closeSidebar);
    $("#sidebarScrim").addEventListener("click", closeSidebar);
    document.addEventListener("keydown", (event) => {
      if (event.key === "Escape") closeModal();
    });
    document.addEventListener("click", (event) => {
      const link = event.target.closest(".sidebar-tip [data-page], .topbar [data-page], .sidebar-brand [data-page]");
      if (link) navigate(link.dataset.page);
    });
    updateCounts();
    if (sessionStorage.getItem("quickbite-admin-session") === "active") {
      $("#loginScreen").classList.add("is-hidden");
      $("#appShell").classList.remove("is-hidden");
      navigate(activePage);
    }
  }

  function togglePassword() {
    const input = $("#loginPassword");
    const show = input.type === "password";
    input.type = show ? "text" : "password";
    $("#passwordToggle").textContent = show ? "Hide" : "Show";
    $("#passwordToggle").setAttribute("aria-label", show ? "Hide password" : "Show password");
  }

  function login(event) {
    event.preventDefault();
    const email = $("#loginEmail").value.trim();
    const password = $("#loginPassword").value;
    $("#emailError").textContent = "";
    $("#passwordError").textContent = "";
    let valid = true;
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      $("#emailError").textContent = "Enter a valid email address.";
      valid = false;
    }
    if (password.length < 6) {
      $("#passwordError").textContent = "Password must be at least 6 characters.";
      valid = false;
    }
    if (!valid) return;
    if (email.toLowerCase() !== "admin@quickbite.test" || password !== "QuickBite123") {
      $("#passwordError").textContent = "Use the demo access details shown above.";
      return;
    }
    sessionStorage.setItem("quickbite-admin-session", "active");
    $("#loginScreen").classList.add("is-hidden");
    $("#appShell").classList.remove("is-hidden");
    navigate("dashboard");
    toast("Welcome back, Alex!");
  }

  function logout() {
    sessionStorage.removeItem("quickbite-admin-session");
    $("#appShell").classList.add("is-hidden");
    $("#loginScreen").classList.remove("is-hidden");
    $("#loginPassword").value = "";
    $("#passwordError").textContent = "";
    toast("You have been signed out.");
  }

  function navigate(page) {
    if (!pageNames[page]) return;
    activePage = page;
    $$(".nav-link").forEach((link) => link.classList.toggle("active", link.dataset.page === page));
    $("#breadcrumbCurrent").textContent = pageNames[page];
    renderPage();
    closeSidebar();
  }

  function handleNavigation(event) {
    const link = event.target.closest("[data-page]");
    if (link) navigate(link.dataset.page);
  }

  function renderPage() {
    const renderers = {
      dashboard: renderDashboard, customers: renderCustomers, riders: renderRiders,
      employees: renderEmployees, roles: renderRoles, menu: renderMenu, inventory: renderInventory,
      orders: renderOrders, reports: renderReports, notifications: renderNotifications
    };
    $("#pageContent").innerHTML = renderers[activePage]();
    updateCounts();
  }

  function pageHeading(title, subtitle, action = "") {
    return `<div class="page-heading"><div><span class="eyebrow">QUICKBITE / ${escapeHtml(title.toUpperCase())}</span><h1>${escapeHtml(title)}</h1><p>${escapeHtml(subtitle)}</p></div><div class="heading-actions">${action}</div></div>`;
  }

  function addButton(label, type) {
    return `<button class="button button-primary button-small" data-action="add" data-type="${type}"><span class="plus">+</span>${label}</button>`;
  }

  function kpi(label, value, icon, foot, positive = true) {
    return `<article class="kpi-card"><div class="kpi-top"><span class="kpi-label">${label}</span><span class="kpi-icon">${icon}</span></div><div class="kpi-value">${value}</div><div class="kpi-foot"><span class="${positive ? "positive" : ""}">${foot}</span></div></article>`;
  }

  function renderDashboard() {
    const revenue = state.orders.filter((order) => order.status !== "Cancelled").reduce((sum, order) => sum + Number(order.total), 0);
    const activeRiders = state.riders.filter((rider) => rider.status === "Active").length;
    const availableRiders = state.riders.filter((rider) => rider.status === "Active" && rider.availability === "Available").length;
    const activeEmployees = state.employees.filter((employee) => employee.status === "Active").length;
    const latestOrders = state.orders.slice(0, 5);
    const chartData = salesForPeriod(dashboardPeriod);
    return `${pageHeading("Good morning, Alex", "Here’s what’s happening at your café today.", `<button class="button button-secondary button-small" data-action="export-orders">↓ &nbsp;Export</button><button class="button button-primary button-small" data-page="orders">View orders <span>→</span></button>`)}
      <div class="kpi-grid">
        ${kpi("Total orders", state.orders.length.toLocaleString(), "▤", '<span class="positive">↗ 12.8%</span> vs last week')}
        ${kpi("Total customers", state.customers.length.toLocaleString(), "♙", '<span class="positive">↗ 8.2%</span> vs last month')}
        ${kpi("Active riders", activeRiders, "♧", `${availableRiders} available today`)}
        ${kpi("Team members", activeEmployees, "♧", `${state.employees.length} total employees`)}
        ${kpi("Revenue", money(revenue), "$", '<span class="positive">↗ 9.4%</span> vs last week')}
      </div>
      <div class="dashboard-grid">
        <section class="panel"><div class="panel-head"><div><h2 class="panel-title">Sales overview</h2><p class="panel-subtitle">A little snapshot of your week</p></div><select class="select-compact" data-control="dashboard-period">${["Today", "This week", "This month"].map((period) => `<option ${period === dashboardPeriod ? "selected" : ""}>${period}</option>`).join("")}</select></div>${salesChart(chartData.buckets, true, chartData.labels)}<div class="sales-summary"><div><span>Period sales</span><b>${money(chartData.revenue)}</b></div><div><span>Average order</span><b>${money(chartData.revenue / Math.max(1, chartData.orders.length))}</b></div><div><span>Orders today</span><b>${state.orders.filter((o) => o.date === dateString()).length}</b></div></div></section>
        <section class="panel"><div class="panel-head"><div><h2 class="panel-title">Today’s activity</h2><p class="panel-subtitle">A few things to keep an eye on</p></div></div><div class="activity-list">
          <div class="activity-item"><span class="activity-icon">⌁</span><div class="activity-copy"><b>Orders to prepare</b><span>Keep the kitchen moving</span></div><span class="activity-value">${state.orders.filter((o) => ["New", "Preparing"].includes(o.status)).length}</span></div>
          <div class="activity-item"><span class="activity-icon">♧</span><div class="activity-copy"><b>Riders available</b><span>Ready for a delivery</span></div><span class="activity-value">${availableRiders}</span></div>
          <div class="activity-item"><span class="activity-icon">▦</span><div class="activity-copy"><b>Low-stock items</b><span>Needs a quick restock</span></div><span class="activity-value">${lowStockCount()}</span></div>
          <div class="activity-item"><span class="activity-icon">✦</span><div class="activity-copy"><b>Average rating</b><span>Guests love what you do</span></div><span class="activity-value">4.9 / 5</span></div>
        </div></section>
      </div>
      <section class="panel table-panel"><div class="panel-head"><div><h2 class="panel-title">Recent orders</h2><p class="panel-subtitle">Your latest customer orders</p></div><button class="text-link" data-page="orders">All orders&nbsp; →</button></div>${ordersTable(latestOrders, false)}</section>`;
  }

  function renderCustomers() {
    const action = addButton("Add customer", "customers");
    return `${pageHeading("Customers", "Get to know the people who make your day.", action)}
      <section class="panel table-panel"><div class="panel-head"><div><h2 class="panel-title">All customers <span class="cell-secondary">${state.customers.length} records</span></h2></div><div class="table-tools"><label class="search-field">⌕ <input data-search="customers" placeholder="Search name, email or ID" aria-label="Search customers"></label><select class="filter-select" data-filter="customers"><option>All customers</option><option>Active</option><option>Inactive</option></select></div></div>${customersTable(state.customers)}</section>`;
  }

  function customersTable(records) {
    if (!records.length) return emptyState("No customers found", "Try changing the search or add your first customer.");
    return `<div class="table-wrap"><table><thead><tr><th>Customer</th><th>Customer ID</th><th>Orders</th><th>Total spent</th><th>Joined</th><th>Status</th><th></th></tr></thead><tbody>${records.map((item, index) => `<tr><td><div class="person-cell"><span class="mini-avatar ${avatarTone(index)}">${escapeHtml(initials(item.name))}</span><div><span class="cell-primary">${escapeHtml(item.name)}</span><span class="cell-secondary">${escapeHtml(item.email)}</span></div></div></td><td>${escapeHtml(item.id)}</td><td>${item.orders}</td><td>${money(item.spend)}</td><td>${escapeHtml(item.joined)}</td><td>${statusBadge(item.status)}</td><td><div class="row-actions"><button class="row-action" title="View customer" data-action="view" data-type="customers" data-id="${item.id}">◉</button><button class="row-action" title="Edit customer" data-action="edit" data-type="customers" data-id="${item.id}">✎</button><button class="row-action delete" title="Delete customer" data-action="delete" data-type="customers" data-id="${item.id}">×</button></div></td></tr>`).join("")}</tbody></table></div><div class="table-footer"><span>Showing ${records.length} of ${state.customers.length} customers</span><span>Demo data · saved in this browser</span></div>`;
  }

  function renderRiders() {
    return `${pageHeading("Riders", "Your delivery team, ready to roll.", addButton("Add rider", "riders"))}
      <div class="report-summary">
        <div class="report-stat"><span>Active riders</span><b>${state.riders.filter((r) => r.status === "Active").length}</b><small>On your team</small></div>
        <div class="report-stat"><span>Available now</span><b>${state.riders.filter((r) => r.status === "Active" && r.availability === "Available").length}</b><small>Ready for a delivery</small></div>
        <div class="report-stat"><span>On delivery</span><b>${state.riders.filter((r) => r.availability === "On delivery").length}</b><small>Currently out</small></div>
        <div class="report-stat"><span>Total deliveries</span><b>${state.riders.reduce((sum, r) => sum + Number(r.deliveries || 0), 0)}</b><small>All-time</small></div>
      </div>
      <section class="panel table-panel"><div class="panel-head"><div><h2 class="panel-title">Rider directory</h2></div><div class="table-tools"><label class="search-field">⌕ <input data-search="riders" placeholder="Search riders" aria-label="Search riders"></label><select class="filter-select" data-filter="riders"><option>All availability</option><option>Available</option><option>On delivery</option><option>Off duty</option></select></div></div>${ridersTable(state.riders)}</section>`;
  }

  function ridersTable(records) {
    if (!records.length) return emptyState("No riders found", "Try another search or add a rider.");
    return `<div class="table-wrap"><table><thead><tr><th>Rider</th><th>Vehicle</th><th>Availability</th><th>Deliveries</th><th>Rating</th><th>Assigned today</th><th>Status</th><th></th></tr></thead><tbody>${records.map((item, index) => {
      const assigned = state.orders.filter((order) => order.riderId === item.id && activeOrder(order) && order.date === dateString()).length;
      return `<tr><td><div class="person-cell"><span class="mini-avatar ${avatarTone(index)}">${escapeHtml(initials(item.name))}</span><div><span class="cell-primary">${escapeHtml(item.name)}</span><span class="cell-secondary">${escapeHtml(item.id)} · ${escapeHtml(item.phone)}</span></div></div></td><td>${escapeHtml(item.vehicle)}</td><td>${statusBadge(item.availability)}</td><td>${item.deliveries}</td><td>★ ${Number(item.rating).toFixed(1)}</td><td><button class="view-link" data-action="rider-orders" data-id="${item.id}">${assigned} active</button></td><td>${statusBadge(item.status)}</td><td><div class="row-actions"><button class="row-action" title="Edit rider" data-action="edit" data-type="riders" data-id="${item.id}">✎</button><button class="row-action delete" title="Delete rider" data-action="delete" data-type="riders" data-id="${item.id}">×</button></div></td></tr>`;
    }).join("")}</tbody></table></div><div class="table-footer"><span>${records.length} riders</span><span>Tap active deliveries to see assigned orders</span></div>`;
  }

  function renderEmployees() {
    return `${pageHeading("Employees", "The people who make QuickBite feel like home.", addButton("Add employee", "employees"))}
      <section class="panel table-panel"><div class="panel-head"><div><h2 class="panel-title">Team directory <span class="cell-secondary">${state.employees.length} team members</span></h2></div><div class="table-tools"><label class="search-field">⌕ <input data-search="employees" placeholder="Search team members" aria-label="Search employees"></label><select class="filter-select" data-filter="employees"><option>All roles</option>${[...new Set(state.employees.map((e) => e.role))].map((role) => `<option>${escapeHtml(role)}</option>`).join("")}</select></div></div>${employeesTable(state.employees)}</section>`;
  }

  function renderRoles() {
    return `${pageHeading("Roles & access", "Manage demo role assignments and review intended permissions.", "")}
      <div class="inventory-alert"><span>ⓘ</span><div><b>Demo role labels only</b><small>These roles describe intended access; this frontend does not enforce permissions or provide real security.</small></div></div>
      <section class="panel table-panel"><div class="panel-head"><div><h2 class="panel-title">Role permissions</h2><p class="panel-subtitle">Example access levels for the QuickBite portal</p></div></div><div class="table-wrap"><table><thead><tr><th>Role</th><th>Description</th>${["Dashboard", "Orders", "Customers", "Riders", "Employees", "Menu", "Inventory", "Reports", "Notifications"].map((name) => `<th>${name}</th>`).join("")}<th>Team members</th></tr></thead><tbody>${roleDefinitions.map((role) => `<tr><td><span class="cell-primary">${escapeHtml(role.name)}</span></td><td>${escapeHtml(role.description)}</td>${["Dashboard", "Orders", "Customers", "Riders", "Employees", "Menu", "Inventory", "Reports", "Notifications"].map((name) => `<td>${role.permissions.includes(name) ? '<span class="badge badge-green">Allowed</span>' : '<span class="badge badge-neutral">No access</span>'}</td>`).join("")}<td>${state.employees.filter((employee) => employee.accessRole === role.name).length}</td></tr>`).join("")}</tbody></table></div></section>
      <section class="panel table-panel" style="margin-top:14px"><div class="panel-head"><div><h2 class="panel-title">Employee role assignments</h2><p class="panel-subtitle">Change an employee’s demo portal role from their employee record.</p></div><button class="text-link" data-page="employees">Manage employees&nbsp; →</button></div><div class="table-wrap"><table><thead><tr><th>Employee</th><th>Job title</th><th>Portal role</th><th>Role description</th></tr></thead><tbody>${state.employees.map((employee) => `<tr><td><span class="cell-primary">${escapeHtml(employee.name)}</span><span class="cell-secondary">${escapeHtml(employee.email)}</span></td><td>${escapeHtml(employee.role)}</td><td>${escapeHtml(employee.accessRole || "Staff")}</td><td>${escapeHtml(roleDefinitions.find((role) => role.name === (employee.accessRole || "Staff"))?.description || "")}</td></tr>`).join("") || '<tr><td colspan="4">No employees available.</td></tr>'}</tbody></table></div></section>`;
  }

  function employeesTable(records) {
    if (!records.length) return emptyState("No employees found", "Try another search or add a team member.");
    return `<div class="table-wrap"><table><thead><tr><th>Employee</th><th>Employee ID</th><th>Job role</th><th>Portal role</th><th>Shift</th><th>Joined</th><th>Status</th><th></th></tr></thead><tbody>${records.map((item, index) => `<tr><td><div class="person-cell"><span class="mini-avatar ${avatarTone(index)}">${escapeHtml(initials(item.name))}</span><div><span class="cell-primary">${escapeHtml(item.name)}</span><span class="cell-secondary">${escapeHtml(item.email)}</span></div></div></td><td>${escapeHtml(item.id)}</td><td>${escapeHtml(item.role)}</td><td>${escapeHtml(item.accessRole || "Staff")}</td><td>${escapeHtml(item.shift)}</td><td>${escapeHtml(item.joined)}</td><td>${statusBadge(item.status)}</td><td><div class="row-actions"><button class="row-action" title="Edit employee" data-action="edit" data-type="employees" data-id="${item.id}">✎</button><button class="row-action delete" title="Delete employee" data-action="delete" data-type="employees" data-id="${item.id}">×</button></div></td></tr>`).join("")}</tbody></table></div><div class="table-footer"><span>Showing ${records.length} of ${state.employees.length} employees</span><span>Roles and status can be updated anytime</span></div>`;
  }

  function renderMenu() {
    const categories = [...new Set(state.menu.map((item) => item.category))];
    return `${pageHeading("Menu management", "A menu made with care, served with a smile.", addButton("Add food item", "menu"))}
      <div class="panel table-panel" style="margin-bottom:14px"><div class="panel-head"><div><h2 class="panel-title">Your menu <span class="cell-secondary">${state.menu.filter((item) => item.available).length} available · ${state.menu.length} items</span></h2></div><div class="table-tools"><label class="search-field">⌕ <input data-search="menu" placeholder="Search food items" aria-label="Search food items"></label><select class="filter-select" data-filter="menu"><option>All categories</option>${categories.map((category) => `<option>${escapeHtml(category)}</option>`).join("")}</select></div></div></div>
      <div class="menu-grid">${state.menu.map((item) => menuCard(item)).join("") || emptyState("Your menu is looking a little empty", "Add your first food item to get started.")}</div>`;
  }

  function menuCard(item) {
    const art = `<span aria-hidden="true">${escapeHtml(item.emoji || "🍽️")}</span>${item.image ? `<img src="${escapeHtml(item.image)}" alt="${escapeHtml(item.name)}" onerror="this.remove()">` : ""}`;
    return `<article class="menu-card" data-menu-card data-category="${escapeHtml(item.category)}" data-name="${escapeHtml(item.name.toLowerCase())}"><div class="menu-art">${art}${statusBadge(item.available ? "Available" : "Unavailable")}</div><div class="menu-body"><div class="menu-body-top"><div><h3>${escapeHtml(item.name)}</h3><span class="menu-category">${escapeHtml(item.category)}</span></div><button class="row-action" title="Toggle availability" data-action="toggle-menu" data-id="${item.id}">${item.available ? "✓" : "○"}</button></div><p>${escapeHtml(item.description)}</p><div class="menu-foot"><span class="menu-price">${money(item.price)}</span><div class="menu-actions"><button class="row-action" title="Edit item" data-action="edit" data-type="menu" data-id="${item.id}">✎</button><button class="row-action delete" title="Delete item" data-action="delete" data-type="menu" data-id="${item.id}">×</button></div></div></div></article>`;
  }

  function renderInventory() {
    const low = lowStockCount();
    return `${pageHeading("Inventory", "Keep your kitchen stocked and the good things coming.", addButton("Add ingredient", "inventory"))}
      ${low ? `<div class="inventory-alert"><span>⚠</span><div><b>${low} item${low === 1 ? "" : "s"} running low</b><small>These ingredients are at or below their minimum stock levels.</small></div><button class="text-link" data-action="show-low-stock">Review&nbsp; →</button></div>` : ""}
      <section class="panel table-panel"><div class="panel-head"><div><h2 class="panel-title">Stock overview <span class="cell-secondary">${state.inventory.length} ingredients</span></h2></div><div class="table-tools"><label class="search-field">⌕ <input data-search="inventory" placeholder="Search ingredients" aria-label="Search inventory"></label><select class="filter-select" data-filter="inventory"><option>All categories</option>${[...new Set(state.inventory.map((i) => i.category))].map((category) => `<option>${escapeHtml(category)}</option>`).join("")}<option>Low stock</option></select></div></div>${inventoryTable(state.inventory)}</section>`;
  }

  function inventoryTable(records) {
    if (!records.length) return emptyState("No ingredients found", "Try a different search or category.");
    return `<div class="table-wrap"><table><thead><tr><th>Ingredient</th><th>Category</th><th>In stock</th><th>Minimum</th><th>Stock level</th><th>Supplier</th><th>Updated</th><th></th></tr></thead><tbody>${records.map((item, index) => {
      const pct = Math.min(100, item.minimum ? Math.round((item.quantity / (item.minimum * 2)) * 100) : 100);
      const tone = item.quantity === 0 ? "empty" : item.quantity <= item.minimum ? "low" : "";
      return `<tr><td><span class="cell-primary">${escapeHtml(item.name)}</span><span class="cell-secondary">${escapeHtml(item.id)}</span></td><td>${escapeHtml(item.category)}</td><td><div class="inline-control"><button data-action="stock-change" data-id="${item.id}" data-delta="-1" aria-label="Decrease stock">−</button><span>${item.quantity}</span><button data-action="stock-change" data-id="${item.id}" data-delta="1" aria-label="Increase stock">+</button></div></td><td>${item.minimum} ${escapeHtml(item.unit)}</td><td><span class="badge ${tone === "low" ? "badge-low" : tone === "empty" ? "badge-out-of-stock" : "badge-green"}">${tone === "empty" ? "Out of stock" : tone === "low" ? "Low stock" : "In stock"}</span><div class="stock-meter"><span class="${tone}" style="width:${pct}%"></span></div></td><td>${escapeHtml(item.supplier)}</td><td>${escapeHtml(shortDate(item.updated))}</td><td><div class="row-actions"><button class="row-action" title="Update ingredient" data-action="edit" data-type="inventory" data-id="${item.id}">✎</button><button class="row-action delete" title="Delete ingredient" data-action="delete" data-type="inventory" data-id="${item.id}">×</button></div></td></tr>`;
    }).join("")}</tbody></table></div><div class="table-footer"><span>${records.length} ingredients listed</span><span>Use + / − to adjust quantities</span></div>`;
  }

  function renderOrders() {
    const statuses = ["All statuses", "New", "Preparing", "On delivery", "Delivered", "Cancelled"];
    const orders = filteredOrders($("#orderSearch")?.value || "", orderStatusFilter);
    return `${pageHeading("Order management", "Every order is a chance to make someone’s day.", `<button class="button button-secondary button-small" data-action="export-orders">↓ &nbsp;Export orders</button>`)}
      <div class="report-summary">
        <div class="report-stat"><span>New &amp; preparing</span><b>${state.orders.filter((o) => ["New", "Preparing"].includes(o.status)).length}</b><small>Needs your attention</small></div>
        <div class="report-stat"><span>On delivery</span><b>${state.orders.filter((o) => o.status === "On delivery").length}</b><small>Out with our riders</small></div>
        <div class="report-stat"><span>Delivered today</span><b>${state.orders.filter((o) => o.status === "Delivered" && o.date === dateString()).length}</b><small>Making people happy</small></div>
        <div class="report-stat"><span>Today's revenue</span><b>${money(state.orders.filter((o) => o.date === dateString() && o.status !== "Cancelled").reduce((sum, o) => sum + o.total, 0))}</b><small>From ${state.orders.filter((o) => o.date === dateString() && o.status !== "Cancelled").length} fulfilled orders</small></div>
      </div>
      <section class="panel table-panel"><div class="panel-head"><div><h2 class="panel-title">All orders <span class="cell-secondary">${state.orders.length} orders</span></h2></div><div class="table-tools"><label class="search-field">⌕ <input id="orderSearch" data-search="orders" placeholder="Search order or customer" aria-label="Search orders"></label><select class="filter-select" data-filter="orders">${statuses.map((status) => `<option ${status === orderStatusFilter ? "selected" : ""}>${status}</option>`).join("")}</select></div></div>${ordersTable(orders, true)}</section>`;
  }

  function filteredOrders(search, filter) {
    const needle = search.toLowerCase();
    return state.orders.filter((order) => {
      const match = !needle || [order.id, order.customer, order.customerId].some((value) => String(value).toLowerCase().includes(needle));
      return match && (filter === "All statuses" || order.status === filter);
    });
  }

  function ordersTable(orders, includeRider) {
    if (!orders.length) return emptyState("No orders found", "Try a different search or status filter.");
    return `<div class="table-wrap"><table><thead><tr><th>Order</th><th>Customer</th><th>Items</th><th>Total</th><th>Time</th><th>Status</th>${includeRider ? "<th>Rider</th>" : ""}<th></th></tr></thead><tbody>${orders.map((order, index) => {
      const rider = state.riders.find((r) => r.id === order.riderId);
      const itemText = order.items.map((item) => `${item.quantity}× ${item.name}`).join(", ");
      return `<tr><td><span class="cell-primary">${escapeHtml(order.id)}</span><span class="cell-secondary">${escapeHtml(order.date)}</span></td><td><span class="cell-primary">${escapeHtml(order.customer)}</span><span class="cell-secondary">${escapeHtml(order.customerId)}</span></td><td><span class="cell-primary">${escapeHtml(itemText)}</span></td><td><span class="cell-primary">${money(order.total)}</span></td><td>${escapeHtml(order.time)}</td><td>${statusBadge(order.status)}</td>${includeRider ? `<td>${rider ? escapeHtml(rider.name) : '<span class="cell-secondary">Unassigned</span>'}</td>` : ""}<td><div class="row-actions"><button class="view-link" data-action="order-detail" data-id="${order.id}">Details</button></div></td></tr>`;
    }).join("")}</tbody></table></div><div class="table-footer"><span>Showing ${orders.length} of ${state.orders.length} orders</span><span>Order updates are local demo changes</span></div>`;
  }

  function renderReports() {
    const periodData = salesForPeriod(reportPeriod);
    const periodRevenue = periodData.revenue;
    const completed = periodData.orders.filter((order) => order.status === "Delivered").length;
    const averageOrder = periodRevenue / Math.max(1, periodData.orders.length);
    const best = periodData.bestSellers.slice(0, 5);
    return `${pageHeading("Sales & reports", "The numbers behind all those happy meals.", `<select class="filter-select" data-control="report-period">${["Today", "This week", "This month"].map((p) => `<option ${p === reportPeriod ? "selected" : ""}>${p}</option>`).join("")}</select><button class="button button-secondary button-small" data-action="export-report">↓ &nbsp;Export report</button>`)}
      <div class="report-summary">
        <div class="report-stat"><span>Revenue · ${escapeHtml(reportPeriod)}</span><b>${money(periodRevenue)}</b><small>↑ 9.4% from last period</small></div>
        <div class="report-stat"><span>Orders completed</span><b>${completed}</b><small>${periodData.orders.length} non-cancelled orders this period</small></div>
        <div class="report-stat"><span>Average order value</span><b>${money(averageOrder)}</b><small>Per non-cancelled order</small></div>
        <div class="report-stat"><span>Best-selling item</span><b>${escapeHtml(best[0]?.name || "—")}</b><small>${best[0]?.quantity || 0} items sold this period</small></div>
      </div>
      <div class="report-grid">
        <section class="panel"><div class="panel-head"><div><h2 class="panel-title">${escapeHtml(reportPeriod)} sales</h2><p class="panel-subtitle">Sales performance at a glance</p></div><span class="badge badge-green">↗ ${periodData.orders.length} orders</span></div>${salesChart(periodData.buckets, false, periodData.labels)}<div class="sales-summary"><div><span>Revenue</span><b>${money(periodRevenue)}</b></div><div><span>Best interval</span><b>${money(Math.max(...periodData.buckets))}</b></div><div><span>Period</span><b>${escapeHtml(reportPeriod)}</b></div></div></section>
        <section class="panel"><div class="panel-head"><div><h2 class="panel-title">Best sellers</h2><p class="panel-subtitle">Fan favorites, ranked for this period</p></div></div><div class="best-list">${best.map((item, index) => `<div class="best-item"><span class="best-rank">${String(index + 1).padStart(2, "0")}</span><div><b>${escapeHtml(item.name)}</b><span>${item.quantity} sold · ${escapeHtml(item.category)}</span></div><strong>${money(item.revenue)}</strong></div>`).join("") || '<div class="empty-state">No order items to report for this period.</div>'}</div></section>
      </div>`;
  }

  function renderNotifications() {
    const unread = state.notifications.filter((item) => !item.read).length;
    const actions = unread ? `<button class="button button-secondary button-small" data-action="mark-all-read">Mark all as read</button>` : "";
    return `${pageHeading("Notifications", "The latest from your team and your café.", actions)}
      <section class="notification-list">${state.notifications.map((item) => `<article class="notification-card ${item.read ? "" : "unread"}"><span class="notification-symbol">${notificationIcon(item.kind)}</span><div class="notification-copy"><h3>${escapeHtml(item.title)} ${item.read ? "" : '<span class="badge badge-blue">NEW</span>'}</h3><p>${escapeHtml(item.message)}</p><small>${escapeHtml(item.time)}</small></div><div class="notification-actions">${item.read ? "" : `<button class="button button-quiet button-small" data-action="mark-read" data-id="${item.id}">Mark read</button>`}<button class="row-action delete" title="Delete notification" data-action="delete-notification" data-id="${item.id}">×</button></div></article>`).join("") || emptyState("All caught up", "There are no notifications right now.")}</section>`;
  }

  function notificationIcon(kind) {
    return ({ inventory: "▦", order: "▤", rider: "♧", sales: "↗", system: "✦" })[kind] || "✦";
  }

  function salesForPeriod(period) {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    let start = new Date(today);
    let end = new Date(today);
    if (period === "This week") {
      start.setDate(start.getDate() - ((start.getDay() + 6) % 7));
      end.setDate(start.getDate() + 6);
    } else if (period === "This month") {
      start.setDate(1);
      end = new Date(start.getFullYear(), start.getMonth() + 1, 0);
    }
    end.setHours(23, 59, 59, 999);
    const orders = state.orders.filter((order) => {
      if (order.status === "Cancelled") return false;
      const orderDate = new Date(`${order.date}T12:00:00`);
      return orderDate >= start && orderDate <= end;
    });
    const buckets = Array(7).fill(0);
    const labels = [];
    if (period === "Today") {
      labels.push("9a", "11a", "1p", "3p", "5p", "7p", "9p");
      orders.forEach((order) => {
        const hour = orderTimeHour(order.time);
        const bucket = Math.max(0, Math.min(6, Math.floor((hour - 9) / 2)));
        buckets[bucket] += Number(order.total) || 0;
      });
    } else if (period === "This week") {
      const names = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
      labels.push(...names);
      orders.forEach((order) => {
        const day = new Date(`${order.date}T12:00:00`).getDay();
        buckets[(day + 6) % 7] += Number(order.total) || 0;
      });
    } else {
      const daysInMonth = end.getDate();
      const bucketSize = Math.ceil(daysInMonth / 7);
      for (let index = 0; index < 7; index += 1) {
        const first = index * bucketSize + 1;
        const last = Math.min(daysInMonth, first + bucketSize - 1);
        labels.push(first <= daysInMonth ? `${first}–${last}` : "");
      }
      orders.forEach((order) => {
        const day = new Date(`${order.date}T12:00:00`).getDate();
        const bucket = Math.min(6, Math.floor((day - 1) / bucketSize));
        buckets[bucket] += Number(order.total) || 0;
      });
    }
    const bestSellers = new Map();
    orders.forEach((order) => order.items.forEach((item) => {
      const entry = bestSellers.get(item.name) || {
        name: item.name, quantity: 0, revenue: 0,
        category: state.menu.find((menuItem) => menuItem.name === item.name)?.category || "Menu item"
      };
      entry.quantity += Number(item.quantity) || 0;
      entry.revenue += (Number(item.quantity) || 0) * (Number(item.price) || 0);
      bestSellers.set(item.name, entry);
    }));
    return {
      orders, buckets, labels,
      revenue: orders.reduce((sum, order) => sum + (Number(order.total) || 0), 0),
      bestSellers: [...bestSellers.values()].sort((a, b) => b.quantity - a.quantity || b.revenue - a.revenue)
    };
  }

  function orderTimeHour(value) {
    const match = String(value || "").match(/(\d{1,2})(?::\d{2})?\s*(AM|PM)/i);
    if (!match) return 12;
    let hour = Number(match[1]) % 12;
    if (match[2].toUpperCase() === "PM") hour += 12;
    return hour;
  }

  function salesChart(values, bars, chartLabels) {
    const width = 560, height = 172, left = 36, right = 12, top = 12, bottom = 27;
    const max = Math.max(...values, 1) * 1.15;
    const usableW = width - left - right, usableH = height - top - bottom;
    const points = values.map((value, i) => [left + usableW * (i / Math.max(1, values.length - 1)), top + usableH * (1 - value / max)]);
    const labels = chartLabels || ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
    const grid = [0, 1, 2, 3].map((i) => {
      const y = top + usableH * (i / 3);
      return `<line class="chart-grid-line" x1="${left}" y1="${y}" x2="${width - right}" y2="${y}"></line><text class="chart-label" x="0" y="${y + 3}">$${Math.round(max * (1 - i / 3))}</text>`;
    }).join("");
    const xLabels = labels.map((label, i) => `<text class="chart-label" text-anchor="middle" x="${left + usableW * (i / Math.max(1, labels.length - 1))}" y="${height - 5}">${label}</text>`).join("");
    if (bars) {
      const barW = usableW / values.length * .42;
      const rects = values.map((value, i) => {
        const x = left + usableW * (i / values.length) + (usableW / values.length - barW) / 2;
        const h = usableH * value / max;
        return `<rect class="chart-bar ${i === 5 ? "highlight" : ""}" x="${x}" y="${top + usableH - h}" width="${barW}" height="${h}" rx="4"></rect>`;
      }).join("");
      return `<div class="chart-area"><svg class="chart-svg" viewBox="0 0 ${width} ${height}" role="img" aria-label="Sales overview bar chart">${grid}${rects}${xLabels}</svg></div>`;
    }
    const path = points.map((point, index) => `${index ? "L" : "M"}${point[0]},${point[1]}`).join(" ");
    const fillPath = `${path} L${points[points.length - 1][0]},${height - bottom} L${points[0][0]},${height - bottom} Z`;
    const dots = points.map(([x, y]) => `<circle class="chart-dot" cx="${x}" cy="${y}" r="3.5"></circle>`).join("");
    return `<div class="chart-area"><svg class="chart-svg" viewBox="0 0 ${width} ${height}" role="img" aria-label="${escapeHtml(reportPeriod)} sales line chart"><defs><linearGradient id="chartFill" x1="0" x2="0" y1="0" y2="1"><stop offset="0%" stop-color="#1d6b4b" stop-opacity=".18"></stop><stop offset="100%" stop-color="#1d6b4b" stop-opacity="0"></stop></linearGradient></defs>${grid}<path class="chart-fill" d="${fillPath}"></path><path class="chart-path" d="${path}"></path>${dots}${xLabels}</svg></div>`;
  }

  function handlePageClick(event) {
    const button = event.target.closest("button");
    if (!button) return;
    if (button.dataset.page) { navigate(button.dataset.page); return; }
    const { action, type, id } = button.dataset;
    if (action === "add") openForm(type);
    else if (action === "edit") openForm(type, id);
    else if (action === "view") showRecord(type, id);
    else if (action === "delete") deleteRecord(type, id);
    else if (action === "order-detail") showOrder(id);
    else if (action === "rider-orders") showRiderOrders(id);
    else if (action === "toggle-menu") toggleMenuItem(id);
    else if (action === "stock-change") changeStock(id, Number(button.dataset.delta));
    else if (action === "mark-read") markRead(id);
    else if (action === "mark-all-read") markAllRead();
    else if (action === "delete-notification") deleteNotification(id);
    else if (action === "show-low-stock") {
      inventoryFilter = "Low stock";
      const select = $('[data-filter="inventory"]');
      if (select) { select.value = inventoryFilter; applyFilters(); }
    } else if (action === "export-orders") exportCsv("quickbite-orders.csv", ["Order", "Customer", "Status", "Total", "Date"], state.orders.map((o) => [o.id, o.customer, o.status, o.total, o.date]));
    else if (action === "export-report") {
      const report = salesForPeriod(reportPeriod);
      exportCsv("quickbite-sales-report.csv",
        ["Order ID", "Date", "Customer", "Status", "Item", "Quantity", "Unit Price", "Line Total"],
        report.orders.flatMap((order) => order.items.map((item) => [order.id, order.date, order.customer, order.status, item.name, item.quantity, item.price, (Number(item.quantity) * Number(item.price)).toFixed(2)])));
    }
  }

  function handleSearchInput(event) {
    if (!event.target.matches("[data-search]")) return;
    if (event.target.dataset.search === "orders") orderStatusFilter = $('[data-filter="orders"]')?.value || "All statuses";
    applyFilters();
  }

  function handlePageChange(event) {
    const control = event.target;
    if (control.matches("[data-filter]")) {
      if (control.dataset.filter === "orders") orderStatusFilter = control.value;
      applyFilters();
      return;
    }
    if (control.matches('[data-control="report-period"]')) {
      reportPeriod = control.value;
      renderPage();
      return;
    }
    if (control.matches('[data-control="dashboard-period"]')) {
      dashboardPeriod = control.value;
      renderPage();
      return;
    }
  }

  function applyFilters() {
    const type = activePage;
    const search = $(`[data-search="${type}"]`)?.value || "";
    const filter = $(`[data-filter="${type}"]`)?.value || "";
    const matchSearch = (values) => values.filter((item) => Object.values(item).join(" ").toLowerCase().includes(search.toLowerCase()));
    if (type === "customers") {
      const data = matchSearch(state.customers).filter((item) => !filter || filter === "All customers" || item.status === filter);
      $("[data-table-container]")?.remove();
      const panel = $(".table-panel");
        if (panel) { clearTable(panel); panel.insertAdjacentHTML("beforeend", customersTable(data)); }
    } else if (type === "riders") {
      let data = matchSearch(state.riders);
      if (filter && filter !== "All availability") data = data.filter((item) => item.availability === filter);
      const panel = $(".table-panel");
      if (panel) { clearTable(panel); panel.insertAdjacentHTML("beforeend", ridersTable(data)); }
    } else if (type === "employees") {
      let data = matchSearch(state.employees);
      if (filter && filter !== "All roles") data = data.filter((item) => item.role === filter);
      const panel = $(".table-panel");
      if (panel) { clearTable(panel); panel.insertAdjacentHTML("beforeend", employeesTable(data)); }
    } else if (type === "inventory") {
      let data = matchSearch(state.inventory);
      if (filter === "Low stock") data = data.filter((item) => item.quantity <= item.minimum);
      else if (filter && filter !== "All categories") data = data.filter((item) => item.category === filter);
      const panel = $(".table-panel");
      if (panel) { clearTable(panel); panel.insertAdjacentHTML("beforeend", inventoryTable(data)); }
    } else if (type === "menu") {
      const needle = search.toLowerCase();
      $$("[data-menu-card]").forEach((card) => {
        const categoryMatch = !filter || filter === "All categories" || card.dataset.category === filter;
        card.classList.toggle("is-hidden", !categoryMatch || !card.dataset.name.includes(needle));
      });
      if ($$("[data-menu-card]:not(.is-hidden)").length === 0 && !$(".menu-empty")) $(".menu-grid").insertAdjacentHTML("beforeend", '<div class="empty-state menu-empty"><strong>No menu items found</strong>Try another search or category.</div>');
      else $(".menu-empty")?.remove();
    } else if (type === "orders") {
      const panel = $(".table-panel");
      if (panel) { clearTable(panel); panel.insertAdjacentHTML("beforeend", ordersTable(filteredOrders(search, orderStatusFilter), true)); }
    }
  }

  function clearTable(panel) {
    panel.querySelector(".table-wrap")?.remove();
    panel.querySelector(".empty-state")?.remove();
    panel.querySelector(".table-footer")?.remove();
  }

  function handleModalClick(event) {
    if (event.target.matches(".modal-backdrop") || event.target.closest("[data-modal-close]")) closeModal();
    if (event.target.closest("#saveOrder")) saveOrderUpdate(event);
    const edit = event.target.closest('[data-action="edit"]');
    if (edit) openForm(edit.dataset.type, edit.dataset.id);
  }

  function openForm(type, id = "") {
    const record = id ? (state[type] || []).find((item) => item.id === id) : null;
    const title = `${record ? "Edit" : "Add"} ${type === "menu" ? "food item" : type === "inventory" ? "ingredient" : type.slice(0, -1)}`;
    const fields = formFields(type, record || {});
    $("#modalRoot").innerHTML = `<div class="modal-backdrop"><section class="modal" role="dialog" aria-modal="true" aria-labelledby="modalTitle"><div class="modal-head"><div><h2 id="modalTitle">${title}</h2><p>Changes are saved to this browser’s demo data.</p></div><button class="modal-close" data-modal-close aria-label="Close">×</button></div><form id="recordForm" data-type="${type}" data-id="${id}"><div class="modal-body"><div class="form-grid">${fields}</div><p id="formError" class="field-error"></p></div><div class="modal-foot"><button type="button" class="button button-secondary button-small" data-modal-close>Cancel</button><button type="submit" class="button button-primary button-small">Save changes</button></div></form></section></div>`;
  }

  function textField(name, label, value = "", options = {}) {
    const full = options.full ? " full" : "";
    const type = options.type || "text";
    const required = options.required === false ? "" : "required";
    const placeholder = options.placeholder ? ` placeholder="${escapeHtml(options.placeholder)}"` : "";
    const min = options.min !== undefined ? ` min="${options.min}"` : "";
    const step = options.step !== undefined ? ` step="${options.step}"` : "";
    return `<div class="form-field${full}"><label for="field-${name}">${label}${required ? " *" : ""}</label><input id="field-${name}" name="${name}" type="${type}" value="${escapeHtml(value)}"${placeholder}${min}${step} ${required}></div>`;
  }

  function selectField(name, label, value, choices, full = false) {
    return `<div class="form-field${full ? " full" : ""}"><label for="field-${name}">${label} *</label><select id="field-${name}" name="${name}" required>${choices.map((choice) => `<option ${choice === value ? "selected" : ""}>${escapeHtml(choice)}</option>`).join("")}</select></div>`;
  }

  function textareaField(name, label, value = "") {
    return `<div class="form-field full"><label for="field-${name}">${label} *</label><textarea id="field-${name}" name="${name}" required>${escapeHtml(value)}</textarea></div>`;
  }

  function formFields(type, item = {}) {
    if (type === "customers") return `${textField("name", "Full name", item.name)}${textField("email", "Email address", item.email, { type: "email" })}${textField("phone", "Phone number", item.phone)}${selectField("status", "Status", item.status || "Active", ["Active", "Inactive"])}${textField("orders", "Total orders", item.orders ?? 0, { type: "number", min: 0 })}${textField("spend", "Total spent ($)", item.spend ?? 0, { type: "number", min: 0, step: ".01" })}`;
    if (type === "riders") return `${textField("name", "Full name", item.name)}${textField("email", "Email address", item.email, { type: "email" })}${textField("phone", "Phone number", item.phone)}${selectField("vehicle", "Vehicle", item.vehicle || "E-bike", ["E-bike", "Scooter", "Bicycle", "Car"])}${selectField("availability", "Availability", item.availability || "Available", ["Available", "On delivery", "Off duty"])}${selectField("status", "Account status", item.status || "Active", ["Active", "Inactive"])}${textField("deliveries", "Completed deliveries", item.deliveries ?? 0, { type: "number", min: 0 })}${textField("rating", "Rider rating (0–5)", item.rating ?? 5, { type: "number", min: 0, step: ".1" })}`;
    if (type === "employees") return `${textField("name", "Full name", item.name)}${textField("email", "Email address", item.email, { type: "email" })}${textField("phone", "Phone number", item.phone)}${selectField("role", "Job role", item.role || "Chef", ["Store manager", "Kitchen lead", "Chef", "Kitchen assistant", "Cashier", "Customer service"])}${selectField("accessRole", "Portal access role", item.accessRole || "Staff", roleDefinitions.map((role) => role.name))}${selectField("shift", "Shift", item.shift || "Morning", ["Morning", "Day", "Evening", "Night"])}${selectField("status", "Status", item.status || "Active", ["Active", "On leave", "Inactive"])}${textField("joined", "Start date", item.joined || dateString(), { type: "date" })}`;
    if (type === "menu") return `${textField("name", "Food name", item.name)}${selectField("category", "Category", item.category || "Burgers", ["Burgers", "Healthy bowls", "Pasta", "Wraps", "Desserts", "Drinks", "Sides"])}${textField("price", "Price ($)", item.price ?? "", { type: "number", min: 0, step: ".01" })}${textField("image", "Image URL (optional)", item.image || "", { required: false, placeholder: "https://example.com/image.jpg" })}${textField("emoji", "Food icon", item.emoji || "🍽️", { required: false })}${selectField("available", "Availability", item.available === false ? "Unavailable" : "Available", ["Available", "Unavailable"])}${textField("sold", "Units sold", item.sold ?? 0, { type: "number", min: 0 })}${textareaField("description", "Description", item.description || "")}`;
    if (type === "inventory") return `${textField("name", "Ingredient name", item.name)}${selectField("category", "Category", item.category || "Produce", ["Produce", "Dairy & eggs", "Meat & poultry", "Pantry", "Beverages", "Other"])}${textField("quantity", "Current quantity", item.quantity ?? 0, { type: "number", min: 0 })}${textField("minimum", "Minimum stock level", item.minimum ?? 1, { type: "number", min: 0 })}${textField("unit", "Unit (e.g. kg, pieces)", item.unit || "pieces")}${textField("supplier", "Supplier", item.supplier)}${textField("updated", "Last updated", item.updated || "Today")}`;
    return "";
  }

  function submitRecordForm(event) {
    event.preventDefault();
    const form = $("#recordForm");
    const type = form.dataset.type;
    const id = form.dataset.id;
    const data = Object.fromEntries(new FormData(form).entries());
    const error = validateRecord(type, data);
    if (error) { $("#formError").textContent = error; return; }
    convertRecord(type, data);
    const records = state[type];
    if (id) {
      const index = records.findIndex((item) => item.id === id);
      if (index >= 0) records[index] = { ...records[index], ...data };
    } else {
      data.id = makeId(type);
      if (type === "customers") data.joined = new Date().toISOString().slice(0, 10);
      if (type === "employees") data.joined = data.joined || new Date().toISOString().slice(0, 10);
      if (type === "menu") data.sold = Number(data.sold || 0);
      if (type === "riders") data.deliveries = Number(data.deliveries || 0);
      records.unshift(data);
    }
    persist();
    closeModal();
    renderPage();
    toast(`${type === "menu" ? "Food item" : type.slice(0, -1)} ${id ? "updated" : "added"}.`);
  }

  function validateRecord(type, data) {
    if (!data.name?.trim()) return "Please enter a name.";
    if (data.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(data.email)) return "Enter a valid email address.";
    if (type === "menu" && Number(data.price) < 0) return "Price cannot be negative.";
    if (type === "riders" && (Number(data.rating) < 0 || Number(data.rating) > 5)) return "Rating must be between 0 and 5.";
    if (type === "inventory" && Number(data.minimum) < 0) return "Minimum stock cannot be negative.";
    return "";
  }

  function convertRecord(type, data) {
    ["orders", "spend", "price", "sold", "quantity", "minimum", "deliveries", "rating"].forEach((key) => {
      if (key in data && data[key] !== "") data[key] = Number(data[key]);
    });
    if (type === "menu") data.available = data.available === "Available";
    if (type === "inventory") data.updated = "Today";
  }

  function makeId(type) {
    const prefixes = { customers: "CUS", riders: "RID", employees: "EMP", menu: "FOOD", inventory: "ING" };
    const next = state.nextIds[type] || 1;
    state.nextIds[type] = next + 1;
    return `${prefixes[type]}-${String(next).padStart(3, "0")}`;
  }

  function deleteRecord(type, id) {
    const item = (state[type] || []).find((record) => record.id === id);
    if (!item || !window.confirm(`Delete ${item.name}? This only removes it from local demo data.`)) return;
    state[type] = state[type].filter((record) => record.id !== id);
    persist();
    renderPage();
    toast("Record deleted.");
  }

  function showRecord(type, id) {
    const item = (state[type] || []).find((record) => record.id === id);
    if (!item) return;
    const title = escapeHtml(item.name);
    const labels = type === "customers"
      ? [["Customer ID", item.id], ["Email", item.email], ["Phone", item.phone], ["Joined", item.joined], ["Orders", item.orders], ["Lifetime spend", money(item.spend)], ["Status", item.status]]
      : Object.entries(item).filter(([key]) => key !== "image").map(([key, value]) => [key.replace(/[A-Z]/g, (m) => ` ${m}`).replace(/^./, (m) => m.toUpperCase()), value]);
    $("#modalRoot").innerHTML = `<div class="modal-backdrop"><section class="modal" role="dialog" aria-modal="true"><div class="modal-head"><div><h2>${title}</h2><p>Customer details</p></div><button class="modal-close" data-modal-close aria-label="Close">×</button></div><div class="modal-body"><div class="detail-grid">${labels.map(([label, value]) => `<div class="detail-item"><span>${escapeHtml(label)}</span><b>${escapeHtml(value)}</b></div>`).join("")}</div></div><div class="modal-foot"><button class="button button-secondary button-small" data-modal-close>Close</button><button class="button button-primary button-small" data-action="edit" data-type="${type}" data-id="${id}">Edit customer</button></div></section></div>`;
  }

  function showOrder(id) {
    const order = state.orders.find((item) => item.id === id);
    if (!order) return;
    const riderOptions = assignableRiders(order).map((r) => `<option value="${r.id}" ${r.id === order.riderId ? "selected" : ""}>${escapeHtml(r.name)} · ${escapeHtml(r.availability)}</option>`).join("");
    $("#modalRoot").innerHTML = `<div class="modal-backdrop"><section class="modal" role="dialog" aria-modal="true" aria-labelledby="modalTitle"><div class="modal-head"><div><h2 id="modalTitle">Order ${escapeHtml(order.id)}</h2><p>${escapeHtml(order.date)} · ${escapeHtml(order.time)}</p></div><button class="modal-close" data-modal-close aria-label="Close">×</button></div><div class="modal-body"><div class="detail-grid"><div class="detail-item"><span>Customer</span><b>${escapeHtml(order.customer)}</b></div><div class="detail-item"><span>Payment</span><b>${escapeHtml(order.payment)}</b></div><div class="detail-item"><span>Order status</span><b>${escapeHtml(order.status)}</b></div><div class="detail-item"><span>Total</span><b>${money(order.total)}</b></div></div><div class="detail-section"><h3>Items</h3>${order.items.map((item) => `<div class="detail-line"><span>${item.quantity} × ${escapeHtml(item.name)}</span><b>${money(item.quantity * item.price)}</b></div>`).join("")}<div class="detail-line"><b>Total amount</b><b>${money(order.total)}</b></div></div><div class="form-grid"><div class="form-field"><label for="orderStatus">Update order status</label><select id="orderStatus">${["New", "Preparing", "On delivery", "Delivered", "Cancelled"].map((status) => `<option ${status === order.status ? "selected" : ""}>${status}</option>`).join("")}</select></div><div class="form-field"><label for="orderRider">Assign a rider</label><select id="orderRider"><option value="">Unassigned</option>${riderOptions}</select><small class="cell-secondary">Only available riders can be assigned. Set status to On delivery before assigning.</small></div></div><p id="orderError" class="field-error"></p></div><div class="modal-foot"><button class="button button-secondary button-small" data-modal-close>Close</button><button class="button button-primary button-small" id="saveOrder" data-id="${order.id}">Save order</button></div></section></div>`;
  }

  function assignableRiders(order) {
    return state.riders.filter((rider) => {
      if (rider.status !== "Active") return false;
      const busyElsewhere = state.orders.some((candidate) =>
        candidate.id !== order.id && activeOrder(candidate) && candidate.riderId === rider.id);
      return !busyElsewhere && (rider.availability === "Available" || rider.id === order.riderId);
    });
  }

  function saveOrderUpdate(event) {
    const id = event.target.closest("#saveOrder")?.dataset.id;
    const order = state.orders.find((item) => item.id === id);
    if (!order) return;
    const riderId = $("#orderRider").value;
    const status = $("#orderStatus").value;
    const selectedRider = state.riders.find((rider) => rider.id === riderId);
    const assignedElsewhere = riderId && state.orders.some((candidate) =>
      candidate.id !== order.id && activeOrder(candidate) && candidate.riderId === riderId);
    if (riderId && !["Delivered", "Cancelled"].includes(status) && status !== "On delivery") {
      $("#orderError").textContent = "Set the order to On delivery before assigning a rider.";
      return;
    }
    if (riderId && riderId !== order.riderId && (status === "Delivered" || status === "Cancelled")) {
      $("#orderError").textContent = "A rider cannot be newly assigned to a completed or cancelled order.";
      return;
    }
    if (riderId && (!selectedRider || selectedRider.status !== "Active" || assignedElsewhere ||
      (riderId !== order.riderId && selectedRider.availability !== "Available"))) {
      $("#orderError").textContent = "That rider is no longer available. Choose an available rider.";
      return;
    }
    const previousRiderId = order.riderId;
    order.riderId = riderId;
    order.status = status;
    refreshRiderAvailability(previousRiderId);
    if (riderId !== previousRiderId) refreshRiderAvailability(riderId);
    persist();
    closeModal();
    renderPage();
    toast(`Order ${id} updated.`);
  }

  function refreshRiderAvailability(riderId) {
    if (!riderId) return;
    const rider = state.riders.find((item) => item.id === riderId);
    if (!rider) return;
    const hasActiveAssignment = state.orders.some((order) => activeOrder(order) && order.riderId === riderId);
    if (hasActiveAssignment) rider.availability = "On delivery";
    else if (rider.availability === "On delivery") rider.availability = "Available";
  }

  function syncAllRiderAvailability() {
    state.riders.forEach((rider) => refreshRiderAvailability(rider.id));
  }

  function showRiderOrders(id) {
    const rider = state.riders.find((item) => item.id === id);
    const orders = state.orders.filter((order) => order.riderId === id);
    $("#modalRoot").innerHTML = `<div class="modal-backdrop"><section class="modal" role="dialog" aria-modal="true"><div class="modal-head"><div><h2>${escapeHtml(rider?.name || "Rider")}’s deliveries</h2><p>${orders.length} assigned order${orders.length === 1 ? "" : "s"}</p></div><button class="modal-close" data-modal-close aria-label="Close">×</button></div><div class="modal-body">${orders.map((order) => `<div class="detail-line"><span>${escapeHtml(order.id)} · ${escapeHtml(order.customer)}</span><b>${statusBadge(order.status)}</b></div>`).join("") || '<div class="empty-state">No orders assigned yet.</div>'}</div><div class="modal-foot"><button class="button button-secondary button-small" data-modal-close>Close</button></div></section></div>`;
  }

  function toggleMenuItem(id) {
    const item = state.menu.find((entry) => entry.id === id);
    if (!item) return;
    item.available = !item.available;
    persist();
    renderPage();
    toast(`${item.name} is now ${item.available ? "available" : "unavailable"}.`);
  }

  function changeStock(id, delta) {
    const item = state.inventory.find((entry) => entry.id === id);
    if (!item) return;
    if (item.quantity + delta < 0) { toast("Stock quantity cannot be below zero.", true); return; }
    item.quantity += delta;
    item.updated = "Today";
    persist();
    renderPage();
    toast(`${item.name} stock updated.`);
  }

  function markRead(id) {
    const item = state.notifications.find((entry) => entry.id === id);
    if (!item) return;
    item.read = true;
    persist();
    renderPage();
  }

  function markAllRead() {
    state.notifications.forEach((item) => { item.read = true; });
    persist();
    renderPage();
    toast("All notifications marked as read.");
  }

  function deleteNotification(id) {
    state.notifications = state.notifications.filter((item) => item.id !== id);
    persist();
    renderPage();
    toast("Notification deleted.");
  }

  function updateCounts() {
    const pending = state.orders.filter((order) => ["New", "Preparing"].includes(order.status)).length;
    const unread = state.notifications.filter((item) => !item.read).length;
    $("#pendingCount").textContent = pending;
    $("#unreadCount").textContent = unread;
    $("#topUnreadDot").classList.toggle("is-hidden", unread === 0);
  }

  function lowStockCount() {
    return state.inventory.filter((item) => item.quantity <= item.minimum).length;
  }

  function statusBadge(status) {
    const classes = {
      Active: "badge-active", Available: "badge-available", "On delivery": "badge-on-delivery",
      "Off duty": "badge-neutral", Inactive: "badge-neutral", "On leave": "badge-amber",
      New: "badge-new", Preparing: "badge-preparing", Delivered: "badge-delivered",
      Cancelled: "badge-cancelled", "Out of stock": "badge-out-of-stock", "Low stock": "badge-low",
      "In stock": "badge-green", Unavailable: "badge-neutral", "Paid": "badge-paid", "Refunded": "badge-neutral"
    };
    return `<span class="badge ${classes[status] || "badge-neutral"}">${escapeHtml(status)}</span>`;
  }

  function avatarTone(index) {
    return ["", "amber", "pink", "blue"][index % 4];
  }

  function emptyState(title, message) {
    return `<div class="empty-state"><strong>${escapeHtml(title)}</strong>${escapeHtml(message)}</div>`;
  }

  function closeModal() {
    $("#modalRoot").innerHTML = "";
  }

  function toast(message, error = false) {
    const region = $("#toastRegion");
    const node = document.createElement("div");
    node.className = `toast${error ? " error" : ""}`;
    node.innerHTML = `<span>${error ? "!" : "✓"}</span>${escapeHtml(message)}`;
    region.appendChild(node);
    window.setTimeout(() => node.remove(), 3000);
  }

  function openSidebar() {
    $("#sidebar").classList.add("open");
    $("#sidebarScrim").classList.add("visible");
  }

  function closeSidebar() {
    $("#sidebar").classList.remove("open");
    $("#sidebarScrim").classList.remove("visible");
  }

  function exportCsv(filename, headers, rows) {
    const csvCell = (value) => {
      let text = String(value ?? "");
      if (/^[=+\-@\t\r]/.test(text)) text = `'${text}`;
      return `"${text.replace(/"/g, '""')}"`;
    };
    const csv = `\uFEFF${[headers, ...rows].map((row) => row.map(csvCell).join(",")).join("\r\n")}`;
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
    const link = document.createElement("a");
    link.href = URL.createObjectURL(blob);
    link.download = filename;
    link.style.position = "fixed";
    link.style.left = "-10000px";
    link.style.top = "0";
    document.body.appendChild(link);
    link.click();
    link.remove();
    window.setTimeout(() => URL.revokeObjectURL(link.href), 1000);
    toast("Your CSV export is ready.");
  }

  init();
})();
