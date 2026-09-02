---
name: Elite Operation
colors:
  surface: '#f7f9fc'
  surface-dim: '#d8dadd'
  surface-bright: '#f7f9fc'
  surface-container-lowest: '#ffffff'
  surface-container-low: '#f2f4f7'
  surface-container: '#eceef1'
  surface-container-high: '#e6e8eb'
  surface-container-highest: '#e0e3e6'
  on-surface: '#191c1e'
  on-surface-variant: '#464555'
  inverse-surface: '#2d3133'
  inverse-on-surface: '#eff1f4'
  outline: '#777587'
  outline-variant: '#c7c4d8'
  surface-tint: '#4c42e9'
  primary: '#493ee5'
  on-primary: '#ffffff'
  primary-container: '#635bff'
  on-primary-container: '#fefaff'
  inverse-primary: '#c3c0ff'
  secondary: '#585d77'
  on-secondary: '#ffffff'
  secondary-container: '#dadefd'
  on-secondary-container: '#5c617c'
  tertiary: '#00647a'
  on-tertiary: '#ffffff'
  tertiary-container: '#007f9a'
  on-tertiary-container: '#f8fdff'
  error: '#ba1a1a'
  on-error: '#ffffff'
  error-container: '#ffdad6'
  on-error-container: '#93000a'
  primary-fixed: '#e2dfff'
  primary-fixed-dim: '#c3c0ff'
  on-primary-fixed: '#0f0069'
  on-primary-fixed-variant: '#321ed2'
  secondary-fixed: '#dde1ff'
  secondary-fixed-dim: '#c1c5e3'
  on-secondary-fixed: '#151a31'
  on-secondary-fixed-variant: '#41455f'
  tertiary-fixed: '#b4ebff'
  tertiary-fixed-dim: '#3cd7ff'
  on-tertiary-fixed: '#001f27'
  on-tertiary-fixed-variant: '#004e5f'
  background: '#f7f9fc'
  on-background: '#191c1e'
  surface-variant: '#e0e3e6'
typography:
  display-lg:
    fontFamily: Hanken Grotesk
    fontSize: 40px
    fontWeight: '700'
    lineHeight: 48px
    letterSpacing: -0.02em
  headline-md:
    fontFamily: Hanken Grotesk
    fontSize: 24px
    fontWeight: '600'
    lineHeight: 32px
  headline-md-mobile:
    fontFamily: Hanken Grotesk
    fontSize: 20px
    fontWeight: '600'
    lineHeight: 28px
  body-lg:
    fontFamily: Hanken Grotesk
    fontSize: 18px
    fontWeight: '400'
    lineHeight: 28px
  body-md:
    fontFamily: Hanken Grotesk
    fontSize: 16px
    fontWeight: '400'
    lineHeight: 24px
  label-caps:
    fontFamily: JetBrains Mono
    fontSize: 12px
    fontWeight: '500'
    lineHeight: 16px
    letterSpacing: 0.05em
  data-tabular:
    fontFamily: JetBrains Mono
    fontSize: 14px
    fontWeight: '400'
    lineHeight: 20px
rounded:
  sm: 0.25rem
  DEFAULT: 0.5rem
  md: 0.75rem
  lg: 1rem
  xl: 1.5rem
  full: 9999px
spacing:
  container-max: 1440px
  gutter: 24px
  sidebar-width: 260px
  card-padding: 24px
  stack-sm: 8px
  stack-md: 16px
  stack-lg: 32px
---

## Brand & Style
The design system is engineered for the professional management of high-traffic service centers. It balances the utilitarian needs of data-heavy reporting with a "First Class" premium aesthetic. The brand personality is efficient, authoritative, and transparent.

The visual style follows a **Corporate Modern** approach with subtle **Glassmorphism** accents. It prioritizes clarity and precision, using a spacious layout to reduce cognitive load for managers tracking multiple revenue streams and service statuses in real-time. Surfaces are layered to create a sense of organized depth, while high-contrast indicators ensure critical financial metrics are instantly legible.

