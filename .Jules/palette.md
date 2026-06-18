## 2024-05-18 - Accessible color pickers
**Learning:** Color-only pickers need accessible text (like aria-label/title) to ensure screen readers can announce the color being selected.
**Action:** Add aria-label and title to color picker buttons.
## 2023-10-27 - Hidden Text in Responsive Buttons
**Learning:** Buttons that have visible text on desktop but hide the text on mobile (e.g., `<span className="hidden sm:inline">Text</span>`) act as icon-only buttons on small screens, causing screen readers to lack context if there's no `aria-label`.
**Action:** Always check responsive styles on button text spans. If text is conditionally hidden, provide a fallback `aria-label` on the parent `<button>` to maintain accessibility across all viewport sizes.
## 2024-06-18 - Missing ARIA Labels in Responsive Text Buttons
**Learning:** Buttons containing text wrapped in `<span className="hidden sm:inline">` act like icon-only buttons on smaller screens because the text disappears. If no `aria-label` is explicitly provided on the `<button>` itself, screen readers lose context entirely.
**Action:** Always check elements that use responsive visibility classes (e.g., hidden) for text. If text is conditionally hidden, ensure an explicit `aria-label` exists on the parent element.
