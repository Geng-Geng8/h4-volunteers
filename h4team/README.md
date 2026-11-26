# H4 Team Hub maintenance

The hub lives at `/h4team/`. Each section has an `index.html` in its own directory. The styles and browser interactions are in `assets/hub.css` and `assets/hub.js`. Serve the repository root for local review.

```sh
python3 -m http.server 8000
```

## Update content

- **Missions** live in `content/missions.json`. Keep mission IDs stable. Each mission keeps its existing URL ID and kit number (01–05), plus a title, goal, ordered steps, resources (`label` and `url`), approvals and completion criteria (`complete`). Task cards are linked automatically by their mission IDs.
- **Tasks** live in `content/tasks.json`. Add one object per approved card. Keep the kit IDs `T01`–`T20` stable. Set `minimumMinutes` and `minutes` to the lower and upper time estimates. The time filter uses the upper estimate. Keep checklist step order stable once published so existing checkmarks continue to refer to the same steps.
- **Resources** live in `content/resources.json`. Each category has a title and an array of items. Give each item a stable URL ID. An item can have a title, description, copyable text, a local preview image with width, height and alt text, a local download path, and an approved HTTPS link. Put approved files in `assets/` and use `../assets/` paths. Scan every approved QR at its intended print size and verify the destination.
- **Start Here, Leadership, Guides and Help** have their lesson copy in their section’s `index.html`. Update the existing sections and keep safety and adult escalation guidance visible.

Example task schema for editors, using fictional content

```json
{
  "id": "example-task",
  "title": "Review a draft message",
  "crew": "Media",
  "minutes": 20,
  "purpose": "Make the message easy to understand.",
  "missions": ["launch-your-school-team"],
  "steps": ["Read the draft.", "Suggest one change."],
  "resources": [{"label": "Draft from your H4 lead"}],
  "submit": "Send your suggestion through the official H4Hours assignment.",
  "approval": "Ask your lead for approval before sharing the message.",
  "assignment": "Review the draft message and suggest one improvement."
}
```

Use `Dance`, `Media` or `Ops` for the crew. Use ` / ` between crew names for shared tasks. Links such as `/h4team/tasks/#example-task` and `/h4team/missions/#launch-your-school-team` open the applicable card. Use the title and body from the H4Hours task bank. The copy action adds the instruction URL when it fits and caps text at 500 characters. Set the due date separately in H4Hours.

## Release and rollback

This branch integrates the student-facing sections of `Editable_Resource_Text.md` and the supplied H4Hours task bank. Public review assets are in `assets/launch-kit/`. The teacher handout and club plan contain only pages 1–2 of the teacher package. Keep the staff workshop checklist, director-only pilot material, private records and credentials out of the site and its download paths.

The supplied kit is a draft. H4 must approve the final content and design before publication. School approval is also required before sharing school promotions or running school activities. H4Hours handles official assignments, proof and hours.

After the owner approves content and authorizes release, check the GitHub Pages publishing source, complete the browser and live-link checks against the release candidate, and publish to the existing Pages source. Preserve `CNAME` and the root recruitment page’s form configuration. Smoke-test the recruitment page and the new routes on the custom domain. If the release must be rolled back, revert the release commit or redeploy the last known-good Pages source, then verify the recruitment page and its generated form URL. A platform publication or rollback requires owner authorization.

The recruitment page currently uses a CDN script and Google Fonts. Its Studio controls can be revealed with a URL parameter and keep changes in browser storage. Treat Studio as a local editor and keep privileged actions in authenticated services.
