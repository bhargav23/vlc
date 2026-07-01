const isDev = import.meta.env.DEV ?? false;
const isServer = typeof window === "undefined";

function formatArgs(args: unknown[]) {
  return args.map((arg) => {
    try {
      return typeof arg === "string" ? arg : JSON.stringify(arg);
    } catch {
      return String(arg);
    }
  });
}

export const logger = {
  error: (...args: unknown[]) => {
    if (isDev || isServer) {
      console.error(...args);
    }
  },
  warn: (...args: unknown[]) => {
    if (isDev || isServer) {
      console.warn(...args);
    }
  },
  info: (...args: unknown[]) => {
    if (isDev || isServer) {
      console.info(...args);
    }
  },
  debug: (...args: unknown[]) => {
    if (isDev) {
      console.debug(...args);
    }
  },
  log: (...args: unknown[]) => {
    if (isDev || isServer) {
      console.log(...args);
    }
  },
  string: (...args: unknown[]) => formatArgs(args).join(" "),
};
