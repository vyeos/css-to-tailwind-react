import chalk from 'chalk';

class Logger {
  private isVerbose: boolean = false;

  setVerbose(verbose: boolean): void {
    this.isVerbose = verbose;
  }

  info(message: string, ...args: any[]): void {
    console.log(chalk.blue(message), ...args);
  }

  success(message: string, ...args: any[]): void {
    console.log(chalk.green(message), ...args);
  }

  warn(message: string, ...args: any[]): void {
    console.log(chalk.yellow(`⚠️  ${message}`), ...args);
  }

  error(message: string, error?: any): void {
    console.error(chalk.red(`❌ ${message}`));
    if (error && this.isVerbose) {
      if (error instanceof Error) {
        console.error(chalk.red(error.stack || error.message));
      } else {
        console.error(chalk.red(error));
      }
    }
  }

  verbose(message: string, ...args: any[]): void {
    if (this.isVerbose) {
      console.log(chalk.gray(`[verbose] ${message}`), ...args);
    }
  }

  debug(message: string, ...args: any[]): void {
    if (this.isVerbose) {
      console.log(chalk.cyan(`[debug] ${message}`), ...args);
    }
  }

  file(message: string, filePath: string): void {
    console.log(chalk.magenta(`${message}:`), chalk.white(filePath));
  }

  diff(original: string, converted: string): void {
    if (this.isVerbose) {
      console.log(chalk.red('  -'), original);
      console.log(chalk.green('  +'), converted);
    }
  }
}

export const logger = new Logger();
