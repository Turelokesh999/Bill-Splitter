# Bill Splitter 🧾

> Fast, fair, and penny-exact bill settlement for group dining, trips, and shared expenses.

---

## 📌 Problem Statement

After dining out with friends or returning from a group trip, settling up expenses is frequently awkward, time-consuming, and prone to calculation disputes:

1. **The Rounding Penny Problem**: Standard split calculators divide amounts using floating-point math (e.g., $100.00 split among 3 people yields $33.33 each, leaving $0.01 missing). Someone always pays more or less, and totals fail to match receipt receipts.
2. **Multiple Meals & Changing Attendee Lists**: Outings often consist of multiple bills (e.g., Friday Dinner attended by Alice, Bob, and Charlie; followed by Saturday Brunch attended by Alice, Bob, Charlie, and David). Calculating who owes what cumulatively across various gatherings requires tedious manual spreadsheets.
3. **Storage & Privacy Constraints**: Many web applications store sensitive financial figures in browser cookies or persistent local databases. Users need an instant, privacy-conscious tool that retains state on accidental page reload without relying on `localStorage`, `sessionStorage`, or tracking cookies.
4. **Currency Restrictions**: Friends travel internationally and need support for local and global currencies with instant symbol updates across all breakdowns.

---

## 💡 Implemented Solution & Key Features

**Bill Splitter** is a lightweight, zero-dependency one-page application designed with an intuitive **3-Step Flow ("1. Enter", "2. Result", "3. Recent")** that allows first-time users to settle up within seconds.

### 1. Integer-Cent Precision (Exact to the Penny)
- Eliminates IEEE 754 floating-point inaccuracies by transforming all currency inputs into integer cents:
  $$\text{Total Cents} = \text{round}(\text{Bill} \times 100)$$
- Distributes base integer cents evenly ($\lfloor\text{Total} / N\rfloor$) and assigns remainder pennies sequentially to the first remainder individuals.
- **Guarantee**: The sum of all individual payments mathematically matches the total bill amount with a real-time verification check.

### 2. Multi-Occasion & Individual Name Settlement
- **Dynamic Occasion Creation**: Add multiple bills (e.g., Dinner, Drinks, Brunch) within a single session.
- **Smart Attendee Parsing**: Enter comma-separated names (`Alice, Bob, Charlie`) or a numerical count (`4`).
- **Cumulative Grand Totals**: When different people attend different meals, the app computes:
  - Each occasion's individual breakdown.
  - A cumulative per-person grand total across all occasions (e.g., Alice owes for Dinner + Brunch, while David only owes for Brunch).

### 3. Multi-Currency Support
- An accessible currency dropdown in the header allows selecting from:
  - **USD ($)**, **EUR (€)**, **GBP (£)**, **INR (₹)**, **JPY (¥)**, **CAD (CA$)**, **AUD (A$)**, and **CHF**.
- Switching currency dynamically updates input prefixes, output cards, breakdowns, and historical logs in real-time.

### 4. Recent History & Multi-Select Bill Combiner
- **Memory History**: Retains the last 5 calculated sessions in JavaScript memory.
- **Multi-Select Combiner**: Check multiple past bills to view an instant aggregated balance sheet across those selected events.
- **One-Click Restore**: Click "Load this bill" or "Load Selected into Calculator" to repopulate the editor and edit amounts.
- **Clear History**: Instantly purge historical records at any time.

### 5. Reload Persistence Without Cookies / LocalStorage
- Compliant with strict technical rules forbidding `localStorage`, `sessionStorage`, and cookies.
- Encodes state in `window.location.hash`, enabling users to refresh the page or share the calculation URL without losing inputs or results.
- **Reset All**: Restores the application to its pristine initial state, clearing inputs, errors, history, URL hash, and resetting theme.

### 6. Interactive & Accessible Design
- **WCAG AA Compliance**: High-contrast typography with system fonts (`-apple-system`, `BlinkMacSystemFont`, `Segoe UI`, etc.).
- **Theme Support**: Integrated Light Mode and Dark Mode toggle, adhering strictly to the palette:
  - `--dark-amethyst`: `#190230`
  - `--dark-amethyst-2`: `#41295B`
  - `--parchment`: `#F3EEE8`
  - `--lavender-veil`: `#E7D7F5`
  - `--linen`: `#F2E9E2`
- **Delighter**: "Try an Example" button to populate a sample multi-occasion split with one click.
- **Responsive Layout**: Mobile-first architecture scaling seamlessly from 320px smartphones to 1920px desktop displays without horizontal scroll.
- **Reduced Motion Support**: Honoring the `prefers-reduced-motion` media query.

---

## 🛠️ Technology Stack

- **HTML5**: Semantic, accessible markup with ARIA roles and labels.
- **CSS3**: Vanilla stylesheet using CSS custom properties (variables), clamp(), flexbox, and grid.
- **JavaScript (ES2022)**: Pure Vanilla JS, wrapped in `DOMContentLoaded`, with zero external libraries (no React, jQuery, Tailwind, or CDNs).
- **Protocols Supported**: Works natively on HTTP/HTTPS servers as well as double-clicking `index.html` via the `file://` protocol.

---

## 📂 Project Structure

```
├── index.html        # Main HTML markup with 3-step semantic sections
├── style.css         # Complete styles, palette variables, and animations
├── script.js         # Core split math, multi-occasion aggregation, and state handling
├── metadata.json     # Application metadata
└── README.md         # Project documentation and problem/solution overview
```

---

## 🚀 How to Run

1. Clone or download the repository.
2. Open `index.html` directly in any modern web browser (Chrome, Firefox, Safari, Edge) or serve it locally using any static web server:
   ```bash
   npx serve .
   ```
3. Enter your meal names, bill amounts, and attendees to split instantly!
