/**
 * Base Entity with common fields for all database entities
 */
/**
 * Abstract base entity class that provides common fields
 * for all entities in the system
 */
export declare abstract class BaseEntity {
    id: string;
    createdAt: Date;
    updatedAt: Date;
    version: number;
    isDeleted: boolean;
    deletedAt?: Date;
    /**
     * Soft delete the entity
     */
    softDelete(): void;
    /**
     * Restore a soft-deleted entity
     */
    restore(): void;
}
export default BaseEntity;
//# sourceMappingURL=base.entity.d.ts.map