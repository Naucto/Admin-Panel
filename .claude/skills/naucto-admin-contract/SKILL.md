---
name: naucto-admin-contract
description: Working method for following a change of the Naucto backend's admin contract in the admin console. Use when a backend branch changes what an `admin/*` route takes, answers or refuses (a field, a type, an enum value, an id, a route), when the console has to read a new kind of moderation target, a new role or a new media behind the bearer, or when asked whether the console still matches the backend.
---

# Following the backend's contract in the admin console

`AGENTS.md` at the repo root is the authority and is not repeated here. Read, before anything
else, its **Layout**, **The backend's contract**, the id, CSP and failure paragraphs of
**Conventions**, **Roles**, **Moderation** and **Before finishing**.

The one thing to hold on to: `core/types.ts` is written by hand and `ApiService.get<T>` believes
it. The compiler holds the console to `types.ts`, never `types.ts` to the backend, so the work
starts from the contract and not from what stops compiling.

## 1. Read the change in the contract

The contract is the backend's OpenAPI document, `swagger.json`. The Backend repository emits it
(`npm run generate:swagger`) and does not commit it, so the copy lying in a checkout says nothing
of the branch it was made from. Emit one per version, outside both repositories:

```sh
B=../Backend                      # the Backend checkout, beside this repository
W=<a scratch directory of your own>
for ref in <old> <new>; do        # a branch name holding a slash needs a plain folder name
  mkdir -p "$W/$ref" && git -C "$B" archive "$ref" | tar -x -C "$W/$ref"
  ln -s "$(realpath "$B")/node_modules" "$W/$ref/node_modules"
  (cd "$W/$ref" && TS_NODE_TRANSPILE_ONLY=1 npm run generate:swagger)
done
```

