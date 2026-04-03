/**
 * CLI prompt helpers. Only use when process.stdin.isTTY is true.
 */

import inquirer from 'inquirer';

export function isInteractive(): boolean {
  return Boolean(process.stdin.isTTY);
}

type ListChoice = { value: string; name: string };

export async function selectFromList(choices: ListChoice[], message: string): Promise<string> {
  const { value } = await inquirer.prompt<{ value: string }>([
    {
      type: 'list',
      name: 'value',
      message,
      choices: choices.map(c => ({ name: c.name, value: c.value })),
    },
  ]);
  return value;
}

export async function input(message: string, defaultAnswer?: string): Promise<string> {
  const answers = await inquirer.prompt<{ value: string }>([
    {
      type: 'input',
      name: 'value',
      message,
      default: defaultAnswer,
    },
  ]);
  return answers.value.trim();
}

export async function number(
  message: string,
  defaultAnswer?: number,
  min?: number,
  max?: number
): Promise<number> {
  const answers = await inquirer.prompt<{ value: number }>([
    {
      type: 'number',
      name: 'value',
      message,
      default: defaultAnswer,
      validate: (val: number) => {
        if (Number.isNaN(val)) {
          return 'Enter a number.';
        }
        if (min != null && val < min) {
          return `Minimum is ${min}.`;
        }
        if (max != null && val > max) {
          return `Maximum is ${max}.`;
        }
        return true;
      },
    },
  ]);
  return answers.value;
}

/**
 * Create a progress callback that updates a single line in the terminal (TTY).
 * Use for CLI progress during cohort persona creation etc.
 */
export function createProgressReporter(): (
  current: number,
  total: number,
  message?: string
) => void {
  const isTty = Boolean(process.stdout.isTTY);
  return (current: number, total: number, message?: string) => {
    if (!isTty) {
      return;
    }
    const text = message ?? `${current}/${total}`;
    const line = `\r${text.padEnd(60)}`;
    process.stdout.write(line);
  };
}

/**
 * Clear the current progress line (call when done so the next console.log starts on a new line).
 */
export function clearProgress(): void {
  if (process.stdout.isTTY) {
    process.stdout.write('\r' + ' '.repeat(60) + '\r');
  }
}
