"use strict";
/**
 * Statistical Cache Entity - Phase 3 Performance Optimization
 * Caches frequently accessed statistical computations and benchmark data
 */
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.StatisticalCache = exports.CacheType = void 0;
const typeorm_1 = require("typeorm");
var CacheType;
(function (CacheType) {
    CacheType["BENCHMARK_DATA"] = "benchmark_data";
    CacheType["AGGREGATED_METRICS"] = "aggregated_metrics";
    CacheType["HISTORICAL_STATS"] = "historical_stats";
    CacheType["BASELINE_VALUES"] = "baseline_values";
    CacheType["THRESHOLD_CONFIG"] = "threshold_config";
})(CacheType || (exports.CacheType = CacheType = {}));
let StatisticalCache = class StatisticalCache {
    id;
    cacheKey; // Unique cache identifier
    cacheType;
    pipelineId; // Pipeline-specific cache
    metric; // Metric-specific cache
    data; // Cached data
    metadata; // Cache metadata
    size; // Data size in bytes
    hitCount; // Cache hit counter
    expiresAt; // Cache expiration
    lastAccessed; // Last access time
    createdAt;
    updatedAt;
    /**
     * Check if cache entry is expired
     */
    isExpired() {
        return new Date() > this.expiresAt;
    }
    /**
     * Update hit count and last accessed time
     */
    recordHit() {
        this.hitCount++;
        this.lastAccessed = new Date();
    }
    /**
     * Generate cache key for specific parameters
     */
    static generateKey(type, params) {
        const sortedParams = Object.keys(params)
            .sort()
            .map(key => `${key}:${params[key]}`)
            .join('|');
        return `${type}:${sortedParams}`;
    }
};
exports.StatisticalCache = StatisticalCache;
__decorate([
    (0, typeorm_1.PrimaryGeneratedColumn)('uuid'),
    __metadata("design:type", String)
], StatisticalCache.prototype, "id", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'varchar', length: 255, unique: true }),
    __metadata("design:type", String)
], StatisticalCache.prototype, "cacheKey", void 0);
__decorate([
    (0, typeorm_1.Column)({
        type: 'enum',
        enum: CacheType
    }),
    __metadata("design:type", String)
], StatisticalCache.prototype, "cacheType", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'uuid', nullable: true }),
    __metadata("design:type", String)
], StatisticalCache.prototype, "pipelineId", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'varchar', length: 100, nullable: true }),
    __metadata("design:type", String)
], StatisticalCache.prototype, "metric", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'json' }),
    __metadata("design:type", Object)
], StatisticalCache.prototype, "data", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'json', nullable: true }),
    __metadata("design:type", Object)
], StatisticalCache.prototype, "metadata", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'bigint' }),
    __metadata("design:type", Number)
], StatisticalCache.prototype, "size", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'int', default: 0 }),
    __metadata("design:type", Number)
], StatisticalCache.prototype, "hitCount", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'timestamp' }),
    __metadata("design:type", Date)
], StatisticalCache.prototype, "expiresAt", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'timestamp', nullable: true }),
    __metadata("design:type", Date)
], StatisticalCache.prototype, "lastAccessed", void 0);
__decorate([
    (0, typeorm_1.CreateDateColumn)(),
    __metadata("design:type", Date)
], StatisticalCache.prototype, "createdAt", void 0);
__decorate([
    (0, typeorm_1.UpdateDateColumn)(),
    __metadata("design:type", Date)
], StatisticalCache.prototype, "updatedAt", void 0);
exports.StatisticalCache = StatisticalCache = __decorate([
    (0, typeorm_1.Entity)('statistical_cache'),
    (0, typeorm_1.Index)(['cacheKey']),
    (0, typeorm_1.Index)(['cacheType', 'expiresAt']),
    (0, typeorm_1.Index)(['pipelineId', 'cacheType'])
], StatisticalCache);
//# sourceMappingURL=statistical-cache.entity.js.map