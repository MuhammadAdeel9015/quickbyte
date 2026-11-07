const { AppError } = require("../utils/errors");

class InventoryService {
  constructor(repository) { this.repository = repository; }
  async adjust(id, quantityChange) {
    const item = await this.repository.getInventoryItem(id);
    if (!item) throw new AppError(404, "Inventory item not found.", "INVENTORY_NOT_FOUND");
    const quantity = item.quantity + quantityChange;
    if (quantity < 0) throw new AppError(400, "Stock quantity cannot be negative.", "INVALID_STOCK_QUANTITY");
    return this.repository.updateInventoryItem(id, { quantity, updatedAt: new Date().toISOString() });
  }
}

module.exports = { InventoryService };
