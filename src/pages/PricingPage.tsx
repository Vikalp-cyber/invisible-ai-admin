import { useCallback, useEffect, useState } from 'react'
import { ApiError, listAdminPricing, patchPlanPricing } from '../lib/api'
import { formatDate, formatInr, formatInt } from '../lib/format'
import { useAuth } from '../context/AuthContext'
import type { PlanPricing, PlanPricingPatchBody } from '../types'

function planToForm(plan: PlanPricing) {
  return {
    amountRupees: String(plan.amountRupees),
    currency: plan.currency,
    displayName: plan.displayName,
    description: plan.description ?? '',
    tokensGranted: String(plan.tokensGranted),
    isActive: plan.isActive,
  }
}

export function PricingPage() {
  const { apiBase, adminAuth } = useAuth()
  const [plans, setPlans] = useState<PlanPricing[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)

  const [editingType, setEditingType] = useState<string | null>(null)
  const [amountRupees, setAmountRupees] = useState('')
  const [currency, setCurrency] = useState('INR')
  const [displayName, setDisplayName] = useState('')
  const [description, setDescription] = useState('')
  const [tokensGranted, setTokensGranted] = useState('')
  const [isActive, setIsActive] = useState(true)

  const load = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const res = await listAdminPricing(apiBase, adminAuth)
      setPlans(res.plans)
    } catch (e) {
      if (e instanceof ApiError && e.status === 401) {
        setError('Session expired or invalid credentials.')
      } else if (e instanceof ApiError) {
        setError(e.message)
      } else {
        setError('Failed to load pricing.')
      }
      setPlans([])
    } finally {
      setLoading(false)
    }
  }, [apiBase, adminAuth])

  useEffect(() => {
    void load()
  }, [load])

  function startEdit(plan: PlanPricing) {
    const f = planToForm(plan)
    setEditingType(plan.planType)
    setAmountRupees(f.amountRupees)
    setCurrency(f.currency)
    setDisplayName(f.displayName)
    setDescription(f.description)
    setTokensGranted(f.tokensGranted)
    setIsActive(f.isActive)
    setError(null)
  }

  function cancelEdit() {
    setEditingType(null)
    setError(null)
  }

  async function onSave(e: React.FormEvent) {
    e.preventDefault()
    if (!editingType) return

    const rupees = Number(amountRupees)
    const amountPaise = Math.round(rupees * 100)
    const tokens = Number.parseInt(tokensGranted, 10)

    if (!Number.isFinite(rupees) || amountPaise < 100) {
      setError('Price must be at least ₹1 (100 paise).')
      return
    }
    if (!Number.isFinite(tokens) || tokens < 1000) {
      setError('Tokens granted must be a whole number ≥ 1,000.')
      return
    }
    const cur = currency.trim().toUpperCase()
    if (cur.length !== 3) {
      setError('Currency must be a 3-letter code (e.g. INR).')
      return
    }
    const name = displayName.trim()
    if (!name || name.length > 120) {
      setError('Display name is required (max 120 characters).')
      return
    }
    if (description.length > 500) {
      setError('Description max length is 500 characters.')
      return
    }

    const body: PlanPricingPatchBody = {
      amountPaise,
      currency: cur,
      displayName: name,
      description: description.trim(),
      tokensGranted: tokens,
      isActive,
    }

    setBusy(true)
    setError(null)
    try {
      const updated = await patchPlanPricing(apiBase, adminAuth, editingType, body)
      setPlans((prev) =>
        prev.map((p) => (p.planType === updated.planType ? updated : p)),
      )
      setEditingType(null)
    } catch (err) {
      if (err instanceof ApiError) setError(err.message)
      else setError('Could not save pricing.')
    } finally {
      setBusy(false)
    }
  }

  const editingPlan = editingType ? plans.find((p) => p.planType === editingType) : null

  return (
    <div className="mx-auto max-w-5xl">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight text-white">Plan pricing</h1>
        <p className="mt-1 text-sm text-zinc-400">
          Razorpay catalog for the Windows app. Public pay screen uses{' '}
          <span className="font-mono text-zinc-500">GET /api/pricing/plans</span> (active plans
          only). Changes here apply to new checkouts immediately.
        </p>
      </div>

      {error ? (
        <div
          className="mt-6 rounded-xl border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-200"
          role="alert"
        >
          {error}
        </div>
      ) : null}

      <div className="mt-6 overflow-hidden rounded-2xl border border-zinc-800 bg-zinc-900/40">
        <div className="overflow-x-auto">
          <table className="min-w-full text-left text-sm">
            <thead>
              <tr className="border-b border-zinc-800 bg-zinc-900/80 text-xs font-semibold uppercase tracking-wide text-zinc-500">
                <th className="px-4 py-3">Plan</th>
                <th className="px-4 py-3">Price</th>
                <th className="px-4 py-3">Tokens</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3">Updated</th>
                <th className="px-4 py-3" />
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-800">
              {loading ? (
                <tr>
                  <td colSpan={6} className="px-4 py-12 text-center text-zinc-500">
                    Loading…
                  </td>
                </tr>
              ) : plans.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-4 py-12 text-center text-zinc-500">
                    No plans configured.
                  </td>
                </tr>
              ) : (
                plans.map((plan) => (
                  <tr key={plan.planType} className="hover:bg-zinc-800/40">
                    <td className="px-4 py-3">
                      <div className="font-mono text-xs text-violet-300">{plan.planType}</div>
                      <div className="mt-0.5 font-medium text-white">{plan.displayName}</div>
                      {plan.description ? (
                        <div className="mt-0.5 max-w-xs truncate text-xs text-zinc-500">
                          {plan.description}
                        </div>
                      ) : null}
                    </td>
                    <td className="whitespace-nowrap px-4 py-3 text-zinc-200">
                      {formatInr(plan.amountPaise)}
                      <div className="text-[10px] text-zinc-600">
                        {formatInt(plan.amountPaise)} paise · {plan.currency}
                      </div>
                    </td>
                    <td className="px-4 py-3 font-mono text-xs text-zinc-300">
                      {formatInt(plan.tokensGranted)}
                    </td>
                    <td className="px-4 py-3">
                      {plan.isActive ? (
                        <span className="rounded-full bg-emerald-500/15 px-2 py-0.5 text-[10px] font-medium text-emerald-300 ring-1 ring-emerald-500/30">
                          Active
                        </span>
                      ) : (
                        <span className="rounded-full bg-zinc-700/50 px-2 py-0.5 text-[10px] font-medium text-zinc-400 ring-1 ring-zinc-600">
                          Inactive
                        </span>
                      )}
                    </td>
                    <td className="whitespace-nowrap px-4 py-3 text-xs text-zinc-500">
                      {formatDate(plan.updatedAt)}
                    </td>
                    <td className="px-4 py-3">
                      <button
                        type="button"
                        disabled={busy}
                        onClick={() => startEdit(plan)}
                        className="rounded-lg border border-zinc-700 bg-zinc-900 px-2.5 py-1 text-xs font-medium text-zinc-200 hover:bg-zinc-800 disabled:opacity-50"
                      >
                        Edit
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {editingPlan ? (
        <form
          onSubmit={onSave}
          className="mt-8 space-y-4 rounded-2xl border border-violet-500/25 bg-zinc-900/50 p-6"
        >
          <h2 className="text-lg font-semibold text-white">
            Edit <span className="font-mono text-violet-300">{editingPlan.planType}</span>
          </h2>
          <p className="text-xs text-zinc-500">
            <span className="font-mono">PATCH /admin/pricing/{editingPlan.planType}</span> — all
            fields are sent on save.
          </p>

          <div className="grid gap-4 sm:grid-cols-2">
            <label className="block text-sm font-medium text-zinc-300">
              Price (₹)
              <input
                type="number"
                min={1}
                step={0.01}
                value={amountRupees}
                onChange={(e) => setAmountRupees(e.target.value)}
                required
                className="mt-1.5 w-full rounded-xl border border-zinc-700 bg-zinc-950 px-3 py-2 text-sm text-white outline-none focus:border-violet-500/40 focus:ring-2 focus:ring-violet-500/25"
              />
              <span className="mt-1 block text-xs text-zinc-600">Min ₹1 (100 paise on server)</span>
            </label>
            <label className="block text-sm font-medium text-zinc-300">
              Currency
              <input
                value={currency}
                onChange={(e) => setCurrency(e.target.value.toUpperCase())}
                maxLength={3}
                required
                className="mt-1.5 w-full rounded-xl border border-zinc-700 bg-zinc-950 px-3 py-2 font-mono text-sm uppercase text-white outline-none focus:border-violet-500/40 focus:ring-2 focus:ring-violet-500/25"
              />
            </label>
          </div>

          <label className="block text-sm font-medium text-zinc-300">
            Display name
            <input
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
              maxLength={120}
              required
              className="mt-1.5 w-full rounded-xl border border-zinc-700 bg-zinc-950 px-3 py-2 text-sm text-white outline-none focus:border-violet-500/40 focus:ring-2 focus:ring-violet-500/25"
            />
          </label>

          <label className="block text-sm font-medium text-zinc-300">
            Description
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              maxLength={500}
              rows={3}
              className="mt-1.5 w-full resize-none rounded-xl border border-zinc-700 bg-zinc-950 px-3 py-2 text-sm text-white outline-none focus:border-violet-500/40 focus:ring-2 focus:ring-violet-500/25"
            />
          </label>

          <label className="block text-sm font-medium text-zinc-300">
            Tokens granted (on successful payment)
            <input
              type="number"
              min={1000}
              step={1}
              value={tokensGranted}
              onChange={(e) => setTokensGranted(e.target.value)}
              required
              className="mt-1.5 w-full rounded-xl border border-zinc-700 bg-zinc-950 px-3 py-2 font-mono text-sm text-white outline-none focus:border-violet-500/40 focus:ring-2 focus:ring-violet-500/25"
            />
          </label>

          <label className="flex cursor-pointer items-center gap-2 text-sm text-zinc-300">
            <input
              type="checkbox"
              checked={isActive}
              onChange={(e) => setIsActive(e.target.checked)}
              className="h-4 w-4 rounded border-zinc-600 bg-zinc-950 text-violet-600"
            />
            Active (visible on public{' '}
            <span className="font-mono text-xs">/pricing/plans</span> and allows checkout)
          </label>

          <div className="flex flex-wrap gap-2 border-t border-zinc-800 pt-4">
            <button
              type="submit"
              disabled={busy}
              className="rounded-xl bg-violet-600 px-4 py-2 text-sm font-semibold text-white hover:bg-violet-500 disabled:opacity-50"
            >
              {busy ? 'Saving…' : 'Save changes'}
            </button>
            <button
              type="button"
              disabled={busy}
              onClick={cancelEdit}
              className="rounded-xl border border-zinc-700 bg-zinc-900 px-4 py-2 text-sm font-medium text-zinc-200 hover:bg-zinc-800 disabled:opacity-50"
            >
              Cancel
            </button>
          </div>
        </form>
      ) : null}
    </div>
  )
}
