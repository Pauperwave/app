// .claude\hooks\guard-git-push.mjs
// PreToolUse hook (user request, 2026-10-02): Claude may push release tags, never branch commits.
// A permission rule can't express that (an allow can't carve an exception out of a deny, and
// argument patterns like `git push origin v*` also match `git push origin v1.0.0 main`), so this
// parses every `git push` in the command and denies it unless it only pushes existing tags.
import { execFileSync } from 'node:child_process'

const TAG_NAME = /^(?:refs\/tags\/)?(v\d+\.\d+\.\d+(?:[-.][\w.]+)?)$/

function deny(reason) {
  process.stdout.write(JSON.stringify({
    hookSpecificOutput: {
      hookEventName: 'PreToolUse',
      permissionDecision: 'deny',
      permissionDecisionReason: reason
    }
  }))
  process.exit(0)
}

function isLocalTag(name) {
  try {
    return execFileSync('git', ['tag', '--list', name], { encoding: 'utf8' }).trim() === name
  } catch {
    return false
  }
}

// Why a single `git push …` segment isn't a tag-only push, or null when it is.
function rejectReason(segment) {
  // Shell redirections (`2>&1`, `> log.txt`) aren't push arguments: drop them and their target.
  const words = segment.trim().split(/\s+/)
    .map(word => word.replace(/^['"]|['"]$/g, ''))
    .filter((word, index, all) => !/^\d*[<>]/.test(word) && !/^\d*[<>]+$/.test(all[index - 1] ?? ''))
  const pushIndex = words.indexOf('push')
  const args = words.slice(pushIndex + 1)

  // `--tags` alone pushes every tag and no branch; any other flag (--follow-tags, -u, --force,
  // --all, --mirror…) can move branches.
  const flags = args.filter(arg => arg.startsWith('-'))
  if (flags.some(flag => flag !== '--tags')) return `flag not allowed: ${flags.join(' ')}`

  const positional = args.filter(arg => !arg.startsWith('-'))
  const [remote, ...refspecs] = positional
  if (!remote) return 'no remote given (a bare `git push` pushes the current branch)'
  if (flags.includes('--tags')) return refspecs.length === 0 ? null : 'refspecs next to --tags'
  if (refspecs.length === 0) return 'no refspec given (pushes the current branch)'

  for (const refspec of refspecs) {
    const match = refspec.match(TAG_NAME)
    if (!match) return `not a release tag: ${refspec}`
    if (!isLocalTag(match[1])) return `no local tag named ${match[1]}`
  }
  return null
}

let input = ''
process.stdin.on('data', (chunk) => {
  input += chunk
})
process.stdin.on('end', () => {
  const command = JSON.parse(input || '{}').tool_input?.command ?? ''

  const pushes = command
    .split(/&&|\|\||;|\||\n/)
    // Only segments that *run* git (not "git push" quoted inside a commit message or heredoc).
    .filter(segment => /^\s*(?:\w+=\S*\s+)*git(?:\s+-\S+(?:\s+[^-\s]\S*)?)*\s+push\b/.test(segment))

  for (const segment of pushes) {
    const reason = rejectReason(segment)
    if (reason) {
      deny(`Only release tags may be pushed (e.g. \`git push origin v1.2.3\`); branch commits need the user. Blocked: ${reason}`)
    }
  }
  process.exit(0)
})
