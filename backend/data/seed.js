const bcrypt = require("bcryptjs");

const hash = (password) => bcrypt.hashSync(password, 10);
const now = () => new Date().toISOString();
const today = () => new Date().toISOString().slice(0, 10);

function createSeedData() {
  return {
    users: [
      { id: "CUS-1042", role: "customer", name: "Olivia Bennett", email: "olivia.bennett@email.test", phone: "+1 (415) 555-0182", address: "742 Oak Street, San Francisco", passwordHash: hash("CustomerDemo123"), active: true, createdAt: now() },
      { id: "RID-208", role: "rider", name: "Daniel Brooks", email: "daniel.brooks@quickbite.test", phone: "+1 (415) 555-0141", passwordHash: hash("RiderDemo123"), active: true, availability: "Available", vehicle: "E-bike", deliveries: 0, createdAt: now() },
      { id: "RID-207", role: "rider", name: "Sofia Garcia", email: "sofia.garcia@quickbite.test", phone: "+1 (415) 555-0176", passwordHash: hash("RiderDemo123"), active: true, availability: "Available", vehicle: "Scooter", deliveries: 0, createdAt: now() },
      { id: "ADM-001", role: "admin", accessRole: "Super Admin", name: "Alex Morgan", email: "admin@quickbite.test", phone: "", passwordHash: hash("QuickBiteAdmin123"), active: true, createdAt: now() },
      { id: "EMP-027", role: "employee", accessRole: "Manager", name: "Chloe Nguyen", email: "chloe.n@email.test", phone: "+1 (415) 555-0180", jobTitle: "Store manager", shift: "Day", status: "Active", joined: "2023-12-01", passwordHash: hash("ManagerDemo123"), active: true, createdAt: now() }
    ],
    menu: [
      { id: "FOOD-015", name: "Garden Avocado Bowl", category: "Healthy bowls", price: 14.5, description: "Creamy avocado, quinoa, greens and lemon tahini.", image: "", available: true },
      { id: "FOOD-014", name: "Classic Smash Burger", category: "Burgers", price: 16, description: "Grass-fed beef, aged cheddar and our house sauce.", image: "", available: true },
      { id: "FOOD-013", name: "Truffle Mushroom Pasta", category: "Pasta", price: 18.5, description: "Silky parmesan cream, wild mushrooms and truffle.", image: "", available: true },
      { id: "FOOD-012", name: "Crispy Chicken Wrap", category: "Wraps", price: 13, description: "Buttermilk chicken, crunchy slaw and herb dressing.", image: "", available: false },
      { id: "FOOD-011", name: "Berry Cheesecake", category: "Desserts", price: 8.5, description: "Vanilla bean cheesecake with fresh berry compote.", image: "", available: true },
      { id: "FOOD-010", name: "Iced Matcha Latte", category: "Drinks", price: 6, description: "Ceremonial matcha, oat milk and a touch of honey.", image: "", available: true }
    ],
    orders: [],
    menuItemIngredients: [],
    inventory: [
      { id: "ING-021", name: "Ripe avocados", category: "Produce", unit: "pieces", quantity: 24, minimum: 12, supplier: "Green Valley Farms", updatedAt: now() },
      { id: "ING-020", name: "Free-range eggs", category: "Dairy & eggs", unit: "dozen", quantity: 8, minimum: 10, supplier: "Sunny Side Co.", updatedAt: now() },
      { id: "ING-019", name: "Organic baby spinach", category: "Produce", unit: "bags", quantity: 5, minimum: 8, supplier: "Green Valley Farms", updatedAt: now() },
      { id: "ING-018", name: "Aged cheddar", category: "Dairy & eggs", unit: "kg", quantity: 12, minimum: 5, supplier: "Creamery House", updatedAt: now() }
    ],
    inventoryTransactions: [],
    notifications: [
      { id: "NTF-001", title: "QuickBite API is ready", message: "Temporary in-memory demo mode is active.", read: false, createdAt: now() }
    ],
    feedback: [],
    employeeShifts: [],
    employeeAttendance: [],
    counters: { CUS: 1043, RID: 209, EMP: 32, FOOD: 16, ING: 22, QB: 3001, NTF: 2, FB: 1, SHIFT: 1, ATTENDANCE: 1 }
  };
}

module.exports = { createSeedData };
