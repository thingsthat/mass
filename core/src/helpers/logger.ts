import { getEnv } from 'core/src/env';
import packageJson from '~/package.json';

/**
 * Universal logger utility that works in both browser and Node.js environments.
 */
type Logger = {
  info: (category: keyof typeof LogCategory, ...args: unknown[]) => void;
  warn: (category: keyof typeof LogCategory, ...args: unknown[]) => void;
  error: (category: keyof typeof LogCategory, ...args: unknown[]) => void;
  debug: (category: keyof typeof LogCategory, ...args: unknown[]) => void;
};

export const LogCategory = {
  APP: 'App',
  SERVER: 'Server',
  LLM: 'LLM',
  API: 'API',
  MASS: 'MASS',
  DATABASE: 'Database',
  SIMULATION: 'Simulation',
  SOUNDS: 'Sounds',
  PROMPT_ASK: 'Prompt Ask',
  GRAPHQL: 'GraphQL',
  REPORT: 'Report',
  COHORTS: 'Cohorts',
  RELATIONSHIPS: 'Relationships',
  PERSONA: 'Persona',
  HELPERS: 'Helpers',
  CONVERSATION: 'Conversation',
  TASK: 'Background Task',
  REPORTS: 'Reports',
  WORKFLOW: 'Workflow',
  WORKSPACE: 'Workspace',
  SYSTEM: 'System',
  GENERAL: 'General',
} as const;

const isNode =
  typeof globalThis !== 'undefined' &&
  typeof (globalThis as unknown as { window?: unknown }).window === 'undefined';

const isCli = getEnv('MASS_CLI') === 'true' || getEnv('MASS_USE_JSON_STORE') === 'true';
const usePlainLog = isNode || isCli;

const isDev = (): boolean =>
  isNode && getEnv('NODE_ENV') !== 'production';

const isVerbose = (): boolean =>
  isDev() ||
  getEnv('MASS_VERBOSE') === '1' ||
  getEnv('DEBUG') === 'true' ||
  getEnv('LOG_LEVEL') === 'debug';

const shouldLogDebug = (): boolean => isVerbose();

const createStyledLog = (label: string, color = '#888'): [string, string] => {
  return [
    `%c${label}`,
    `color: ${color}; font-weight: bold; border: 1px solid ${color}; padding: 2px 6px; border-radius: 3px;`,
  ];
};

const prefix = (category: keyof typeof LogCategory): string => `[${category}]`;

const logger: Logger = {
  info: (category: keyof typeof LogCategory, ...args: unknown[]) => {
    if (usePlainLog) {
      console.error(prefix(category), ...args);
    } else {
      const [label, style] = createStyledLog(category, '#008000');
      console.log(label, style, ...args);
    }
  },

  warn: (category: keyof typeof LogCategory, ...args: unknown[]) => {
    if (usePlainLog) {
      console.error(prefix(category), ...args);
    } else {
      const [label, style] = createStyledLog(category, '#ffa500');
      console.warn(label, style, ...args);
    }
  },

  error: (category: keyof typeof LogCategory, ...args: unknown[]) => {
    if (usePlainLog) {
      console.error(prefix(category), ...args);
    } else {
      const [label, style] = createStyledLog(category, '#f00');
      console.error(label, style, ...args);
    }
  },

  debug: (category: keyof typeof LogCategory, ...args: unknown[]) => {
    if (shouldLogDebug()) {
      if (usePlainLog) {
        console.error(prefix(category), ...args);
      } else {
        const [label, style] = createStyledLog(category);
        console.log(label, style, ...args);
      }
    }
  },
};

export const log = logger;

export const logApp = () => {
  const asciiArt = String.raw`%c
    __  ______   __________                                                  
   /  |/  /   | / ___/ ___/                                                  
  / /|_/ / /| | \__ \\__ \                                                 
 / /  / / ___ |___/ /__/ /  ${packageJson.version}                                                 
/_/ _/_/_/  |_/____/____/ ___________    ________  _____  ______
   /_  __/ / / /  _/ | / / ____/ ___/   /_  __/ / / /   |/_  __/
    / / / /_/ // //  |/ / / __ \__ \     / / / /_/ / /| | / /   
   / / / __  // // /|  / /_/ /___/ /    / / / __  / ___ |/ /    
  /_/ /_/ /_/___/_/ |_/\____//____/    /_/ /_/ /_/_/  |_/_/                                                                              
`;
  console.log(asciiArt, 'color: #008000; font-family: monospace; font-weight: bold;');
};
