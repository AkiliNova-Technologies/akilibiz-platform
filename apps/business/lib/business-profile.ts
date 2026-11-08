import { z } from "zod";

const optionalText = (max: number) =>
  z
    .string()
    .trim()
    .max(max)
    .transform((value) => value || null)
    .nullable();

export const businessProfileSchema = z.object({
  name: z.string().trim().min(1, "Business name is required.").max(160),
  tradingName: optionalText(160),
  contactEmail: optionalText(320).refine(
    (value) => value === null || z.string().email().safeParse(value).success,
    "Enter a valid contact email address.",
  ),
  contactPhone: optionalText(32).refine(
    (value) => value === null || value.length >= 3,
    "Contact phone must contain at least 3 characters.",
  ),
  locale: z.string().trim().min(2).max(35),
  timeZone: z.string().trim().min(1).max(63),
  currencyCode: z
    .string()
    .trim()
    .toUpperCase()
    .regex(/^[A-Z]{3}$/, "Use a three-letter currency code, such as UGX."),
});

export type BusinessProfileInput = z.infer<typeof businessProfileSchema>;

export function businessProfileFromFormData(formData: FormData) {
  return businessProfileSchema.safeParse({
    name: formData.get("name"),
    tradingName: formData.get("tradingName"),
    contactEmail: formData.get("contactEmail"),
    contactPhone: formData.get("contactPhone"),
    locale: formData.get("locale"),
    timeZone: formData.get("timeZone"),
    currencyCode: formData.get("currencyCode"),
  });
}

export function firstValidationMessage(
  error: z.ZodError<BusinessProfileInput>,
) {
  return (
    error.issues[0]?.message ?? "Check the business details and try again."
  );
}
