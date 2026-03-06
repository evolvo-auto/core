import {
  mergeCorrelationContexts,
  normalizeCorrelationContext,
  type CorrelationContext
} from './correlation-context.js';
import {
  createStructuredEvent,
  serializeStructuredEvent,
  type CreateStructuredEventInput,
  type LogLevel,
  type StructuredEvent
} from './structured-event.js';

export type LogSink = {
  write: (entry: string) => void;
};

export type LoggerMethodInput = Omit<
  CreateStructuredEventInput,
  'level' | 'source'
> & {
  source?: string;
};

export type StructuredLogger = {
  child: (options?: LoggerChildOptions) => StructuredLogger;
  debug: (input: LoggerMethodInput) => StructuredEvent;
  error: (input: LoggerMethodInput) => StructuredEvent;
  info: (input: LoggerMethodInput) => StructuredEvent;
  log: (input: CreateStructuredEventInput) => StructuredEvent;
  warn: (input: LoggerMethodInput) => StructuredEvent;
};

export type CreateLoggerOptions = {
  correlationIds?: CorrelationContext;
  now?: () => Date;
  sink?: LogSink;
  source: string;
};

export type LoggerChildOptions = {
  correlationIds?: CorrelationContext;
  source?: string;
};

function createSinkWriter(
  sink: LogSink
): (event: StructuredEvent) => StructuredEvent {
  return (event) => {
    sink.write(`${serializeStructuredEvent(event)}\n`);
    return event;
  };
}

function normalizeSource(source: string): string {
  const trimmedSource = source.trim();

  if (trimmedSource.length === 0) {
    throw new TypeError('Logger source must be a non-empty string');
  }

  return trimmedSource;
}

export function createLogger(options: CreateLoggerOptions): StructuredLogger {
  const sink = options.sink ?? process.stdout;
  const source = normalizeSource(options.source);
  const now = options.now ?? (() => new Date());
  const baseCorrelationIds = normalizeCorrelationContext(
    options.correlationIds
  );
  const writeEvent = createSinkWriter(sink);

  const createLevelLogger = (level: LogLevel) => (input: LoggerMethodInput) =>
    writeEvent(
      createStructuredEvent(
        {
          level,
          eventName: input.eventName,
          source: input.source ?? source,
          message: input.message,
          correlationIds: mergeCorrelationContexts(
            baseCorrelationIds,
            input.correlationIds
          ),
          data: input.data,
          error: input.error
        },
        {
          now
        }
      )
    );

  return {
    child(childOptions = {}) {
      return createLogger({
        sink,
        now,
        source: childOptions.source ?? source,
        correlationIds: mergeCorrelationContexts(
          baseCorrelationIds,
          childOptions.correlationIds
        )
      });
    },
    debug: createLevelLogger('debug'),
    error: createLevelLogger('error'),
    info: createLevelLogger('info'),
    log(input) {
      return writeEvent(
        createStructuredEvent(
          {
            ...input,
            source: input.source,
            correlationIds: mergeCorrelationContexts(
              baseCorrelationIds,
              input.correlationIds
            )
          },
          {
            now
          }
        )
      );
    },
    warn: createLevelLogger('warn')
  };
}
