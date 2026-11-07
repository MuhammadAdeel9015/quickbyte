const { publicUser } = require("../utils/sanitize");

function authController({ authService }) {
  return {
    register: async (req, res) => res.status(201).json({ data: await authService.registerCustomer(req.body) }),
    customerLogin: async (req, res) => res.json({ data: await authService.login("customer", req.body.email, req.body.password) }),
    riderLogin: async (req, res) => res.json({ data: await authService.login("rider", req.body.email, req.body.password) }),
    adminLogin: async (req, res) => res.json({ data: await authService.loginAdmin(req.body.email, req.body.password) }),
    me: (req, res) => res.json({ data: req.user }),
    logout: (req, res) => res.json({ data: { message: "Client should discard its access token." } }),
    profile: async (req, res) => res.json({ data: publicUser(await req.app.locals.repository.getUserById(req.user.id)) })
  };
}

module.exports = { authController };
