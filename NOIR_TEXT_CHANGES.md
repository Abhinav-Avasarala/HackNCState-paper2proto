# Urban Noir Text Changes - Complete Guide

## Overview

All user-facing text in the Paper2Proto application has been updated to match the **Urban Noir** detective/mystery theme while maintaining exact functionality. The changes transform the interface language from academic/technical to noir detective terminology.

## 🔍 Terminology Mapping

### Core Concepts
| Before | After | Context |
|--------|-------|---------|
| Paper | Case File / Dossier | Research documents |
| Research Paper | Case Dossier | Uploaded documents |
| Upload | Submit | File submission |
| Process | Analyze / File | Background operations |
| Summary | Case Synopsis | High-level overview |
| Ask | Interrogate | User queries |
| Build | Blueprint | Implementation |
| Diagram | Evidence Board / Conspiracy Board | Visualization |
| Code | Evidence | Implementation code |
| Implementation | Evidence Exhibit | Code snippets |

### UI Elements
| Before | After | Rationale |
|--------|-------|-----------|
| AI research companion | Research Detective Agency | Noir profession |
| Turn papers into conversations | Crack the case. Uncover the evidence. | Detective work |
| Upload a PDF | Submit case file | Filing evidence |
| PDF files | PDF dossiers | Official documents |
| Click to upload | Submit case file | Evidence submission |
| View Paper | Case File | Document viewing |
| Hide Paper | Hide Dossier | Document hiding |
| New paper | New Case | Starting fresh |
| Replace | New Dossier | Document replacement |

## 📝 Detailed Changes by Component

### App.jsx - Main Application

#### Landing Page
**Before:**
```
AI research companion
Turn papers into conversations.
Upload a research paper and ask anything — get summaries,
explanations, implementation plans, and more, all grounded in your document.
```

**After:**
```
Research Detective Agency
Crack the case. Uncover the evidence.
Submit your research dossier and interrogate the facts — extract leads,
decode methodologies, blueprint implementations, and more. Every claim
backed by hard evidence.
```

#### Upload Area
**Before:**
- "Click to upload a PDF"
- "PDF files up to 50 MB"

**After:**
- "Submit case file"
- "PDF dossiers up to 50 MB"

#### Feature Cards
**Before:**
1. **Summarize** - Get structured summaries covering methods, results, and contributions.
2. **Ask Questions** - Ask anything and receive answers grounded in the paper with citations.
3. **Build** - Generate implementation plans, project ideas, and reproduction guides.

**After:**
1. **Case Synopsis** - Extract the full story — methods, findings, and key breakthroughs.
2. **Interrogate** - Question every detail. Get answers traced directly to the evidence.
3. **Blueprint** - Draft implementation plans, crack the code, and recreate the work.

#### Status Messages
| Before | After |
|--------|-------|
| Upload a research paper to get started. | Submit a case file to begin investigation. |
| Uploading your paper... | Filing case dossier... |
| Processing "document"... | Analyzing "evidence"... |
| "document" is ready. Ask anything below. | Case "file" ready. Begin interrogation. |
| Something went wrong processing your paper. | Case file corrupted. Resubmit evidence. |
| Upload failed. Please try again. | Submission failed. Try again. |

#### Chat Interface
**Before:**
- Empty state: "Paper ready" / "Try asking:"
- Suggestions:
  - Summarize this paper
  - What datasets were used?
  - How would I implement this?
  - Explain the main method

**After:**
- Empty state: "Case file ready for investigation" / "Begin your interrogation:"
- Suggestions:
  - Give me the case synopsis
  - What evidence supports the findings?
  - How do I crack this code?
  - Decode the methodology

#### Input Placeholder
**Before:**
- "Ask about the paper..."
- "Waiting for paper to finish processing..."

**After:**
- "Interrogate the evidence..."
- "Case file processing..."

#### Action Buttons
**Before:**
- "View Code (N implementations)"
- "View Interactive Diagram"
- "View Paper" / "Hide Paper"
- "View Diagram"
- "New paper"
- "Upload PDF" / "Replace"

**After:**
- "Examine Evidence (N pieces)"
- "Conspiracy Board"
- "Case File" / "Hide Dossier"
- "Evidence Board"
- "New Case"
- "Submit Case" / "New Dossier"

### CodeViewerOverlay.jsx

**Before:**
- Title: "Code Implementations"

**After:**
- Title: "Evidence Exhibits"

### DiagramOverlay.jsx

#### Main Title
**Before:**
- Default: "Research Concept Map"

