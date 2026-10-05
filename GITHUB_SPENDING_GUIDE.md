# GitHub Zero-Spend Setup Guide

This guide provides exact, step-by-step click instructions to ensure your GitHub personal account (**KEERTHAN-089**) spends **$0** going forward, while keeping both **GitHub Codespaces** and **GitHub Copilot** enabled where possible.

---

## Part 1 — Delete All Codespaces (Stops Storage Charges Immediately)

Codespaces storage (`codespaces_storage`, billed in gigabyte-hours) accrues as long as a codespace **exists**, even when stopped. Deleting it is the only way to stop storage charges.

1. Click your **profile picture** (top-right corner of any GitHub page).
2. Click **"Your codespaces"**.
3. For **each codespace** listed:
   a. Click the **`⋯` (three-dot) menu** on the right side of that codespace row.
   b. Click **"Stop codespace"** — wait for it to reach "Stopped" state.
   c. Click the **`⋯` menu** again.
   d. Click **"Delete"**.
   e. Confirm deletion in the dialog that appears.
4. Repeat until the list is empty.

> **Why deleting matters:** A stopped (not deleted) codespace still consumes storage GB-hours. Only deletion ends the storage charge.

---

## Part 2 — Codespaces Settings: Smallest Machine & Shortest Timeout

Even if you create a new codespace later, these settings minimize future costs.

1. Click your **profile picture** → **"Settings"**.
2. In the left sidebar, click **"Codespaces"**.
3. Under **"Default machine type"**, select the **smallest available option** (e.g., "2-core · 8 GB RAM · 32 GB storage").
4. Under **"Default idle timeout"**, set it to **5 minutes** (the minimum allowed).
5. Click **"Save"** (or the equivalent save button next to each setting).

---

## Part 3 — Set Codespaces Spending Limit to $0

This hard-caps any future Codespaces compute and storage charges.

1. Click your **profile picture** → **"Settings"**.
2. In the left sidebar, scroll down to **"Billing and plans"** and click it.
3. Look for a **"Spending limits"** or **"Budgets"** section.
4. Find the **Codespaces** row/card.
5. Click **"Edit limit"** (or **"Manage budget"**).
6. Set the value to **`0`** (zero dollars).
7. Click **"Save"** / **"Update"**.

> **If you see $0 is not allowed:** Set it to the minimum (e.g., $1) and rely on Part 1 (deleting all codespaces) to prevent any charges. GitHub will not charge for Codespaces you have deleted.

> **If there is no Spending Limits section:** Your plan may not support metered Codespaces overages — which means no charges can occur beyond your included quota. Deleting all codespaces (Part 1) is still the safest step.

---

## Part 4 — Disable / Cap Copilot Premium Request Charges

Your billing CSV shows `copilot_premium_request` usage (metered, billed per request). These are charges from using **premium AI models** (e.g., Claude, GPT-4o) in Copilot Chat beyond the free-tier allowance. You can prevent them without disabling Copilot entirely.

### Step 4a — Set Copilot Premium Requests Spending Limit to $0

1. Click your **profile picture** → **"Settings"**.
2. Click **"Billing and plans"** in the left sidebar.
3. In the **"Spending limits"** or **"Budgets"** section, find the **Copilot** row/card.
4. Click **"Edit limit"** / **"Manage budget"**.
5. Set the value to **`0`** (zero dollars).
6. Click **"Save"** / **"Update"**.

### Step 4b — Turn Off Copilot Premium Model Access in Copilot Settings

1. Click your **profile picture** → **"Settings"**.
2. In the left sidebar, click **"Copilot"**.
3. Look for a section about **"Premium requests"**, **"Additional models"**, **"Metered usage"**, or **"Pay-as-you-go features"**.
4. **Toggle off** any option that mentions:
   - Premium requests
   - Metered / pay-as-you-go
   - Additional model access (e.g., Claude, GPT-4o, etc.)
5. Click **"Save"** if a save button appears.

### Step 4c — Use Only the Default (Included) Copilot Model

Going forward, when using GitHub Copilot Chat (in VS Code, the web UI, or other editors):

- **Do NOT select a premium model** from the model picker (if one is shown). Stick with the **default** model (labelled as "Included" or the standard Copilot model).
- Premium models (marked as "Premium" or with a request counter) consume metered `copilot_premium_request` tokens.
- Regular code completions and the default Copilot Chat model are **included in your plan** and do not generate metered charges.

---

## Part 5 — Verification Checklist (Next 2–3 Days)

Check these pages to confirm no new charges are accruing:

| What to check | Where to go | What to look for |
|---|---|---|
| Codespaces list is empty | Profile menu → "Your codespaces" | No codespaces listed |
| No new storage usage | Settings → Billing and plans → Usage | `codespaces_storage` rows have **0 GB-hours** |
| No new Copilot premium usage | Settings → Billing and plans → Usage | `copilot_premium_request` rows absent or **0 requests** |
| Spending limits are set | Settings → Billing and plans → Spending limits | Codespaces = $0, Copilot = $0 |
| Current period spend | Settings → Billing and plans | "Current usage" or "Amount due" shows **$0.00** |

**Recommended schedule:**
- **Day 1 (today):** Complete all steps in Parts 1–4. Take note of any codespaces you deleted.
- **Day 2 (tomorrow):** Check Usage page — confirm no new `codespaces_storage` rows appear.
- **Day 3:** Check again. If both days show zero new usage, you are safe.

---

## Part 6 — Fallback Plan (If $0 Hard Cap Is Not Available in the UI)

If GitHub's UI does not offer a $0 spending limit for either product, use the following approach to guarantee zero charges:

### Codespaces Fallback
- **Delete all codespaces** (Part 1) — this is the single most effective action. No codespace = no storage charge.
- **Never create a new codespace** in a repository that has large files or dependencies if you are not actively using it.
- If you must use Codespaces, **always delete the codespace when finished** rather than just stopping it.

### Copilot Premium Request Fallback
- In your editor (VS Code, JetBrains, etc.), **always use the default Copilot model** — never switch to a premium/alternative model.
- Do not use any Copilot feature that shows a "premium request" counter or indicator.
- If you are unsure whether a model is premium, use the **Copilot Chat in the GitHub.com web UI**, which shows the model name clearly — use only the default.

### General Safety Net
- **Remove your payment method** from GitHub Billing if you want a hard guarantee that no charge can ever succeed:
  - Settings → Billing and plans → Payment information → Remove card
  - ⚠️ Note: This may disable some paid features or cause account issues if you have any active paid plan. Only do this if you are on a free plan.
- **Downgrade to GitHub Free** if you are not using any paid features — this eliminates all metered billing surfaces.

---

## Quick Reference: All Key URLs

| Action | URL |
|---|---|
| Your codespaces list | `https://github.com/codespaces` |
| Codespaces settings | `https://github.com/settings/codespaces` |
| Billing & plans | `https://github.com/settings/billing` |
| Spending limits | `https://github.com/settings/billing/spending_limit` |
| Copilot settings | `https://github.com/settings/copilot` |
| Usage report | `https://github.com/settings/billing/usage` |
