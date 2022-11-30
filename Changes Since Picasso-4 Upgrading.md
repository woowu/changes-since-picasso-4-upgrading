# Find Out and Evaluate Changes Since Picasso-4 Upgrading

## Scope

Compare code change between commit `0aac995c76` and the latest `99bc337695` at the time of writing.

## Filter out the Copyright line changes

Run the following command to generate a list of filenames in which there is only only Copyright changes.
```
git diff --stat=300 -w -G"[Cc]opyright" last-before-picasso-merge \
  -- **/*.cpp **/*.hpp  | grep "|\s*2\s+" > Copyright-changes.txt
```

## Changed Files

Run below command line to get an order list of changed files as well as number of lines changed:
```
git diff --stat=300 -w --diff-filter=dr last-before-picasso-merge \
  -- **/*.cpp **/*.hpp | grep -v UnitTest \
  | grep -v Mocks \
  | head -n -1 > changed-source-files.txt
```

Here is the [output](https://wiki.landisgyr.net/display/E360APACP/Find+Out+and+Evaluate+Changes+Since+Picasso-4+Upgrading?preview=/297112469/297112518/changed-source-file-list-1.txt)
