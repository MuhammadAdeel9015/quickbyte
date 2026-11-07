const { AppError } = require("../utils/errors");

class CustomerFeedbackService {
  constructor(repository) {
    this.repository = repository;
    this.creationLocks = new Map();
  }

  async list(customer) {
    return this.repository.listFeedbackForCustomer(customer.id);
  }

  async get(id, customer) {
    const feedback = await this.repository.getFeedback(id);
    if (!feedback || feedback.customerId !== customer.id) {
      throw new AppError(404, "Feedback not found.", "FEEDBACK_NOT_FOUND");
    }
    return feedback;
  }

  async create(orderId, customer, input) {
    const previous = this.creationLocks.get(orderId) || Promise.resolve();
    let release;
    const current = new Promise((resolve) => { release = resolve; });
    const queued = previous.then(() => current);
    this.creationLocks.set(orderId, queued);
    await previous;

    try {
      const order = await this.repository.getOrder(orderId);
      if (!order || order.customerId !== customer.id) {
        throw new AppError(404, "Order not found.", "ORDER_NOT_FOUND");
      }
      if (order.status !== "Delivered") {
        throw new AppError(409, "Feedback can only be submitted for delivered orders.", "ORDER_NOT_DELIVERED");
      }
      if (await this.repository.getFeedbackForOrder(orderId)) {
        throw new AppError(409, "Feedback has already been submitted for this order.", "FEEDBACK_EXISTS");
      }

      return await this.repository.createFeedback({
        customerId: customer.id,
        orderId,
        rating: input.rating,
        comment: input.comment || ""
      });
    } finally {
      release();
      if (this.creationLocks.get(orderId) === queued) this.creationLocks.delete(orderId);
    }
  }

  async update(id, customer, changes) {
    const feedback = await this.get(id, customer);
    const updated = await this.repository.updateFeedback(feedback.id, changes);
    if (!updated) throw new AppError(404, "Feedback not found.", "FEEDBACK_NOT_FOUND");
    return updated;
  }

  async delete(id, customer) {
    const feedback = await this.get(id, customer);
    if (!await this.repository.deleteFeedback(feedback.id)) {
      throw new AppError(404, "Feedback not found.", "FEEDBACK_NOT_FOUND");
    }
    return true;
  }
}

module.exports = { CustomerFeedbackService };
