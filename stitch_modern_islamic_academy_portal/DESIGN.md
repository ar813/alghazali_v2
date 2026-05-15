---
name: Academic Emerald
colors:
  surface: '#faf8ff'
  surface-dim: '#d2d9f4'
  surface-bright: '#faf8ff'
  surface-container-lowest: '#ffffff'
  surface-container-low: '#f2f3ff'
  surface-container: '#eaedff'
  surface-container-high: '#e2e7ff'
  surface-container-highest: '#dae2fd'
  on-surface: '#131b2e'
  on-surface-variant: '#404944'
  inverse-surface: '#283044'
  inverse-on-surface: '#eef0ff'
  outline: '#707974'
  outline-variant: '#bfc9c3'
  surface-tint: '#2b6954'
  primary: '#003527'
  on-primary: '#ffffff'
  primary-container: '#064e3b'
  on-primary-container: '#80bea6'
  inverse-primary: '#95d3ba'
  secondary: '#006c49'
  on-secondary: '#ffffff'
  secondary-container: '#6cf8bb'
  on-secondary-container: '#00714d'
  tertiary: '#25312b'
  on-tertiary: '#ffffff'
  tertiary-container: '#3b4741'
  on-tertiary-container: '#a8b5ad'
  error: '#ba1a1a'
  on-error: '#ffffff'
  error-container: '#ffdad6'
  on-error-container: '#93000a'
  primary-fixed: '#b0f0d6'
  primary-fixed-dim: '#95d3ba'
  on-primary-fixed: '#002117'
  on-primary-fixed-variant: '#0b513d'
  secondary-fixed: '#6ffbbe'
  secondary-fixed-dim: '#4edea3'
  on-secondary-fixed: '#002113'
  on-secondary-fixed-variant: '#005236'
  tertiary-fixed: '#d9e6dd'
  tertiary-fixed-dim: '#bdcac1'
  on-tertiary-fixed: '#131e19'
  on-tertiary-fixed-variant: '#3e4943'
  background: '#faf8ff'
  on-background: '#131b2e'
  surface-variant: '#dae2fd'
typography:
  display:
    fontFamily: Geist
    fontSize: 48px
    fontWeight: '700'
    lineHeight: '1.1'
    letterSpacing: -0.04em
  headline-lg:
    fontFamily: Geist
    fontSize: 32px
    fontWeight: '600'
    lineHeight: '1.2'
    letterSpacing: -0.02em
  headline-lg-mobile:
    fontFamily: Geist
    fontSize: 24px
    fontWeight: '600'
    lineHeight: '1.2'
  headline-md:
    fontFamily: Geist
    fontSize: 24px
    fontWeight: '600'
    lineHeight: '1.3'
  body-lg:
    fontFamily: Geist
    fontSize: 18px
    fontWeight: '400'
    lineHeight: '1.6'
  body-md:
    fontFamily: Geist
    fontSize: 16px
    fontWeight: '400'
    lineHeight: '1.5'
  label-md:
    fontFamily: Geist
    fontSize: 14px
    fontWeight: '500'
    lineHeight: '1.4'
    letterSpacing: 0.01em
  mono-label:
    fontFamily: Geist Mono
    fontSize: 12px
    fontWeight: '500'
    lineHeight: '1.0'
    letterSpacing: 0.05em
rounded:
  sm: 0.125rem
  DEFAULT: 0.25rem
  md: 0.375rem
  lg: 0.5rem
  xl: 0.75rem
  full: 9999px
spacing:
  unit: 4px
  container-max: 1280px
  gutter: 24px
  margin-sm: 16px
  margin-md: 32px
  margin-lg: 64px
  section-gap: 128px
---

## Brand & Style
The design system is anchored in a philosophy of "Sacred Precision." It bridges the gap between traditional academic rigor and modern technical excellence. The target audience includes scholars, students, and administrators who value clarity, focus, and a premium aesthetic that reflects the weight of the subject matter.

