"use strict";
/**
 * Rate Limiter Middleware
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.RateLimiter = void 0;
const logger_1 = require("../shared/logger");
class RateLimiter {
    static logger = new logger_1.Logger('RateLimiter');
    static middleware() {
        return (req, res, next) => {
            // TODO: Implement actual rate limiting logic
            // For now, just pass through
            next();
        };
    }
}
exports.RateLimiter = RateLimiter;
//# sourceMappingURL=rate-limiter.js.map