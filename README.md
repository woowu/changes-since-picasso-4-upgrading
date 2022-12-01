# Changes Since Picasso-4 Upgrading

Analysis code changes since (including) Picasso-4 upgrading.

## Get Information Of Changes From Git

### Scope of change

Compare code change between commit `0aac995c76` and the latest `99bc337695` at the time of writing.

### Copyright-only changes

Run the following command to generate a list of filenames of each there are only Copyright changes.
```
git diff --stat=300 -w -G"[Cc]opyright" last-before-picasso-merge \
  -- **/*.cpp **/*.hpp  | grep "|\s*2\s+" > Copyright-changes.txt
```

### Changes containing TODO mark

Run the following command to generate a list of filename of each there exits TODO mark.
```
git diff --stat=300 -w -G"TODO" last-before-picasso-merge \
  -- **/*.cpp **/*.hpp  | head -n -1 > todo-changes.txt
```

### All changed files

Run below command line to get an order list of changed files as well as number of lines changed:
```
git diff --stat=300 -w --diff-filter=dr last-before-picasso-merge \
  -- **/*.cpp **/*.hpp | grep -v UnitTest \
  | grep -v Mocks \
  | head -n -1 > changed-source-files.txt
```
