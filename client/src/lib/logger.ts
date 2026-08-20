type LogArguments = unknown[];

export const logger = {
  error: (...args: LogArguments) => console.error(...args),
  info: (...args: LogArguments) => console.info(...args),
  warn: (...args: LogArguments) => console.warn(...args),
};
