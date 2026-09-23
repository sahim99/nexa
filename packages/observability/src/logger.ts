export interface LogContext {
  userId?: string;
  agentName?: string;
  taskId?: string;
  [key: string]: any;
}

export type LogLevel = 'debug' | 'info' | 'warn' | 'error';

export interface LogEntry {
  ts: string;
  level: LogLevel;
  userId: string;
  agentName: string;
  taskId: string;
  msg: string;
  [key: string]: any;
}

export class JsonLogger {
  private context: LogContext;
  private outputStream: (line: string) => void;

  constructor(context: LogContext = {}, outputStream?: (line: string) => void) {
    this.context = {
      userId: context.userId || 'system',
      agentName: context.agentName || 'nexa-core',
      taskId: context.taskId || 'none',
      ...context
    };
    this.outputStream = outputStream || ((line: string) => process.stdout.write(line + '\n'));
  }

  public child(extraContext: LogContext): JsonLogger {
    return new JsonLogger({ ...this.context, ...extraContext }, this.outputStream);
  }

  public log(level: LogLevel, msg: string, meta: Record<string, any> = {}): LogEntry {
    const entry: LogEntry = {
      ts: new Date().toISOString(),
      level,
      userId: meta.userId || this.context.userId || 'system',
      agentName: meta.agentName || this.context.agentName || 'nexa-core',
      taskId: meta.taskId || this.context.taskId || 'none',
      msg,
      ...this.context,
      ...meta
    };

    const serialized = JSON.stringify(entry);
    this.outputStream(serialized);
    return entry;
  }

  public info(msg: string, meta?: Record<string, any>): LogEntry {
    return this.log('info', msg, meta);
  }

  public debug(msg: string, meta?: Record<string, any>): LogEntry {
    return this.log('debug', msg, meta);
  }

  public warn(msg: string, meta?: Record<string, any>): LogEntry {
    return this.log('warn', msg, meta);
  }

  public error(msg: string, meta?: Record<string, any>): LogEntry {
    return this.log('error', msg, meta);
  }
}

export const logger = new JsonLogger();
