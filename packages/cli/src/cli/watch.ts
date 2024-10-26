import { Command } from "commander";
import fs from "fs";
import path from "path";
import debounce from "lodash/debounce";
import { exec } from "child_process";
import Ora from "ora";

const WATCH_DEBOUNCE_TIME = 1000; // debounce time in milliseconds

export default new Command()
  .command("watch")
  .description("Watch source file for changes and trigger retranslation")
  .option("--source <file>", "Path to the source file to watch", "i18n.json")
  .option("--locale <locale>", "Locale to process")
  .option("--bucket <bucket>", "Bucket to process")
  .action((options) => {
    const { source, locale, bucket } = options;
    const sourcePath = path.resolve(source);

    if (!fs.existsSync(sourcePath)) {
      console.error(`Source file "${sourcePath}" not found.`);
      process.exit(1);
    }

    const spinner = Ora(`Watching for changes in ${sourcePath}`).start();

    // Debounced function to avoid rapid retranslation calls
    const triggerRetranslation = debounce(() => {
      spinner.info("Change detected, triggering retranslation...");
      retranslate({ locale, bucket });
    }, WATCH_DEBOUNCE_TIME);

    // Watch source file for changes
    fs.watch(sourcePath, { persistent: true }, (eventType) => {
      if (eventType === "change") {
        triggerRetranslation();
      }
    });
  });

// Function to execute the i18n retranslation process
function retranslate({ locale, bucket }: { locale?: string; bucket?: string }) {
  const spinner = Ora("Retranslating...").start();
  const command = [
    "node", // assumes the CLI is called with Node.js
    "i18n", // the command name, assuming it's registered as "i18n"
    locale ? `--locale ${locale}` : "",
    bucket ? `--bucket ${bucket}` : "",
  ].join(" ");

  exec(command, (error, stdout, stderr) => {
    if (error) {
      spinner.fail(`Retranslation failed: ${error.message}`);
      console.error(stderr);
      return;
    }
    spinner.succeed("Retranslation completed successfully");
    console.log(stdout);
  });
}
