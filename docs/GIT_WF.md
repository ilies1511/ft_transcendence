# Norm for Commits

Präfix:

x = Betroffener Bereich, z. B. Parsing, sprich FEAT(parsing): <Erläuterung des Commits>

- FEAT(x) —> Add new feature
- FIX(x) —> Bug fix
- DOCS(x) —> Add documentation changes
- STYLE(x) —> Changes that do not affect meaning of code, for example Norm
- REFACTOR(x) —> Code that neither fixes a bug nor adds a feature
- PERF(x) —> Changes that improves performance
- TEST(x) —> Add test (shell script)
- BUILD(x) —> Frame, architecture of Project
- CHORE(x) —> Boring changes, that had to be done
- REVERT(x) —> Revert a previous commit

Beispiel:

- FEAT(execution): Add execution frame for Buildins etc…


# Git Wokrflow:

## Always Work in Your Own Branch - Never Push Directly to main
1. git checkout -b IntraName_TypeOfBranch --> z.B iziane_fix/parser
2. only push here

## You have worked on your branch and now want to merge it into the main branch

1. git checkout main
2. git pull origin main
3. git merge --no-ff feature-branch
    1. if merge conflicts appear, solve with concerned member
4. git push origin main


## Context: (mostly after you merged your branch with main, you do the following) —> Get your Branch up to date (after peers added feature)

1. go to branch

    ```bash
    git checkout <name of feature branch>
    ```

2. git fetch origin
3. git merge origin/main
    1. if merge conflicts appear, solve with concern member
