/**
 * Core type definitions for the CI/CD Pipeline Analyzer
 * Enterprise-grade type safety across all modules
 */

// === Core Pipeline Types ===
export interface Pipeline {
  id: string;
  name: string;
  provider: PipelineProvider;
  repositoryId: string;
  branch: string;
  status: PipelineStatus;
  startTime: Date;
  endTime?: Date;
  duration?: number;
  stages: PipelineStage[];
  metadata: PipelineMetadata;
  createdAt: Date;
  updatedAt: Date;
}

export interface PipelineStage {
  id: string;
  name: string;
  type: StageType;
  status: StageStatus;
  startTime: Date;
  endTime?: Date;
  duration?: number;
  jobs: PipelineJob[];
  dependsOn?: string[];
  metadata: Record<string, unknown>;
}

export interface PipelineJob {
  id: string;
  name: string;
  status: JobStatus;
  startTime: Date;
  endTime?: Date;
  duration?: number;
  logs?: string;
  artifacts?: Artifact[];
  resourceUsage: ResourceUsage;
  metadata: Record<string, unknown>;
}

// === Provider Types ===
export enum PipelineProvider {
  GITHUB_ACTIONS = 'github-actions',
  GITLAB_CI = 'gitlab-ci',
  JENKINS = 'jenkins',
  AZURE_DEVOPS = 'azure-devops',
  CIRCLECI = 'circleci',
  BUILDKITE = 'buildkite',
  CUSTOM = 'custom',
}

export interface ProviderConfig {
  provider: PipelineProvider;
  baseUrl: string;
  apiToken: string;
  organizationId?: string;
  projectId?: string;
  webhookSecret?: string;
  rateLimits: RateLimitConfig;
  retryConfig: RetryConfig;
}

// === Status Enums ===
export enum PipelineStatus {
  UNKNOWN = 'unknown',
  PENDING = 'pending',
  RUNNING = 'running',
  SUCCESS = 'success',
  FAILED = 'failed',
  CANCELLED = 'cancelled',
  SKIPPED = 'skipped',
  TIMEOUT = 'timeout',
}

export enum PipelineVisibility {
  PUBLIC = 'public',
  PRIVATE = 'private',
  INTERNAL = 'internal',
}

export enum StageStatus {
  PENDING = 'pending',
  RUNNING = 'running',
  SUCCESS = 'success',
  FAILED = 'failed',
  CANCELLED = 'cancelled',
  SKIPPED = 'skipped',
}

export enum JobStatus {
  PENDING = 'pending',
  RUNNING = 'running',
  SUCCESS = 'success',
  FAILED = 'failed',
  CANCELLED = 'cancelled',
  SKIPPED = 'skipped',
}

export enum StageType {
  BUILD = 'build',
  TEST = 'test',
  LINT = 'lint',
  SECURITY = 'security',
  DEPLOY = 'deploy',
  RELEASE = 'release',
  CUSTOM = 'custom',
}

// === Resource & Performance Types ===
export interface ResourceUsage {
  cpuTime: number; // milliseconds
  memoryPeak: number; // bytes
  diskUsage: number; // bytes
  networkIO: number; // bytes
  cost?: number; // USD
}

export interface PerformanceMetrics {
  averageExecutionTime: number;
  p50ExecutionTime: number;
  p95ExecutionTime: number;
  p99ExecutionTime: number;
  successRate: number;
  failureRate: number;
  resourceEfficiency: number;
  costPerExecution: number;
}

// === Analysis & Intelligence Types ===
export interface PipelineAnalysis {
  pipelineId: string;
  analysisDate: Date;
  performanceMetrics: PerformanceMetrics;
  bottlenecks: Bottleneck[];
  optimizationSuggestions: OptimizationSuggestion[];
  trends: Trend[];
  anomalies: Anomaly[];
  riskAssessment: RiskAssessment;
}

export interface Bottleneck {
  type: BottleneckType;
  location: string; // stage or job ID
  description: string;
  impact: ImpactLevel;
  suggestedFix: string;
  estimatedTimeReduction: number;
}

export enum BottleneckType {
  RESOURCE_CONSTRAINT = 'resource-constraint',
  DEPENDENCY_WAIT = 'dependency-wait',
  INEFFICIENT_PARALLELIZATION = 'inefficient-parallelization',
  SLOW_DEPENDENCY_FETCH = 'slow-dependency-fetch',
  EXCESSIVE_LOGGING = 'excessive-logging',
  REDUNDANT_STEPS = 'redundant-steps',
}

export interface OptimizationSuggestion {
  id: string;
  type: OptimizationType;
  priority: Priority;
  description: string;
  expectedImpact: string;
  implementation: string;
  estimatedEffort: string;
  costSavings?: number;
  timeSavings?: number;
}

export enum OptimizationType {
  CACHING = 'caching',
  PARALLELIZATION = 'parallelization',
  RESOURCE_OPTIMIZATION = 'resource-optimization',
  DEPENDENCY_OPTIMIZATION = 'dependency-optimization',
  WORKFLOW_RESTRUCTURE = 'workflow-restructure',
  COST_OPTIMIZATION = 'cost-optimization',
}

