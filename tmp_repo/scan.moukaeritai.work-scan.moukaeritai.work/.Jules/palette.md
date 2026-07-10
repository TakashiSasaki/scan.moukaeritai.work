## 2024-05-18 - Accessible color pickers
**Learning:** Color-only pickers need accessible text (like aria-label/title) to ensure screen readers can announce the color being selected.
**Action:** Add aria-label and title to color picker buttons.
## 2023-10-27 - Hidden Text in Responsive Buttons
**Learning:** Buttons that have visible text on desktop but hide the text on mobile (e.g., `<span className="hidden sm:inline">Text</span>`) act as icon-only buttons on small screens, causing screen readers to lack context if there's no `aria-label`.
**Action:** Always check responsive styles on button text spans. If text is conditionally hidden, provide a fallback `aria-label` on the parent `<button>` to maintain accessibility across all viewport sizes.
## 2024-06-18 - Missing ARIA Labels in Responsive Text Buttons
**Learning:** Buttons containing text wrapped in `<span className="hidden sm:inline">` act like icon-only buttons on smaller screens because the text disappears. If no `aria-label` is explicitly provided on the `<button>` itself, screen readers lose context entirely.
**Action:** Always check elements that use responsive visibility classes (e.g., hidden) for text. If text is conditionally hidden, ensure an explicit `aria-label` exists on the parent element.
## 2024-06-22 - Missing ARIA Labels on Icon-Only Close Buttons
**Learning:** Icon-only utility buttons (such as the `<X />` close button in the user profile dropdown) often lack semantic meaning for screen readers. A bare `<X />` icon without an `aria-label` provides no context about what action the button performs.
**Action:** Always provide an explicit `aria-label` (e.g., `aria-label="Close profile menu"`) on utility buttons containing only icons, especially those that trigger popover or menu state changes.
