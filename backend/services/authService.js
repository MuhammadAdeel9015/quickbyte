const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const config = require("../config/env");
const { AppError } = require("../utils/errors");
const { publicUser } = require("../utils/sanitize");

const ROLE_PREFIX = { customer: "CUS", rider: "RID", admin: "ADM", employee: "EMP" };

class AuthService {
  constructor(repository) { this.repository = repository; }

  async registerCustomer(input) {
    const email = input.email.trim().toLowerCase();
    if (await this.repository.getUserByEmail(email)) throw new AppError(409, "An account with this email already exists.", "EMAIL_IN_USE");
    const user = await this.repository.createUser({
      id: this.repository.nextId(ROLE_PREFIX.customer), role: "customer",
      name: input.name.trim(), email, phone: input.phone.trim(),
      address: input.address?.trim() || "", passwordHash: await bcrypt.hash(input.password, 10),
      active: true, createdAt: new Date().toISOString()
    });
    return this.issueToken(user);
  }

  async login(role, emailValue, password) {
    const email = emailValue.trim().toLowerCase();
    const user = await this.repository.getUserByEmail(email);
    if (!user || user.role !== role || !user.active || !(await bcrypt.compare(password, user.passwordHash))) {
      throw new AppError(401, "Email or password is incorrect.", "INVALID_CREDENTIALS");
    }
    return this.issueToken(user);
  }

  async loginAdmin(emailValue, password) {
    const email = emailValue.trim().toLowerCase();
    const user = await this.repository.getUserByEmail(email);
    if (!user || !["admin", "employee"].includes(user.role) || !user.active || !(await bcrypt.compare(password, user.passwordHash))) {
      throw new AppError(401, "Email or password is incorrect.", "INVALID_CREDENTIALS");
    }
    return this.issueToken(user);
  }

  issueToken(user) {
    const token = jwt.sign({ role: user.role, accessRole: user.accessRole }, config.jwtSecret, {
      subject: user.id, expiresIn: config.jwtExpiresIn, issuer: "quickbite-api", audience: "quickbite-apps"
    });
    return { token, tokenType: "Bearer", expiresIn: config.jwtExpiresIn, user: publicUser(user) };
  }
}

module.exports = { AuthService };
