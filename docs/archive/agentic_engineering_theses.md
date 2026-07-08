# The Theses of Agentic Engineering: A Deep Dive into Matt Pocock's Workflow

This document outlines and expands upon the core architectural and philosophical theses of **Agentic Engineering** as discussed by Matt Pocock and David Ondrej. These principles redefine the relationship between software engineers and artificial intelligence, shifting the paradigm from simple AI-assisted typing to full-scale orchestration.

---

## Thesis 1: AI Has Eaten Tactical Programming; Success Demands Strategic Engineering

### Tactical Programming vs. Strategic Programming
Borrowing a distinction from John Ousterhout’s *Philosophy of Software Design*, programming is split into two layers:
* **Tactical Programming:** The day-to-day writing of syntax, finding local bugs, messing about with configurations, and assembling basic components.
* **Strategic Programming:** Designing long-term codebase health, organizing macro-architecture, structuring clean boundaries between systems, and optimizing overall velocity.

### The Agentic Shift
AI is faster, cheaper, and increasingly more reliable at **tactical programming** than humans. Trying to compete with an infinite fleet of automated tactical developers on purely syntactic metrics is a losing game. The modern engineer's competitive edge lies completely in **strategic programming**—acting as the "general" orchestrating the fleet.

---

## Thesis 2: The "Harness" Matters More Than the Model

### Engine vs. Chassis
The tech community frequently falls prey to model hype, obsessing over individual paradigm shifts in raw model capabilities (e.g., Anthropic’s Fable, Claude Opus, GPT upgrades). In agentic workflows, the model is simply the engine of a Formula 1 car. 

```
┌────────────────────────────────────────────────────────┐
│                   THE AGENT HARNESS                    │
│                                                        │
│  ┌──────────────────┐  ┌────────────────────────────┐  │
│  │   Prompt Specs   │  │   Execution Environment    │  │
│  └──────────────────┘  └────────────────────────────┘  │
│  ┌──────────────────┐  ┌────────────────────────────┐  │
│  │ Standardized Skills│  │ Architectural Guardrails   │  │
│  └──────────────────┘  └────────────────────────────┘  │
└───────────────────────────┬────────────────────────────┘
                            │ Drives/Steers
                            ▼
                  ┌──────────────────┐
                  │ Raw LLM Engine   │
                  └──────────────────┘
```

The **Harness** represents everything you build *around* the model:
1.  **Prompt Specifications & Standardized Skills**
2.  **The Execution Environment (e.g., isolated sandboxes)**
3.  **Codebase Architecture & Testing Guardrails**

### Minimizing Token Friction
A highly structured, clean codebase with isolated modules enables you to get world-class performance out of cheaper, lower-tier models. If the codebase architecture is confusing or lacks guardrails, even the smartest model will waste infinite tokens "banging its head against the wall."

---

## Thesis 3: Shift from Human-in-the-Loop to Queue-Based AFK Workflows

### The Trap of Interactive Hand-Holding
The standard developer experience with AI tools involves constant interactive prompting—submitting a block of code, waiting, reading an error, approving a file write, and repeating. This keeps the human bound to the keyboard.

### Queue-Based Engineering (AFK)
True agentic scale is achieved by working **AFK (Away From Keyboard)**. Instead of interactive chat loops, development should be structured around a **Queue of Scoped Tasks**.

```
  Incoming Bugs/Issues
          │
          ▼
   ┌─────────────┐
   │ Task Triage │ (Human scopes the boundaries)
   └──────┬──────┘
          │
          ▼
   ┌─────────────┐
   │ Task Queue  │
   └──────┬──────┘
          ├───────────────────────────────┐
          ▼                               ▼
┌──────────────────┐            ┌──────────────────┐
│ Sandbox Agent 1  │ (AFK)      │ Sandbox Agent 2  │ (AFK)
└─────────┬────────┘            └─────────┬────────┘
          │                             │
          └───────────────┬─────────────┘
                          ▼
                  ┌──────────────┐
                  │ Human Gate/  │ (Single-click code review)
                  │ Verification │
                  └──────────────┘
```

