import {
  AssignmentSettingsSchema,
  CompanyProfileSchema,
  type AssignmentSettings,
  type CompanyProfile,
  type UpdateAssignmentSettingsInput,
  type UpdateCompanyProfileInput,
} from '@chat-crm/contracts'
import { client } from '@/lib/http'

const company = client('/company')

// Dev-only runtime checks: they catch API/contract drift immediately.
const parseProfile = (data: unknown): CompanyProfile =>
  import.meta.env.DEV
    ? CompanyProfileSchema.parse(data)
    : (data as CompanyProfile)

const parseAssignment = (data: unknown): AssignmentSettings =>
  import.meta.env.DEV
    ? AssignmentSettingsSchema.parse(data)
    : (data as AssignmentSettings)

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
