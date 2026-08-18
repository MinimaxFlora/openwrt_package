
# Fluent icons in SCSS

Icons are resolved from Iconify JSON packages during the rsbuild CSS build and embedded directly into the final `fluent.css` as inline SVG data URIs. No extra asset files are loaded at runtime.

Currently supported collections:

- `fluent`
- `fluent-mdl2`

Use the name-based mixins in SCSS:

```scss
// Default collection: fluent
@include fluent-icon-by-name("person-20-regular", 16px, #242424);
@include fluent-icon-by-name("fluent:person-20-regular", 16px, #242424);

// Alternate collection: fluent-mdl2
@include fluent-icon-content-by-name("fluent-mdl2:accept", 16px, #107c10);
```

Name rules:

- no prefix → defaults to `fluent:`
- `fluent:xxx` → explicit Fluent System icon
- `fluent-mdl2:xxx` → Fluent MDL2 icon

Icon names come from:

- <https://icones.js.org/collection/fluent>
- <https://icones.js.org/collection/fluent-mdl2>

For normal `background-image` / pseudo-element cases, writing the icon name in `fluent-icon-by-name()` or `fluent-icon-content-by-name()` is enough — the build scans SCSS, resolves the icon automatically, and regenerates `src/scss/_fluent-icons.scss` before compiling Sass.

For direct map access cases such as custom `mask-image` rules, fetch from `$fluent-icons`:

```scss
@use "sass:map";

$chevron-svg: map.get($fluent-icons, "chevron-down-20-regular");
$accept-svg: map.get($fluent-icons, "fluent-mdl2:accept");

mask-image: url("data:image/svg+xml,#{$chevron-svg}");
```

All icons are dynamically scanned and resolved from the SCSS source files during the build process.
