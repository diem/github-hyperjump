# github-hyperjump

This is a GitHub app to create
[repository_dispatch](https://docs.github.com/en/developers/webhooks-and-events/webhook-events-and-payloads#repository_dispatch)
events on the configured set of repos. Interact with it on the
[libra-hyperjump app page](https://github.com/apps/libra-hyperjump).

This is a workaround for GitHub Actions' lack of support for handling events
coming from forked repos. When GitHub Actions on a PR from a forked repo
happen, they have read-only scope to the base repo which prevents them from
doing most useful things like assigning labels, reviewers, or posting comments
to the PR.

It listens for unauthenticated HTTP events that originate in GitHub
Actions. This app would be installed with write access on the target repos and
can create the `repository_dispatch` events which the GitHub Actions can't do
themselves since they lack appropriate scopes. The `repository_dispatch` event
is handled by the default branch in the base repository and so it can access
stored repo secrets and use those to gain write permission for specific
actions.

This app is deliberately limited to creating `repository_dispatch` events to
keep it simple and allow GitHub Actions to handle what to do with the
events. That keeps changes and deployment to the event logic simple. Note that
`repository_dispatch` events are only handled on the default branch in the
repo, so it is not possible to trigger GitHub Actions that are created or
modified in PRs until they are landed.

## Triggering a `repository_dispatch` event

The hyperjump server listens for `POST` requests at path
`/hyperjump/jump`. Request bodys are JSON data:

```json
{
   "owner": "libra",
   "repo": "libra",
   "type": "comment",
   "args": {
       "number": 1234,
       "comment": "this is a comment"
   }
}
```

The `owner` and `repo` fields identifier the repo to trigger a
`repository_dispatch` event on. The app must have been installed there with
access to the target repo. The `type` field will be passed as the `event_type`
field in the `repository_dispatch` request to GitHub. See
[the GitHub
documentation](https://developer.github.com/v3/repos/#create-a-repository-dispatch-event)
for details. The `args` field will be passed as `client_payload` and
accessible to the GitHub Action receiving the event.

## Receiving hyperjump dispatches

Handling the above example of a hyperjump event can be done with the following
workflow:

```yaml
name: hyperjump - comment

on:
  repository_dispatch:
    types: [comment]

jobs:
  comment:
    runs-on: ubuntu-latest
    name: comment
    steps:
      - name: checkout
        uses: actions/checkout@v2
      - name: post comment
        uses: ./.github/actions/comment
        with:
          github-token: ${{ secrets.HYPERJUMP_TOKEN }}
          number: ${{ github.event.client_payload.number }}
          comment: ${{ github.event.client_payload.comment }}
```

Note that this workflow filters for the `comment` event type, which was
provided in the JSON body sent to `/hyperjump/jump` above. It passes the args
to the `./.github/actions/comment` action which you would have to write and
place in the repo. Note that a GitHub token with write scope to the repo must
be stored in the repo secrets (called `HYPERJUMP_TOKEN` in this example).

## Security considerations

Almost all useful GitHub functionality needs repo write scope, and so a repo
write scope token will need to be stored as a repo secret. If this token is
leaked, an attacker can push code and do other bad things.

Leaks are prevented by hyperjump limiting the payloads to what is essentially
a function name and its arguments, and the repo must have configured matching
actions for those names. Since these `repository_dispatch` events are run from
the default branch, which an attacker does not control, it can't force the
leak of a token.

However, any action that a `repository_dispatch` event can trigger is
available to anyone at any time. The HTTP requests to the hyperjump server
can't be authenticated, and therefore anyone could trigger them to comment on
PRs in the repo. As this is intended to be used on public repos, the risk of
abuse seems very small as normally anyone can comment on repos. However, one
must be careful with what actions are exposed via `repository_dispatch`
events.