// === Common Utility Types ===
export enum Priority {
  LOW = 'low',
  MEDIUM = 'medium',
  HIGH = 'high',
  CRITICAL = 'critical',
}

export enum ImpactLevel {
  MINIMAL = 'minimal',
  LOW = 'low',
  MEDIUM = 'medium',
  HIGH = 'high',
  SEVERE = 'severe',
}

export interface Trend {
  metric: string;
  direction: 'up' | 'down' | 'stable';
  magnitude: number;
  period: string;
  significance: number;
}

export interface Anomaly {
  type: string;
  description: string;
  severity: ImpactLevel;
  detectedAt: Date;
  affectedMetrics: string[];
}

export interface RiskAssessment {
  overallRisk: ImpactLevel;
  factors: RiskFactor[];
  recommendations: string[];
}

export interface RiskFactor {
  factor: string;
  risk: ImpactLevel;
  description: string;
}

// === Metadata & Configuration ===
export interface PipelineMetadata {
  repositoryUrl: string;
  commitSha: string;
  author: string;
  message: string;
  triggeredBy: string;
  environment?: string;
  tags: string[];
  customFields: Record<string, unknown>;
}

export interface Artifact {
  id: string;
  name: string;
  type: string;
  size: number;
  url?: string;
  checksum?: string;
}

export interface RateLimitConfig {
  requestsPerMinute: number;
  burstLimit: number;
  backoffStrategy: 'exponential' | 'linear' | 'fixed';
}

export interface RetryConfig {
  maxAttempts: number;
  initialDelay: number;
  maxDelay: number;
  backoffMultiplier: number;
}

// === API & Response Types ===
export interface ApiResponse<T = unknown> {
  success: boolean;
  data?: T;
  error?: ApiError;
  metadata: ResponseMetadata;
}

export interface ApiError {
  code: string;
  message: string;
  details?: Record<string, unknown>;
  timestamp: Date;
}

export interface ResponseMetadata {
  requestId: string;
  timestamp: Date;
  processingTime: number;
  version: string;
}

// === Authentication & Authorization ===
export interface User {
  id: string;
  email: string;
  name: string;
  role: UserRole;
  permissions: Permission[];
  apiKeys: ApiKey[];
  createdAt: Date;
  updatedAt: Date;
}

export enum UserRole {
  ADMIN = 'admin',
  ANALYST = 'analyst',
  VIEWER = 'viewer',
  DEVELOPER = 'developer',
}

export interface Permission {
  resource: string;
  actions: string[];
}

export interface ApiKey {
  id: string;
  name: string;
  key: string;
  permissions: Permission[];
  expiresAt?: Date;
  lastUsed?: Date;
  createdAt: Date;
}

// === Module Interfaces ===
export interface Module {
  name: string;
  version: string;
  enabled: boolean;
  config: Record<string, unknown>;
  dependencies: string[];
}

export interface ProviderModule extends Module {
  provider: PipelineProvider;
  supportedFeatures: string[];
  rateLimits: RateLimitConfig;
}

export interface AnalysisModule extends Module {
  analysisTypes: string[];
  requiredData: string[];
  outputFormat: string[];
}

// === Configuration Types ===
export interface AppConfig {
  server: ServerConfig;
  database: DatabaseConfig;
  redis: RedisConfig;
  auth: AuthConfig;
  modules: ModuleConfig;
  monitoring: MonitoringConfig;
}

export interface ServerConfig {
  port: number;
  host: string;
  cors: CorsConfig;
  security: SecurityConfig;
}

export interface DatabaseConfig {
  type: 'postgres' | 'mysql';
  host: string;
  port: number;
  database: string;
  username: string;
  password: string;
  ssl: boolean;
  poolSize: number;
}

export interface RedisConfig {
  host: string;
  port: number;
  password?: string;
  db: number;
  ttl: number;
}

export interface AuthConfig {
  jwtSecret: string;
  jwtExpiresIn: string;
  refreshTokenExpiresIn: string;
  bcryptRounds: number;
}

export interface CorsConfig {
  origin: string | string[];
  credentials: boolean;
  optionsSuccessStatus: number;
}

export interface SecurityConfig {
  rateLimiting: boolean;
  helmet: boolean;
  compression: boolean;
}

export interface ModuleConfig {
  providers: Record<string, ProviderConfig>;
  analysis: Record<string, unknown>;
  caching: CachingConfig;
}

export interface CachingConfig {
  enabled: boolean;
  ttl: number;
  maxSize: number;
  strategy: 'lru' | 'lfu' | 'fifo';
}

export interface MonitoringConfig {
  enabled: boolean;
  prometheus: boolean;
  jaeger: boolean;
  logging: LoggingConfig;
}

export interface LoggingConfig {
  level: 'error' | 'warn' | 'info' | 'debug';
  format: 'json' | 'simple';
  file?: string;
  maxSize?: string;
  maxFiles?: number;
}

// === Express Request Types ===
import { Request, ParamsDictionary } from 'express-serve-static-core';
import { ParsedQs } from 'qs';

export interface TypedRequest<
  TParams extends ParamsDictionary = ParamsDictionary,
  TQuery extends ParsedQs = ParsedQs,
  TBody = any
> extends Request<TParams, any, TBody, TQuery> {}
