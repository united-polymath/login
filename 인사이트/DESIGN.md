---
name: Empathetic Research
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
  on-surface-variant: '#434655'
  inverse-surface: '#2d3133'
  inverse-on-surface: '#eff1f3'
  outline: '#737686'
  outline-variant: '#c3c6d7'
  surface-tint: '#0053db'
  primary: '#004ac6'
  on-primary: '#ffffff'
  primary-container: '#2563eb'
  on-primary-container: '#eeefff'
  inverse-primary: '#b4c5ff'
  secondary: '#006c49'
  on-secondary: '#ffffff'
  secondary-container: '#6cf8bb'
  on-secondary-container: '#00714d'
  tertiary: '#ad0033'
  on-tertiary: '#ffffff'
  tertiary-container: '#d22348'
  on-tertiary-container: '#ffecec'
  error: '#ba1a1a'
  on-error: '#ffffff'
  error-container: '#ffdad6'
  on-error-container: '#93000a'
  primary-fixed: '#dbe1ff'
  primary-fixed-dim: '#b4c5ff'
  on-primary-fixed: '#00174b'
  on-primary-fixed-variant: '#003ea8'
  secondary-fixed: '#6ffbbe'
  secondary-fixed-dim: '#4edea3'
  on-secondary-fixed: '#002113'
  on-secondary-fixed-variant: '#005236'
  tertiary-fixed: '#ffdadb'
  tertiary-fixed-dim: '#ffb2b7'
  on-tertiary-fixed: '#40000d'
  on-tertiary-fixed-variant: '#92002a'
  background: '#f7f9fb'
  on-background: '#191c1e'
  surface-variant: '#e0e3e5'
typography:
  headline-xl:
    fontFamily: Plus Jakarta Sans
    fontSize: 40px
    fontWeight: '700'
    lineHeight: '1.2'
  headline-lg:
    fontFamily: Plus Jakarta Sans
    fontSize: 32px
    fontWeight: '700'
    lineHeight: '1.3'
  headline-md:
    fontFamily: Plus Jakarta Sans
    fontSize: 24px
    fontWeight: '600'
    lineHeight: '1.4'
  body-lg:
    fontFamily: Plus Jakarta Sans
    fontSize: 18px
    fontWeight: '400'
    lineHeight: '1.6'
  body-md:
    fontFamily: Plus Jakarta Sans
    fontSize: 16px
    fontWeight: '400'
    lineHeight: '1.6'
  label-sm:
    fontFamily: Plus Jakarta Sans
    fontSize: 14px
    fontWeight: '500'
    lineHeight: '1.4'
    letterSpacing: 0.02em
rounded:
  sm: 0.25rem
  DEFAULT: 0.5rem
  md: 0.75rem
  lg: 1rem
  xl: 1.5rem
  full: 9999px
spacing:
  unit: 8px
  gutter: 24px
  margin-mobile: 16px
  margin-desktop: 64px
  container-max: 1200px
---

## Brand & Style

This design system is built for a youth growth research center, focusing on the bridge between rigorous academic research and the lived experiences of 20-30s in Korea. The visual identity balances **Professionalism** with **Empathy**, moving away from clinical coldness toward a warm, supportive atmosphere.

The style is **Modern Corporate**, characterized by a clean, white-space-heavy layout that allows data and personal narratives to breathe. To ensure the content feels grounded and relatable to a younger demographic, the system relies exclusively on realistic, high-quality photography capturing authentic human moments. Avoid abstract vectors or AI-generated imagery; the focus is on "real people, real growth."

## Colors

The palette is anchored by a deep, trustworthy blue that communicates authority and stability. This is complemented by a series of soft, meaningful accents that categorize the research pillars:

*   **Primary (Trust):** #2563EB — Used for core branding, primary actions, and headers.
*   **Growth Accent:** #10B981 (Emerald) — Represents vitality and progress.
*   **Relationship Accent:** #F43F5E (Rose/Coral) — Represents connection and warmth.
*   **Mental Accent:** #8B5CF6 (Violet) — Represents self-reflection and inner peace.

The background remains a clean white (#FFFFFF) to maintain a "research paper" clarity, while neutrals are pulled from the slate-blue spectrum to prevent the interface from feeling "flat" or "cheap."

## Typography

The design system utilizes **Plus Jakarta Sans** (as the closest high-quality equivalent to Pretendard) to provide a modern, highly readable, and professional typographic experience. 

The hierarchy is structured to prioritize clarity in long-form research articles. Headlines use a tighter line height for a bold, confident appearance, while body text uses a generous 1.6 line height to reduce eye fatigue for users reading study findings or self-improvement guides.

## Layout & Spacing

The layout follows a **Fixed Grid** model for desktop to ensure research data and articles remain centered and readable, while transitioning to a fluid model for mobile. 

A 12-column grid is utilized with a 24px gutter to provide ample breathing room between content cards. Vertical rhythm is strictly governed by an 8px base unit (8, 16, 24, 32, 48, 64) to maintain consistency across different screen sizes. Sections of content should be separated by large padding blocks (min 64px) to emphasize the "Minimalist" brand personality.

## Elevation & Depth

To maintain a professional and research-oriented feel, depth is used sparingly. This design system avoids heavy, distracting shadows in favor of **Low-contrast outlines** and **Ambient shadows**.

*   **Level 0:** Flat background (#FFFFFF).
*   **Level 1 (Cards):** 1px border (#E2E8F0) with a very soft, diffused shadow (0px 4px 20px rgba(0,0,0,0.04)).
*   **Level 2 (Interactive):** Hover states slightly lift elements with a more pronounced, yet still subtle shadow (0px 10px 25px rgba(37, 99, 235, 0.1)).

This approach keeps the UI feeling light and organized without sacrificing the modern, tactile quality required for a youth-targeted product.

## Shapes

The shape language is defined by a **Rounded** aesthetic. All primary containers, buttons, and input fields utilize an 8px to 12px corner radius. This specific range is chosen to strike a balance: it is rounded enough to feel friendly and empathetic, but sharp enough to retain its professional, research-based integrity. 

Large-scale image containers and hero sections may use the higher end of the scale (12px-16px) to emphasize the "warm" visual style.

## Components

### Buttons
Primary buttons use the Brand Blue (#2563EB) with white text and 8px rounded corners. Secondary buttons should use a ghost style (transparent fill with a 1px border) to maintain a clean aesthetic.

### Cards
Cards are the primary vehicle for research summaries. They must feature a white background, the Level 1 elevation shadow, and a 12px radius. Images within cards should always be top-aligned and bleed to the edges of the top corners.

### Chips & Tags
Used for categories (Growth, Mental, Relationship). Chips should use a "Soft-tint" background (e.g., 10% opacity of the category color) with 100px (pill) radius for high distinction.

### Input Fields
Inputs use a 1px slate-200 border, 8px radius, and should transition to a 2px Brand Blue border on focus to provide clear accessibility and feedback.

### Photography Treatment
Use only realistic photography. Apply a subtle "warmth" filter or ensure images have natural lighting. Avoid high-saturation or "stocky" corporate poses; prefer candid, urban-environment shots of young adults in Korea or similar settings.