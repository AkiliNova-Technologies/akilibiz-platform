// Next.js 16 references the newer URL Pattern aliases; the current DOM types
// expose URLPatternInit instead. Keep this compatibility declaration local.
type URLPatternInput = string | URLPatternInit;

interface URLPatternOptions {
  ignoreCase?: boolean;
}
