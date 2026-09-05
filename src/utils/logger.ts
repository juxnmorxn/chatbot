export class Logger {
  private context: string;

  constructor(context: string) {
    this.context = context;
  }

  private formatMessage(level: string, message: string, meta?: any): string {
    const timestamp = new Date().toISOString();
    let log = `[${timestamp}] [${level.toUpperCase()}] [${this.context}]: ${message}`;
    if (meta !== undefined) {
      if (typeof meta === 'object') {
        try {
          log += ` ${JSON.stringify(meta)}`;
        } catch {
          log += ` [Unserializable Object]`;
        }
      } else {
        log += ` ${meta}`;
      }
    }
    return log;
  }

  info(message: string, meta?: any) {
    console.log(this.formatMessage('info', message, meta));
  }

  warn(message: string, meta?: any) {
    console.warn(this.formatMessage('warn', message, meta));
  }

  error(message: string, meta?: any) {
    console.error(this.formatMessage('error', message, meta));
  }

  debug(message: string, meta?: any) {
    if (process.env.NODE_ENV !== 'production') {
      console.debug(this.formatMessage('debug', message, meta));
    }
  }
}
