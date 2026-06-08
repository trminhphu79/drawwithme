---
name: DrawWithMe Design System
colors:
  surface: '#f7f9fb'
  surface-dim: '#d8dadc'
  surface-bright: '#f7f9fb'
  surface-container-lowest: '#ffffff'
  surface-container-low: '#f2f4f6'
  surface-container: '#eceef0'
  surface-container-high: '#e6e8ea'
  surface-container-highest: '#e0e3e5'
  on-surface: '#191c1e'
  on-surface-variant: '#46464f'
  inverse-surface: '#2d3133'
  inverse-on-surface: '#eff1f3'
  outline: '#767680'
  outline-variant: '#c7c5d0'
  surface-tint: '#545b8a'
  primary: '#000110'
  on-primary: '#ffffff'
  primary-container: '#111844'
  on-primary-container: '#7b81b3'
  inverse-primary: '#bdc3f9'
  secondary: '#4b41e1'
  on-secondary: '#ffffff'
  secondary-container: '#645efb'
  on-secondary-container: '#fffbff'
  tertiary: '#060100'
  on-tertiary: '#ffffff'
  tertiary-container: '#341300'
  on-tertiary-container: '#af7858'
  error: '#ba1a1a'
  on-error: '#ffffff'
  error-container: '#ffdad6'
  on-error-container: '#93000a'
  primary-fixed: '#dfe0ff'
  primary-fixed-dim: '#bdc3f9'
  on-primary-fixed: '#101743'
  on-primary-fixed-variant: '#3d4371'
  secondary-fixed: '#e2dfff'
  secondary-fixed-dim: '#c3c0ff'
  on-secondary-fixed: '#0f0069'
  on-secondary-fixed-variant: '#3323cc'
  tertiary-fixed: '#ffdbc9'
  tertiary-fixed-dim: '#f8b995'
  on-tertiary-fixed: '#321200'
  on-tertiary-fixed-variant: '#673c21'
  background: '#f7f9fb'
  on-background: '#191c1e'
  surface-variant: '#e0e3e5'
typography:
  headline-lg:
    fontFamily: Manrope
    fontSize: 40px
    fontWeight: '800'
    lineHeight: 48px
    letterSpacing: -0.02em
  headline-lg-mobile:
    fontFamily: Manrope
    fontSize: 32px
    fontWeight: '800'
    lineHeight: 38px
    letterSpacing: -0.02em
  headline-md:
    fontFamily: Manrope
    fontSize: 24px
    fontWeight: '700'
    lineHeight: 32px
    letterSpacing: -0.01em
  body-lg:
    fontFamily: Manrope
    fontSize: 18px
    fontWeight: '400'
    lineHeight: 28px
  body-md:
    fontFamily: Manrope
    fontSize: 16px
    fontWeight: '400'
    lineHeight: 24px
  label-md:
    fontFamily: Manrope
    fontSize: 14px
    fontWeight: '600'
    lineHeight: 20px
    letterSpacing: 0.01em
  label-sm:
    fontFamily: Manrope
    fontSize: 12px
    fontWeight: '700'
    lineHeight: 16px
    letterSpacing: 0.05em
rounded:
  sm: 0.25rem
  DEFAULT: 0.5rem
  md: 0.75rem
  lg: 1rem
  xl: 1.5rem
  full: 9999px
spacing:
  unit: 4px
  gutter: 24px
  margin-mobile: 16px
  margin-desktop: 32px
  toolbar-padding: 8px
---

## Brand & Style
This design system focuses on a **sophisticated minimalist** aesthetic tailored for high-end creative collaboration. The UI is designed to feel like a "pro-grade" digital studio—unobtrusive, focused, and precise. 

The visual language balances the weight of Deep Navy with the ethereal lightness of **glassmorphism**. By using translucent layers and background blurs, the interface maintains a sense of depth and spatial awareness without cluttering the canvas. The emotional goal is to evoke a sense of focused calm and professional creative flow, ensuring the user's artwork remains the hero of the experience.

## Colors
The palette is anchored by **Deep Navy (#111844)**, used for primary structural elements and high-contrast typography. To support the creative nature of the app, a vibrant **Indigo (#4F46E5)** serves as the secondary action color, while **Cyan (#06B6D4)** provides a sharp accent for active states and collaborative cursors.

Surface colors utilize a range of transparent whites (e.g., `rgba(255, 255, 255, 0.7)`) to achieve the glassmorphic effect. Gradients should be soft and directional, moving from the primary navy into the secondary indigo to create a sense of light source within the interface.

## Typography
Manrope is used across all levels to maintain a modern, geometric, yet highly readable feel. 

- **Headlines:** Use tighter letter-spacing and heavy weights (ExtraBold/Bold) to anchor page sections. 
- **Body:** Standard weights with generous line-height ensure legibility during long sessions.
- **Labels:** Semi-bold weights are used for UI controls and metadata to ensure they remain distinct from content.
- **Monospace (Optional):** For coordinate displays or hex codes, a clean monospace should be used at 12px.

## Layout & Spacing
This design system utilizes a **fluid-to-fixed** hybrid model. The main drawing canvas is fluid, expanding to fill all available space. UI overlays (toolbars, panels) follow a 4px base grid system.

- **Floating Panels:** Panels should be positioned with a 16px margin from the screen edges.
- **Toolbars:** Use an 8px internal padding for tool groups, with 4px spacing between individual icons.
- **Breakpoints:**
  - **Mobile (<600px):** Single column with collapsible bottom-sheet controls.
  - **Tablet (600px - 1024px):** Floating sidebars for tools.
  - **Desktop (>1024px):** Fixed-width sidebars (280px) for layers and properties, with floating tool palettes.

## Elevation & Depth
Depth is created through **Layered Glassmorphism** rather than traditional heavy shadows.

- **Level 1 (Canvas):** Flat, background layer.
- **Level 2 (Floating Panels):** White surface at 70% opacity with a `20px` background blur and a subtle `1px` white border (20% opacity) to define the edge.
- **Level 3 (Popovers/Modals):** Same as Level 2 but with a soft, large-radius ambient shadow (`0 10px 40px rgba(17, 24, 68, 0.1)`) to lift it further from the workspace.
- **Active States:** Use a glow effect (inner shadow) with the accent color to indicate selected tools.

## Shapes
The shape language is consistently **Rounded**, using an 8px base for standard components.

- **Buttons & Inputs:** 8px (0.5rem).
- **Cards & Sidebars:** 16px (1rem).
- **Tool Icons:** Within a square container, use a 6px radius for the internal selection state.
- **Active Indicators:** Use pill-shapes (rounded-full) for status chips and user presence avatars.

## Components
- **Buttons:** Primary buttons use the Deep Navy background with white text. Secondary buttons utilize the glassmorphism style (blur + border).
- **Toolbars:** Vertical or horizontal stacks of 40x40px icon buttons. The "Active" tool should be highlighted with a subtle indigo gradient background.
- **Input Fields:** Minimalist design with only a bottom border (2px) in the inactive state, transitioning to a full 1px border with a soft blue glow on focus.
- **Chips:** Used for "Tags" or "Active Users." These should be semi-transparent with a 1px border matching the user's assigned cursor color.
- **Cards:** Used for project galleries. Featuring 16px corner radius and a subtle hover-scale effect (1.02x) to show interactivity.
- **The Canvas Cursor:** A custom component showing a 1px ring with a small text label (User Name) that floats slightly above the drawing point.