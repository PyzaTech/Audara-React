import { DEBUG_MODE } from '../config/debug';

export const logger = {
  log: (...args: any[]) => {
    if (DEBUG_MODE) console.log(...args);
  },
  warn: (...args: any[]) => {
    if (DEBUG_MODE) console.warn(...args);
  },
  error: (...args: any[]) => {
    console.error(...args);
  },
};
