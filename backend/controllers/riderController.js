const { AppError } = require("../utils/errors");
const { publicUser } = require("../utils/sanitize");
const { periodBounds } = require("../utils/date");

function riderController({ repository, orderService, notificationService }) {
  return {
    profile: async (req, res) => res.json({ data: publicUser(await repository.getUserById(req.user.id)) }),
    notifications: async (req, res) => {
      const notifications = await notificationService.listForRecipient(req.user.id);
      res.json({
        data: notifications.map(({ id, title, message, read, createdAt }) => ({
          id, title, message, read, createdAt
        }))
      });
    },
    updateProfile: async (req, res) => res.json({ data: publicUser(await repository.updateUser(req.user.id, req.body)) }),
    assigned: async (req, res) => res.json({ data: await repository.listOrders((order) => order.riderId === req.user.id && !["Delivered", "Rejected", "Cancelled"].includes(order.status)) }),
    history: async (req, res) => res.json({ data: (await repository.listOrders((order) => order.riderId === req.user.id && order.status === "Delivered")).sort((a, b) => b.updatedAt.localeCompare(a.updatedAt)) }),
    accept: async (req, res) => res.json({ data: await orderService.riderAction(req.params.id, req.user, "accept") }),
    reject: async (req, res) => res.json({ data: await orderService.riderAction(req.params.id, req.user, "reject") }),
    advance: async (req, res) => {
      const statusAction = { "Picked Up": "pickup", "On the Way": "onTheWay", Delivered: "delivered" }[req.body.status];
      if (!statusAction) throw new AppError(400, "Rider status must be Picked Up, On the Way, or Delivered.", "INVALID_ORDER_STATUS");
      res.json({ data: await orderService.riderAction(req.params.id, req.user, statusAction) });
    },
    earnings: async (req, res) => {
      const all = await repository.listOrders((order) => order.riderId === req.user.id && order.status === "Delivered");
      const summarize = (period) => {
        const bounds = periodBounds(period);
        const orders = all.filter((order) => {
          const date = new Date(order.updatedAt);
          return date >= bounds.start && date <= bounds.end;
        });
        const gross = orders.reduce((sum, order) => sum + order.total, 0);
        return { deliveries: orders.length, earnings: Number((gross * 0.1).toFixed(2)) };
      };
      const activeOrders = await repository.listOrders((order) => order.riderId === req.user.id && !["Delivered", "Rejected", "Cancelled"].includes(order.status));
      const cashToCollect = activeOrders.filter((order) => order.paymentMethod === "Cash").reduce((sum, order) => sum + order.total, 0);
      res.json({ data: { commissionRate: 0.1, today: summarize("day"), week: summarize("week"), month: summarize("month"), completedDeliveries: all.length, activeDeliveries: activeOrders.length, cashToCollect: Number(cashToCollect.toFixed(2)) } });
    },
    setAvailability: async (req, res) => {
      if (!["Available", "Off duty"].includes(req.body.availability)) throw new AppError(400, "Availability must be Available or Off duty.", "INVALID_AVAILABILITY");
      const active = await repository.listOrders((order) => order.riderId === req.user.id && !["Delivered", "Rejected", "Cancelled"].includes(order.status));
      if (active.length) throw new AppError(409, "Complete or reject active deliveries before changing availability.", "RIDER_HAS_ACTIVE_ORDERS");
      res.json({ data: publicUser(await repository.updateUser(req.user.id, { availability: req.body.availability })) });
    }
  };
}

module.exports = { riderController };
