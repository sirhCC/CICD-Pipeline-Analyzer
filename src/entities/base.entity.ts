/**
 * Base Entity with common fields for all database entities
 */

import { 
  PrimaryGeneratedColumn, 
  CreateDateColumn, 
  UpdateDateColumn, 
  VersionColumn,
  Column,
} from 'typeorm';

/**
 * Abstract base entity class that provides common fields
 * for all entities in the system
 */
export abstract class BaseEntity {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @CreateDateColumn({ type: 'timestamptz' })
  createdAt!: Date;

  @UpdateDateColumn({ type: 'timestamptz' })
  updatedAt!: Date;

  @VersionColumn()
  version!: number;

  @Column({ type: 'boolean', default: false })
  isDeleted!: boolean;

  @Column({ type: 'timestamptz', nullable: true })
  deletedAt?: Date;

  /**
   * Soft delete the entity
   */
  softDelete(): void {
    this.isDeleted = true;
    this.deletedAt = new Date();
  }

  /**
   * Restore a soft-deleted entity
   */
  restore(): void {
    this.isDeleted = false;
    delete (this as any).deletedAt;
  }
}

export default BaseEntity;
