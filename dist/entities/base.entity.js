"use strict";
/**
 * Base Entity with common fields for all database entities
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
exports.BaseEntity = void 0;
const typeorm_1 = require("typeorm");
/**
 * Abstract base entity class that provides common fields
 * for all entities in the system
 */
class BaseEntity {
    id;
    createdAt;
    updatedAt;
    version;
    isDeleted;
    deletedAt;
    /**
     * Soft delete the entity
     */
    softDelete() {
        this.isDeleted = true;
        this.deletedAt = new Date();
    }
    /**
     * Restore a soft-deleted entity
     */
    restore() {
        this.isDeleted = false;
        delete this.deletedAt;
    }
}
exports.BaseEntity = BaseEntity;
__decorate([
    (0, typeorm_1.PrimaryGeneratedColumn)('uuid'),
    __metadata("design:type", String)
], BaseEntity.prototype, "id", void 0);
__decorate([
    (0, typeorm_1.CreateDateColumn)({ type: 'timestamptz' }),
    __metadata("design:type", Date)
], BaseEntity.prototype, "createdAt", void 0);
__decorate([
    (0, typeorm_1.UpdateDateColumn)({ type: 'timestamptz' }),
    __metadata("design:type", Date)
], BaseEntity.prototype, "updatedAt", void 0);
__decorate([
    (0, typeorm_1.VersionColumn)(),
    __metadata("design:type", Number)
], BaseEntity.prototype, "version", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'boolean', default: false }),
    __metadata("design:type", Boolean)
], BaseEntity.prototype, "isDeleted", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'timestamptz', nullable: true }),
    __metadata("design:type", Date)
], BaseEntity.prototype, "deletedAt", void 0);
exports.default = BaseEntity;
//# sourceMappingURL=base.entity.js.map