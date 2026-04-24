import { commands, ExtensionContext } from "vscode";
import { HelloWorldPanel } from "./panels/HelloWorldPanel";

export function activate(context: ExtensionContext) {
  const openViewerCommand = commands.registerCommand("ifc-graph-viewer.openViewer", () => {

    let ifcText: string | undefined;

    ifcText = ""; // TODO: Webviewに渡すIFC文字列

    // Webview起動
    HelloWorldPanel.render(context.extensionUri, ifcText);
  });

  // Add command to the extension context
  context.subscriptions.push(openViewerCommand);
}