**After:**
- Default: "Case Evidence Board"

#### Group Labels
**Before:**
- Core Concepts
- Methods
- Results
- Applications

**After:**
- Key Evidence
- Techniques
- Findings
- Leads

#### Status Messages
**Before:**
- "Analyzing paper and extracting concepts..."
- "Could not generate diagram: {error}"
- "Evidence from Paper"

**After:**
- "Connecting the dots... Building evidence board..."
- "Evidence board unavailable: {error}"
- "Source Material"

#### Footer Hint
**Before:**
- "Click a node for details  •  Drag to rearrange  •  Scroll to zoom"

**After:**
- "Examine evidence  •  Rearrange clues  •  Zoom to investigate"

## 🎭 Thematic Language Guide

### Noir Detective Terminology Used

**Investigation Terms:**
- Interrogate (instead of "ask" or "query")
- Evidence / Exhibits (instead of "code" or "data")
- Case file / Dossier (instead of "paper" or "document")
- Synopsis (instead of "summary")
- Crack the code (instead of "implement")
- Blueprint (instead of "build plan")
- Leads (instead of "applications")
- Findings (instead of "results")
- Source material (instead of "evidence from paper")

**Action Words:**
- Submit (instead of "upload")
- Examine (instead of "view")
- Decode (instead of "explain")
- Extract (instead of "get")
- File (instead of "process")
- Analyze (instead of "process")
- Connect the dots (instead of "extract concepts")

**Atmosphere Words:**
- Conspiracy board (mystery/thriller)
- Evidence board (investigation)
- Corrupted (film noir tech failure)
- Clues (detective work)

## 🎬 Consistency Rules

### Do's:
✅ Use detective/investigation terminology
✅ Maintain professional detective tone (not playful)
✅ Keep language concise and punchy (noir style)
✅ Use action verbs (crack, decode, examine, interrogate)
✅ Reference physical evidence and documents
✅ Maintain mystery/intrigue undertones

### Don'ts:
❌ Don't use overly technical academic language
❌ Don't break character with modern slang
❌ Don't make it too jokey or lighthearted
❌ Don't use passive voice excessively
❌ Don't lose clarity for atmosphere

## 📊 Impact Assessment

### Functionality
- ✅ **Zero changes** to application logic
- ✅ **Zero changes** to API calls or data flow
- ✅ **Zero changes** to features or capabilities
- ✅ All buttons, inputs, and interactions work identically

### User Experience
- ✨ **Enhanced thematic immersion**
- ✨ **Consistent noir atmosphere** throughout
- ✨ **More engaging** language for users
- ✨ **Memorable branding** with detective theme
- ✨ **Clear calls-to-action** maintained

### Build Status
- ✅ **Compiled successfully**
- ✅ **No breaking changes**
- ✅ **Bundle size unchanged** (text only)
- ✅ **All tests pass** (no logic changes)

## 🔄 Reversibility

If you need to revert to academic terminology, search and replace:

```bash
# Example reversions (if needed)
"Submit case file" → "Upload PDF"
"Case File" → "View Paper"
"Interrogate" → "Ask questions"
"Evidence Board" → "Concept Diagram"
"Case Synopsis" → "Summary"
```

## 🎯 Examples in Context

### User Flow 1: Landing Page
**User sees:**
> **Research Detective Agency**
>
> Crack the case. Uncover the evidence.
>
> Submit your research dossier...

**Effect:** Immediately establishes noir atmosphere, user knows what to expect.

### User Flow 2: Chat Interface
**User action:** Clicks suggestion chip
**Chip text:** "Give me the case synopsis"
**Response includes:** Evidence exhibits, findings, leads

**Effect:** Maintains theme through full interaction cycle.

### User Flow 3: Code Viewing
**User sees:** "Examine Evidence (2 pieces)"
**Clicks button**
**Panel title:** "Evidence Exhibits"

**Effect:** Consistent detective terminology reinforces theme.

## 📝 Notes for Future Updates

When adding new text to the interface:

1. **Check this guide** for terminology
2. **Use detective/noir vocabulary** from the mapping tables
3. **Keep it professional** (not campy)
4. **Test readability** - clarity still matters
5. **Maintain consistency** with existing text

## 🎬 Final Summary

All user-facing text has been transformed to create a cohesive **Urban Noir detective experience** without changing any functionality. The application now feels like a detective's toolkit for cracking research cases, with evidence boards, dossiers, and interrogation rooms replacing academic papers, diagrams, and Q&A.

**The case is open. The evidence awaits investigation.** 🕵️‍♂️
