# Frontend-Only Multi-City Trip Planner Roadmap

## Objective

Build a static, frontend-only **multi-city trip planner** using React and Vite. A single user creates and edits a trip entirely in the browser, keeps a recovery draft locally, and exports/imports a versioned JSON plan as the portable source of truth.

## Product Boundaries and Decisions

- **Application type:** Greenfield static web application.
- **Stack:** React, TypeScript, and Vite.
- **Hosting:** Static deployment to GitHub Pages; Vite's base path must be configured for the repository Pages URL.
- **Audience and ownership:** One user; authentication, backend services, collaboration, and shareable live plans are out of scope.
- **Persistence:** Browser-only state with `localStorage` recovery drafts; a validated, versioned JSON file is the portable backup and interchange format.
- **External services:** No API integration is required. Google Maps links are saved as URLs and opened in a new tab; there is no embedded map or map API dependency.
- **Design:** A minimal utility interface with original branding and components, inspired by useful planning patterns but not a visual copy of Pickyourtrail.
- **Responsive behavior:** Desktop and mobile are in scope.
- **Accessibility:** No formal MVP acceptance scope, but use semantic React and HTML patterns.

## Confirmed Requirements

| Area | Approved requirement |
| --- | --- |
| Trip type | Multi-city routes. |
| Setup | Route-first wizard. |
| Route stops | Cities are free-text user input. |
| Dates | Exact trip start/end dates; automatically allocate dates, then allow edited stop dates. |
| Route editing | Add, edit, delete, and drag-and-drop reorder stops. |
| Travel legs | Optional transport mode, Google Maps route link, and travel notes. |
| Arrival/departure | Separate itinerary items with place, date/time, Maps link, and notes. |
| Itinerary | Day-by-day plan grouped into morning, afternoon, and evening, with ordered activities and optional exact times. |
| Activities | Title, notes, slot/time, duration, category, Google Maps link, INR cost, and planned/done/skipped status. |
| Time conflicts | Warn about overlapping timed activities but allow them. |
| Food | Separate “must taste” entries assignable by destination and day, including meal type, restaurant, Maps link, notes, INR estimate, priority, and status. |
| Day content | Empty/leisure days and day-level notes are supported. |
| Costing | INR-only trip budget target plus automatic total of recorded activity costs. |
| Editing UX | Inline editing; add/edit/delete; activity drag-and-drop; duplicate items; undo/redo; unsaved-change warning. |
| Changed dates | Prompt the user to move each affected activity to a selected day. |
| Deleted destination | Confirm deletion and delete associated activities and food entries. |
| Map links | Accept valid `http`/`https` URLs, identify Google Maps URLs where possible, and open links in a new tab. |
| Local draft | Browser-local autosave with an explicit clear-local-data action. |
| New plan | Confirm before resetting the active plan. |
| JSON export | Download the complete, versioned JSON plan. |
| JSON import | Validate a selected file and show a preview/confirmation before replacing the active plan. |
| Invalid import | Keep the current plan; show field-level messages and expandable technical validation details. |
| Layout | One main planning screen with route, itinerary, and food sections; a separate import/export/settings screen. |
| Deployment | GitHub Pages. |

## Execution Plan

### Phase 1: Foundation and Domain Design

**Estimate:** 0.5–1 day

#### Task 1.1: Initialize the React + Vite project

- **Owner:** `code-puppy`
- **Planned files:**
  - `package.json`
  - `vite.config.*`
  - `src/main.tsx`
  - `src/App.tsx`
  - GitHub Pages deployment configuration
- **Dependencies:** React, TypeScript, Vite, and GitHub Pages build/deploy tooling.
- **Notes:** Configure Vite's `base` correctly for the repository GitHub Pages URL. Keep deployment static with no runtime server dependency.

#### Task 1.2: Define the versioned JSON schema and TypeScript domain models

- **Owner:** `code-puppy`
- **Planned files:**
  - `src/types/trip.ts`
  - `src/schemas/tripSchema.ts`
  - `src/constants/schema.ts`
  - `docs/plan-json-format.md`
- **Core models:** `TripPlan`, `TripMetadata`, `RouteStop`, `TravelLeg`, `TripDay`, `Activity`, `FoodEntry`, `ArrivalDepartureEvent`, and `Budget`.
- **Validation rules:**
  - `schemaVersion` is required.
  - Trip start/end dates must be valid.
  - Route-stop dates must fall inside the trip.
  - Activities and food entries must reference existing route stops and days.
  - Costs must be non-negative INR values.
  - Maps links must be valid `http` or `https` URLs.
- **Recommended dependency:** Zod for runtime validation and import error reporting.

#### Task 1.3: Design the state architecture

- **Owner:** `code-puppy`
- **Planned files:**
  - `src/store/tripStore.ts`
  - `src/store/history.ts`
  - `src/store/selectors.ts`
