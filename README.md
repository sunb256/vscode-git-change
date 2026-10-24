# Git Change Navigator

`F7` and `Shift+F7` navigate Git diff hunks across files. Navigation loops from the last change to the first, and from the first to the last.

The default target is merge conflicts and unstaged changes. Configure the extension in VS Code settings:

```json
{
  "gitChangeNavigator.changeGroups": ["merge", "unstaged"],
  "gitChangeNavigator.exclude": ["**/dist/**", "*.lock"]
}
```

`changeGroups` accepts `merge`, `staged`, and `unstaged`. `exclude` patterns are repository-relative globs; each matching changed file is skipped.

## Development

```sh
npm install
npm run package
```

This creates a versioned VSIX in `public/`:

```text
public/git-change-navigator-0.0.1.vsix
```

## Install

The generated VSIX works with VS Code on macOS, Windows, and Linux. The most portable installation method is to run **Extensions: Install from VSIX...** in VS Code and select the generated file.

If the `code` command is available in your terminal, install it with:

```sh
code --install-extension public/git-change-navigator-0.0.2.vsix
```

On Windows PowerShell, use:

```powershell
code --install-extension .\public\git-change-navigator-0.0.2.vsix
```

The `public/` directory is intentionally ignored by Git.

To run the test suite without building a VSIX:

```sh
npm test
```

Install the generated `.vsix` from VS Code's **Extensions: Install from VSIX...** command.


## Additional Keyboad

```json
  // git diff
  {
    "key": "alt+F7",
    "command": "git.stage",
    "when": "editorTextFocus"
  },
  {
    "key": "shift+alt+e",
    "command": "workbench.view.scm",
    "when": "activeViewlet == workbench.view.explorer"
  },
  {
    "key": "shift+alt+e",
    "command": "workbench.view.explorer",
    "when": "activeViewlet == workbench.view.scm"
  },
```