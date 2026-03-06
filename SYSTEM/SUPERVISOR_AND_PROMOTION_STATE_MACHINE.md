
# 5. Supervisor / promotion state machine

This is the core self-upgrade mechanism.

---

## 5.1 Entities

There are two major entities:

* `RuntimeInstance`
* `RuntimeVersion`

### RuntimeVersion

A versioned candidate or active build of Evolvo tied to a commit.

### RuntimeInstance

A running process of a given runtime version.

---

## 5.2 Runtime version states

```ts
export type RuntimeVersionState =
  | "discovered"
  | "candidate"
  | "validating"
  | "shadow"
  | "promotable"
  | "active"
  | "rejected"
  | "rolled-back"
  | "archived";
```

---

## 5.3 Runtime instance states

```ts
export type RuntimeInstanceState =
  | "starting"
  | "healthy"
  | "degraded"
  | "stopped"
  | "failed";
```

---

## 5.4 Promotion state machine

## State: `discovered`

Meaning:
a new commit/version that could affect runtime behaviour has been noticed.

Entry trigger:

* merge to `main`
* PR merged with `kind:upgrade`, `kind:mutation`, or a surface affecting runtime behaviour

Transitions:

* to `candidate` if eligible for validation
* to `archived` if no promotion relevance

---

## State: `candidate`

Meaning:
version is registered as a potential runtime candidate.

Actions:

* create runtime version record
* associate source issue/PR/mutation
* schedule validation

Transitions:

* to `validating`

---

## State: `validating`

Meaning:
candidate is being assessed before activation.

Actions:

* boot candidate in isolated mode
* run startup health checks
* run required benchmark/evaluation pack
* collect promotion evidence

Transitions:

* to `shadow` if candidate needs comparative runtime observation
* to `promotable` if validation is sufficient
* to `rejected` if validation fails badly

---

## State: `shadow`

Meaning:
candidate runtime is running non-authoritatively.

Actions:

* read GitHub and internal state
* make decisions without authoritative writes
* compare its choices to the active runtime
* record divergence and health

Transitions:

* to `promotable` if shadow results acceptable
* to `rejected` if shadow results poor
* to `rolled-back` if shadow run crashes badly

---

## State: `promotable`

Meaning:
candidate has enough evidence to become active.

Actions:

* supervisor requests promotion decision
* promotion decision recorded

Transitions:

* to `active` if promoted
* to `rejected` if not promoted
* back to `shadow` if more evidence required

---

## State: `active`

Meaning:
this is the leader runtime version.

Actions:

* authoritative GitHub writes
* issue selection and execution
* mutation generation
* normal operation

Transitions:

* old active becomes `archived` when replaced
* candidate can become `rolled-back` if activation fails immediately

---

## State: `rejected`

Meaning:
candidate is not promoted.

Actions:

* record why
* link to mutation or upgrade issue
* possibly generate follow-up mutation issue

Transitions:

* usually terminal, later `archived`

---

## State: `rolled-back`

Meaning:
candidate was promoted or nearly promoted and had to be reversed.

Actions:

* restore prior active runtime
* record promotion failure event
* narrate failure
* likely open mutation/failure issue

Transitions:

* to `archived`

---

## State: `archived`

Meaning:
historical record only.

---

## 5.5 Promotion decision rules

A candidate may be promoted if:

* boot health checks pass
* required benchmark pack passes within acceptable regression limits
* no fatal orchestration errors are observed
* shadow divergence is acceptable when shadow mode is used
* supervisor can safely stop old instance and activate new one

A candidate should be rejected or shadowed if:

* boot is healthy but behavioural confidence is low
* benchmarks are mixed
* major routing/evaluator changes need more evidence

A candidate must be rolled back if:

* activated instance becomes unhealthy
* authoritative writes fail dangerously
* repeated crash loop detected
* core issue loop becomes non-functional

---

## 5.6 Supervisor transition diagram in compact form

```txt
discovered
  -> candidate
candidate
  -> validating
validating
  -> shadow
  -> promotable
  -> rejected
shadow
  -> promotable
  -> rejected
  -> rolled-back
promotable
  -> active
  -> rejected
  -> shadow
active
  -> archived (when superseded)
rejected
  -> archived
rolled-back
  -> archived
```

---

## 5.7 Supervisor operational rules

* exactly one active leader runtime at a time
* shadow runtime must not perform authoritative writes
* promotion must be an explicit supervisor action
* rollback target should be the last healthy active runtime
* all promotions and rollbacks must be recorded in DB
* important promotion events should be posted to linked issue/PR where applicable