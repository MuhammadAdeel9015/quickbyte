class Repository {
  nextId() { throw new Error("Repository.nextId must be implemented."); }
  listUsers() { throw new Error("Repository.listUsers must be implemented."); }
  getUserById() { throw new Error("Repository.getUserById must be implemented."); }
  getUserByEmail() { throw new Error("Repository.getUserByEmail must be implemented."); }
  createUser() { throw new Error("Repository.createUser must be implemented."); }
  updateUser() { throw new Error("Repository.updateUser must be implemented."); }
  deleteUser() { throw new Error("Repository.deleteUser must be implemented."); }
  listMenuCategories() { throw new Error("Repository.listMenuCategories must be implemented."); }
  listMenu() { throw new Error("Repository.listMenu must be implemented."); }
  getMenuItem() { throw new Error("Repository.getMenuItem must be implemented."); }
  createMenuItem() { throw new Error("Repository.createMenuItem must be implemented."); }
  updateMenuItem() { throw new Error("Repository.updateMenuItem must be implemented."); }
  deleteMenuItem() { throw new Error("Repository.deleteMenuItem must be implemented."); }
  listOrders() { throw new Error("Repository.listOrders must be implemented."); }
  getOrder() { throw new Error("Repository.getOrder must be implemented."); }
  createOrder() { throw new Error("Repository.createOrder must be implemented."); }
  updateOrder() { throw new Error("Repository.updateOrder must be implemented."); }
  listInventory() { throw new Error("Repository.listInventory must be implemented."); }
  getInventoryItem() { throw new Error("Repository.getInventoryItem must be implemented."); }
  createInventoryItem() { throw new Error("Repository.createInventoryItem must be implemented."); }
  updateInventoryItem() { throw new Error("Repository.updateInventoryItem must be implemented."); }
  deleteInventoryItem() { throw new Error("Repository.deleteInventoryItem must be implemented."); }
  listNotifications() { throw new Error("Repository.listNotifications must be implemented."); }
  listNotificationsForRecipient() { throw new Error("Repository.listNotificationsForRecipient must be implemented."); }
  createNotification() { throw new Error("Repository.createNotification must be implemented."); }
  updateNotification() { throw new Error("Repository.updateNotification must be implemented."); }
  deleteNotification() { throw new Error("Repository.deleteNotification must be implemented."); }
  listFeedback() { throw new Error("Repository.listFeedback must be implemented."); }
  listFeedbackForCustomer() { throw new Error("Repository.listFeedbackForCustomer must be implemented."); }
  getFeedback() { throw new Error("Repository.getFeedback must be implemented."); }
  getFeedbackForOrder() { throw new Error("Repository.getFeedbackForOrder must be implemented."); }
  createFeedback() { throw new Error("Repository.createFeedback must be implemented."); }
  updateFeedback() { throw new Error("Repository.updateFeedback must be implemented."); }
  deleteFeedback() { throw new Error("Repository.deleteFeedback must be implemented."); }
  listEmployeeShifts() { throw new Error("Repository.listEmployeeShifts must be implemented."); }
  getEmployeeShift() { throw new Error("Repository.getEmployeeShift must be implemented."); }
  createEmployeeShift() { throw new Error("Repository.createEmployeeShift must be implemented."); }
  updateEmployeeShift() { throw new Error("Repository.updateEmployeeShift must be implemented."); }
  deleteEmployeeShift() { throw new Error("Repository.deleteEmployeeShift must be implemented."); }
  listEmployeeAttendance() { throw new Error("Repository.listEmployeeAttendance must be implemented."); }
  getEmployeeAttendance() { throw new Error("Repository.getEmployeeAttendance must be implemented."); }
  createEmployeeAttendance() { throw new Error("Repository.createEmployeeAttendance must be implemented."); }
  updateEmployeeAttendance() { throw new Error("Repository.updateEmployeeAttendance must be implemented."); }
  deleteEmployeeAttendance() { throw new Error("Repository.deleteEmployeeAttendance must be implemented."); }
}

module.exports = { Repository };
