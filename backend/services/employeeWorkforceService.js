const { AppError } = require("../utils/errors");

class EmployeeWorkforceService {
  constructor(repository) {
    this.repository = repository;
  }

  async ensureEmployee(employeeId) {
    const employee = await this.repository.getUserById(employeeId);
    if (!employee || employee.role !== "employee") {
      throw new AppError(404, "Employee not found.", "EMPLOYEE_NOT_FOUND");
    }
    return employee;
  }

  async ensureShift(employeeId, shiftId) {
    await this.ensureEmployee(employeeId);
    const shift = await this.repository.getEmployeeShift(shiftId);
    if (!shift || shift.employeeId !== employeeId) {
      throw new AppError(404, "Employee shift not found.", "EMPLOYEE_SHIFT_NOT_FOUND");
    }
    return shift;
  }

  async ensureAttendance(employeeId, attendanceId) {
    await this.ensureEmployee(employeeId);
    const attendance = await this.repository.getEmployeeAttendance(attendanceId);
    if (!attendance || attendance.employeeId !== employeeId) {
      throw new AppError(404, "Employee attendance record not found.", "EMPLOYEE_ATTENDANCE_NOT_FOUND");
    }
    return attendance;
  }

  async listShifts(employeeId) {
    await this.ensureEmployee(employeeId);
    return this.repository.listEmployeeShifts(employeeId);
  }

  async createShift(employeeId, input) {
    await this.ensureEmployee(employeeId);
    return this.repository.createEmployeeShift({ employeeId, status: "Scheduled", ...input });
  }

  async updateShift(employeeId, shiftId, changes) {
    const shift = await this.ensureShift(employeeId, shiftId);
    const startsAt = changes.startsAt || shift.startsAt;
    const endsAt = changes.endsAt || shift.endsAt;
    if (Date.parse(startsAt) >= Date.parse(endsAt)) {
      throw new AppError(400, "Shift end must be later than shift start.", "INVALID_SHIFT_TIME");
    }
    const updated = await this.repository.updateEmployeeShift(shift.id, changes);
    if (!updated) throw new AppError(404, "Employee shift not found.", "EMPLOYEE_SHIFT_NOT_FOUND");
    return updated;
  }

  async deleteShift(employeeId, shiftId) {
    const shift = await this.ensureShift(employeeId, shiftId);
    if (!await this.repository.deleteEmployeeShift(shift.id)) {
      throw new AppError(404, "Employee shift not found.", "EMPLOYEE_SHIFT_NOT_FOUND");
    }
    return true;
  }

  async listAttendance(employeeId) {
    await this.ensureEmployee(employeeId);
    return this.repository.listEmployeeAttendance(employeeId);
  }

  async createAttendance(employeeId, input) {
    await this.ensureEmployee(employeeId);
    return this.repository.createEmployeeAttendance({
      employeeId,
      checkIn: null,
      checkOut: null,
      status: "Present",
      notes: "",
      ...input
    });
  }

  async updateAttendance(employeeId, attendanceId, changes) {
    const attendance = await this.ensureAttendance(employeeId, attendanceId);
    const checkIn = changes.checkIn === undefined ? attendance.checkIn : changes.checkIn;
    const checkOut = changes.checkOut === undefined ? attendance.checkOut : changes.checkOut;
    if (checkIn && checkOut && Date.parse(checkIn) > Date.parse(checkOut)) {
      throw new AppError(400, "Check-out must not be earlier than check-in.", "INVALID_ATTENDANCE_TIME");
    }
    const updated = await this.repository.updateEmployeeAttendance(attendance.id, changes);
    if (!updated) throw new AppError(404, "Employee attendance record not found.", "EMPLOYEE_ATTENDANCE_NOT_FOUND");
    return updated;
  }

  async deleteAttendance(employeeId, attendanceId) {
    const attendance = await this.ensureAttendance(employeeId, attendanceId);
    if (!await this.repository.deleteEmployeeAttendance(attendance.id)) {
      throw new AppError(404, "Employee attendance record not found.", "EMPLOYEE_ATTENDANCE_NOT_FOUND");
    }
    return true;
  }
}

module.exports = { EmployeeWorkforceService };
