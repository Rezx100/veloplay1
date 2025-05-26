// Type definitions for Crisp chat widget

interface CrispCommand {
  [key: string]: any;
}

interface CrispInterface extends Array<CrispCommand> {
  push: (command: CrispCommand) => void;
}

interface Window {
  $crisp: CrispInterface;
  CRISP_WEBSITE_ID: string;
}