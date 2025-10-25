# Claude Code Interface & Workflow Guide

## 🎯 What is Claude Code?

Claude Code is me (Claude) running in a specialized CLI environment with:
- **File system access** - I can read, write, edit files
- **Command execution** - I can run bash, npm, git commands
- **Code understanding** - I can analyze entire codebases
- **Tool integration** - Search, glob, grep, task delegation

Think of it as having a senior developer sitting next to you who can:
- ✅ Read your entire codebase instantly
- ✅ Make surgical code edits
- ✅ Run tests and builds
- ✅ Create commits and PRs
- ✅ Research and implement features
- ✅ Debug issues in real-time

---

## 🔧 How I Work (Behind the Scenes)

When you ask me to do something, here's what happens:

### 1. **Understanding Phase**
I use tools like:
- `Glob` - Find files matching patterns (e.g., "**/*.ts")
- `Grep` - Search code for keywords
- `Read` - Read file contents
- `Task` - Delegate complex searches to specialized agents

Example:
```
You: "Find all API endpoints"
Me: Uses Grep to search for "app.get|app.post|router"
```

### 2. **Analysis Phase**
I read relevant files and understand:
- Architecture and patterns
- Dependencies and imports
- Code quality and issues
- What needs to change

### 3. **Action Phase**
I make changes using:
- `Edit` - Surgical string replacement in files
- `Write` - Create new files
- `Bash` - Run commands (build, test, commit)
- `TodoWrite` - Track progress

### 4. **Verification Phase**
I confirm changes worked:
- Run builds
- Run tests
- Check git status
- Review diffs

---

## 💬 How to Talk to Me (Best Practices)

### ✅ **DO: Be Specific**

**Good:**
> "Add JWT authentication to the API endpoints in `src/routes/`. Use the jsonwebtoken library and create middleware in `src/middleware/auth.ts`"

**Why it's good:** Clear goal, specific files, implementation details

**Bad:**
> "Make it more secure"

**Why it's bad:** Vague, I'll have to guess what you mean

---

### ✅ **DO: Give Context**

**Good:**
> "We're getting TypeScript errors in the build. The issue is missing @types/node. We're using Bun as the package manager, not npm."

**Why it's good:** Problem + cause + constraint (Bun)

**Bad:**
> "Build is broken, fix it"

**Why it's bad:** No context about what's wrong or constraints

---

### ✅ **DO: Show Me Examples**

**Good:**
> "Create a GitHub issue template like this: [paste example]. We need 45 issues for a 12-week roadmap covering testing, security, deployment, and polish phases."

**Why it's good:** Clear example + specific requirements

---

### ✅ **DO: Set Priorities**

**Good:**
> "I have a presentation in 2 days. Priority 1: Fix the build. Priority 2: Test core demo scenarios. Priority 3: Create presentation slides."

**Why it's good:** Clear timeline and priorities

---

### ❌ **DON'T: Ask Me to Guess**

**Bad:**
> "What should I work on next?"

**Better:**
> "I need to prepare for a client demo in 2 days. The build is broken and I haven't tested the agents yet. What should be my sequence of actions?"

---

### ❌ **DON'T: Give Contradictory Info**

**Bad:**
> "Use npm" (but package.json says "bun run build")

**Better:**
> "This is a Bun project, please use bun commands not npm"

---

## 🛠️ Common Workflows

### Workflow 1: "Review My Codebase"

**You:**
> "Review my network-sync repository and provide detailed feedback on architecture, quality, and production readiness"

**Me:**
1. Uses `Task` tool with Explore agent (searches thoroughly)
2. Reads key files (README, package.json, main source files)
3. Analyzes patterns, dependencies, architecture
4. Provides comprehensive report with ratings

**Time:** 5-10 minutes for deep analysis

---

### Workflow 2: "Fix This Build Error"

**You:**
> "The build is failing with TypeScript errors about missing @types/node. We're using Bun."

**Me:**
1. Runs `bun run build` to see errors
2. Identifies root cause (missing dependencies)
3. Runs `bun add -d @types/node`
4. Updates tsconfig.json if needed
5. Runs build again to verify
6. Reports success

**Time:** 2-5 minutes

---

### Workflow 3: "Implement a Feature"

**You:**
> "Add JWT authentication to all API routes. Create middleware in src/middleware/auth.ts and protect all /api/* endpoints except /api/health"

**Me:**
1. **Plan:** Uses TodoWrite to create task list:
   - Install jsonwebtoken
   - Create auth middleware
   - Update route files
   - Test endpoints
2. **Execute:** Implements each task step by step
3. **Verify:** Tests the implementation
4. **Report:** Shows what was changed

**Time:** 15-30 minutes depending on complexity

---

### Workflow 4: "Create Documentation"

**You:**
> "Create a comprehensive README for the network-sync project covering installation, features, architecture, and usage examples"