- **Implementation:** Keep the active plan in client memory, autosave recovery drafts through `localStorage`, support undo/redo, and separate transient UI state from exportable trip data.
- **Recommended approach:** Zustand with immutable-update patterns, or React Context plus a reducer for a smaller dependency footprint.

### Phase 2: Trip Setup and Route Builder

**Estimate:** 1–2 days

#### Task 2.1: Build the route-first trip setup wizard

- **Owner:** `code-puppy`
- **Planned files:**
  - `src/features/setup/TripSetupWizard.tsx`
  - `src/features/setup/TripMetadataForm.tsx`
  - `src/features/setup/RouteStopForm.tsx`
- **Fields:** Trip title, description, optional external cover-image URL, trip start/end dates, arrival/departure information, and initial route-stop list.
- **Output:** An initial route and corresponding day records.

#### Task 2.2: Implement automatic day allocation with manual overrides

- **Owner:** `code-puppy`
- **Planned files:**
  - `src/domain/dateAllocation.ts`
  - `src/domain/itineraryGenerator.ts`
  - `src/domain/dateChangeResolver.ts`
- **Behavior:** Automatically assign trip days to route stops; allow edited route-stop date ranges; rebuild the itinerary when the route changes; and prompt users to select a new day for affected activities.
- **Validation:** No route stop may fall outside overall trip dates, and every generated date appears exactly once in the itinerary.

#### Task 2.3: Create the editable route timeline

- **Owner:** `code-puppy`
- **Planned files:**
  - `src/features/route/RouteTimeline.tsx`
  - `src/features/route/RouteStopCard.tsx`
  - `src/features/route/TravelLegEditor.tsx`
- **Features:** Add/edit/delete stops; drag-and-drop reordering; date ranges and destination duration; optional travel mode, notes, and directions URL between stops; and arrival/departure events.
- **Recommended dependency:** `@dnd-kit` for accessible, maintainable drag-and-drop behavior.

### Phase 3: Day-by-Day Itinerary and Activities

**Estimate:** 2–3 days

#### Task 3.1: Build the main planner workspace

- **Owner:** `code-puppy`
- **Planned files:**
  - `src/pages/PlannerPage.tsx`
  - `src/components/layout/PlannerLayout.tsx`
  - `src/components/layout/StickyRoutePanel.tsx`
- **Layout:** Desktop has the itinerary workspace and a sticky route-summary panel. Mobile stacks or collapses route and itinerary sections. Provide navigation for Route, Itinerary, Food, and Budget.
- **Design note:** Retain the useful planning hierarchy of the reference experience while keeping the visual design original.

#### Task 3.2: Implement daily itinerary cards

- **Owner:** `code-puppy`
- **Planned files:**
  - `src/features/itinerary/DayCard.tsx`
  - `src/features/itinerary/TimeSlotSection.tsx`
  - `src/features/itinerary/DayNotesEditor.tsx`
- **Features:** Day number, exact date, current destination, morning/afternoon/evening sections, empty “at leisure” days, day notes, and ordered activity lists per slot.

#### Task 3.3: Implement activity lifecycle and scheduling

- **Owner:** `code-puppy`
- **Planned files:**
  - `src/features/activities/ActivityEditor.tsx`
  - `src/features/activities/ActivityCard.tsx`
  - `src/domain/timeConflicts.ts`
- **Fields:** Title, notes, category, slot, optional exact start/end time, duration, Maps/place link, INR cost, and planned/done/skipped status.
- **Behavior:** Drag activities within a day and between days/slots; duplicate them; detect and non-blockingly warn about overlaps; safely open Maps URLs in a new tab.

### Phase 4: Must-Taste Food Planner and Budget

**Estimate:** 1–1.5 days

#### Task 4.1: Add separate must-taste food entries

- **Owner:** `code-puppy`
- **Planned files:**
  - `src/features/food/FoodPlanner.tsx`
  - `src/features/food/FoodEntryEditor.tsx`
  - `src/features/food/FoodEntryCard.tsx`
- **Fields:** Food item/dish, linked destination, optional day, meal type, restaurant name, restaurant/place URL, notes, estimated INR cost, priority, and planned/done/skipped status.
- **UX:** Filter by destination or day, and show entries from destination/day itinerary context.

#### Task 4.2: Add trip budget tracking

- **Owner:** `code-puppy`
- **Planned files:**
  - `src/features/budget/BudgetSummary.tsx`
  - `src/features/budget/BudgetTargetEditor.tsx`
  - `src/domain/budget.ts`
- **Features:** Set an INR trip budget; calculate planned costs from activities; show remaining or over-budget amount.
- **Out of scope:** Currency conversion, external price lookup, and booking integration.

### Phase 5: Local Recovery, JSON Import, and Export

**Estimate:** 1–1.5 days

#### Task 5.1: Add local browser draft recovery

- **Owner:** `code-puppy`
- **Planned files:**
  - `src/services/localDraftStorage.ts`
  - `src/features/settings/LocalDraftControls.tsx`
