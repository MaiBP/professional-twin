# Project map

## Summary
- **Problem:** _(in one line)_
- **For whom:** _(areas and users)_
- **Solution:** _(what it is and what it does)_
- **Tools:** _(technologies, systems, third parties)_
- **Impact:** _(figures, or "pending measurement")_

## How it works

```map
{
  "direction": "LR",
  "nodes": [
    { "id": "need", "type": "person", "title": "Need", "detail": "What you told us" },
    { "id": "twin", "type": "ai", "title": "Discovery", "detail": "Questions and analysis" },
    { "id": "solution", "type": "process", "title": "Solution", "detail": "To be defined" }
  ],
  "flows": [
    { "from": "need", "to": "twin" },
    { "from": "twin", "to": "solution" }
  ]
}
```

## Components
| Component | What it does | Where it is |
|---|---|---|