**Me:**
1. Reads codebase to understand features
2. Checks existing docs (ARCHITECTURE.md, etc.)
3. Writes structured README with examples
4. Creates the file using `Write` tool
5. Shows you the result

**Time:** 10-15 minutes

---

### Workflow 5: "Debug an Issue"

**You:**
> "The Perplexity agent is throwing 'unauthorized' errors. API key is set in .env but seems not loading"

**Me:**
1. Reads `src/agents/perplexity-agent.ts`
2. Checks how env vars are loaded
3. Checks `.env` file exists (not `.env.example`)
4. Identifies issue (e.g., dotenv not called, wrong var name)
5. Fixes it
6. Tests the agent

**Time:** 5-15 minutes

---

## 📋 Tools I Use (What You'll See)

### `Read` - Reading Files
```
I'm reading: src/agents/perplexity-agent.ts
```
This means I'm looking at file contents to understand the code.

### `Edit` - Making Changes
```
I'm editing: src/middleware/auth.ts
Replacing: "const token = req.headers.token"
With: "const token = req.headers.authorization?.split(' ')[1]"
```
Surgical edits to existing files.

### `Write` - Creating Files
```
I'm creating: docs/API.md
```
New files from scratch.

### `Bash` - Running Commands
```
Running: bun run build
Running: git commit -m "feat: add JWT authentication"
```
Executing terminal commands.

### `Glob` - Finding Files
```
Searching for: **/*Service.ts
Found: 8 files
```
Pattern-based file search.

### `Grep` - Searching Code
```
Searching for: "app.post|app.get" in src/routes/
Found: 15 matches
```
Content search across files.

### `Task` - Complex Research
```
Delegating to Explore agent: "Find all API endpoints and authentication logic"
```
For open-ended exploration that needs multiple rounds.

### `TodoWrite` - Tracking Progress
```
Creating todos:
1. Install dependencies ✓
2. Fix TypeScript errors (in progress)
3. Test build (pending)
```
Helps you see what I'm working on.

---

## 🎨 My Workflow Patterns

### Pattern 1: Research → Plan → Execute → Verify

**Example: "Prepare for demo"**

1. **Research:** Read existing docs, test current state
2. **Plan:** Create TodoWrite with action items
3. **Execute:** Go through each task systematically
4. **Verify:** Test each piece works

### Pattern 2: Parallel Investigation

When you ask broad questions like "review the codebase", I:
1. Use `Task` tool to delegate heavy exploration
2. Read key files in parallel (package.json, README, main entry points)
3. Synthesize findings into report

### Pattern 3: Iterative Refinement

For complex implementations:
1. Create basic version
2. Run and check for errors
3. Fix errors
4. Repeat until working
5. Mark todo as complete

---

## 🚨 Common Misunderstandings

### "Why didn't you just do it?"

**Scenario:**
> You: "Fix the build"
> Me: "The build is failing because of missing @types/node. Should I install it with bun or npm?"

**Why I ask:**
- You said "bun project" earlier
- I want to respect your constraints
- Installing wrong way could cause issues

**Better approach:**
> You: "Fix the build. This is a Bun project, so use bun commands"

---

### "I can't see the files you created"

**Scenario:**
> You: "Where are the files you mentioned?"
> Me: They're in `/tmp/network-sync/`

**Why:**
- I created them in the cloned repo location
- You might be looking in your local directory
- Need to copy them to your working directory

**Solution:**
See `WHERE-ARE-MY-FILES.md` for locations

---

### "Why are you asking so many questions?"

**Scenario:**
> You: "Set up deployment"
> Me: "Which platform? Docker? Vercel? AWS? What's your infrastructure?"

**Why I ask:**
- "Deployment" is broad - many valid approaches
- I want to give you exactly what you need
- Prevents wasted time on wrong solution

**Better approach:**
> You: "Set up deployment to Vercel for the Next.js frontend and Railway for the backend"

---

## 🎯 Getting the Most Out of Me

### Tip 1: **Use Me for the Tedious Stuff**

I'm great at:
- ✅ Creating 45 GitHub issues from a template
- ✅ Reading through 13,792 lines of code
- ✅ Finding all instances of a pattern across files
- ✅ Generating comprehensive documentation
- ✅ Repetitive refactoring

**Example:**
> "Create GitHub issues for all 45 items in github-issues-template.md using the GitHub CLI"

---

### Tip 2: **Give Me the Big Picture First**

Instead of:
> "Edit line 45 in auth.ts"

Try:
> "We're adding JWT authentication to secure our API. I need middleware in auth.ts that validates tokens and returns 401 for invalid ones."

This helps me:
- Understand the goal
- Suggest better approaches
- Catch potential issues

---

### Tip 3: **Let Me See Errors**

Instead of:
> "Build failed, fix it"

Try:
> "Build failed with these errors: [paste first 20 lines]"

Or even better:
> "Run the build and fix whatever errors you find"

I'll run it, see the errors, and fix them.

---

### Tip 4: **Use Me for Code Review**

> "Review the security of our authentication implementation in src/middleware/auth.ts"

