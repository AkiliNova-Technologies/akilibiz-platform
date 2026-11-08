import { useEffect, useState } from "react";
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
  SheetFooter,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Separator } from "@/components/ui/separator";
import { IconEdit, IconPlus, IconUser, IconWallet } from "@tabler/icons-react";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";
import { useReduxCustomers } from "@/hooks/useReduxCustomers";
import type {
  CreateCustomerPayload,
  CustomerResponse,
  UpdateCustomerPayload,
} from "@/services/tauri/customers";
import { useI18n } from "@/hooks/useI18n";

interface CustomerSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  isEdit: boolean;
  initialData?: CustomerResponse | null;
}

interface CustomerFormData {
  name: string;
  email: string;
  phone: string;
  address: string;
  customer_type: string;
  credit_limit: string;
  opening_balance: string;
  is_active: boolean;
}

const CUSTOMER_TYPES = [
  { label: "Retail", value: "retail" },
  { label: "Wholesale", value: "wholesale" },
  { label: "VIP", value: "vip" },
  { label: "Corporate", value: "corporate" },
];

export function CustomerSheet({
  open,
  onOpenChange,
  isEdit,
  initialData,
}: CustomerSheetProps) {
  const { t } = useI18n();
  const {
    addCustomer,
    editCustomer,
    getCustomers,
    getCustomerSummary,
    loading,
  } = useReduxCustomers();

  const [formData, setFormData] = useState<CustomerFormData>({
    name: "",
    email: "",
    phone: "",
    address: "",
    customer_type: "",
    credit_limit: "",
    opening_balance: "",
    is_active: true,
  });

  const [errors, setErrors] = useState<Record<string, string>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (isEdit && initialData) {
      setFormData({
        name: initialData.name || "",
        email: initialData.email || "",
        phone: initialData.phone || "",
        address: initialData.address || "",
        customer_type: initialData.customer_type || "",
        credit_limit:
          initialData.credit_limit !== undefined &&
          initialData.credit_limit !== null
            ? String(initialData.credit_limit)
            : "",
        opening_balance:
          initialData.opening_balance !== undefined &&
          initialData.opening_balance !== null
            ? String(initialData.opening_balance)
            : "",
        is_active: initialData.is_active,
      });
    } else {
      setFormData({
        name: "",
        email: "",
        phone: "",
        address: "",
        customer_type: "",
        credit_limit: "",
        opening_balance: "",
        is_active: true,
      });
    }

    setErrors({});
  }, [isEdit, initialData, open]);

  const handleInputChange = (
    field: keyof CustomerFormData,
    value: string | boolean,
  ) => {
    setFormData((prev) => ({ ...prev, [field]: value }));

    if (errors[field]) {
      setErrors((prev) => {
        const next = { ...prev };
        delete next[field];
        return next;
      });
    }
  };

  const validateForm = () => {
    const nextErrors: Record<string, string> = {};

    if (!formData.name.trim()) {
      nextErrors.name = t("customers.nameRequired");
    }

    if (formData.email.trim() && !/\S+@\S+\.\S+/.test(formData.email.trim())) {
      nextErrors.email = t("customers.emailInvalid");
    }

    if (
      formData.credit_limit.trim() &&
      Number.isNaN(Number(formData.credit_limit))
    ) {
      nextErrors.credit_limit = t("customers.creditLimitInvalid");
    }

    if (
      formData.opening_balance.trim() &&
      Number.isNaN(Number(formData.opening_balance))
    ) {
      nextErrors.opening_balance = t("customers.openingBalanceInvalid");
    }

    if (formData.credit_limit.trim() && Number(formData.credit_limit) < 0) {
      nextErrors.credit_limit = t("customers.creditLimitNegative");
    }

    if (
      formData.opening_balance.trim() &&
      Number(formData.opening_balance) < 0
    ) {
      nextErrors.opening_balance = t("customers.openingBalanceNegative");
    }

    setErrors(nextErrors);
    return Object.keys(nextErrors).length === 0;
  };

  const handleSubmit = async (e?: React.FormEvent) => {
    e?.preventDefault();

    if (!validateForm()) return;

    setIsSubmitting(true);

    try {
      if (isEdit && initialData) {
        const payload: UpdateCustomerPayload = {
          name: formData.name.trim(),
          email: formData.email.trim() || null,
          phone: formData.phone.trim() || null,
          address: formData.address.trim() || null,
          customer_type: formData.customer_type.trim() || null,
          credit_limit: formData.credit_limit.trim()
            ? Number(formData.credit_limit)
            : null,
          opening_balance: formData.opening_balance.trim()
            ? Number(formData.opening_balance)
            : null,
          is_active: formData.is_active,
        };

        const result = await editCustomer(initialData.id, payload);
        if (!result) return;

        toast.success(t("customers.updated"));
      } else {
        const payload: CreateCustomerPayload = {
          name: formData.name.trim(),
          email: formData.email.trim() || null,
          phone: formData.phone.trim() || null,
          address: formData.address.trim() || null,
          customer_type: formData.customer_type.trim() || null,
          credit_limit: formData.credit_limit.trim()
            ? Number(formData.credit_limit)
            : null,
          opening_balance: formData.opening_balance.trim()
            ? Number(formData.opening_balance)
            : null,
          is_active: formData.is_active,
        };

        const result = await addCustomer(payload);
        if (!result) return;

        toast.success(t("customers.added"));
      }

      onOpenChange(false);
      await Promise.all([getCustomers(), getCustomerSummary()]);
    } catch (error) {
      console.error("Failed to save customer:", error);
      toast.error(t("customers.saveFailed"));
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        className="w-full sm:max-w-xl overflow-y-auto p-0 bg-white dark:bg-[#323232]"
        onOpenAutoFocus={(e) => e.preventDefault()}>
        <div className="sticky top-0 z-10 border-b border-gray-200 bg-white px-6 py-4 dark:border-gray-700 dark:bg-[#323232]">
          <SheetHeader className="text-left px-0">
            <div className="flex items-center gap-5">
              <div className="rounded-lg bg-primary/10 p-2">
                {isEdit ? (
                  <IconEdit className="size-5 text-primary" />
                ) : (
                  <IconPlus className="size-5 text-primary" />
                )}
              </div>

              <div>
                <SheetTitle className="text-xl text-gray-900 dark:text-primary">
                  {isEdit ? t("customers.edit") : t("customers.addNew")}
                </SheetTitle>
                <SheetDescription className="text-gray-600 dark:text-gray-400">
                  {isEdit
                    ? t("customers.editDescription")
                    : t("customers.addDescription")}
                </SheetDescription>
              </div>
            </div>
          </SheetHeader>
        </div>

        <div className="px-6 py-6">
          <form onSubmit={handleSubmit} className="space-y-8">
            {isEdit && initialData && (
              <div className="rounded-lg border border-gray-200 bg-gray-50 p-4 dark:border-gray-700 dark:bg-[#323232]">
                <div className="flex items-center gap-3">
                  <div className="rounded-full bg-primary/10 p-2">
                    <IconUser className="size-5 text-primary" />
                  </div>

                  <div>
                    <p className="font-semibold text-gray-900 dark:text-primary">
                      {initialData.name}
                    </p>
                    <p className="text-sm text-gray-600 dark:text-gray-400">
                      {initialData.email || t("customers.noEmail")}
                    </p>
                    <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                      {t("customers.customerId")}: {initialData.id} • Joined:{" "}
                      {new Date(initialData.created_at).toLocaleDateString()}
                    </p>
                  </div>
                </div>
              </div>
            )}

            {isEdit && initialData && (
              <Separator className="dark:bg-gray-700" />
            )}

            <div className="space-y-5">
              <div className="flex items-center gap-2">
                <div className="rounded-md bg-primary/10 p-1">
                  <IconUser className="size-4 text-primary" />
                </div>
                <h3 className="text-base font-semibold text-gray-900 dark:text-primary">
                  {t("customers.customerInformation")}
                </h3>
              </div>

              <div className="space-y-4">
                <div className="space-y-2">
                  <FieldLabel required htmlFor="name" className="text-sm dark:text-gray-300">
                    {t("customers.name")}
                  </FieldLabel>
                  <Input
                    id="name"
                    value={formData.name}
                    onChange={(e) => handleInputChange("name", e.target.value)}
                    placeholder={t("customers.name")}
                    required
                    aria-required="true"
                    disabled={isSubmitting}
                    className={`${errors.name ? "border-red-500" : ""} dark:bg-[#2c2c2c] dark:border-gray-600 dark:text-white dark:placeholder:text-gray-500`}
                  />
                  {errors.name && (
                    <p className="text-sm text-red-500">{errors.name}</p>
                  )}
                </div>

                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="space-y-2">
                    <Label
                      htmlFor="email"
                      className="text-sm dark:text-gray-300">
                      {t("customers.email")}
                    </Label>
                    <Input
                      id="email"
                      type="email"
                      value={formData.email}
                      onChange={(e) =>
                        handleInputChange("email", e.target.value)
                      }
                      placeholder="email@example.com"
                      disabled={isSubmitting}
                      className={`${errors.email ? "border-red-500" : ""} dark:bg-[#2c2c2c] dark:border-gray-600 dark:text-white dark:placeholder:text-gray-500`}
                    />
                    {errors.email && (
                      <p className="text-sm text-red-500">{errors.email}</p>
                    )}
                  </div>

                  <div className="space-y-2">
                    <Label
                      htmlFor="phone"
                      className="text-sm dark:text-gray-300">
                      {t("customers.phone")}
                    </Label>
                    <Input
                      id="phone"
                      value={formData.phone}
                      onChange={(e) =>
                        handleInputChange("phone", e.target.value)
                      }
                      placeholder="+256..."
                      disabled={isSubmitting}
                      className="dark:bg-[#2c2c2c] dark:border-gray-600 dark:text-white dark:placeholder:text-gray-500"
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label
                    htmlFor="address"
                    className="text-sm dark:text-gray-300">
                    {t("customers.address")}
                  </Label>
                  <Textarea
                    id="address"
                    value={formData.address}
                    onChange={(e) =>
                      handleInputChange("address", e.target.value)
                    }
                    placeholder={t("customers.address")}
                    rows={3}
                    disabled={isSubmitting}
                    className="dark:bg-[#2c2c2c] dark:border-gray-600 dark:text-white dark:placeholder:text-gray-500"
                  />
                </div>
              </div>
            </div>

            <Separator className="dark:bg-gray-700" />

            <div className="space-y-5">
              <div className="flex items-center gap-2">
                <div className="rounded-md bg-primary/10 p-1">
                  <IconWallet className="size-4 text-primary" />
                </div>
                <h3 className="text-base font-semibold text-gray-900 dark:text-primary">
                  {t("customers.accountConfiguration")}
                </h3>
              </div>

              <div className="space-y-4">
                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="space-y-2">
                    <Label className="text-sm dark:text-gray-300">
                      {t("customers.customerType")}
                    </Label>
                    <Select
                      value={formData.customer_type}
                      onValueChange={(value) =>
                        handleInputChange("customer_type", value)
                      }
                      disabled={isSubmitting}>
                      <SelectTrigger className="w-full dark:bg-[#2c2c2c] dark:border-gray-600 dark:text-white">
                        <SelectValue placeholder={t("customers.selectCustomerType")} />
                      </SelectTrigger>
                      <SelectContent className="dark:bg-[#2c2c2c] dark:border-gray-600">
                        {CUSTOMER_TYPES.map((type) => (
                          <SelectItem
                            key={type.value}
                            value={type.value}
                            className="dark:text-white">
                            {type.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label className="text-sm dark:text-gray-300">{t("sales.status")}</Label>
                    <Select
                      value={formData.is_active ? "Active" : "Inactive"}
                      onValueChange={(value) =>
                        handleInputChange("is_active", value === "Active")
                      }
                      disabled={isSubmitting}>
                      <SelectTrigger className="w-full dark:bg-[#2c2c2c] dark:border-gray-600 dark:text-white">
                        <SelectValue placeholder={t("customers.selectStatus")} />
                      </SelectTrigger>
                      <SelectContent className="dark:bg-[#2c2c2c] dark:border-gray-600">
                        <SelectItem value="Active" className="dark:text-white">
                          {t("common.active")}
                        </SelectItem>
                        <SelectItem
                          value="Inactive"
                          className="dark:text-white">
                          {t("common.inactive")}
                        </SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="space-y-2">
                    <Label
                      htmlFor="credit_limit"
                      className="text-sm dark:text-gray-300">
                      {t("customers.creditLimit")}
                    </Label>
                    <Input
                      id="credit_limit"
                      type="number"
                      value={formData.credit_limit}
                      onChange={(e) =>
                        handleInputChange("credit_limit", e.target.value)
                      }
                      placeholder="0"
                      disabled={isSubmitting}
                      className={`${errors.credit_limit ? "border-red-500" : ""} dark:bg-[#2c2c2c] dark:border-gray-600 dark:text-white dark:placeholder:text-gray-500`}
                    />
                    {errors.credit_limit && (
                      <p className="text-sm text-red-500">
                        {errors.credit_limit}
                      </p>
                    )}
                  </div>

                  <div className="space-y-2">
                    <Label
                      htmlFor="opening_balance"
                      className="text-sm dark:text-gray-300">
                      {t("customers.openingBalance")}
                    </Label>
                    <Input
                      id="opening_balance"
                      type="number"
                      value={formData.opening_balance}
                      onChange={(e) =>
                        handleInputChange("opening_balance", e.target.value)
                      }
                      placeholder="0"
                      disabled={isSubmitting}
                      className={`${errors.opening_balance ? "border-red-500" : ""} dark:bg-[#2c2c2c] dark:border-gray-600 dark:text-white dark:placeholder:text-gray-500`}
                    />
                    {errors.opening_balance && (
                      <p className="text-sm text-red-500">
                        {errors.opening_balance}
                      </p>
                    )}
                  </div>
                </div>
              </div>
            </div>

            <Separator className="dark:bg-gray-700" />

            <div className="rounded-lg border border-blue-200 bg-blue-50 p-3 dark:border-gray-600 dark:bg-[#2c2c2c]">
              <div className="flex items-start gap-2">
                <p className="text-sm text-blue-900 dark:text-gray-400">
                  <span className="font-medium dark:text-primary">Note:</span>{" "}
                  {t("customers.requiredNote")}
                </p>
              </div>
            </div>
          </form>
        </div>

        <div className="sticky bottom-0 border-t border-gray-200 bg-white px-6 py-4 dark:border-gray-700 dark:bg-[#323232]">
          <SheetFooter className="flex flex-row items-center gap-2 sm:gap-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              className="flex-1 border-gray-300 text-gray-700 hover:bg-gray-50 dark:bg-[#444444] dark:border-gray-600 dark:text-gray-300 dark:hover:bg-gray-700"
              disabled={isSubmitting}>
              {t("pos.cancel")}
            </Button>

            <Button
              type="submit"
              onClick={handleSubmit}
              className="flex-1"
              disabled={isSubmitting || loading}>
              {isSubmitting || loading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  {isEdit ? t("customers.updating") : t("customers.adding")}
                </>
              ) : (
                <>{isEdit ? t("customers.saveChanges") : t("customers.add")}</>
              )}
            </Button>
          </SheetFooter>
        </div>
      </SheetContent>
    </Sheet>
  );
}
