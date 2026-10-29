# Wagba — User Flows

> The two journeys the app exists for, step by step. Screen contents are in [screens.md](screens.md); what happens on the network and the device is in [../tech/](../tech/).

Everything in Wagba is one of these two stories. The first version has exactly one loop each.

## The core loop

1. Open the app, see meals near you.
2. Tap one, read the details.
3. Tap the WhatsApp button, land in a chat with the cook.
4. Optionally: add a meal of your own.

That is the whole product. Anything that lengthens step 1, 2, or 3 is a defect.

## Flow 1: The explorer

**Goal.** Find a meal nearby and reach the cook, as fast as possible.

1. **Open the app.** First run shows Welcome; one tap to continue. The anonymous account already exists by then.
2. **Home loads.** The app takes one GPS reading and queries meals near it, nearest first. If permission was denied, this is where the flow stops with a reason and a retry — not an empty list.
3. **Browse or search.** Search covers the meal's text and the cook's name ([fields](../tech/data-model.md#search)). Unavailable meals never surface here.
4. **Open a meal.** Photos, full description, price, quantity, availability, pickup method, the cook's location text as they wrote it, distance from the viewer, and the cook's identity with optional social links.
5. **Tap the WhatsApp button.** The device opens a chat with the cook. Behavior when WhatsApp is not installed: [../tech/integrations.md](../tech/integrations.md#whatsapp).
6. **Conversation continues off-app.** The buyer can return and keep browsing.

**Branch points.**
- No meals nearby → empty state with an add-meal prompt.
- No search results → short message, no illustration.
- Offline → cached feed with a staleness banner; the flow still works for browsing, and the WhatsApp button still works because the number is already on screen.
- A meal deleted while open → not-found message, back to Home.

**What this flow never does.** Ask for sign-in, show a cart, request a rating, or expose the cook's coordinate.

## Flow 2: The cook

**Goal.** Publish a home meal and keep it accurate with no ceremony.

### First post

1. Tap **Add Meal** from anywhere.
2. The app finds the profile incomplete and routes to **Profile Setup** first.
3. Enter display name, WhatsApp number, and location text. The handle is generated from the display name, shown once for editing, and freezes on save; avatar and social links are optional. Save returns to the form.
4. A GPS fix is captured for the meal. If permission is denied, publishing is blocked with a stated reason.
5. Fill the meal: up to five photos, name required, the rest optional.
6. Publish. The meal appears in Home for nearby buyers and in My Meals.

### Later posts

Same path minus steps 2 and 3. Profile Setup never interrupts again.

### Managing published meals

From **Settings → My Meals**, across all / available / unavailable:
- Edit any field, including photos and their order.
- Toggle availability.
- Delete, with confirmation.

Marking a meal unavailable removes it from every buyer's Home and search immediately, while it stays in the cook's own list. That asymmetry is the whole point of having a status instead of a delete.

**Branch points.**
- Offline → publishing is blocked with the reason; there is no local draft queue.
- Photo capture fails or a single file exceeds the compression ceiling → the field reports it and the rest of the form survives.
- Location capture fails → the cook can retry; the form keeps everything already typed.

## Shared properties

- **No sign-in anywhere.** The account is provisioned silently on first launch. Reinstalling loses ownership of previously posted meals until phone verification exists. Recorded in [../decisions.md](../decisions.md).
- **Personal details are asked for once**, at the first post, not at install.
- **Communication always leaves the app.**
- **The bottom bar is stable** across browse screens so the add-meal action is never more than one tap.

## Summary

| Story | Goal | Terminal action |
|---|---|---|
| Explorer | Find a meal, reach the cook | WhatsApp chat opens |
| Cook | Publish and stay accurate | Publish, edit, or mark unavailable |
