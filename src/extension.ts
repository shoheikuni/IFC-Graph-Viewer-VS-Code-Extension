import { commands, ExtensionContext, window, Uri, workspace } from "vscode";
import { HelloWorldPanel } from "./panels/HelloWorldPanel";

export function activate(context: ExtensionContext) {
  const openViewerCommand = commands.registerCommand("ifc-graph-viewer.openViewer",
						     async (uri?: Uri) => {

    let ifcText: string | undefined;

    // エクスプローラ右クリック（ファイルuriが渡される）
    if (uri) {
      if (!uri.fsPath.toLowerCase().endsWith(".ifc")) {
        window.showErrorMessage("IFCファイルではありません");
        return;
      }
      const bytes = await workspace.fs.readFile(uri);
      ifcText = bytes.toString();
    }
    // コマンドパレットまたはエディタ右クリック
    else {
      const editor = window.activeTextEditor;
      if (!editor) {
        window.showErrorMessage("IFCファイルを開いてください");
	      return;
      }

      const document = editor.document;
      if (!document.fileName.toLowerCase().endsWith(".ifc")) {
        window.showErrorMessage("IFCファイルではありません");
	      return;
      }

      ifcText = document.getText();
    }

    // Webview起動
    HelloWorldPanel.render(context.extensionUri, ifcText);
  });

  // Add command to the extension context
  context.subscriptions.push(openViewerCommand);
}

