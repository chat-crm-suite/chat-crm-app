import {
  AssignmentSettingsSchema,
  CompanyProfileSchema,
  type AssignmentSettings,
  type CompanyProfile,
  type UpdateAssignmentSettingsInput,
  type UpdateCompanyProfileInput,
} from '@chat-crm/contracts'
import { parseContract } from '@/lib/contract-parse'
import { client } from '@/lib/http'

const company = client('/company')

// Contract parse: coerces wire values (dates); strict in dev, tolerant in prod.
const parseProfile = (data: unknown): CompanyProfile =>
  parseContract(CompanyProfileSchema, data)

const parseAssignment = (data: unknown): AssignmentSettings =>
  parseContract(AssignmentSettingsSchema, data)

/** `GET /company/me`: the active company. */
export const getCompanyProfile = async (): Promise<CompanyProfile> => {
  const { data } = await company.get('/me')
  return parseProfile(data)
}

/** `PATCH /company/me` (admin). */
export const updateCompanyProfile = async (
  input: UpdateCompanyProfileInput
): Promise<CompanyProfile> => {
  const { data } = await company.patch('/me', input)
  return parseProfile(data)
}

/** `GET /company/me/assignment-settings`. */
export const getAssignmentSettings = async (): Promise<AssignmentSettings> => {
  const { data } = await company.get('/me/assignment-settings')
  return parseAssignment(data)
}

/** `PATCH /company/me/assignment-settings` (admin). */
export const updateAssignmentSettings = async (
  input: UpdateAssignmentSettingsInput
): Promise<AssignmentSettings> => {
  const { data } = await company.patch('/me/assignment-settings', input)
  return parseAssignment(data)
}
