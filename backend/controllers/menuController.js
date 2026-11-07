const { AppError } = require("../utils/errors");
const { publicUser } = require("../utils/sanitize");

function menuController({ repository }) {
  return {
    list: async (req, res) => {
      const { q = "", category = "" } = req.query;
      const items = await repository.listMenu((item) =>
        item.name.toLowerCase().includes(String(q).toLowerCase()) &&
        (!category || item.category.toLowerCase() === String(category).toLowerCase()) &&
        item.available);
      res.json({ data: items });
    },
    categories: async (req, res) => {
      const [categories, items] = await Promise.all([
        repository.listMenuCategories(),
        repository.listMenu((item) => item.available)
      ]);
      const availableNames = new Set(items.map((item) => item.category.toLowerCase()));
      res.json({ data: categories.map((category) => category.name).filter((name) => availableNames.has(name.toLowerCase())) });
    },
    get: async (req, res) => {
      const item = await repository.getMenuItem(req.params.id);
      if (!item) throw new AppError(404, "Menu item not found.", "MENU_ITEM_NOT_FOUND");
      res.json({ data: item });
    },
    create: async (req, res) => {
      const item = await repository.createMenuItem({ id: repository.nextId("FOOD"), image: "", available: true, ...req.body });
      res.status(201).json({ data: item });
    },
    update: async (req, res) => {
      const item = await repository.updateMenuItem(req.params.id, req.body);
      if (!item) throw new AppError(404, "Menu item not found.", "MENU_ITEM_NOT_FOUND");
      res.json({ data: item });
    },
    remove: async (req, res) => {
      if (!await repository.deleteMenuItem(req.params.id)) throw new AppError(404, "Menu item not found.", "MENU_ITEM_NOT_FOUND");
      res.status(204).end();
    }
  };
}

module.exports = { menuController };
