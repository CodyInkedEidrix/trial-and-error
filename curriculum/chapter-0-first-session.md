# Chapter 0 — First Session

*Welcome to Trial and Error. This is chapter zero — the before-you-build chapter. By the end of it, you'll have everything installed, a fresh empty project on the internet, and Claude Code open and ready to work. Total time: about 30 minutes if you've never done any of this. Less if you've touched some of it before.*

---

## What you're learning

Three things:
1. What Claude Code is and how to get it running
2. What GitHub is and how to make a project "live" somewhere other than your computer
3. How to connect those two things so they talk to each other

You're not writing any code in this chapter. You're setting up the workshop so you can build in it.

---

## What you're building

Nothing yet. You're setting up your tools. Think of this chapter like unpacking a new toolbox before starting a project.

By the end of this chapter, you'll have:
- Claude Code Desktop installed and signed in
- A free GitHub account
- An empty project called `trial-and-error` that lives on GitHub
- A copy of that same project on your computer
- Claude Code open and pointed at it, waiting for instructions

---

## What files matter

None yet. The project is intentionally empty. We'll create files in Chapter 1.

---

## Plain English glossary for this chapter

A few words that will come up. Don't worry about memorizing them — you'll see them so many times they become automatic.

- **Repo** — short for "repository." A project folder that has version history built in. Like a regular folder but it remembers every change you've ever made and can roll any of them back.
- **GitHub** — a website that hosts repos on the internet. Think of it like Google Drive, but for code projects, with a ton of extra features for tracking changes and collaborating.
- **Clone** — making a copy of a GitHub repo onto your computer. Your laptop and GitHub now each have a copy, and they stay in sync when you tell them to.
- **Terminal** — a window where you type commands instead of clicking buttons. Looks intimidating; isn't. We barely use it.
- **Claude Code** — an AI coding assistant that runs on your computer and can build software by talking to it in English. This is the thing that's going to write most of your code for you.

---

## Step 1 — Install Claude Code Desktop

1. Go to [claude.com](https://claude.com) in your browser.
2. Sign in or create an Anthropic account (Pro or Max plan required for Claude Code — if you don't have one yet, sign up for Pro, it's the cheapest option that works).
3. Download Claude Code Desktop for your operating system (Mac or Windows).
4. Install it like any other app.
5. Open it. Sign in with your Anthropic account.

**Success looks like:** Claude Code Desktop is open on your computer, you're signed in, and you see a welcome screen.

---

## Step 2 — Create a GitHub account

If you already have one, skip to Step 3.

1. Go to [github.com](https://github.com).
2. Click "Sign up."
3. Use a real email you check. Pick a username you don't mind being public — this username shows up in URLs.
4. Verify your email when the confirmation arrives.

**Success looks like:** You can log in to github.com and see a blank dashboard.

---

## Step 3 — Create the `trial-and-error` repo on GitHub

This is the "project folder on the internet" we're going to build inside of.

1. Log in to github.com.
2. Click the green **"New"** button on the left side (or go to [github.com/new](https://github.com/new)).
3. **Repository name:** `trial-and-error`
4. **Description:** `Learning to build with Claude Code, one chapter at a time.` (optional)
5. **Visibility:** Public (so we can share it later)
6. **Initialize this repository with:** Leave all three boxes UNCHECKED. We want it completely empty.
7. Click **Create repository**.

You'll land on a page that says "Quick setup — if you've done this kind of thing before." That's where we're heading next.

**Success looks like:** A page on github.com showing your new empty `trial-and-error` repo. The URL is `https://github.com/YOUR-USERNAME/trial-and-error`.

---

## Step 4 — Get the repo onto your computer

Now we need a copy of the (empty) repo on your local machine, so Claude Code has somewhere to build things.

**Easiest way: let Claude Code do it.**

1. Open Claude Code Desktop.
2. You'll see a "New session" or "Start" option. Click it.
3. In the chat input, paste this prompt (replace `YOUR-USERNAME` with your actual GitHub username):

```
I'm a complete beginner. I just created an empty GitHub repo at https://github.com/YOUR-USERNAME/trial-and-error. Help me clone it to my computer into a sensible location (like my home directory). Then open the cloned folder as the active project in this session. Walk me through any steps I need to do manually, one at a time. Don't assume I know any terminal commands — explain each one.
```

4. Claude Code will walk you through it. You might need to install Git if it's not already on your machine — Claude Code will tell you if that's the case and give you the link.
5. When it's done, Claude Code is "looking at" your new empty project folder.

**Success looks like:** Claude Code says something like "Done — you're now on `main` in `trial-and-error`, working tree clean." You've got a project on your computer and Claude Code is pointed at it.

---

## Step 5 — Say hello

Let's confirm everything works. Paste this prompt into Claude Code:

```
Confirm you can see this project. Tell me: what folder is it in on my computer, what branch am I on, and is the folder currently empty? Keep the answer short.
```

You should get back something like: *"Project is at ~/code/trial-and-error, you're on branch `main`, and yes it's empty except for the `.git` folder."*

That's it. You're ready for Chapter 1.

---

## What success looks like

At the end of this chapter you have:
- Claude Code Desktop open and working
- A GitHub account
- An empty repo on GitHub called `trial-and-error`
- A copy of it on your computer
- Claude Code confirming it can see the project

If all five are true, you're done. Check it off in `curriculum/PROGRESS.md` (which will exist after Chapter 1 — don't worry about it yet).

---

## If something broke

- **"I can't install Claude Code"** — check you have an active Pro or Max subscription. Free accounts don't get Claude Code.
- **"git is not recognized"** — you need to install Git. On Mac, open Terminal and type `git --version`, it'll offer to install. On Windows, go to [git-scm.com](https://git-scm.com) and download.
- **"I cloned the repo but Claude Code doesn't see it"** — in Claude Code, look for an "Open folder" option and navigate to where you cloned it.
- **Anything else** — tell Claude Code exactly what you're seeing. Copy-paste error messages. It's good at diagnosing.

Don't struggle more than 15 minutes on any one problem. Ask for help. That's what the tool is for.

---

## Next up

**Chapter 1 — Hello World.** You'll create your first real files and see something on screen.
