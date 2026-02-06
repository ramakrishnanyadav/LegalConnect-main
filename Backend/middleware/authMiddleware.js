import { protect } from "../config/auth.js";
import jwt from "jsonwebtoken";
import UserModel from "../models/User.js";

// Re-export the protect middleware as authenticate
export const authenticate = protect;

// Optional auth: attaches req.user when token is valid, but does not fail when missing
export const optionalAuthenticate = async (req, res, next) => {
  try {
    let token;
    if (
      req.headers.authorization &&
      req.headers.authorization.startsWith("Bearer")
    ) {
      token = req.headers.authorization.split(" ")[1];
    }
    if (!token) {
      return next();
    }
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.user = await UserModel.findById(decoded.id).select("-password");
    next();
  } catch {
    next();
  }
};
