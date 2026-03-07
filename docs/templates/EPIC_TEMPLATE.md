# Epic [Number]: [Epic Name]

**Owner:** [Primary product owner for this epic - verify via git history]
**Contributors:** [All people who built user stories - verify via git history]

<!--
Derive ownership and history from git - don't guess or assume:

Contributors by commit count:
git log --format="%an" -- <relevant-files> | sort | uniq -c | sort -rn

Full history with dates:
git log --format="%ad %an - %s" --date=short -- <relevant-files>

Example: git log --format="%an" -- "backend/src/agent/*.ts" | sort | uniq -c | sort -rn
-->

---

## 1. Summary

[2-3 sentences. What is this? Why does it matter? Who benefits?]

---

## 2. Problem

[What user problem exists today? What's broken or missing? Focus on human experience.]

---

## 3. Proposed Solution

[What are we building? What capability will users have? Describe in user terms, not technical terms.]

---

## 4. User Stories

**IMPORTANT:** Only include user stories for IMPLEMENTED features. Do NOT create user story files for future work. Epic describes future capabilities, but detailed user story files are created when ready to build.

### Implemented

| # | Story | Owner | Created | Contributors | Last Updated |
|---|-------|-------|---------|--------------|--------------|
| `[XX-01](../user-stories/XX-epic-name/XX-01-story-name.md)` | Story Name | Person | YYYY-MM-DD | - | - |
| `[XX-02](../user-stories/XX-epic-name/XX-02-story-name.md)` | Story Name | Person | YYYY-MM-DD | Person2 | YYYY-MM-DD |

**Date Format:** Always use ISO 8601 format (YYYY-MM-DD). Examples: 2025-12-15, 2025-11-20, 2025-01-05

### Future

- ⏭️ **Future capability** - What users will be able to do
- ⏭️ **Another capability** - What users will be able to do

[List future work at high level. Details defined when ready to build.]

---

## 5. Outcomes

**Success Looks Like:**
- [Outcome metric with target]
- [Outcome metric with target]

**We'll Measure:**
- [How we'll know we succeeded]

---

## 6. Dependencies

**Requires:** [What must exist first?]

**Enables:** [What does this make possible?]

**Blocks:** [What's waiting on this?]

---

## 7. Risks & Mitigations

| Risk | Impact | Probability | Strategic Response |
|------|--------|-------------|-------------------|
| [What could go wrong?] | H/M/L | H/M/L | [Product decision to address] |

---

## 8. Open Questions

- [ ] [Strategic question]
- [ ] [Product decision needed]

---

## 9. Change History

| Version | Date | Author | Changes |
|---------|------|--------|---------|
| v1.0 | YYYY-MM-DD | [Name] | Initial epic |

**Date Format:** Always use ISO 8601 format (YYYY-MM-DD). Examples: 2025-12-15, 2025-11-20, 2025-01-05

---

## Writing Guidelines

**WHAT to include:**
- User problems and needs
- Capabilities and experiences
- Outcomes and success metrics
- Strategic decisions

**WHAT to exclude:**
- Technical details (code, APIs, schemas)
- UI specifics (buttons, toolbars, components)
- Implementation mechanisms (metadata, endpoints)
- Timelines or estimates

**Test:** Can a non-technical person (CEO, investor) understand this without technical knowledge?
