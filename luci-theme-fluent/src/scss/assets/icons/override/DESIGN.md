# FluentUI Icon Redesign Guidelines & Prompts

This document defines the design system, constraints, and AI generation prompts for transforming the legacy Tango/3D-style network interface icons in `src/scss/assets/icons/override/` into modern **FluentUI System Icons** style.

---

## 📐 1. Design System & Constraints

To ensure all overridden icons are visually consistent, elegant, and drop-in compatible with the existing LuCI theme layout, strictly follow these vector design specifications:

| Parameter | Specification | Description |
| :--- | :--- | :--- |
| **Grid / ViewBox** | `0 0 48 48` | Keep coordinates scaled to 48x48. Set defaults `width="32" height="32"`. |
| **Main Stroke Width** | `3px` | Used for outer outlines and main components. |
| **Detail Stroke Width** | `2.5px` or `2.0px` | Used for inner contacts, wires, and secondary details. |
| **Stroke Style** | `stroke-linecap="round"`<br>`stroke-linejoin="round"` | Standard Fluent design language for soft, rounded finishes. |
| **Corner Radius** | `rx="3"` or `rx="2.5"` | Outer rectangle corners must be rounded to avoid sharp edges. |
| **Fill Style** | `fill="none"` | Icons must be outline-based. Do not use solid filled blocks unless necessary. |

### 🎨 Color Palette & Opacity

Because these SVGs are loaded via `<img>` tags, they cannot inherit CSS variables or `currentColor` in an isolated context. Colors must be hardcoded:

* **Active State (`*.svg`)**:
  * Primary Color: `#0078D4` (Fluent Brand Blue)
  * Secondary Color/Accent: `#106ebe` (Darker Brand Blue)
* **Disabled State (`*_disabled.svg`)**:
  * Stroke Color: `#8a8886` (Neutral Slate Grey)
  * Wrapper Element: `<g opacity="0.6">` (consistent visual fading)

---

## 🧩 2. Icon Metaphors & Anatomy

When redesigning other interface icons, translate the network concepts into clean, flat, Fluent-aligned components:

### 🔌 Ethernet & Ports (`ethernet.svg`, `port_up.svg`, `port_down.svg`)

* **Anatomy**: Flat-topped insertion nose with gold finger slots, central lock latch pointing **down** (T-bar or loop pointing towards the body, *never* extending above the top), rounded square main body, strain-relief boot, and straight vertical cable.
* **Status Indicators**:
  * `port_up.svg` / `port_down.svg`: Standard active plug, optionally with a small directional arrow in the top corner (pointing up or down).

### 🌁 Bridge (`bridge.svg`, `bridge_disabled.svg`)

* **Anatomy**: Two Ethernet port outlines placed side-by-side or stacked, linked together by a horizontal dotted or dashed connection line (`stroke-dasharray="3, 3"`), representing a network bridge.

### 📶 Wifi (`wifi.svg`, `wifi_disabled.svg`)

* **Anatomy**: A solid circular dot at the bottom-center, with 3 concentric rounded arcs extending upwards and outwards. Follow the standard Fluent UI `wifi-regular` proportions.

### 🎛️ Switch (`switch.svg`, `switch_disabled.svg`)

* **Anatomy**: A horizontal rackmount switch block (`rect` with `rx="3"`), containing multiple small rectangular ports side-by-side. Clean, flat, and simple.

### 🧱 VLAN (`vlan.svg`, `vlan_disabled.svg`)

* **Anatomy**: An Ethernet plug base, surrounded by or nested inside a virtual layer bracket (e.g. nested brackets `{ }` or double lines), symbolizing a virtual partitioned LAN.

### 🔒 Virtual / VPN / Tunnel (`tunnel.svg`, `wireguard.svg`, `amneziawg.svg`, `vrf.svg`)

* **Anatomy**: Line-art pipe or shielding motifs combined with security locks/keys.
  * `tunnel.svg`: Concentric concentric loops (pipe cross-section) or a dashed pipeline.
  * `wireguard.svg` / `amneziawg.svg`: Fluent shield icon containing a network node path.

---

## 🤖 3. AI Code-Generation Prompts

Use these prompts in LLMs (Gemini, Claude, GPT) to generate or transform legacy SVGs into the desired Fluent UI style.

### Prompt: Redesign Active Icon (e.g., Wifi, Bridge)

```markdown
You are an expert SVG designer. Redesign the following legacy SVG into a modern Microsoft Fluent UI System Icon style.
Target file is: [Insert Filename, e.g., wifi.svg]

Constraints:
1. Output ONLY the raw SVG code. No explanations, no markdown blocks.
2. The SVG MUST have these attributes exactly: width="32" height="32" viewBox="0 0 48 48" fill="none" xmlns="http://www.w3.org/2000/svg"
3. Design style: Flat, minimal, outline-based line art. Symmetrical and perfectly balanced.
4. Line styling: Main strokes MUST be stroke="#0078D4" (Fluent Brand Blue), stroke-width="3", stroke-linecap="round", and stroke-linejoin="round".
5. Inner details and secondary lines can use stroke-width="2.5" or "2".
6. Avoid solid fills (fill="none" everywhere except tiny dots). Use rx="3" or rx="2.5" for rounded corners on rectangles.
7. Metaphor: [Insert Metaphor description, e.g., A wifi dot at bottom center (24, 38) with three concentric arcs above it, spaced evenly].

Legacy SVG code to transform:
[Paste Legacy SVG code here]
```

### Prompt: Generate Disabled Variant

```markdown
You are an expert SVG designer. Create the disabled variant of the provided active Fluent UI style SVG.
Target file is: [Insert Filename, e.g., wifi_disabled.svg]

Constraints:
1. Output ONLY the raw SVG code. No explanations.
2. The structure, viewBox (0 0 48 48), width/height (32x32), and paths MUST be identical to the active SVG.
3. Wrap all path elements in a group element: <g opacity="0.6"> ... </g>
4. Change all stroke colors from "#0078D4" (or any other color) to "#8a8886" (Neutral Slate Grey).
5. Keep fill="none", stroke-width="3" (or "2.5"), stroke-linecap="round", and stroke-linejoin="round".

Active SVG code to convert:
[Paste Active SVG code here]
```
