---
title: Squad Themes
description: Choose a personality theme for your squad's cast of characters. Themes make agents memorable and fun to work with.
tags:
  - squads
  - customization
  - themes
---

# Squad Themes

Squad uses a **casting system** — each agent gets a persistent name from a thematic universe. Names stick across sessions and make your agents feel like real team members instead of anonymous bots.

!!! tip "Themes are cosmetic, not functional"
    The theme changes names and personality flavor, not capabilities. A "Heist Crew" Orchestrator routes work exactly the same as a "Space Mission" Commander — they just have more personality.

---

## How Casting Works

When you initialize your squad, Squad picks (or lets you pick) a **theme universe**. Each role gets a character name from that universe. Names are stored in `.squad/casting/registry.json` and persist across sessions.

```
.squad/casting/
├── policy.json      # Which universe is active
├── registry.json    # Name → role mapping
└── history.json     # Past theme usage
```

---

## Choosing a Theme

### During Setup

When you run `squad init` or `npm run squad:setup`, you'll be prompted to describe your project. Include your theme preference:

```
I'm building a sales operations toolkit. Use the [theme name] casting theme.
```

### After Setup

You can change the theme at any time by telling Squad:

```
squad > Switch to the heist crew theme
```

Or edit `.squad/casting/policy.json` directly and run `squad upgrade`.

---

## Recommended Themes for Sales Teams

Here are themes that work well for the sales/SA context. Pick one that resonates with your team culture, or describe your own — Squad supports any theme you can imagine.

### :material-movie-open: The Heist Crew

*"Every great deal is a heist. You need a mastermind, a hacker, a face, a builder, and someone who pokes holes in the plan."*

| Role | Character | Personality |
|------|-----------|-------------|
| Experience Orchestrator | **The Mastermind** | Calm, strategic, sees the whole board |
| Data & Signal Synthesizer | **The Hacker** | Data-obsessed, finds what others miss |
| Win Strategy Lead | **The Face** | Smooth, persuasive, knows the angles |
| Artifact Builder | **The Forger** | Meticulous craftsman, pixel-perfect output |
| Contrarian Coach | **The Inside Man** | Paranoid, sees every trap before it springs |
| Comms Agent | **The Driver** | Gets you in and out clean — fast and efficient |

---

### :material-rocket: Space Mission Control

*"You're launching a mission. You need a flight director, a telemetry officer, a mission specialist, an engineer, and a flight surgeon."*

| Role | Character | Personality |
|------|-----------|-------------|
| Experience Orchestrator | **Flight Director** | Decisive, coordinates all stations |
| Data & Signal Synthesizer | **Telemetry Officer** | Reads every signal, flags anomalies |
| Win Strategy Lead | **Mission Specialist** | Knows the science, picks the approach |
| Artifact Builder | **Systems Engineer** | Builds what the mission needs to succeed |
| Contrarian Coach | **Flight Surgeon** | Checks vital signs, calls no-go if needed |
| Comms Agent | **CAPCOM** | Translates between mission control and crew |

---

### :material-chef-hat: The Kitchen Brigade

*"Every great deal is a meal. You need a head chef, a sous chef, a saucier, a pastry chef, and a critic."*

| Role | Character | Personality |
|------|-----------|-------------|
| Experience Orchestrator | **Head Chef** | Runs the kitchen, sets the menu |
| Data & Signal Synthesizer | **Sous Chef** | Preps every ingredient, knows the stock |
| Win Strategy Lead | **Saucier** | Creates the signature flavor that wins |
| Artifact Builder | **Pastry Chef** | Precision work, beautiful presentation |
| Contrarian Coach | **The Critic** | Tastes everything, sends it back if it's not right |
| Comms Agent | **Maître d'** | Front of house, keeps guests informed |

---

### :material-strategy: The War Room

*"You're running a campaign. You need a general, an intelligence officer, a strategist, a quartermaster, and an inspector general."*

| Role | Character | Personality |
|------|-----------|-------------|
| Experience Orchestrator | **The General** | Commands the operation, allocates resources |
| Data & Signal Synthesizer | **Intelligence Officer** | Gathers and analyzes all signals |
| Win Strategy Lead | **Chief Strategist** | Plans the campaign, chooses the battles |
| Artifact Builder | **Quartermaster** | Supplies the troops with what they need |
| Contrarian Coach | **Inspector General** | Audits the plan, finds weaknesses |
| Comms Agent | **Adjutant** | Writes orders, dispatches briefings |

---

### :material-palette: Create Your Own

Squad supports any casting universe you can describe. Just tell it what you want:

```
squad > I want a sports coaching theme — head coach, offensive coordinator, 
        defensive coordinator, equipment manager, and film analyst
```

Or go fully custom:

```
squad > Use these exact names:
        - Aria (orchestrator)
        - Kai (data)
        - Nova (strategy)
        - Sage (builder)
        - Rex (coach)
```

---

## Theme Tips for Teams

!!! success "Best practices"

    - **Pick something your team will enjoy** — if your team loves movies, go heist crew. If they're foodies, go kitchen brigade. Fun themes increase adoption.
    - **Keep names short** — you'll be typing `@TheMastermind` or `@FlightDirector` a lot. Shorter names are faster.
    - **Stay consistent** — once you pick a theme, stick with it. Agent knowledge compounds, and renaming resets personality context.
    - **Share with your team** — commit `.squad/` to git so everyone uses the same cast.

---

## Changing Themes Later

You can switch themes without losing your agents' accumulated knowledge:

```bash
squad > Switch to the space mission theme
```

Squad will re-cast your agents with new names and personality but preserve their `history.md` (what they know about your accounts and workflows).

!!! warning "Theme changes reset personality, not knowledge"
    The agent's accumulated learnings in `history.md` are preserved. But the personality flavor in `charter.md` will be regenerated to match the new theme.

---

## What's Next?

Your squad is set up, roles are defined, and you've picked a theme. Time to put them to work!

<div class="grid cards" markdown>

-   :material-play:{ .lg .middle } __Start Working__

    ---

    Open `squad` in your terminal or use Copilot Chat to talk to your agents.

    ```bash
    squad
    ```

-   :material-book-open:{ .lg .middle } __Learn the Roles__

    ---

    Deep dive into what each role does and how to customize them.

    [:octicons-arrow-right-16: Role Details](roles.md)

</div>
