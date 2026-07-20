export type LogLevel = 'DEBUG' | 'INFO' | 'WARN' | 'ERROR';

export class Logger {
  private static getMinLevel(): LogLevel {
    const envLevel = (process.env.LOG_LEVEL || 'INFO').toUpperCase();
    if (envLevel === 'DEBUG' || envLevel === 'WARN' || envLevel === 'ERROR') {
      return envLevel;
    }
    return 'INFO';
  }

  private static shouldLog(level: LogLevel): boolean {
    const levels: Record<LogLevel, number> = {
      DEBUG: 0,
      INFO: 1,
      WARN: 2,
      ERROR: 3,
    };
    return levels[level] >= levels[Logger.getMinLevel()];
  }

  private static formatMessage(level: LogLevel, moduleName: string, message: string): string {
    const timestamp = new Date().toISOString();
    return `[${timestamp}] [${level}] [${moduleName}]: ${message}`;
  }

  public static debug(moduleName: string, message: string, data?: unknown): void {
    if (this.shouldLog('DEBUG')) {
      // eslint-disable-next-line no-console
      console.debug(
        this.formatMessage('DEBUG', moduleName, message),
        data !== undefined ? data : '',
      );
    }
  }

  public static info(moduleName: string, message: string, data?: unknown): void {
    if (this.shouldLog('INFO')) {
      // eslint-disable-next-line no-console
      console.log(this.formatMessage('INFO', moduleName, message), data !== undefined ? data : '');
    }
  }

  public static warn(moduleName: string, message: string, data?: unknown): void {
    if (this.shouldLog('WARN')) {
      // eslint-disable-next-line no-console
      console.warn(this.formatMessage('WARN', moduleName, message), data !== undefined ? data : '');
    }
  }

  public static error(moduleName: string, message: string, error?: unknown): void {
    if (this.shouldLog('ERROR')) {
      const errMsg =
        error instanceof Error ? error.message : error !== undefined ? String(error) : '';
      // eslint-disable-next-line no-console
      console.error(this.formatMessage('ERROR', moduleName, message), errMsg);
    }
  }
}
