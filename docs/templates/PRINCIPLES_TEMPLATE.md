# [Product Name]: Principles

**The principles that guide every implementation decision in [Product Name].**

These are not generic software principles—they're specific to [describe what makes your product unique].

**Owner:** [Primary product owner - verify via git history]
**Contributors:** [All people who shaped principles - verify via git history]

**Last Updated:** YYYY-MM-DD

---

## Summary

[2-3 sentences describing the scope of principles: product approach, technical approach, design approach, development approach. Include mention of decision framework for AI.]

---

## Table of Contents

1. [Core Product Principles](#core-product-principles)
2. [Technical Principles](#technical-principles)
3. [Design Principles](#design-principles)
4. [Development Principles](#development-principles)
5. [Anti-Patterns](#anti-patterns)
6. [Decision Framework](#decision-framework)
7. [How to Use These Principles](#how-to-use-these-principles)

---

## Core Product Principles

These principles define what makes [Product Name] different from other products.

### 1. [Principle Name]

**What it means:** [One sentence defining the principle]

**How it guides decisions:**
- [Decision this influences] ✅
- [Decision this influences] ✅
- [Decision this prevents] ❌

**Example applications:**
- [Real example of this principle in action]
- [Another example]
- [Another example]

**Decision rule:** [One-sentence rule for when to apply this principle]

---

### 2. [Principle Name]

**What it means:** [One sentence defining the principle]

**How it guides decisions:**
- [Decision this influences] ✅
- [Decision this influences] ✅
- [Decision this prevents] ❌

**Example applications:**
- [Real example of this principle in action]
- [Another example]

**Decision rule:** [One-sentence rule for when to apply this principle]

---

[Continue for all product principles...]

---

## Technical Principles

How we actually build the system.

### 1. [Principle Name]

**What it means:** [One sentence defining the principle]

**How it guides decisions:**
- [Decision this influences] ✅
- [Decision this prevents] ❌

**Example applications:**
- [Real example]
- [Real example]

**Decision rule:** [One-sentence rule]

---

[Continue for all technical principles...]

---

## Design Principles

How the interface should feel and behave.

### 1. [Principle Name]

**What it means:** [One sentence defining the principle]

**How it guides decisions:**
- [Decision this influences] ✅
- [Decision this prevents] ❌

**Example applications:**
- [Real example]
- [Real example]

**Decision rule:** [One-sentence rule]

---

[Continue for all design principles...]

---

## Development Principles

How we work as a team building this.

### 1. [Principle Name]

**What it means:** [One sentence defining the principle]

**How it guides decisions:**
- [Decision this influences] ✅
- [Decision this prevents] ❌

**Example applications:**
- [Real example]
- [Real example]

**Decision rule:** [One-sentence rule]

---

[Continue for all development principles...]

---

## Anti-Patterns

Patterns that violate our principles and vision.

### ❌ [Anti-Pattern Name]

**Bad:** [Example of wrong approach]
**Good:** [Example of correct approach]

**Why it's bad:** Violates "[Which Principle]"

---

### ❌ [Anti-Pattern Name]

**Bad:** [Example of wrong approach]
**Good:** [Example of correct approach]

**Why it's bad:** Violates "[Which Principle]"

---

[Continue for all anti-patterns...]

---

## Decision Framework

**When AI faces choices, use these criteria:**

### Priority Hierarchy

1. **[Priority 1]** - [Explanation]
2. **[Priority 2]** - [Explanation]
3. **[Priority 3]** - [Explanation]
4. **[Priority 4]** - [Explanation]
5. **[Priority 5]** - [Explanation]

---

### Specific Decision Rules

**If considering [scenario]:**
→ [Yes/No]. [Rationale based on principles]

**If considering [scenario]:**
→ [Yes/No]. [Rationale based on principles]

**If considering [scenario]:**
→ [Yes/No]. [Rationale based on principles]

[Add decision rules for common scenarios AI will face]

---

## How to Use These Principles

### When Making Product Decisions

1. **Check against principles** - Does this align with our core principles?
2. **Apply decision framework** - What does the decision rule say?
3. **Identify conflicts** - Which principle does this violate (if any)?
4. **Justify exceptions** - Can you explain why breaking the principle is necessary?
5. **Seek simplicity** - Is there a simpler approach that aligns with principles?

### When Reviewing Code

1. **Does it support [core principle]?** ([Principle Name])
2. **Is it [core value]?** ([Principle Name])
3. **Is it [quality standard]?** ([Principle Name])
4. **Does it [requirement]?** ([Principle Name])
5. **Is it [scope check]?** ([Principle Name])

### When Adding Features

1. **Does this connect to the vision?** (Check 01-VISION.md)
2. **Does this follow our principles?** (Check this doc)
3. **What does the decision framework say?** (See above)
4. **How do we measure success?** (Check 04-SUCCESS-METRICS.md)
5. **Who are we competing with?** (Check 03-COMPETITIVE-ANALYSIS.md)

---

## Principles Evolve, Vision Doesn't

**These principles will evolve** as we learn from building and users. The vision (what we're building and why) stays stable. Principles (how we build it) improve over time.

**When principles conflict:** Vision wins. If a principle blocks achieving the vision, update the principle.

**When reality conflicts with principles:** Learn from reality. Principles should guide, not constrain learning.

---

## Related Documentation

**Vision folder (strategic context):**
- [01-VISION.md](../01-vision/01-VISION.md) - Strategic vision and positioning
- [03-COMPETITIVE-ANALYSIS.md](../01-vision/03-COMPETITIVE-ANALYSIS.md) - Market landscape
- [04-SUCCESS-METRICS.md](../01-vision/04-SUCCESS-METRICS.md) - How we measure success

**Implementation details:**
- CLAUDE.md (see project root) - Project-specific AI guidance
- [docs/README.md](../README.md) - Epic index
- [Epics]the epics directory - Feature requirements

---

## Change History

| Version | Date | Author | Changes |
|---------|------|--------|---------|
| v1.0 | YYYY-MM-DD | [Name] | Initial principles document |

**Date Format:** Always use ISO 8601 format (YYYY-MM-DD). Examples: 2025-12-15, 2025-11-20, 2025-01-05

---

## Writing Guidelines

**Purpose of Principles Document:**
- Define how you think about building (not what you build)
- Provide decision-making framework for AI (primary purpose)
- Articulate values that guide all choices
- Document anti-patterns to avoid
- Enable consistent decisions across team

**WHAT to include:**
- Product-specific principles (not generic software wisdom)
- Concrete examples of principles in action
- Explicit decision rules for common scenarios
- Anti-patterns with "bad vs good" examples
- Clear rationale for why each principle matters

**WHAT to exclude:**
- Feature specifications (those go in epics)
- Technical implementation details (those go in dev-design/)
- Strategic positioning (that goes in 01-VISION.md)
- Success metrics (those go in 04-SUCCESS-METRICS.md)

**For AI context (80%):**
- Make principles actionable (not philosophical)
- Provide explicit decision rules
- Include anti-patterns (what NOT to do is as important as what to do)
- Connect principles to vision (why this matters)

**For human readers (20%):**
- Explain rationale, not just rules
- Provide real examples
- Show how principles work together

**Test:** Can AI use these principles to make correct implementation decisions? Can a new team member understand how to think about building this product?

---

**Questions?** See docs/01-vision/02-PRINCIPLES.md for an example.
