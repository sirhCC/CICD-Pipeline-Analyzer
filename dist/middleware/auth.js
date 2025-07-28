"use strict";
/**
 * Authentication Middleware
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.AuthMiddleware = void 0;
const logger_1 = require("../shared/logger");
class AuthMiddleware {
    static logger = new logger_1.Logger('Auth');
    static optional() {
        return (req, res, next) => {
            // TODO: Implement JWT authentication
            // For now, just pass through
            next();
        };
    }
    static required() {
        return (req, res, next) => {
            // TODO: Implement required authentication
            next();
        };
    }
}
exports.AuthMiddleware = AuthMiddleware;
//# sourceMappingURL=auth.js.map