- **Behavior:** Autosave valid plan changes to `localStorage`; restore the latest draft at startup; provide an explicit clear-local-draft action; and confirm before creating a blank plan that clears current content.

#### Task 5.2: Implement robust JSON export

- **Owner:** `code-puppy`
- **Planned files:**
  - `src/services/exportPlan.ts`
  - `src/features/io/ExportPlanButton.tsx`
- **Behavior:** Download the complete validated plan including `schemaVersion`, metadata, route, itinerary, activities, food entries, and budget. Use a readable filename based on a sanitized trip title and export date.

#### Task 5.3: Implement previewed, validated JSON import

- **Owner:** `code-puppy`
- **Planned files:**
  - `src/services/importPlan.ts`
  - `src/features/io/ImportPlanDialog.tsx`
  - `src/features/io/ImportValidationErrors.tsx`
- **Behavior:** Select a local JSON file; validate it before state changes; display a plan preview and replacement confirmation; preserve the current plan on parsing/validation failure; show field-level messages and expandable technical errors.

### Phase 6: Testing, Polish, and GitHub Pages Release

**Estimate:** 1–2 days

#### Task 6.1: Unit-test trip domain rules

- **Owner:** `qa-expert`
- **Planned files:** `src/domain/*.test.ts` and `src/schemas/*.test.ts`.
- **Coverage:** Date allocation and changed-date behavior; stop reordering and route rebuilding; destination-deletion cleanup; time-conflict warnings; INR budget totals; JSON schema validation; invalid-import handling.

#### Task 6.2: Test core user journeys

- **Owner:** `qa-kitten`
- **Validation journey:**
  1. Create a multi-city trip through the wizard.
  2. Reorder a route stop.
  3. Add a timed activity and observe its overlap warning.
  4. Add a must-taste item associated with a day and restaurant URL.
  5. Export JSON.
  6. Reset, import the JSON, and confirm that the plan is restored.
  7. Validate mobile layout behavior.

#### Task 6.3: Configure GitHub Pages deployment

- **Owner:** `code-puppy`
- **Planned files:**
  - `.github/workflows/deploy.yml`
  - Vite base-path configuration
  - `README.md`
- **Validation:** Production build succeeds; the deployed site loads routes/assets correctly on GitHub Pages; import/export works on static hosting as well as localhost.

## Risks and Considerations

- **Browser storage is not durable backup.** Clearing browser data may remove local drafts, so the UI should visibly encourage JSON exports.
- **Free-text destinations are deliberately lightweight.** They avoid map/geocoding APIs but permit spelling variation; treat entered names as user-owned text.
- **External cover-image URLs may fail.** Remote images can disappear or be blocked, so provide a graceful placeholder.
- **Maps URL recognition has limits.** Validate URL syntax and label recognized Google Maps links where possible, but do not claim correctness of a destination or route without API integration.
- **Complex route edits can cause accidental data loss.** Changing dates or deleting a stop must never silently discard activities or food entries.
- **Undo/redo history consumes memory.** Bound the history stack.
- **Route/date integrity is central.** Route edits affect later days; regenerate from the route model rather than treating day cards as disconnected data.
- **Scope control matters.** Live directions, geocoding, booking, live flight/hotel prices, and curated activity catalogs are separate product capabilities and remain out of scope for this MVP.
- **Reference design boundaries apply.** Reuse useful interaction patterns only; do not copy Pickyourtrail branding, imagery, text, or proprietary presentation.

## Alternatives Considered

### Recommended: React + Vite + localStorage + JSON files

- **Pros:** Fast, static-host friendly, no backend cost, and fully aligned with the frontend-only requirement.
- **Cons:** Plans stay tied to one browser until exported/imported.

### IndexedDB for local drafts

- **Pros:** Greater capacity and more robust storage for large plans or history.
- **Cons:** Extra implementation complexity; unnecessary for the initial MVP unless plans become very large.

### Interactive map later

- **Pros:** Geographic route visibility and richer destination exploration.
- **Cons:** Introduces provider/API decisions, possible usage costs, and more difficult mobile UX. It is not required for the approved Maps-link workflow.

### Map-first planner

- **Pros:** Strong visual exploration of multi-city routes.
- **Cons:** More complex UX and directions integration; a chronological route timeline is still needed for detailed planning.

### Booking-integrated travel marketplace

- **Pros:** Commercial potential and live pricing.
- **Cons:** Highest engineering, partnership, API, compliance, and pricing complexity; intentionally not part of this frontend-only planner.

## Next Steps

1. Begin Phase 1 with the React + Vite foundation, versioned trip schema, and local state architecture.
2. Keep the implementation browser-only and deployable as static GitHub Pages content.
3. Implement route/date integrity before adding itinerary editing UI; the generated route model remains the source of truth for day allocation.
4. Add import/export and local recovery before release so users have a portable backup beyond browser storage.
5. Complete domain and end-to-end user-journey testing, then validate the production GitHub Pages deployment.