## Colors
The palette is anchored in **Deep Navy (#1A1F36)** and **Vibrant Purple (#635BFF)** to establish a professional, institutional foundation. 

- **Primary & Secondary:** Used for branding, active navigation states, and primary calls to action.
- **Success Green:** A high-chroma emerald used exclusively for positive revenue trends and "Completed" service statuses.
- **Revenue Split:** Specific tokens are assigned to differentiate the tripartite revenue model:
    - **Business:** Deep Purple (The house cut).
    - **Soap/Inventory:** Cyan (Material costs).
    - **Washing Boy:** Steel Grey (Labor/Commission).
- **Backgrounds:** Utilizes a very light cool-grey (#F7F9FC) to maintain a "crisp white" feel while providing enough contrast for white card surfaces.

## Typography
**Hanken Grotesk** is the primary typeface, chosen for its sharp, contemporary geometry and exceptional readability in dashboard environments. It provides the "professional" weight required for executive reporting.

**JetBrains Mono** is utilized as a secondary functional font for labels, status badges, and tabular data. The monospaced nature ensures that financial figures and time-stamps align perfectly in dense tables, making vertical scanning of revenue totals effortless for management.

For mobile views, display sizes scale down significantly to maintain hierarchy without forcing horizontal scrolling.

## Layout & Spacing
The design system employs a **Fixed Grid** model for desktop, centered within a 1440px container with a persistent left-hand navigation sidebar.

- **Grid:** A 12-column layout with 24px gutters.
- **Dashboard Widgets:** Standardized on 3-column (quarter-width), 4-column (third-width), or 6-column (half-width) spans.
- **Vertical Rhythm:** An 8px base unit governs all padding and margins. 
- **Adaptation:** On Tablet, the sidebar collapses into an icon-only rail. On Mobile, the layout reflows into a single column with cards spanning the full width of the viewport minus 16px margins.

## Elevation & Depth
This design system uses **Tonal Layering** combined with **Ambient Shadows** to define the hierarchy of information:

1.  **Level 0 (Background):** Neutral light grey, flat.
2.  **Level 1 (Cards/Widgets):** White surface with a very soft, diffused shadow (Offset: 0 4px, Blur: 20px, Opacity: 4% Black). This is the primary container for data tables and charts.
3.  **Level 2 (Dropdowns/Modals):** White surface with a more defined shadow (Offset: 0 12px, Blur: 32px, Opacity: 8% Navy) to suggest immediate interaction.
4.  **Glassmorphism:** Navigation active states and specific "Total Revenue" callouts use a semi-transparent purple tint with a 12px backdrop blur to draw the eye without feeling heavy.

## Shapes
The shape language is **Rounded**, conveying a modern and accessible feel while maintaining professional structure.

- **Standard Elements:** Buttons, input fields, and small widgets use a **0.5rem (8px)** radius.
- **Large Containers:** Dashboard cards and main content areas use a **1rem (16px)** radius.
- **Status Badges:** Use a **Pill-shape (999px)** to distinguish them from interactive buttons.
- **Progress Bars:** Fully rounded ends to signify fluid movement/service progress.

## Components

### Revenue Split Indicators
Stacked horizontal bars or donut charts using the specific tokens: `revenue_business`, `revenue_soap`, and `revenue_staff`. Each segment must be accompanied by a `label-caps` legend.

### Status Badges
- **Queueing:** Grey background, Navy text.
- **Washing:** Light Blue background, Primary Blue text.
- **Drying/Detailing:** Light Purple background, Primary Purple text.
- **Completed:** Light Green background, Success Green text.

### Data Tables
Tables use a flat design with `1px` borders in `#E6E9EF`. Header cells use `label-caps` with a subtle grey background. Row height is fixed at `56px` to ensure touch-targets are accessible and data is not cramped.

### Dashboard Widgets
Each widget must include a header with a `headline-md` title and an optional "View Details" icon button. Expense widgets should utilize a subtle red (`#F04438`) for negative trends, contrasted against the primary success green for growth.

### Input Fields
Bordered style using `#D0D5DD`. Focus state utilizes a `2px` Primary Purple ring with 20% opacity.