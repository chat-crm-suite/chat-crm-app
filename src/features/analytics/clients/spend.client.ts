import {
  SpendSummarySchema,
  type BillablePauseInput,
  type UpdateBudgetInput,
  type UpdateChannelRatesInput,
} from '@chat-crm/contracts'
import { client } from '@/lib/http'
import { devParse } from '../lib/dev-parse'

/** `/billing/*` (admin): channel spend, rates, budget and the billable pause. */
const billing = client('/billing')

export const getSpendSummary = async (month?: string) => {
  const { data } = await billing.get('/spend', {
    params: month ? { month } : undefined,
  })
  return devParse(SpendSummarySchema, data)
}

export const updateChannelRates = async (input: UpdateChannelRatesInput) => {
  await billing.put('/rates', input)
}

export const updateBudget = async (input: UpdateBudgetInput) => {
  await billing.put('/budget', input)
}

export const setBillablePause = async (input: BillablePauseInput) => {
  await billing.post('/pause', input)
}