- `<old>` is the backend the console reads today (the README's "Run it" names it), `<new>` the
  branch that carries the change.
- The emit boots the documented routes on a stubbed environment: no database, a few seconds.
  `TS_NODE_TRANSPILE_ONLY=1` is needed because the shared `node_modules` holds the database client
  of the checkout's own branch, which another ref does not type-check against.
- Never switch branch, stash or write in the Backend checkout: someone else may be working in it.

Keep the admin routes and the schemas they reach, then compare:

```sh
cat > "$W/admin.jq" <<'EOF'
def names: [.. | objects | .["$ref"]? // empty | ltrimstr("#/components/schemas/")] | unique;
def reach($all): . as $seen
  | ($seen + [$seen[] | $all[.] | names[]] | unique) as $next
  | if $next == $seen then $seen else $next | reach($all) end;
(.paths | with_entries(select(.key | startswith("/admin")))) as $paths
| .components.schemas as $all
| { paths: $paths, schemas: ($paths | names | reach($all) | map({ key: ., value: $all[.] }) | from_entries) }
EOF
for ref in <old> <new>; do jq -S -f "$W/admin.jq" "$W/$ref/swagger.json" > "$W/$ref.json"; done

operations='.paths | to_entries[] | .key as $path | .value | keys[] | "\(.) \($path)"'
diff <(jq -r "$operations" "$W/<old>.json") <(jq -r "$operations" "$W/<new>.json")   # routes
diff <(jq -r '.schemas | keys[]' "$W/<old>.json") <(jq -r '.schemas | keys[]' "$W/<new>.json")
diff -u "$W/<old>.json" "$W/<new>.json"                                               # the rest
```

Read the whole diff and write down, per route and per schema, what changed: a type, a format
(`uuid`), what became nullable or required, an enum value, a parameter, a response. A refusal a
screen may want to answer is named in the description of its response (`409: Not suspended
(NOT_SUSPENDED)`), which is what `ApiError.code` carries.

Then set aside what the console does not read. These are the routes it calls:

```sh
grep -rhoE "['\`]/admin/[^'\`]*['\`]" src/app/core | sort -u
```

If the document cannot be emitted, read the diff of the controllers that declare an `admin/` route
and of their DTOs (`git -C "$B" grep -l "admin/" -- 'src/routes/**/*.controller.ts'`), and say in
the report that the contract was read from the source.

## 2. Mirror it where the wire is known

Only `core` knows the wire (`AGENTS.md`, Layout). In this order:

1. **`core/types.ts`**: the interface of each changed schema. It usually bears the schema's name
   without `Dto`; otherwise search for one of its fields. `nullable` is `| null`, a property
   missing from `required` is optional, a `format: uuid` is an id and a `string`, an enum is a
   union. A field that means nothing for some targets says so in its comment, in the words of
   "a target". Remove what the contract dropped: the console reads one version.
2. **The `*.api.ts` of the area**: the path, the method, the names of the query parameters and
   the body of each changed operation. A query is a plain record, so a renamed parameter still
   compiles. A new route is a new method there; a moderation decision is `operationRequest` in
   `core/moderation-format.ts` instead, and the three session routes are in `core/auth.store.ts`.
3. **`core/report-views.ts`** when `/admin/reports` changed: it is where the one report becomes a
   rating, a bug report or a crash.
4. `npm run typecheck`. Every error is a reader of what changed: fix it there, with the rules of
   `AGENTS.md` (an id is shown with `nc-short-id`, a label lives in a `Record` over its enum).

## 3. Look for what the compiler does not show

Each of these compiles whatever the contract says. Search, read every hit, and decide.

- **Route and query parameters.** They reach a page as inputs, typed by the page itself. A query
  parameter that names an id is an input with `transform: idOf`; a path parameter goes to the
  backend as it is.

  ```sh
  grep -rnE "readonly \w+ = input" src/app/features --include='*.page.ts'
  ```

- **The links that build them.** A link is an array or a record of anything.

  ```sh
  grep -rnE "queryParams|routerLink|router\.navigate|createUrlTree" src/app
  ```

- **Values kept in the browser.** `JSON.parse` answers whatever was stored, under a cast. What
  is in the old shape is left out when read and gone at the next save, never migrated
  (`AGENTS.md`, Timeline, posts and compare). A spec stores the old shape and proves the page
  reads it without an error (`hidden posts` in `core/core.spec.ts`).

  ```sh
  grep -rn "localStorage" src/app
  ```

- **Tests of a value's shape.** A conversion, a pattern or a `typeof` is ordinary code.

  ```sh
  grep -rnE "Number\(|Number\.is|numberAttribute|parseInt|typeof |Array\.isArray|\.test\(|String\(" \
    src/app --include='*.ts'
  ```

- **What is built from a value.** A `Map` key, a comparator, a `track`, a value that stands for
  "none" (`NO_RELEASE_ID`): read the hits of the field's name.
- **Lists written out by hand.** A filter that offers some values of an enum is not a `Record`,
  so a new value is missing from it in silence.

  ```sh
  grep -rnE "\{ value: '[A-Z_]+', label:" src/app
  ```

- **Paths and parameter names.** They are strings: read the `*.api.ts` of the area against the
  document.
- **Words that describe a shape.** A placeholder, a hint, an empty state, a sentence of
  `README.md` or `AGENTS.md`: search for the old word.
- **The policy of the production server.** nginx reads it, not the build: section 7.

## 4. Ids

The rule is in `AGENTS.md` (Conventions). What it asks of a change:

- An id of the contract is a `format: uuid`, a `string` in `types.ts`. It is compared for equality
  and nothing else: no order, no arithmetic, no test against zero. The compiler stops most of
  these and lets `Number(id)`, `String(id)` and an interpolation through.
- A screen shows it with `nc-short-id` (`plain` inside a link or a button), a name built in code
  with `shortId`. Never the whole id in running text, never a `#` before it.
- An id from a query parameter or from the browser goes through `idOf`. The id that names no game
  is `NO_RELEASE_ID`, never an empty string or a zero.
- A spec uses whole lower-case UUIDs, so that a fixture cannot pass where an id would not.

## 5. A new kind of moderation target

Shared code speaks of "a target"; a kind is named only in the entries below. In this order:

1. `core/types.ts`: the value in `ModerationTargetType`, its actions in `ModerationActionType`,
   any new value of `TargetState` or `TargetVisibility`, and the fields a case gains for it
   (`CaseDetail`, `CaseTarget`).
2. `core/moderation-format.ts`, one entry in each: `TARGET_TYPE_LABELS`, `TARGET_NOUNS`,
   `ACTION_LABELS`, `ACTION_TONES`, `panelRoute` (a route only if the console has a page for the
   kind, else `null`) and `CONTENT_ROOTS` (its root under `admin/moderation`). The compiler stops
   until each is there. Nothing else in the file names a kind of content: the labels of the
   operations, what they do and `operationRequest` are built from these, and tell apart `USER`
   alone, since a profile is its account.
3. `core/moderation-format.spec.ts`: its label, its noun in the sentences, hide, restore and
   delete under its own root, dismiss, an account operation reaching its owner, `panelRoute`.
4. Nothing to do for what is built from the registry: the type filters of the Queue and the Log,
   `nc-entity-link`, `nc-operation-buttons`, `ModerationActions.run`, and the header, the reports
   and the history of a case.
5. What the kind alone has: one `@if (found.target.type === '<KIND>')` block in
   `features/moderation/case.page.html`. A directory and a page of its own only if the backend
   lists the kind: then a route through `page()`, an entry in `core/nav.ts` and its `panelRoute`.
6. `features/moderation/case.page.spec.ts`, a `describe` for the kind: what it reads, no control
   that writes for a viewer, the operations the backend allowed and no other, a decision sent
   under its own root, and none of its blocks on a target of another kind.
7. The words: search for the sentences that list the kinds, by the name of one of them, and make
   them speak of what is reported.
8. `AGENTS.md`, Moderation: the kind in the list of what a flag bears on, and one paragraph on
   where it is read, what it has and what it has not.

## 6. Roles

- A new control that writes sits under `@if (auth.isAdmin())`, or `auth.canAct()` when moderators
  share it. Which operations a target offers comes from its `allowedActions`, never from the role.
- A link to somewhere that refuses a role is hidden from that role, as the way into the editor is
  from a viewer.
- The page gets a spec that draws it for a viewer (`AuthStore` provided with `canAct` and
  `isAdmin` false) and finds no such control.
- A field only some roles are given is nullable in `types.ts` and drawn only when it is there,
  as `email` is.

## 7. Media behind the bearer, and the CSP

An `<img>` or a `<video>` cannot send the bearer, so its bytes are fetched and shown through an
object URL. Follow `features/moderation/game-detail.page.ts`:

1. A method of the `*.api.ts` over `ApiService.getBlob`.
2. `objectUrl` (`ui/object-url.ts`) over that method, with an id that is `undefined` unless the
   backend says there is something to fetch (`hasCover`, `hasClip`). It makes the object URL and
   revokes it: a page writes neither.
3. In the template: the element, a skeleton while it loads, the error in words when it fails.
4. A spec: jsdom has neither `URL.createObjectURL` nor `URL.revokeObjectURL`, so it assigns both.
5. The directive of the element in `nginx/security-headers.conf` allows `blob:`
   (`img-src`, `media-src`). `src/app/layers.spec.ts` fails if it does not.

The dev server sends no policy. Only the production image refuses, so either build it, run it
on the backend or the mock of section 8 and read the browser's console on the page (a refusal
reads "violates the following Content Security Policy directive"), or report the policy as not
exercised:

```sh
docker build -t naucto-admin:<a tag of your own> .
gateway=$(docker network inspect bridge -f '{{(index .IPAM.Config 0).Gateway}}')
docker run --rm -p <free port>:80 \
  -e NAUCTO_API_URL=http://$gateway:<the port of the backend or of the mock> \
  naucto-admin:<a tag of your own>
```

The address is the host's on the Docker bridge, not a name: nginx looks the backend up through
DNS and does not read the container's `hosts` file. Remove the image when you are done.

## 8. Verify

The repository has no CI: this gate is run by hand, and all of it.

1. `npm run typecheck && npm test && npm run build`
2. `npm run format:check`, and `npm run format` if it fails.
3. Run the console on the new contract. With a backend on the branch:
   `NAUCTO_API=http://localhost:<its port> npx ng serve --port <free port>`. Port 3002 is the
   default and may be serving another tree.
4. With no backend up, a mock shaped on the document, written in your scratch directory and never
   committed: a `node:http` server that reads the new `swagger.json` and answers each `/admin`
   operation with a value built from the schema of its `200` or `201`.
   - Build the value by walking the schema: a `$ref` is followed, an `allOf` of objects is merged
     (of anything else, its first part), an `enum` gives its first value, then `example` if there
     is one, a `uuid` a real lower-case UUID, a `date-time` now, an array one item, an object its
     properties.
   - A `GET` whose answer has no JSON is bytes (a cover, a screenshot, a clip): answer a 1×1
     PNG. Anything else is a `204`.
   - `POST /admin/auth/refresh` is what the console boots on: answer the session with
     `account.role` set to the role under test.
   - Match a path without a parameter before one with (`cases/count`, `cases/{targetType}/…`).
   - A generated value has the shape and no meaning. The moderation pages, Bug reports and
     Crashes draw it as it is. The pages that chart parse days, metric names and sources and throw
     on a placeholder: write those answers by hand. Write by hand, too, the answer of the route
     you are working on, once per case that changes the screen: the kind, the state, a null
     field, an empty list, the `allowedActions` of a moderator and of an admin.
5. Look at every page the change touches, as an admin and as a viewer. The repository has no
   browser test: drive a headless browser you already have (the Frontend checkout beside this one
   has Playwright), collect page errors and console errors, count the panels offering "Try
   again", take a capture and open it.
6. Stop what you started.

A mock proves the console agrees with the document, not with the backend.

## 9. Report

- The change in the contract, route by route and schema by schema, and which backend refs were
  compared.
- What changed in the console, and the places section 3 found and left as they are, with why.
- The result of each command of the gate.
- What was exercised and against what: a real backend, a mock, nothing. Name what was not: a
  decision actually written, a role you did not sign in as, the production policy, what the site
  does with a link.
