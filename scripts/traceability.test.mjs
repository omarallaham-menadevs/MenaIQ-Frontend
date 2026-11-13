import test from 'node:test'
import assert from 'node:assert/strict'
import { employees, entitySessions } from '../src/data/entityAnalytics.ts'
import { authorName, commitLink, commitMergeState, commitPr, demoCollectorEvidence, filterCommits, filterPullRequests, filterRepositories, filterReviews, parseTraceFilters, publicGitHubExample, traceCommits, traceLinks, tracePage, tracePullRequests, traceRepositories, traceReviews } from '../src/data/traceability.ts'

const filters = query => parseTraceFilters(new URLSearchParams(query))

test('demo commit records have unique full SHAs, valid authors, repositories and exact changes', () => {
  assert.equal(traceCommits.length, 60)
  assert.equal(new Set(traceCommits.map(commit => commit.sha)).size, 60)
  for (const commit of traceCommits) {
    assert.match(commit.sha, /^[0-9a-f]{40}$/)
    assert.ok(commit.sha.startsWith(commit.shortSha))
    assert.ok(employees.some(employee => employee.id === commit.authorId))
    assert.ok(traceRepositories.some(repository => repository.name === commit.repository))
    assert.ok(commit.files.every(file => Number.isInteger(file.additions) && file.additions >= 0 && file.deletions >= 0))
  }
  assert.equal(traceCommits[0].files.length, 3)
  assert.equal(traceCommits[0].files.reduce((sum, file) => sum + file.additions, 0), 142)
  assert.equal(traceCommits[0].files.reduce((sum, file) => sum + file.deletions, 0), 28)
  assert.equal(publicGitHubExample, 'https://github.com/octocat/Hello-World/commits/master/')
  assert.ok(traceRepositories.every(repository => repository.connected === false && repository.exampleUrl === publicGitHubExample))
})

test('every verified association has explicit matching demo evidence, ownership, scope and chronology', () => {
  for (const link of traceLinks) {
    const commit = traceCommits.find(item => item.sha === link.commitSha)
    assert.ok(commit)
    if (link.status === 'Unlinked') {
      assert.equal(link.sessionId, null)
      assert.equal(link.evidence, null)
      continue
    }
    const session = entitySessions.find(item => item.id === link.sessionId)
    assert.ok(session)
    assert.equal(session.repository, commit.repository)
    assert.equal(session.employeeId, commit.authorId)
    assert.ok(Date.parse(session.lastActivity) <= Date.parse(commit.committedAt))
    assert.equal(link.evidence.commitSha, commit.sha)
    assert.equal(link.evidence.sessionId, session.id)
    assert.equal(link.evidence.repository, commit.repository)
    assert.equal(link.evidence.authorId, commit.authorId)
    if (link.status === 'Verified') {
      assert.ok(demoCollectorEvidence.includes(link.evidence))
      assert.equal(link.evidence.kind, 'Demo collector commit reference')
      assert.equal(session.status, 'Completed')
      assert.ok(link.evidence.note.includes('demo only'))
    } else assert.equal(link.evidence.kind, 'Temporal candidate')
  }
  for (const status of ['Verified', 'Unverified', 'Unlinked']) assert.ok(traceLinks.some(link => link.status === status))
  assert.equal(commitLink(traceCommits[0]).sessionId, 'SES-1084')
})

test('merged labels require an associated merged PR and explicit merge timestamp', () => {
  for (const commit of traceCommits) {
    const pr = commitPr(commit)
    if (commitMergeState(commit) === 'Merged') {
      assert.ok(pr)
      assert.equal(pr.state, 'Merged')
      assert.ok(pr.commitShas.includes(commit.sha))
      assert.ok(Date.parse(pr.mergedAt) >= Date.parse(commit.committedAt))
    } else assert.ok(!pr || pr.state !== 'Merged')
  }
  assert.equal(commitMergeState(traceCommits[0]), 'Merged')
  assert.equal(commitMergeState(traceCommits[1]), 'Committed')
  for (const review of traceReviews) {
    const pr = tracePullRequests.find(item => item.id === review.pullRequestId)
    assert.ok(pr)
    assert.notEqual(review.reviewerId, pr.authorId)
    assert.ok(employees.some(employee => employee.id === review.reviewerId))
    assert.ok(Date.parse(review.submittedAt) >= Date.parse(pr.createdAt))
    if (pr.state === 'Merged') assert.ok(Date.parse(review.submittedAt) <= Date.parse(pr.mergedAt))
  }
})

test('date scopes, all search fields, repository and advanced filters return consistent records', () => {
  assert.equal(filterCommits(filters('')).length, 40)
  assert.equal(filterCommits(filters('period=90')).length, 60)
  assert.ok(filterCommits(filters('period=7')).length < 40)
  for (const query of ['a7f3d9e', 'authentication', 'web-platform', 'Maya Haddad']) assert.ok(filterCommits(filters('q=' + encodeURIComponent(query))).some(commit => commit.sha === traceCommits[0].sha))
  const scoped = filterCommits(filters('repository=web-platform&author=maya&branch=feature%2Fauth-booking&linkStatus=Verified&prState=Merged'))
  assert.equal(scoped.length, 1)
  assert.equal(scoped[0].shortSha, 'a7f3d9e')
  assert.equal(filterCommits(filters('author=noor')).length, 0)
  assert.ok(filterCommits(filters('prState=No+PR')).every(commit => !commitPr(commit)))
})

test('all four main views share valid scope and pagination uses only actual records', () => {
  assert.equal(filterPullRequests(filters('')).length, 10)
  assert.equal(filterReviews(filters('')).length, 10)
  const repositories = filterRepositories(filters(''))
  assert.equal(repositories.length, 4)
  assert.equal(repositories.reduce((sum, repository) => sum + repository.commits.length, 0), 40)
  const review = traceReviews[0]
  assert.ok(filterReviews(filters('q=' + encodeURIComponent(authorName(review.reviewerId)))).some(item => item.id === review.id))
  const rows = filterCommits(filters(''))
  assert.equal(tracePage(rows, 1).rows.length, 10)
  assert.equal(tracePage(rows, 100).page, 4)
  assert.equal(tracePage(rows, 4).end, 40)
  assert.equal(tracePage([], 1).pageCount, 0)
  assert.equal(tracePage([], 1).start, 0)
})
