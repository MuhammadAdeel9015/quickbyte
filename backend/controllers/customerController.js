const { AppError } = require("../utils/errors");
const { publicUser } = require("../utils/sanitize");

function customerController({ repository, orderService, customerFeedbackService }) {
  return {
    profile: async (req, res) => res.json({ data: publicUser(await repository.getUserById(req.user.id)) }),
    updateProfile: async (req, res) => {
      const updated = await repository.updateUser(req.user.id, req.body);
      res.json({ data: publicUser(updated) });
    },
    createOrder: async (req, res) => res.status(201).json({ data: await orderService.create(req.user, req.body) }),
    orderHistory: async (req, res) => res.json({ data: (await repository.listOrders((order) => order.customerId === req.user.id)).sort((a, b) => b.createdAt.localeCompare(a.createdAt)) }),
    orderDetail: async (req, res) => res.json({ data: await orderService.getForCustomer(req.params.id, req.user) }),
    tracking: async (req, res) => {
      const order = await orderService.getForCustomer(req.params.id, req.user);
      const rider = order.riderId ? await repository.getUserById(order.riderId) : null;
      res.json({ data: {
        orderId: order.id, status: order.status, updatedAt: order.updatedAt,
        statusHistory: order.statusHistory,
        rider: rider ? { id: rider.id, name: rider.name, phone: rider.phone } : null
      } });
    },
    cancelOrder: async (req, res) => res.json({ data: await orderService.cancel(req.params.id, req.user) }),
    feedback: async (req, res) => res.json({ data: await customerFeedbackService.list(req.user) }),
    feedbackDetail: async (req, res) => res.json({ data: await customerFeedbackService.get(req.params.feedbackId, req.user) }),
    createFeedback: async (req, res) => res.status(201).json({ data: await customerFeedbackService.create(req.params.id, req.user, req.body) }),
    updateFeedback: async (req, res) => res.json({ data: await customerFeedbackService.update(req.params.feedbackId, req.user, req.body) }),
    deleteFeedback: async (req, res) => {
      await customerFeedbackService.delete(req.params.feedbackId, req.user);
      res.status(204).end();
    }
  };
}

module.exports = { customerController };
