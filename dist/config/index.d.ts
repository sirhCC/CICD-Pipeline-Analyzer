/**
 * Enterprise Configuration Management
 * Modular, type-safe configuration with environment validation
 */
import type { AppConfig } from '../types';
declare const appConfig: AppConfig;
export declare class ConfigManager {
    private static instance;
    private config;
    private constructor();
    static getInstance(): ConfigManager;
    get(): AppConfig;
    getServer(): AppConfig['server'];
    getDatabase(): AppConfig['database'];
    getRedis(): AppConfig['redis'];
    getAuth(): AppConfig['auth'];
    getModules(): AppConfig['modules'];
    getMonitoring(): AppConfig['monitoring'];
    getProviderConfig(provider: string): any;
    isProduction(): boolean;
    isDevelopment(): boolean;
    isTest(): boolean;
    validateConfiguration(): void;
    updateProviderConfig(provider: string, config: Partial<any>): void;
    enableModule(moduleName: string): void;
    disableModule(moduleName: string): void;
}
export declare const configManager: ConfigManager;
export default appConfig;
//# sourceMappingURL=index.d.ts.map