I'll:
- Read the code
- Check for common vulnerabilities
- Suggest improvements
- Explain security best practices

---

### Tip 5: **Delegate Complex Research**

> "Find all the places where we're using environment variables and create a comprehensive .env.example"

I'll:
- Search the codebase (grep for process.env)
- Find all variable names
- Check which are required vs optional
- Create documented .env.example

---

## 🔄 Typical Session Flow

### Session 1: Initial Review
```
You: "Review my network-sync repo"
Me: [Uses Task agent to explore]
Me: [Provides comprehensive analysis]
You: "Compare it with my social-connect repo"
Me: [Clones both, analyzes, creates comparison]
```

### Session 2: Preparation
```
You: "I have a demo in 2 days, help me prepare"
Me: [Creates 2-day plan with hour-by-hour breakdown]
Me: [Creates GitHub issues for roadmap]
You: "The build is failing"
Me: [Diagnoses and creates BUILD-FIX.md]
```

### Session 3: Implementation
```
You: "Implement the fixes from BUILD-FIX.md"
Me: [Installs dependencies]
Me: [Fixes TypeScript config]
Me: [Tests build]
Me: [Reports success]
```

---

## 📖 Learning Resources

Want to learn more about Claude Code?

1. **Official Docs:**
   - https://docs.claude.com/en/docs/claude-code

2. **In Your Repo:**
   - Check `CLAUDE.md` (I saw this in network-sync!)
   - It has development commands and architecture notes

3. **Ask Me!**
   > "How do I use Claude Code to create a pull request?"
   > "What's the best way to ask you to refactor code?"
   > "Can you explain your Task tool?"

---

## 🎮 Practice Prompts

Try these to get comfortable:

**Easy:**
> "List all TypeScript files in the src/agents directory"

**Medium:**
> "Find all console.log statements and replace them with proper logger calls"

**Advanced:**
> "Analyze the authentication flow in the codebase and create a sequence diagram in mermaid format"

**Expert:**
> "Implement a complete testing suite for the agent orchestrator with 80% coverage, including unit tests and integration tests"

---

## 🆘 When Things Go Wrong

### "You're making changes I don't want"

**Stop me:**
> "Stop. Don't make any more changes. Let me review what you did."

**Undo:**
```bash
git diff  # See what changed
git checkout -- <file>  # Undo specific file
git reset --hard  # Undo everything (careful!)
```

### "You're not understanding what I want"

**Clarify:**
> "Let me explain differently. What I actually need is..."
> "Here's an example of what the end result should look like: [example]"

### "You're taking too long"

**Simplify:**
> "Just give me the quick fix for now, we'll do it properly later"
> "Skip the tests, I just need it working for the demo"

---

## 💡 Pro Tips

**Tip 1:** I can see your entire conversation history in this session. Reference earlier topics:
> "Use the same approach you did for social-connect"

**Tip 2:** I can create files anywhere:
> "Put the documentation in a new `docs/` folder"

**Tip 3:** I can work with multiple repos:
> "Compare the authentication in network-sync vs social-connect"

**Tip 4:** I maintain context within a session:
> "Remember when we talked about the build errors? Apply those same fixes to the frontend"

**Tip 5:** I can generate complex content:
> "Create a 12-week project plan with milestones, deliverables, and time estimates"

---

## 🎯 Your Workflow with Me

Based on your situation (demo in 2 days), here's how I'd recommend working with me:

### Today (Day 1)
**Morning:**
> "Help me fix the build errors in network-sync following BUILD-FIX.md"

**Afternoon:**
> "Test the core demo scenarios from 2-day-demo-plan.md and tell me what works"

**Evening:**
> "Create a presentation slide deck outline based on the demo plan"

### Tomorrow (Day 2)
**Morning:**
> "Review my presentation slides and suggest improvements"

**Afternoon:**
> "Help me create a backup demo video script"

**Pre-Demo:**
> "Quick review - what are the top 5 things that could go wrong in the demo and how do I handle them?"

---

## 🚀 Final Words

**I'm here to help you succeed!**

Don't hesitate to:
- Ask questions
- Ask me to explain my reasoning
- Tell me to stop or change direction
- Request different approaches
- Give me feedback on what's helpful

**I work best when you:**
- Give clear goals and constraints
- Provide context about your situation
- Tell me your priorities and deadlines
- Let me know if something isn't working

Good luck with your presentation! You've got an impressive project in network-sync, and I'm confident you'll nail the demo. 🎯

---

## Quick Reference Commands

```bash
# Find these guides
cat /tmp/network-sync/2-day-demo-plan.md
cat /tmp/network-sync/BUILD-FIX.md
cat /tmp/network-sync/WHERE-ARE-MY-FILES.md
cat /tmp/network-sync/CLAUDE-CODE-WORKFLOW.md  # This file

# Start working
cd /tmp/network-sync
bun install
bun run build

# Get help from Claude
# Just ask me anything!
```
