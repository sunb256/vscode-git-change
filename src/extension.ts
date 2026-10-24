import * as vscode from 'vscode';
import { ChangeGroup, findRepository, getGitApi } from './git-api';
import { ChangeNavigator } from './navigator';
import { ScmViewMode } from './ordering';

const validGroups: readonly ChangeGroup[] = ['merge', 'staged', 'unstaged'];
const validViewModes: readonly ScmViewMode[] = ['list', 'tree'];

export function activate(context: vscode.ExtensionContext): void {
  const navigator = new ChangeNavigator();
  const move = async (direction: 1 | -1): Promise<void> => {
    const config = vscode.workspace.getConfiguration('gitChangeNavigator');
    if (config.get<boolean>('closePanelOnNavigate', true)) {
      await vscode.commands.executeCommand('workbench.action.closePanel');
    }
    await vscode.commands.executeCommand('workbench.view.scm');
    const api = await getGitApi();
    if (!api) {
      return;
    }
    const repository = findRepository(api);
    if (!repository) {
      vscode.window.showInformationMessage('対象の Git リポジトリがありません');
      return;
    }
    const configuredGroups = config.get<unknown>('changeGroups', ['merge', 'unstaged']);
    const groups = Array.isArray(configuredGroups)
      ? configuredGroups.filter((group): group is ChangeGroup => typeof group === 'string' && validGroups.includes(group as ChangeGroup))
      : [];
    const excludes = config.get<unknown>('exclude', []);
    const scmConfig = vscode.workspace.getConfiguration('scm');
    const configuredViewMode = scmConfig.get<unknown>('defaultViewMode', 'list');
    const viewMode = validViewModes.includes(configuredViewMode as ScmViewMode) ? configuredViewMode as ScmViewMode : 'list';
    await navigator.move(
      direction,
      repository,
      groups,
      Array.isArray(excludes) ? excludes.filter((value): value is string => typeof value === 'string') : [],
      viewMode
    );
  };

  context.subscriptions.push(
    vscode.commands.registerCommand('gitChangeNavigator.nextChange', () => move(1)),
    vscode.commands.registerCommand('gitChangeNavigator.previousChange', () => move(-1))
  );
}

export function deactivate(): void {}
