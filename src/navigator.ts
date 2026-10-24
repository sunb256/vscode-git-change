import * as path from 'node:path';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import * as vscode from 'vscode';
import { ChangeGroup, GitChange, GitRepository } from './git-api';
import { Hunk, isExcluded, parseHunks } from './matching';
import { compareChanges, ScmViewMode } from './ordering';
import { findContinuationIndex } from './continuation';

const execFileAsync = promisify(execFile);

export interface ChangeEntry {
  readonly key: string;
  readonly group: ChangeGroup;
  readonly resource: GitChange;
  readonly relativePath: string;
  readonly hunks: readonly Hunk[];
}

interface Cursor {
  key: string;
  hunk: number;
}

export class ChangeNavigator {
  private cursor: Cursor | undefined;
  private previousKeys: string[] = [];

  public async move(
    direction: 1 | -1,
    repository: GitRepository,
    groups: readonly ChangeGroup[],
    excludes: readonly string[],
    viewMode: ScmViewMode
  ): Promise<void> {
    const entries = await this.collectEntries(repository, groups, excludes, viewMode);
    if (entries.length === 0) {
      vscode.window.showInformationMessage('対象の Git 変更がありません');
      this.cursor = undefined;
      this.previousKeys = [];
      return;
    }

    const target = this.nextTarget(entries, direction);
    this.cursor = { key: target.entry.key, hunk: target.hunk };
    this.previousKeys = entries.map((entry) => entry.key);
    await this.open(target.entry, target.hunk);
  }

  private nextTarget(entries: readonly ChangeEntry[], direction: 1 | -1): { entry: ChangeEntry; hunk: number } {
    if (!this.cursor) {
      const entry = direction === 1 ? entries[0] : entries[entries.length - 1];
      return { entry, hunk: direction === 1 ? 0 : entry.hunks.length - 1 };
    }

    let entryIndex = entries.findIndex((entry) => entry.key === this.cursor?.key);
    if (entryIndex < 0) {
      const continuationIndex = findContinuationIndex(
        this.previousKeys,
        this.cursor.key,
        entries.map((entry) => entry.key),
        direction
      );
      if (continuationIndex !== -1) {
        const entry = entries[continuationIndex];
        return { entry, hunk: direction === 1 ? 0 : entry.hunks.length - 1 };
      }
      const entry = direction === 1 ? entries[0] : entries[entries.length - 1];
      return { entry, hunk: direction === 1 ? 0 : entry.hunks.length - 1 };
    }

    const current = entries[entryIndex];
    const hunk = this.cursor.hunk + direction;
    if (hunk >= 0 && hunk < current.hunks.length) {
      return { entry: current, hunk };
    }

    entryIndex = (entryIndex + direction + entries.length) % entries.length;
    const entry = entries[entryIndex];
    return { entry, hunk: direction === 1 ? 0 : entry.hunks.length - 1 };
  }

  private async collectEntries(
    repository: GitRepository,
    selectedGroups: readonly ChangeGroup[],
    excludes: readonly string[],
    viewMode: ScmViewMode
  ): Promise<ChangeEntry[]> {
    const groups: ReadonlyArray<[ChangeGroup, readonly GitChange[]]> = [
      ['merge', repository.state.mergeChanges],
      ['staged', repository.state.indexChanges],
      ['unstaged', [...repository.state.workingTreeChanges, ...repository.state.untrackedChanges]]
    ];
    const result: ChangeEntry[] = [];
    for (const [group, resources] of groups) {
      if (!selectedGroups.includes(group)) {
        continue;
      }
      const includedResources = resources
        .map((resource) => ({ resource, relativePath: path.relative(repository.rootUri.fsPath, resource.uri.fsPath).replace(/\\/g, '/') }))
        .filter(({ relativePath }) => !isExcluded(relativePath, excludes))
        .sort((left, right) => compareChanges(
          { relativePath: left.relativePath },
          { relativePath: right.relativePath },
          viewMode
        ));
      for (const { resource, relativePath } of includedResources) {
        const hunks = await this.hunksFor(repository, resource, group, relativePath);
        result.push({ key: `${group}:${resource.uri.toString()}`, group, resource, relativePath, hunks: hunks.length > 0 ? hunks : [{ line: 0 }] });
      }
    }
    return result;
  }

  private async hunksFor(repository: GitRepository, resource: GitChange, group: ChangeGroup, relativePath: string): Promise<Hunk[]> {
    if (group === 'merge') {
      return [{ line: 0 }];
    }
    try {
      const args = ['-C', repository.rootUri.fsPath, 'diff', '--no-ext-diff', '--unified=0'];
      if (group === 'staged') {
        args.push('--cached');
      }
      args.push('--', relativePath);
      const { stdout } = await execFileAsync('git', args, { maxBuffer: 10 * 1024 * 1024 });
      return parseHunks(stdout);
    } catch {
      // Untracked and unusual resource states have no normal git diff; they
      // are navigable as a single synthetic change.
      return [{ line: 0 }];
    }
  }

  private async open(entry: ChangeEntry, hunkIndex: number): Promise<void> {
    await vscode.commands.executeCommand(
      'vscode.diff',
      entry.resource.originalUri,
      entry.resource.uri,
      path.basename(entry.resource.uri.fsPath),
      { preview: true }
    );

    const line = entry.hunks[hunkIndex].line;
    await new Promise<void>((resolve) => setTimeout(resolve, 0));
    const editor = vscode.window.visibleTextEditors.find((candidate) => candidate.document.uri.fsPath === entry.resource.uri.fsPath)
      ?? vscode.window.activeTextEditor;
    if (!editor) {
      return;
    }
    const targetLine = Math.min(Math.max(0, line), Math.max(0, editor.document.lineCount - 1));
    const position = new vscode.Position(targetLine, 0);
    editor.selection = new vscode.Selection(position, position);
    editor.revealRange(new vscode.Range(position, position), vscode.TextEditorRevealType.InCenter);
  }
}
