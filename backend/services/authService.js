const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const config = require("../config/env");
const { AppError } = require("../utils/errors");
const { publicUser } = require("../utils/sanitize");
const { normalizeUsername, usernameInvalid } = require("../validators/common");

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

  async provisionAdmin(input) {
    const name = typeof input.name === "string" ? input.name.trim() : "";
    const username = normalizeUsername(input.username);
    const password = input.password;
    if (name.length < 2 || usernameInvalid(username)) {
      throw new AppError(400, "A valid admin name and username are required.", "INVALID_ADMIN_PROFILE");
    }
    if (typeof password !== "string" || password.length < 12 || Buffer.byteLength(password, "utf8") > 72) {
      throw new AppError(400, "Admin passwords must be 12–72 bytes.", "WEAK_ADMIN_PASSWORD");
    }

    const existing = await this.repository.getUserByUsername(username);
    if (existing) {
      throw new AppError(409, "Username is already in use; no existing account was changed.", "USERNAME_IN_USE");
    }

    const passwordHash = await bcrypt.hash(password, 12);
    const account = {
      name,
      username,
      email: null,
      phone: "",
      address: "",
      role: "admin",
      accessRole: "Super Admin",
      passwordHash,
      active: true,
      createdAt: new Date().toISOString()
    };

    let created;
    try {
      created = await this.repository.createUser({
        ...account,
        id: this.repository.nextId("ADM"),
      });
    } catch (error) {
      if (error.code === "USERNAME_IN_USE" || error.code === "ORDER_CONFLICT") {
        throw new AppError(409, "Username is already in use.", "USERNAME_IN_USE");
      }
      throw error;
    }
    return { user: publicUser(created), created: true };
  }

  async login(role, emailValue, password) {
    const email = emailValue.trim().toLowerCase();
    const user = await this.repository.getUserByEmail(email);
    if (!user || user.role !== role || !user.active || !(await bcrypt.compare(password, user.passwordHash))) {
      throw new AppError(401, "Email or password is incorrect.", "INVALID_CREDENTIALS");
    }
    return this.issueToken(user);
  }

  async loginAdmin(usernameValue, password) {
    const username = normalizeUsername(usernameValue);
    const user = await this.repository.getUserByUsername(username);
    if (!user || !["admin", "employee"].includes(user.role) || !user.active || !(await bcrypt.compare(password, user.passwordHash))) {
      throw new AppError(401, "Username or password is incorrect.", "INVALID_CREDENTIALS");
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
