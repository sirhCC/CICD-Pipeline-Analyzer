"use strict";
/**
 * Repository Index - Centralized repository exports and factory
 */
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.userRepository = exports.pipelineRunRepository = exports.pipelineRepository = exports.RepositoryFactory = exports.UserRepository = exports.PipelineRunRepository = exports.PipelineRepository = exports.BaseRepository = void 0;
var base_repository_1 = require("./base.repository");
Object.defineProperty(exports, "BaseRepository", { enumerable: true, get: function () { return base_repository_1.BaseRepository; } });
var pipeline_repository_1 = require("./pipeline.repository");
Object.defineProperty(exports, "PipelineRepository", { enumerable: true, get: function () { return __importDefault(pipeline_repository_1).default; } });
var pipeline_run_repository_1 = require("./pipeline-run.repository");
Object.defineProperty(exports, "PipelineRunRepository", { enumerable: true, get: function () { return __importDefault(pipeline_run_repository_1).default; } });
var user_repository_1 = require("./user.repository");
Object.defineProperty(exports, "UserRepository", { enumerable: true, get: function () { return __importDefault(user_repository_1).default; } });
const pipeline_repository_2 = __importDefault(require("./pipeline.repository"));
const pipeline_run_repository_2 = __importDefault(require("./pipeline-run.repository"));
const user_repository_2 = __importDefault(require("./user.repository"));
// Repository factory for dependency injection
class RepositoryFactory {
    static pipelineRepository;
    static pipelineRunRepository;
    static userRepository;
    static getPipelineRepository() {
        if (!this.pipelineRepository) {
            this.pipelineRepository = new pipeline_repository_2.default();
        }
        return this.pipelineRepository;
    }
    static getPipelineRunRepository() {
        if (!this.pipelineRunRepository) {
            this.pipelineRunRepository = new pipeline_run_repository_2.default();
        }
        return this.pipelineRunRepository;
    }
    static getUserRepository() {
        if (!this.userRepository) {
            this.userRepository = new user_repository_2.default();
        }
        return this.userRepository;
    }
    /**
     * Reset all repositories (useful for testing)
     */
    static reset() {
        this.pipelineRepository = null;
        this.pipelineRunRepository = null;
        this.userRepository = null;
    }
}
exports.RepositoryFactory = RepositoryFactory;
// Lazy convenience exports using getters
exports.pipelineRepository = new Proxy({}, {
    get(target, prop) {
        return RepositoryFactory.getPipelineRepository()[prop];
    }
});
exports.pipelineRunRepository = new Proxy({}, {
    get(target, prop) {
        return RepositoryFactory.getPipelineRunRepository()[prop];
    }
});
exports.userRepository = new Proxy({}, {
    get(target, prop) {
        return RepositoryFactory.getUserRepository()[prop];
    }
});
//# sourceMappingURL=index.js.map