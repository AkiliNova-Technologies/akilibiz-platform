import { useState, useEffect, useMemo, useCallback } from "react";
import { format } from "date-fns";
import { toast } from "sonner";

import { SiteHeader } from "@/components/site-header";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { FieldLabel } from "@/components/ui/field";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

import {
  IconUser,
  IconMail,
  IconPhone,
  IconShield,
  IconEdit,
  IconLock,
  IconLogout,
  IconCheck,
} from "@tabler/icons-react";

import { useReduxAuth } from "@/hooks/useReduxAuth";
import { useReduxStaff } from "@/hooks/useReduxStaff";
import { useI18n } from "@/hooks/useI18n";

// ============================================================================
// TYPES
// ============================================================================

interface ProfileFormData {
  full_name: string;
  email: string;
  phone: string;
  password: string;
  current_password: string;
  confirm_password: string;
  notes: string;
}

interface ProfileData {
  id: number;
  full_name?: string;
  username?: string;
  email: string | null;
  phone?: string | null;
  role: string;
  is_active: boolean;
  last_login?: string;
  created_at: string;
  updated_at: string;
}

// ============================================================================
// MAIN COMPONENT
// ============================================================================

export default function AccountProfilePage() {
  const { t } = useI18n();
  const { user: authUser, signOut } = useReduxAuth();
  const { staff, getStaff, editStaff } = useReduxStaff();

  const [profileData, setProfileData] = useState<ProfileData | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [passwordDialogOpen, setPasswordDialogOpen] = useState(false);

  const [formData, setFormData] = useState<ProfileFormData>({
    full_name: "",
    email: "",
    phone: "",
    password: "",
    current_password: "",
    confirm_password: "",
    notes: "",
  });

  const [errors, setErrors] = useState<Record<string, string>>({});

  // ============================================================================
  // EFFECTS
  // ============================================================================

  useEffect(() => {
    if (authUser && staff.length > 0) {
      const currentStaff = staff.find(
        (s) =>
          s.email === authUser.email ||
          (s.full_name &&
            authUser.full_name &&
            s.full_name.includes(authUser.full_name)),
      );

      if (currentStaff) {
        setProfileData({
          id: currentStaff.id,
          full_name: currentStaff.full_name,
          username: currentStaff.username,
          email: currentStaff.email || "",
          phone: currentStaff.phone || "",
          role: currentStaff.role_name,
          is_active: currentStaff.is_active,
          created_at: currentStaff.created_at,
          updated_at: currentStaff.updated_at,
        });

        setFormData({
          full_name: currentStaff.full_name || "",
          email: currentStaff?.email || "",
          phone: currentStaff.phone || "",
          password: "",
          current_password: "",
          confirm_password: "",
          notes: "",
        });
      } else if (authUser) {
        setProfileData({
          id: authUser.user_id,
          full_name: authUser.full_name,
          username: authUser.full_name,
          email: authUser.email || "",
          phone: "",
          role: authUser.role_name || "Staff",
          is_active: true,
          last_login: "",
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        });

        setFormData({
          full_name: authUser.full_name || "",
          email: authUser.email || "",
          phone: "",
          password: "",
          current_password: "",
          confirm_password: "",
          notes: "",
        });
      }
    }
  }, [authUser, staff]);

  // ============================================================================
  // DATA LOADING
  // ============================================================================

  const loadProfileData = useCallback(async () => {
    setIsLoading(true);
    try {
      await getStaff();
    } catch (error) {
      toast.error(t("account.loadFailed"));
      console.error("Profile loading error:", error);
    } finally {
      setIsLoading(false);
    }
  }, [getStaff, t]);

  useEffect(() => {
    void loadProfileData();
  }, [loadProfileData]);

  // ============================================================================
  // HELPERS
  // ============================================================================

  // const formatDate = (dateString: string) => {
  //   if (!dateString) return "N/A";
  //   try {
  //     return format(new Date(dateString), "MMM d, yyyy 'at' h:mm a");
  //   } catch {
  //     return "Invalid date";
  //   }
  // };

  const formatShortDate = (dateString: string) => {
    if (!dateString) return "N/A";
    try {
      return format(new Date(dateString), "MMM d, yyyy");
    } catch {
      return "Invalid date";
    }
  };

  const getInitials = (name?: string) => {
    if (!name) return "U";
    const names = name.trim().split(" ");
    if (names.length === 1) return names[0].charAt(0).toUpperCase();
    return (
      names[0].charAt(0).toUpperCase() +
      names[names.length - 1].charAt(0).toUpperCase()
    );
  };

  const formatRole = (role: string) => {
    const roles: Record<string, string> = {
      admin: "Admin",
      manager: "Manager",
      cashier: "Cashier",
      staff: "Staff",
    };
    return roles[role.toLowerCase()] || role;
  };

  const permissionSummary = useMemo(() => {
    if (!profileData) return [];
    const role = profileData.role.toLowerCase();

    if (role === "admin") {
      return [
        "Full system access",
        "Manage staff and users",
        "View all reports",
        "Configure system settings",
      ];
    }

    if (role === "manager") {
      return [
        "Manage inventory",
        "View sales reports",
        "Process sales",
        "Supervise operations",
      ];
    }

    if (role === "cashier") {
      return [
        "Process sales",
        "View limited reports",
        "Manage customer transactions",
      ];
    }

    return ["Basic staff access"];
  }, [profileData]);

  // ============================================================================
  // FORM HANDLING
  // ============================================================================

  const validateForm = () => {
    const newErrors: Record<string, string> = {};

    if (!formData.full_name.trim()) {
      newErrors.full_name = t("account.fullNameRequired");
    }

    if (!formData.email.trim()) {
      newErrors.email = t("account.emailRequired");
    } else if (!/\S+@\S+\.\S+/.test(formData.email)) {
      newErrors.email = t("account.emailInvalid");
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleInputChange = (field: keyof ProfileFormData, value: string) => {
    setFormData((prev) => ({ ...prev, [field]: value }));

    if (errors[field]) {
      setErrors((prev) => {
        const next = { ...prev };
        delete next[field];
        return next;
      });
    }
  };

  const handleSaveProfile = async () => {
    if (!validateForm()) return;
    if (!profileData) return;

    try {
      const success = await editStaff(profileData.id, {
        full_name: formData.full_name,
        email: formData.email,
        phone: formData.phone || null,
      });

      if (success) {
        toast.success(t("account.updated"));
        setEditDialogOpen(false);
        loadProfileData();
      }
    } catch {
      toast.error(t("account.updateFailed"));
    }
  };

  const handleChangePassword = async () => {
    if (!formData.current_password) {
      toast.error("Current password is required");
      return;
    }

    if (!formData.password) {
      toast.error("New password is required");
      return;
    }

    if (formData.password.length < 6) {
      toast.error("Password must be at least 6 characters");
      return;
    }

    if (formData.password !== formData.confirm_password) {
      toast.error("Passwords do not match");
      return;
    }

    try {
      toast.success("Password changed successfully");
      setPasswordDialogOpen(false);
      setFormData((prev) => ({
        ...prev,
        password: "",
        current_password: "",
        confirm_password: "",
      }));
    } catch {
      toast.error("Failed to change password");
    }
  };

  const handleLogout = async () => {
    await signOut();
  };

  // ============================================================================
  // UI
  // ============================================================================

  if (isLoading) {
    return (
      <>
      <SiteHeader label={t("account.profile")} />
        <div className="flex flex-1 items-center justify-center bg-muted/20">
          <div className="text-center">
            <div className="mx-auto mb-4 h-10 w-10 animate-spin rounded-full border-b-2 border-primary" />
            <p className="text-sm text-muted-foreground">Loading profile...</p>
          </div>
        </div>
      </>
    );
  }

  if (!profileData) {
    return (
      <>
        <SiteHeader label="Account Profile" />
        <div className="flex flex-1 items-center justify-center bg-muted/20">
          <Card className="w-full max-w-md">
            <CardContent className="flex flex-col items-center gap-4 p-8 text-center">
              <div className="rounded-full border bg-muted/40 p-4">
                <IconUser className="size-8 text-muted-foreground" />
              </div>
              <div>
                <h3 className="text-xl font-semibold">Profile Not Found</h3>
                <p className="text-sm text-muted-foreground">
                  Unable to load your profile information.
                </p>
              </div>
              <Button onClick={loadProfileData}>Try Again</Button>
            </CardContent>
          </Card>
        </div>
      </>
    );
  }

  return (
    <>
      <SiteHeader
        label="Account Profile"
      />

      <div className="flex flex-1 flex-col">
        <div className="flex flex-col gap-6 px-4 pb-4 md:px-6 md:pb-6">
          <div>
            <h2 className="text-2xl font-semibold tracking-tight">
              My Account
            </h2>
            <p className="text-sm text-muted-foreground">
              View and manage your profile, account details, and security settings.
            </p>
          </div>

          <div className="grid gap-6 xl:grid-cols-[1.6fr_1fr]">
            <Card className="">
              <CardContent className="px-6">
                <div className="flex flex-col gap-6">
                  <div className="flex flex-col gap-4 sm:flex-row sm:items-center">
                    <Avatar className="h-20 w-20 rounded-2xl">
                      <AvatarFallback className="rounded-2xl bg-primary/10 text-xl font-semibold text-primary">
                        {getInitials(profileData.full_name || profileData.email || undefined)}
                      </AvatarFallback>
                    </Avatar>

                    <div className="flex-1">
                      <h3 className="text-2xl font-semibold">
                        {profileData.full_name || "User"}
                      </h3>
                      <p className="text-sm text-muted-foreground">
                        {profileData.email}
                      </p>
                      <div className="mt-3 flex flex-wrap gap-2">
                        <Badge variant="outline">
                          {formatRole(profileData.role)}
                        </Badge>
                        <Badge variant={profileData.is_active ? "outline" : "secondary"}>
                          {profileData.is_active ? "Active" : "Inactive"}
                        </Badge>
                      </div>
                    </div>
                  </div>

                  <Separator />

                  <div className="space-y-4">
                    <div>
                      <h4 className="mb-3 text-lg font-semibold">
                        Personal Information
                      </h4>
                      <div className="grid gap-4 md:grid-cols-2">
                        <div className="space-y-1">
                          <Label>Full Name</Label>
                          <div className="text-sm">
                            {profileData.full_name || "Not provided"}
                          </div>
                        </div>

                        <div className="space-y-1">
                          <Label>Email Address</Label>
                          <div className="flex items-center gap-2 text-sm">
                            <IconMail className="size-4 text-muted-foreground" />
                            <span>{profileData.email}</span>
                          </div>
                        </div>

                        <div className="space-y-1">
                          <Label>Phone Number</Label>
                          <div className="flex items-center gap-2 text-sm">
                            <IconPhone className="size-4 text-muted-foreground" />
                            <span>{profileData.phone || "Not provided"}</span>
                          </div>
                        </div>

                        <div className="space-y-1">
                          <Label>Account Status</Label>
                          <div className="text-sm">
                            {profileData.is_active ? "Active" : "Inactive"}
                          </div>
                        </div>
                      </div>
                    </div>

                    <Separator />

                    <div>
                      <h4 className="mb-3 text-lg font-semibold">
                        Account Statistics
                      </h4>
                      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                        <Card className="border-border/60">
                          <CardContent className="p-4">
                            <p className="text-xs text-muted-foreground">
                              Account Created
                            </p>
                            <p className="mt-1 text-sm font-semibold">
                              {formatShortDate(profileData.created_at)}
                            </p>
                          </CardContent>
                        </Card>

                        <Card className="border-border/60">
                          <CardContent className="p-4">
                            <p className="text-xs text-muted-foreground">
                              Last Updated
                            </p>
                            <p className="mt-1 text-sm font-semibold">
                              {formatShortDate(profileData.updated_at)}
                            </p>
                          </CardContent>
                        </Card>

                        <Card className="border-border/60">
                          <CardContent className="p-4">
                            <p className="text-xs text-muted-foreground">
                              Last Login
                            </p>
                            <p className="mt-1 text-sm font-semibold">
                              {profileData.last_login
                                ? formatShortDate(profileData.last_login)
                                : "Never"}
                            </p>
                          </CardContent>
                        </Card>

                        <Card className="border-border/60">
                          <CardContent className="p-4">
                            <p className="text-xs text-muted-foreground">
                              Account ID
                            </p>
                            <p className="mt-1 text-sm font-semibold font-mono">
                              {profileData.id}
                            </p>
                          </CardContent>
                        </Card>
                      </div>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            <div className="space-y-6">
              <Card className="">
                <CardContent className="px-6">
                  <h4 className="mb-4 flex items-center gap-2 text-lg font-semibold">
                    <IconShield className="size-5" />
                    {t("account.rolePermissions")}
                  </h4>

                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-muted-foreground">
                        Current Role
                      </span>
                      <Badge variant="outline">{formatRole(profileData.role)}</Badge>
                    </div>

                    <Separator />

                    <div>
                      <Label className="mb-3 block">Permission Summary</Label>
                      <ul className="space-y-2">
                        {permissionSummary.map((permission) => (
                          <li
                            key={permission}
                            className="flex items-center gap-2 text-sm"
                          >
                            <IconCheck className="size-4 text-muted-foreground" />
                            <span>{permission}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card className="">
                <CardContent className="px-6">
                  <h4 className="mb-4 text-lg font-semibold">{t("account.quickActions")}</h4>

                  <div className="space-y-3">
                    <Button
                      variant="outline"
                      className="w-full justify-start"
                      onClick={() => setEditDialogOpen(true)}
                    >
                      <IconEdit className="mr-2 size-4" />
                      {t("account.editProfile")}
                    </Button>

                    <Button
                      variant="outline"
                      className="w-full justify-start"
                      onClick={() => setPasswordDialogOpen(true)}
                    >
                      <IconLock className="mr-2 size-4" />
                      {t("account.changePassword")}
                    </Button>

                    <Separator />

                    <Button
                      variant="outline"
                      className="w-full justify-start"
                      onClick={handleLogout}
                    >
                      <IconLogout className="mr-2 size-4" />
                      Log Out
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
        </div>
      </div>

      {/* EDIT PROFILE DIALOG */}
      <Dialog open={editDialogOpen} onOpenChange={setEditDialogOpen}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>{t("account.editProfile")}</DialogTitle>
            <DialogDescription>
              {t("account.editDescription")}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <FieldLabel required htmlFor="full_name">Full Name</FieldLabel>
              <Input
                id="full_name"
                required
                value={formData.full_name}
                onChange={(e) => handleInputChange("full_name", e.target.value)}
                placeholder="Enter your full name"
              />
              {errors.full_name && (
                <p className="text-sm text-destructive">{errors.full_name}</p>
              )}
            </div>

            <div className="space-y-2">
              <FieldLabel required htmlFor="email">Email Address</FieldLabel>
              <Input
                id="email"
                required
                type="email"
                value={formData.email}
                onChange={(e) => handleInputChange("email", e.target.value)}
                placeholder="email@example.com"
              />
              {errors.email && (
                <p className="text-sm text-destructive">{errors.email}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="phone">Phone Number</Label>
              <Input
                id="phone"
                type="tel"
                value={formData.phone}
                onChange={(e) => handleInputChange("phone", e.target.value)}
                placeholder="+256..."
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="notes">Notes</Label>
              <Textarea
                id="notes"
                rows={3}
                value={formData.notes}
                onChange={(e) => handleInputChange("notes", e.target.value)}
                placeholder="Optional personal note"
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setEditDialogOpen(false)}>
              {t("common.cancel")}
            </Button>
            <Button onClick={handleSaveProfile}>
              <IconCheck className="mr-2 size-4" />
              {t("staff.saveChanges")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* CHANGE PASSWORD DIALOG */}
      <Dialog open={passwordDialogOpen} onOpenChange={setPasswordDialogOpen}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>{t("account.changePassword")}</DialogTitle>
            <DialogDescription>
              {t("account.changePasswordDescription")}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <FieldLabel required htmlFor="current_password">Current Password</FieldLabel>
              <Input
                id="current_password"
                required
                type="password"
                value={formData.current_password}
                onChange={(e) =>
                  handleInputChange("current_password", e.target.value)
                }
                placeholder="Enter current password"
              />
            </div>

            <div className="space-y-2">
              <FieldLabel required htmlFor="password">New Password</FieldLabel>
              <Input
                id="password"
                required
                type="password"
                value={formData.password}
                onChange={(e) => handleInputChange("password", e.target.value)}
                placeholder="Enter new password"
              />
              <p className="text-xs text-muted-foreground">
                Password must be at least 6 characters long.
              </p>
            </div>

            <div className="space-y-2">
              <FieldLabel required htmlFor="confirm_password">Confirm New Password</FieldLabel>
              <Input
                id="confirm_password"
                required
                type="password"
                value={formData.confirm_password}
                onChange={(e) =>
                  handleInputChange("confirm_password", e.target.value)
                }
                placeholder="Confirm new password"
              />
            </div>
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setPasswordDialogOpen(false)}
            >
              {t("common.cancel")}
            </Button>
            <Button onClick={handleChangePassword}>
              <IconCheck className="mr-2 size-4" />
              {t("account.updatePassword")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
