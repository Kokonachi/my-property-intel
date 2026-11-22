# Galaxy / Uiverse attribution

These UI elements are vendored from the [uiverse-io/galaxy](https://github.com/uiverse-io/galaxy) archive
(the open-source backing store for [Uiverse.io](https://uiverse.io/)), **MIT License**, copyright (c) 2023 Uiverse.io.

Pinned commit: `adbd2adde0a299a3956ea288fb444ec01891ca41` (2024-09-02).
The Galaxy repo is a snapshot of HTML/CSS snippets; it has no `package.json` and is not published on npm.

There is no official npm package named `galaxy`, `galaxy-ui`, `uiverse`, or `@uiverse-io/galaxy` that corresponds to this collection.
Do **not** install the unrelated npm packages `galaxy` (bjouhier/galaxy, generators) or `galaxy-ui` (ferrousdesigner, 2018, React 16).

## Elements used here

| Component | Original file | Author | Uiverse page |
| --- | --- | --- | --- |
| GalaxyButton | `Buttons/adamgiebl_fluffy-liger-17.html` | [adamgiebl](https://uiverse.io/adamgiebl) | https://uiverse.io/adamgiebl/fluffy-liger-17 |
| GalaxyCard | `Cards/joe-watson-sbf_honest-bullfrog-6.html` | [joe-watson-sbf](https://uiverse.io/joe-watson-sbf) | https://uiverse.io/joe-watson-sbf/honest-bullfrog-6 |
| GalaxyForm | `Forms/gharsh11032000_nasty-insect-66.html` | [gharsh11032000](https://uiverse.io/gharsh11032000) | https://uiverse.io/gharsh11032000/nasty-insect-66 |
| GalaxyInput | `Inputs/Cksunandh_purple-moose-3.html` | [Cksunandh](https://uiverse.io/Cksunandh) | https://uiverse.io/Cksunandh/purple-moose-3 |

The original HTML/CSS is kept under this `vendor/` folder. React wrappers in the parent directory scope the CSS via CSS modules so the snippets cannot leak into the rest of the app.

Note: the user mentioned “GitHub: Cksunandh/galaxy”. That repository does not exist. Cksunandh is a Uiverse contributor; their elements live inside `uiverse-io/galaxy`.
