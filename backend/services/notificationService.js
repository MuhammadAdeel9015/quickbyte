class NotificationService {
  constructor(repository) { this.repository = repository; }
  async list() { return (await this.repository.listNotifications()).sort((a, b) => b.createdAt.localeCompare(a.createdAt)); }
  async listForRecipient(recipientUserId) {
    return (await this.repository.listNotificationsForRecipient(recipientUserId))
      .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  }
  create(title, message, createdByUserId) {
    return this.repository.createNotification({
      id: this.repository.nextId("NTF"), title, message, read: false,
      recipientUserId: null, createdByUserId, createdAt: new Date().toISOString()
    });
  }
  markRead(id) { return this.repository.updateNotification(id, { read: true }); }
  delete(id) { return this.repository.deleteNotification(id); }
}

module.exports = { NotificationService };
