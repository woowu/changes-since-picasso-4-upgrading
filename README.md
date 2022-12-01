# Changes Since Picasso-4 Upgrading

Analysis code changes since (including) Picasso-4 upgrading.

## Overview Of Changed Source Code

### Code changes vs functionality

![](changes-functional-summary.png?raw=true)

### Change details regarding to changed files

The report <a href="changes-detail.txt">changes-detail.txt</a> listed changed files in the way described below:

- The changed files are grouped into functional categories.
- For each changed file, the following information are listed:
  - The number of changed lines
  - The ratio of number of inserted lines and number of deleted lines are indicated by number of symbols '+' and number of symbols '-'
  - If the change of a file contains one or more TODO marks, the filename will be marked as `filename*`
  - If a function category contains one or more files which has TODO changes, then the function category itself will be marked as `function-name*`

## How The Information Produced

### Scope of change

Compare code change between commit `0aac995c76` and the latest `99bc337695` at the time of writing.

### Exclude Copyright-only changes

Run the following command to generate a list of filenames of each there are only Copyright changes.
```
git diff --stat=300 -w -G"[Cc]opyright" last-before-picasso-merge \
  -- **/*.cpp **/*.hpp  | grep "|\s*2\s+" > data/Copyright-changes.txt
```

### Highlight changes containing TODO marks

Run the following command to generate a list of filename of each there exits TODO mark.
```
git diff --stat=300 -w -G"TODO" last-before-picasso-merge \
  -- **/*.cpp **/*.hpp  | head -n -1 > data/todo-changes.txt
```

### Produce list of all the changed files

Run below command line to get an order list of changed files as well as number of lines changed:
```
git diff --stat=300 -w --diff-filter=dr last-before-picasso-merge \
  -- **/*.cpp **/*.hpp | grep -v UnitTest \
  | grep -v Mocks \
  | head -n -1 > data/changed-source-files.txt
```

### Produce reports

With all the three data files `Copyright-changes.txt`, `todo-changes.txt` and `changed-source-files.txt` stored in the `data/` directory, running the reporting program `report.js` followed by `viz.R` will produce the mentioned reports.

The following changes are excluded after following the above steps:

- None .cpp or .hpp files
- Copyright-only changes
- UnitTest and Mocks files
