# Galaxy UI wrappers

React wrappers around a few MIT-licensed Uiverse / Galaxy snippets.

```js
import { GalaxyButton, GalaxyCard, GalaxyForm, GalaxyInput } from './components/galaxy'
```

Demo route: `#/galaxy` (`src/pages/GalaxyDemo.jsx`). This route is additive; product pages are unchanged.

To add another element: copy the `.html` from the pinned Galaxy commit into `vendor/`, convert class names into a CSS module, and wrap the markup as JSX. Never install a similarly named npm package without checking the publisher.
