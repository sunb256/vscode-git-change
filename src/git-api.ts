import * as vscode from 'vscode';

export type ChangeGroup = 'merge' | 'staged' | 'unstaged';

export interface GitChange {
  readonly uri: vscode.Uri;
  readonly originalUri: vscode.Uri;
  readonly status: number;
}

export interface GitRepository {
  readonly rootUri: vscode.Uri;
  readonly state: {
    readonly mergeChanges: readonly GitChange[];
    readonly indexChanges: readonly GitChange[];
    readonly workingTreeChanges: readonly GitChange[];
    readonly untrackedChanges: readonly GitChange[];
  };
}

export interface GitApi {
  readonly repositories: readonly GitRepository[];
  getRepository(uri: vscode.Uri): GitRepository | null;
}

interface GitExtensionExports {
  getAPI(version: 1): GitApi;
}

export async function getGitApi(): Promise<GitApi | undefined> {
  const extension = vscode.extensions.getExtension<GitExtensionExports>('vscode.git');
  if (!extension) {
    vscode.window.showErrorMessage('Git Change Navigator requires the built-in Git extension.');
    return undefined;
  }

  if (!extension.isActive) {
    await extension.activate();
  }

  return extension.exports.getAPI(1);
}

export function findRepository(api: GitApi): GitRepository | undefined {
  const activeUri = vscode.window.activeTextEditor?.document.uri;
  if (activeUri) {
    const activeRepository = api.getRepository(activeUri);
    if (activeRepository) {
      return activeRepository;
    }
  }

  const workspaceFolder = vscode.workspace.workspaceFolders?.[0];
  return workspaceFolder ? api.getRepository(workspaceFolder.uri) ?? api.repositories[0] : api.repositories[0];
}
