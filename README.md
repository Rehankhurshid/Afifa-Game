# Brute Invasion

*The Battle for Mynstral Village* — a lane-defense strategy game built from the "Brute Invasion" game script.

Centuries ago, the scientist Victor Consuela created hybrid superhumans and settled them alongside ordinary humans on the island of Mynstral. Now the hybrids of Brute Cave, led by the **Insinuated Destroyer**, have declared war. Command **Lord Godwin**'s Army Chiefs and defend the Earthling Fort.

## Play

No build step, no dependencies. Either:

- open `index.html` directly in a modern browser, or
- serve the folder (recommended, e.g. `npx http-server .` or `python3 -m http.server`) and open the printed URL.

Click / tap to start — browsers only allow sound after the first interaction.

## Game flow

Splash screen → Main menu (**Play**, **Instructions**, **Characters**, **Settings**, **Exit**) → story cinematic (skippable) → Level 1 → Level 2 → Level 3 *coming soon*.

- **Win** a level to unlock the next stage with new visuals (the Brute Lair).
- **Lose** and a *Defeated* screen offers **Try Again**.

## How to play

- Pick a warrior from the portraits at the top (or press **1–4**), then tap one of the **3 lanes**.
- Warriors march out of the fort's gates and fight every beast in their lane.
- Every warrior who reaches the Brute Cave damages the enemy's health bar; every beast reaching your gates damages yours.
- Zero out the enemy's health — or have more health when the **90-second** timer ends — to win.
- **Courage** refills over time, and defeated beasts drop bonus courage.
- **Royal Volley**: when Lord Godwin's medallion glows, tap it (or press **Space**) and pick a lane to rain flaming arrows.
- **P / Esc** pauses.

### Humans

| Warrior | Cost | Role |
| --- | --- | --- |
| Commando Falco | 6 | Swordsman — strongest, can take the most blows |
| Lancer Mortt | 5 | Spearman — never misses, spears pierce a second enemy |
| Queen Thea | 3 | Archer — every 4th shot is a triple volley |
| Warrior June | 2 | Knifewoman — lightning fast, dodges 35% of attacks |

### Beasts

| Beast | Trait |
| --- | --- |
| Gryphon Keljeon | Dark Elf swordsman; stronger in darkness (Level 2) and shadow-steps attacks |
| Ruthless Ilydan | Amphibian archer; resurrects once |
| Giant Incarnated | Minotaur; enrages below half health |
| Fatty Hadog | Hammer troll; takes 40% less damage, smashes groups |
| Insinuated Destroyer | Level 2 boss — immune to bows and swords, only Warrior June's magic dagger can wound him |

## Tech

- Plain HTML5 Canvas + JavaScript (no frameworks), scaled to any screen; mouse, touch and keyboard input.
- All sound effects and music are synthesized live with the Web Audio API — there are no audio files.
- Backgrounds (fort, Brute Cave, lair, cinematic sets) are painted procedurally; characters use the artwork from the script in `assets/sprites/`.
- Settings (volume, difficulty, screen shake) and level progress are saved in `localStorage`.

```
index.html        entry point
css/style.css
js/engine.js      loop, scaling, input, scene manager, particles
js/audio.js       synthesized SFX + music sequencer
js/data.js        characters, stats, bios, levels
js/art.js         sprite drawing + procedural backgrounds
js/ui.js          buttons, panels, text helpers
js/scenes.js      splash, menu, settings, instructions, characters, results…
js/cinematic.js   story cinematic
js/battle.js      the lane battle, AI, HUD
js/main.js        bootstrap
```
