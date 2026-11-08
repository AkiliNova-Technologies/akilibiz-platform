import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { FieldLabel } from "@/components/ui/field";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetFooter,
} from "@/components/ui/sheet";
import { Separator } from "@/components/ui/separator";
import {
  IconEdit,
  IconUser,
  IconBriefcase,
  IconInfoCircle,
  IconCheck,
  IconPlus,
  IconLock,
} from "@tabler/icons-react";
import { Loader2 } from "lucide-react";
import { useReduxStaff } from "@/hooks/useReduxStaff";
import { toast } from "sonner";
import type { StaffMember, CreateStaffPayload } from "@/services/tauri/staff";
import { useI18n } from "@/hooks/useI18n";

// ============================================================================
// TYPES
// ============================================================================

interface StaffFormProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  isEdit: boolean;
  initialData?: StaffMember | null;
}

interface FormData {
  username: string;
  full_name: string;
  email: string;
  password: string;
  confirm_password: string;
  phone: string;
  role_id: number;
  is_active: boolean;
  notes: string;
}

// ============================================================================
// STAFF FORM COMPONENT
// ============================================================================

export function StaffSheet({
  open,
  onOpenChange,
  isEdit,
  initialData,
}: StaffFormProps) {
  const { t } = useI18n();
  const { addStaff, editStaff, getStaff, getStaffRoles, roles, loading } =
    useReduxStaff();

  const [formData, setFormData] = useState<FormData>({
    username: "",
    full_name: "",
    email: "",
    password: "",
    confirm_password: "",
    phone: "",
    role_id: 0,
    is_active: true,
    notes: "",
  });

  const [errors, setErrors] = useState<Record<string, string>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (open) {
      getStaffRoles();
    }
  }, [open, getStaffRoles]);

  // Initialize form with initial data when in edit mode
  useEffect(() => {
    if (isEdit && initialData) {
      setFormData({
        username: initialData.username,
        full_name: initialData.full_name || "",
        email: initialData.email || "",
        password: "",
        confirm_password: "",
        phone: initialData.phone || "",
        role_id: initialData.role_id,
        is_active: initialData.is_active,
        notes: initialData.notes || "",
      });
    } else {
      setFormData({
        username: "",
        full_name: "",
        email: "",
        password: "",
        confirm_password: "",
        phone: "",
        role_id: 0,
        is_active: true,
        notes: "",
      });
    }
    setErrors({});
  }, [isEdit, initialData, open]);

  // Validate form
  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {};

    if (!formData.username.trim()) {
      newErrors.username = t("staff.usernameRequired");
    }

    if (!formData.email.trim()) {
      newErrors.email = t("staff.emailRequired");
    } else if (!/\S+@\S+\.\S+/.test(formData.email)) {
      newErrors.email = t("staff.emailInvalid");
    }

    if (!isEdit) {
      if (!formData.password) {
        newErrors.password = t("staff.passwordRequired");
      } else if (formData.password.length < 6) {
        newErrors.password = t("staff.passwordTooShort");
      }

      if (formData.password !== formData.confirm_password) {
        newErrors.confirm_password = t("staff.passwordsDoNotMatch");
      }
    }

    if (!formData.role_id) {
      newErrors.role_id = t("staff.roleRequired");
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  // Handle input changes
  const handleInputChange = (
    field: keyof FormData,
    value: string | boolean | number,
  ) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
    // Clear error for this field when user starts typing
    if (errors[field]) {
      setErrors((prev) => {
        const newErrors = { ...prev };
        delete newErrors[field];
        return newErrors;
      });
    }
  };

  // Handle form submission
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!validateForm()) {
      return;
    }

    setIsSubmitting(true);
    try {
      if (isEdit && initialData) {
        const staffData = {
          full_name: formData.full_name.trim() || null,
          email: formData.email.trim() || null,
          phone: formData.phone.trim() || null,
          role_id: formData.role_id,
          job_title: null,
          branch_name: null,
          notes: formData.notes.trim() || null,
          is_active: formData.is_active,
        };
        const success = await editStaff(initialData.id, staffData);
        if (success) {
          toast.success(t("staff.updated"));
          onOpenChange(false);
          getStaff();
        }
      } else {
        const staffData: CreateStaffPayload = {
          username: formData.username.trim(),
          full_name: formData.full_name.trim(),
          email: formData.email.trim() || null,
          password: formData.password,
          phone: formData.phone.trim() || null,
          role_id: formData.role_id,
          job_title: null,
          branch_name: null,
          notes: formData.notes.trim() || null,
        };

        await addStaff(staffData);
        toast.success(t("staff.added"));
        onOpenChange(false);
        await getStaff();
      }
    } catch (error) {
      console.error("Failed to save staff:", error);
      toast.error(t("staff.saveFailed"));
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        className="w-full sm:max-w-xl overflow-y-auto p-0 bg-white dark:bg-[#323232]"
        onOpenAutoFocus={(e) => e.preventDefault()}
      >
        {/* Fixed: Removed backdrop-blur-sm */}
        <div className="sticky top-0 z-10 border-b border-gray-200 bg-white px-6 py-4 dark:border-gray-700 dark:bg-[#323232]">
          <SheetHeader className="text-left dark:bg-[#323232] px-0">
            <div className="flex items-center gap-5">
              <div className="p-2 rounded-lg bg-primary/10">
                {isEdit ? (
                  <IconEdit className="size-5 text-primary" />
                ) : (
                  <IconPlus className="size-5 text-primary" />
                )}
              </div>
              <div>
                <SheetTitle className="text-xl text-gray-900 dark:text-primary">
                  {isEdit ? t("staff.editMember") : t("staff.addNew")}
                </SheetTitle>
                <SheetDescription className="text-gray-600 dark:text-gray-400">
                  {isEdit
                    ? t("staff.editDescription")
                    : t("staff.addDescription")}
                </SheetDescription>
              </div>
            </div>
          </SheetHeader>
        </div>

        <div className="px-6 py-6">
          <form onSubmit={handleSubmit} className="space-y-8">
            {/* Staff Info Preview (Edit Mode) */}
            {isEdit && initialData && (
              <div className="p-4 bg-gray-50 rounded-lg border border-gray-200 dark:bg-[#323232] dark:border-gray-700">
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-full bg-primary/10">
                    <IconUser className="size-5 text-primary" />
                  </div>
                  <div>
                    <p className="font-semibold text-gray-900 dark:text-primary">
                      {initialData.full_name || initialData.username}
                    </p>
                    <p className="text-sm text-gray-600 dark:text-gray-400">
                      {initialData.email}
                    </p>
                    <p className="text-xs text-gray-500 mt-1 dark:text-gray-400">
                      Staff ID: {initialData.id} • Joined:{" "}
                      {new Date(initialData.created_at).toLocaleDateString()}
                    </p>
                  </div>
                </div>
              </div>
            )}

            {isEdit && initialData && (
              <Separator className="dark:bg-gray-700" />
            )}

            {/* Personal Information */}
            <div className="space-y-5">
              <div className="flex items-center gap-2">
                <div className="p-1 rounded-md bg-primary/10">
                  <IconUser className="size-4 text-primary" />
                </div>
                <h3 className="text-base font-semibold text-gray-900 dark:text-primary">
                  Personal Information
                </h3>
              </div>

              <div className="space-y-4">
                {!isEdit && (
                  <div className="space-y-2">
                    <FieldLabel
                      required
                      htmlFor="username"
                      className="text-sm dark:text-gray-300"
                    >
                      {t("staff.username")}
                    </FieldLabel>
                    <Input
                      id="username"
                      required
                      type="text"
                      value={formData.username}
                      onChange={(e) =>
                        handleInputChange("username", e.target.value)
                      }
                      placeholder={t("staff.enterUsername")}
                      disabled={isSubmitting}
                      className={`${errors.username ? "border-red-500" : ""} dark:bg-[#2c2c2c] dark:border-gray-600 dark:text-white dark:placeholder:text-gray-500`}
                    />
                    {errors.username && (
                      <p className="text-sm text-red-500">{errors.username}</p>
                    )}
                    <p className="text-xs text-muted-foreground dark:text-gray-400">
                      Unique identifier for login
                    </p>
                  </div>
                )}

                <div className="space-y-2">
                  <Label
                    htmlFor="full_name"
                    className="text-sm dark:text-gray-300"
                  >
                    {t("staff.fullName")}
                  </Label>
                  <Input
                    id="full_name"
                    type="text"
                    value={formData.full_name}
                    onChange={(e) =>
                      handleInputChange("full_name", e.target.value)
                    }
                    placeholder={t("staff.enterFullName")}
                    disabled={isSubmitting}
                    className="dark:bg-[#2c2c2c] dark:border-gray-600 dark:text-white dark:placeholder:text-gray-500"
                  />
                  <p className="text-xs text-muted-foreground dark:text-gray-400">
                    Optional. Leave empty to use username.
                  </p>
                </div>

                <div className="space-y-2">
                  <FieldLabel required htmlFor="email" className="text-sm dark:text-gray-300">
                    {t("staff.emailAddress")}
                  </FieldLabel>
                  <Input
                    id="email"
                    required
                    type="email"
                    value={formData.email}
                    onChange={(e) => handleInputChange("email", e.target.value)}
                    placeholder="email@example.com"
                    disabled={isSubmitting}
                    className={`${errors.email ? "border-red-500" : ""} dark:bg-[#2c2c2c] dark:border-gray-600 dark:text-white dark:placeholder:text-gray-500`}
                  />
                  {errors.email && (
                    <p className="text-sm text-red-500">{errors.email}</p>
                  )}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="phone" className="text-sm dark:text-gray-300">
                    {t("staff.phoneNumber")}
                  </Label>
                  <Input
                    id="phone"
                    type="tel"
                    value={formData.phone}
                    onChange={(e) => handleInputChange("phone", e.target.value)}
                    placeholder="+1 (555) 123-4567"
                    disabled={isSubmitting}
                    className="dark:bg-[#2c2c2c] dark:border-gray-600 dark:text-white dark:placeholder:text-gray-500"
                  />
                </div>
              </div>
            </div>

            <Separator className="dark:bg-gray-700" />

            {/* Account Security (Add Mode Only) */}
            {!isEdit && (
              <>
                <div className="space-y-5">
                  <div className="flex items-center gap-2">
                    <div className="p-1 rounded-md bg-primary/10">
                      <IconLock className="size-4 text-primary" />
                    </div>
                    <h3 className="text-base font-semibold text-gray-900 dark:text-primary">
                      {t("staff.accountSecurity")}
                    </h3>
                  </div>

                  <div className="space-y-4">
                    <div className="space-y-2">
                      <FieldLabel
                        required
                        htmlFor="password"
                        className="text-sm dark:text-gray-300"
                      >
                        {t("auth.password")}
                      </FieldLabel>
                      <Input
                        id="password"
                        required
                        type="password"
                        value={formData.password}
                        onChange={(e) =>
                          handleInputChange("password", e.target.value)
                        }
                        placeholder="Enter password"
                        disabled={isSubmitting}
                        className={`${errors.password ? "border-red-500" : ""} dark:bg-[#2c2c2c] dark:border-gray-600 dark:text-white dark:placeholder:text-gray-500`}
                      />
                      {errors.password && (
                        <p className="text-sm text-red-500">
                          {errors.password}
                        </p>
                      )}
                      <p className="text-xs text-muted-foreground dark:text-gray-400">
                        Minimum 6 characters
                      </p>
                    </div>

                    <div className="space-y-2">
                      <FieldLabel
                        required
                        htmlFor="confirm_password"
                        className="text-sm dark:text-gray-300"
                      >
                        {t("staff.confirmPassword")}
                      </FieldLabel>
                      <Input
                        id="confirm_password"
                        required
                        type="password"
                        value={formData.confirm_password}
                        onChange={(e) =>
                          handleInputChange("confirm_password", e.target.value)
                        }
                        placeholder="Confirm password"
                        disabled={isSubmitting}
                        className={`${errors.confirm_password ? "border-red-500" : ""} dark:bg-[#2c2c2c] dark:border-gray-600 dark:text-white dark:placeholder:text-gray-500`}
                      />
                      {errors.confirm_password && (
                        <p className="text-sm text-red-500">
                          {errors.confirm_password}
                        </p>
                      )}
                    </div>
                  </div>
                </div>

                <Separator className="dark:bg-gray-700" />
              </>
            )}

            {/* Employment Details */}
            <div className="space-y-5">
              <div className="flex items-center gap-2">
                <div className="p-1 rounded-md bg-primary/10">
                  <IconBriefcase className="size-4 text-primary" />
                </div>
                <h3 className="text-base font-semibold text-gray-900 dark:text-primary">
                  {t("staff.employmentDetails")}
                </h3>
              </div>

              <div className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="role" className="text-sm dark:text-gray-300">
                    {t("staff.role")} <span className="text-red-500">*</span>
                  </Label>
                  <Select
                    value={formData.role_id ? String(formData.role_id) : ""}
                    onValueChange={(value) =>
                      handleInputChange("role_id", Number(value))
                    }
                    disabled={isSubmitting}
                  >
                    <SelectTrigger className="w-full">
                      <SelectValue placeholder={t("staff.selectRole")} />
                    </SelectTrigger>

                    <SelectContent>
                      {roles.map((role) => (
                        <SelectItem key={role.id} value={String(role.id)}>
                          {role.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  {errors.role && (
                    <p className="text-sm text-red-500">{errors.role}</p>
                  )}
                </div>

                <div className="space-y-2">
                  <Label
                    htmlFor="is_active"
                    className="text-sm dark:text-gray-300"
                  >
                    {t("staff.accountStatus")} <span className="text-red-500">*</span>
                  </Label>
                  <Select
                    value={formData.is_active ? "Active" : "Inactive"}
                    onValueChange={(value) =>
                      handleInputChange("is_active", value === "Active")
                    }
                    disabled={isSubmitting}
                  >
                    <SelectTrigger
                      id="is_active"
                      className="w-full dark:bg-[#2c2c2c] dark:border-gray-600 dark:text-white dark:placeholder:text-gray-500"
                    >
                      <SelectValue placeholder={t("staff.selectStatus")} />
                    </SelectTrigger>
                    <SelectContent className="dark:bg-[#2c2c2c] dark:border-gray-600">
                      <SelectItem
                        value="Active"
                        className="dark:text-white dark:hover:bg-[#444444]"
                      >
                        Active
                      </SelectItem>
                      <SelectItem
                        value="Inactive"
                        className="dark:text-white dark:hover:bg-[#444444]"
                      >
                        Inactive
                      </SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </div>

            <Separator className="dark:bg-gray-700" />

            {/* Additional Notes */}
            <div className="space-y-5">
              <div className="flex items-center gap-2">
                <div className="p-1 rounded-md bg-primary/10">
                  <IconInfoCircle className="size-4 text-primary" />
                </div>
                <h3 className="text-base font-semibold text-gray-900 dark:text-primary">
                  {t("staff.additionalInformation")}
                </h3>
              </div>

              <div className="space-y-2">
                <Label htmlFor="notes" className="text-sm dark:text-gray-300">
                  {t("staff.notes")}
                </Label>
                <Textarea
                  id="notes"
                  value={formData.notes}
                  onChange={(e) => handleInputChange("notes", e.target.value)}
                  placeholder={t("staff.notesPlaceholder")}
                  rows={3}
                  disabled={isSubmitting}
                  className="dark:bg-[#2c2c2c] dark:border-gray-600 dark:text-white dark:placeholder:text-gray-500"
                />
              </div>
            </div>

            {/* Required Fields Note */}
            <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg dark:bg-[#2c2c2c] dark:border-gray-600">
              <p className="text-sm text-blue-900 dark:text-gray-400">
                <span className="font-medium dark:text-primary">Note:</span>{" "}
                Fields marked with <span className="text-red-500">*</span> are
                required.
              </p>
            </div>
          </form>
        </div>

        {/* Fixed: Removed backdrop-blur-sm */}
        <div className="sticky bottom-0 border-t border-gray-200 bg-white px-6 py-4 dark:border-gray-700 dark:bg-[#323232]">
          <SheetFooter className="flex flex-row items-center gap-2 sm:gap-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              className="flex-1 border-gray-300 text-gray-700 hover:bg-gray-50 dark:bg-[#444444] dark:border-gray-600 dark:text-gray-300 dark:hover:bg-gray-700"
              disabled={isSubmitting}
            >
              {t("common.cancel")}
            </Button>
            <Button
              type="submit"
              onClick={handleSubmit}
              className="flex-1"
              disabled={isSubmitting || loading}
            >
              {isSubmitting || loading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  {isEdit ? t("staff.updating") : t("staff.adding")}
                </>
              ) : (
                <>
                  <IconCheck className="size-4 mr-2" />
                  {isEdit ? t("staff.saveChanges") : t("staff.add")}
                </>
              )}
            </Button>
          </SheetFooter>
        </div>
      </SheetContent>
    </Sheet>
  );
}