The visual style is **Modern Minimalist with High-Contrast Accents**. It leverages the expansive whitespace characteristic of high-end editorial design while employing technical precision in its borders and alignment. The emotional response is one of calm authority, intellectual clarity, and professional reliability. Every element is intentional, avoiding unnecessary ornamentation to keep the focus entirely on the educational content.

## Colors
The palette is intentionally restricted to maintain a high-end, academic feel.

- **Primary:** A deep, sophisticated Emerald (#064E3B) used for navigation, primary actions, and branding. It conveys growth, tradition, and stability.
- **Secondary:** A vibrant Emerald (#10B981) reserved for success states and subtle highlights.
- **Tertiary:** A very soft Mint wash (#F0FDF4) used for large surface areas like active sidebars or highlighted lecture notes to reduce eye strain.
- **Neutral:** A deep Navy-Slate (#0F172A) for typography and borders, providing the "Vercel-style" high contrast against the pure white background.
- **Background:** Pure White (#FFFFFF) is the foundation of the design system, ensuring a sterile and distraction-free environment.

## Typography
The system utilizes **Geist** exclusively to achieve a clean, developer-centric, and highly legible interface. The type scale is aggressive, prioritizing clear hierarchy.

Headlines should use tighter letter spacing and bold weights to feel structural. Body text is optimized for long-form academic reading with generous line heights. A mono-variant of Geist should be used for metadata, such as "Course ID" or "Verse References," to reinforce the technical and precise nature of this design system.

## Layout & Spacing
This design system employs a **Fixed Grid** model for desktop to ensure content remains centered and readable, mimicking a physical manuscript or textbook. 

- **Desktop (1280px+):** 12-column grid with 24px gutters. Large section gaps (128px) separate major modules like "Lessons" and "Assessments."
- **Tablet:** 8-column grid with 24px gutters. Sidebars collapse into drawers.
- **Mobile:** 4-column grid with 16px gutters and margins. 

Whitespace is treated as a functional element, not a void. Padding within components is generous to allow the high-contrast typography to "breathe" against the pure white background.

## Elevation & Depth
In alignment with the high-contrast aesthetic, this design system avoids traditional shadows. Depth is communicated through **Structural Layering** and **Crisp Outlines**.

- **Level 0 (Base):** #FFFFFF.
- **Level 1 (Cards/Inputs):** Defined by a 1px solid border (#E2E8F0 or #0F172A for emphasis). No shadow.
- **Level 2 (Modals/Overlays):** A sharp 2px border with a very subtle, non-blurred offset "hard shadow" (e.g., 4px 4px 0px #0F172A) can be used for high-importance prompts.
- **Hover States:** Instead of elevation, use color shifts (e.g., background shifts to #F8FAFC) or border-weight thickness changes.

## Shapes
The shape language is **Soft (0.25rem)**. The slight rounding of corners prevents the UI from feeling overly aggressive or "brutalist," while maintaining the architectural precision of the design system.

- **Standard Buttons:** 4px (Soft)
- **Input Fields:** 4px (Soft)
- **Cards/Modules:** 8px (Rounded-lg)
- **Avatars:** Circular (Pill) for human elements to contrast against the geometric grid.

## Components
- **Buttons:** Primary buttons are Solid Emerald (#064E3B) with White text. Secondary buttons are Ghost style with a 1px Emerald border. All buttons use `label-md` and have a height of 40px or 48px.
- **Inputs:** Clean white backgrounds with 1px #E2E8F0 borders. On focus, the border changes to 1px #064E3B with no glow. Labels are positioned above the field in `label-md`.
- **Cards:** Used sparingly. Cards feature a 1px border and 32px of internal padding. Titles within cards use `headline-md`.
- **Chips/Badges:** Small, rectangular with slightly rounded corners. Used for "Completed," "In Progress," or "Level" tags. Use Tertiary Green background with Primary Emerald text.
- **Progress Indicators:** Thin, 4px high bars. Unfilled state is #F1F5F9; filled state is #064E3B.
- **Academic Lists:** Numbered lists should use the Mono font for the numeral to signify a structured curriculum or sequence.