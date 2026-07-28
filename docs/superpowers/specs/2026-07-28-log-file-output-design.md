# Log File Output Design

## Scope

Issue #22 adds optional conversion job reports to the `convert` command. The
feature does not change the default conversion output or the existing Winston
application logs.

## Command Interface

The command accepts two independent options:

- `--log-file-json <path>` writes one JSON document.
- `--log-file-txt <path>` writes a readable text report.

Either option may be used alone or both may be used in the same command. No
report file is created when neither option is supplied.

## Report Contents

Both report formats capture the completed conversion result and the job logs
produced by `JobQueue`: job identifiers, source and destination paths, engine,
parameters, timestamps, duration, exit code, success status, and errors.

The JSON report is a single structured document containing conversion summary
fields and a `jobs` array. The text report starts with a summary, followed by a
separate readable block for each job.

## Error Handling

Report paths are resolved from the invoking working directory. Parent
directories are created as needed. If a requested report cannot be written,
the conversion command fails with an error naming the affected path; it does
not silently continue.

## Implementation Boundaries

`cli.ts` parses and forwards the two options. `ConversionOptions` carries them
to `Converter`. `Converter` owns report creation immediately after job
completion, using a small focused report writer module rather than modifying
the global Winston logger.

## Tests

Tests will verify JSON-only output, text-only output, both outputs in one run,
and propagation of a file-writing failure. They will exercise the report
writer with real filesystem paths and representative job logs.