* **Isolation:** Spin up autonomous agents inside dedicated execution environments (like Docker containers via tools such as *Sand Castle*).
* **Asynchronous Parallelism:** The engineer assigns various labels (e.g., `agent:implement`) to issues, allowing several sandbox environments to run simultaneously. 
* **Human as the Gatekeeper:** The human returns to a rich Pull Request (PR) containing the code change, verification logs, and automated tests, turning continuous labor into single-click verification.

---

## Thesis 4: Stateful Skills Transform Generic LLMs into Great Teachers

### Stateless vs. Stateful Inputs
* **Stateless Prompts/Skills:** Every interaction requires sending the same base conditions. The model has no persistent memory of the workspace across system updates.
* **Stateful Skills:** Interactive loops that read and write persistent state inside the local workspace (e.g., tracking a user's intent in `mission.md` or recording past test results).

### Zone of Proximal Development (ZPD)
By logging a user's current knowledge baseline and long-term project requirements in text files inside the working folder, an agent can dynamically build custom educational tracks (e.g., generating tailored HTML lessons, interactive syntax cheat sheets, and adversarial code quizzes). The education becomes perfectly personalized because it adapts structurally to what the project needs next.

---

## Thesis 5: Prefer Explicit Procedures Over Passive Abilities

### Context Window Leakage
Many agent implementations leak the text descriptions of dozens of available tools, plugins, or Model Context Protocol (MCP) servers directly into the base context window on every turn. This creates **context bloat**, driving up costs and degrading model reasoning quality.

### Action Steps
* **Abilities:** Allowing the model to autonomously choose when to pick an abstract behavior out of a massive list. 
* **Procedures (Preferred):** Explicit, short instructions explicitly invoked by the developer to transform the agent's behavior for a specific task (e.g., running a `grill-me` script to switch the agent into an adversarial interviewer for architectural design reviews). Explicit execution keeps the context window clean and leaves the human explicitly in control of the steering wheel.

---

## Thesis 6: Prioritize Agent Experience (AX) Alongside Developer Experience (DX)

For decades, teams optimized **Developer Experience (DX)**—making environments comfortable, readable, and interactive for humans. In the agentic era, codebases must intentionally optimize for **Agent Experience (AX)**.

| Focus Area | Good Developer Experience (DX) | Good Agent Experience (AX) |
| :--- | :--- | :--- |
| **Documentation** | Multi-page deep dives and tutorials. | High-density architectural markdown files mapping interfaces. |
| **Testing** | Readable assertions, clear visual console logs. | Bulletproof automated test suites that catch regressions instantly in isolated sandboxes. |
| **Architecture** | Subjective stylistic patterns. | Decoupled, predictable boundaries; strict typed interfaces. |

If an agent is running a script to build features autonomously, it relies entirely on the AX of your codebase. A system built with excellent AX allows the agent to self-verify its work before ever handing it back to a human.

---

## Thesis 7: AI Is a Force Multiplier for Skill, Not a Subsitute for It

### The Multiplier Phenomenon
AI tools do not flatten the playing field entirely; they act as a multiplier ($M$) for a developer's foundational capability ($C$).

$$	ext{Total Value Output} = C 	imes M$$

* If a developer possesses low strategic capability, the multiplier yields limited, poorly structured codebases.
* If a senior developer possesses elite architectural vision, the multiplier allows them to direct a massive virtual workforce to achieve a 10x output boost.

Your domain knowledge, grasp of structural design patterns, and systemic wisdom remain the absolute ceiling of what your AI agents can execute.

---

## Summary Action Plan for Engineers

1.  **Strip Away the Bloat:** Delete over-engineered configuration files, excessive system instructions, and passive tools. Return the agent to a clean, blank slate.
2.  **Observe Raw Behavior:** Run the agent uninhibited to map out exactly where it naturally breaks or fails.
3.  **Build Precise Procedures:** Create atomic, user-triggered markdown instructions and tool boundaries only for the tasks you explicitly need to automate.
4.  **Enforce Codebase Rigor:** Treat every unexpected agent mistake as a symptom of architectural weakness in your project—fix the codebase interfaces rather than endlessly patching your prompts.