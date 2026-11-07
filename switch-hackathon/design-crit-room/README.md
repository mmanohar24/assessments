# Design Crit Room

A Slack channel where AI agents review a web page, fix the problems I approve, and then check their own work. I stay in charge the whole time.

I built this for the Flip the Switch Hackathon (WeMakeDevs x DevTools Academy x Switch), for the Best Business Workflow track.

**Demo video:** https://www.youtube.com/watch?v=vJ2tH7joxtk

---

## Why I built this

I'm a product designer, and design review always breaks in the same spot for me.

I look at a screen, find the problems, write them down, and send them to a developer. Then I wait. A few days later it comes back, and half of it isn't fixed, or it got fixed in a way I didn't mean.

There are AI tools that review designs, but most of them live inside Figma and only talk to the designer. The PM and the developer aren't part of it. And the feedback still ends up as a list that someone has to turn into actual work.

I wanted the review to happen where the team already talks, and I wanted it to end with fixed code, not just a list.

## How it works

There's one Slack channel with two AI agents and me in it.

| Who | Runs on | What it does | Can it change code? |
|---|---|---|---|
| `@design-critic` | Claude Code | Reviews the page for accessibility, usability and consistency. Ranks the problems. Checks the fixes after. | No. I blocked its Write and Edit tools in Switch. |
| `@ui-builder` | Codex | Fixes only the things I said yes to. Saves a copy of the old files first. Tells us what it changed. | Yes, but only in this project folder |
| Me | Slack | Asks for the review, picks what to fix, answers design questions, signs off | |

Here's what a run looks like:

```
Me:            @design-critic please review the Pulse booking page
design-critic: 1. Focus outline is turned off everywhere (High) ...
               2. Gray text is too light, 2.3 to 1 contrast (High) ...
               ...
               Reply with the numbers you want fixed.
Me:            @design-critic approve 1, 2, 4
design-critic: @ui-builder please fix these: ...     (only the ones I approved)
ui-builder:    Done. Here's what I changed in styles.css ... I saved a copy of the old files.
               @design-critic can you check it?
design-critic: 1 Fixed (outline is back), 2 Fixed (now 7 to 1), 4 Fixed
Me:            Looks good, signed off.
```

Two agents from two different companies pass work back and forth in one thread, and nothing changes unless I say yes.

## How it went

In my test run, the critic found **15 of the 16 problems I hid in the page on purpose**. It also found **2 real problems I didn't plant**: the input borders were almost invisible, and the menu icon showed up next to the full menu on desktop. Its contrast numbers matched my own math.

The whole loop took about 7 minutes. One moment I really liked: one of the classes on the page was full, and the agents weren't sure what its button should say. So they stopped and asked me, A) "Class full" or B) "Join waitlist", instead of guessing. I picked B.

## Where Switch comes in

This project doesn't work without Switch. Here's what it gives me:

- **The room.** The Slack channel is the room. Me and both agents see the same thread and the same context.
- **Handing off work.** The critic tags `@ui-builder` by name and Switch delivers the task. The builder hands it back the same way.
- **Room rules.** Every agent that joins reads the same instructions: wait for approval, ask when there's a design choice, stay in the project folder.
- **Permissions.** The critic really can't edit files. And the agents only answer me and each other.
- **Different agents together.** Claude Code and Codex run side by side on my laptop through Switch Console. Slack connects with Socket Mode, so I didn't need a public URL.

## The demo page

`demo-app/` is a booking page for **Pulse Studio**, a fitness studio I made up. I built it with problems on purpose: text that's too light, form fields with no labels, three different "Book" buttons, a fake button made from a div, no focus outline, and more. The full list is in `docs/planted-issues.md`, so you can check the critic's work against it.

After a run, `demo-app/before/` has the old version, so you can open both and compare.

## Try it yourself

You'll need: a Mac (I used an M3), Docker Desktop, [Switch Console](https://docs.switchagents.ai/switch-rooms/getting-started/install-switch-console.md), Claude Code and Codex both signed in, and a Slack workspace where you can add your own app.

1. **Start Switch.** Open Switch Console, pick *On this computer*, then *Start*.
2. **Connect Slack.** Make a Slack app from `setup/slack-app-manifest.json`. Create the `xapp-` token (with `connections:write`), install the app, and copy the `xoxb-` token. In Switch Console go to Home, then Connect, then Slack, paste both, and link your Slack account.
3. **Add the two agents** in Switch Console (Your Agents, then +):
   - `design-critic`: Claude Code, folder = this repo, instructions from `agents/design-critic.md`, and put `Write, Edit` under **Disallowed tools**
   - `ui-builder`: Codex, folder = this repo, instructions from `agents/ui-builder.md`
4. **Make the room.** Your Rooms, then Create room, pick Slack, name it `design-crit`, add both agents, and paste in `room/room-instructions.md`.
5. In the Slack channel, type: `@design-critic please review the Pulse booking page`

One thing that tripped me up: agents only answer messages that start with their name. If you just type "approve 1, 2", nothing happens. You need `@design-critic approve 1, 2`. I actually like this, because the agents never jump into a conversation on their own.

To start over: copy the files in `demo-app/before/` back into `demo-app/`, delete the `before` folder, and type `/reset-all-agents` in the channel.

## What's in here

```
agents/design-critic.md         instructions and settings for the critic
agents/ui-builder.md            instructions and settings for the builder
room/room-instructions.md       the rules for the room
demo-app/                       the Pulse page (plain HTML and CSS)
demo-app/before/                the old version, made by ui-builder
docs/planted-issues.md          the list of problems I hid in the page
setup/slack-app-manifest.json   the Slack app setup, from the Switch docs
```

## What I'd add next

- Review a live website or a Figma frame, not just local files
- A third agent that writes up the change and opens a pull request
- Before and after screenshots posted right in the thread
- Let the critic check against the team's own design system
- An extra "polish" pass for visual design, maybe with [unslop](https://github.com/heydamir/unslop)

## Built with

[Switch](https://github.com/sandbox-quantum/switch), Claude Code, Codex and Slack.

Made by Manoj Venkatesun Manoharan, product designer.
