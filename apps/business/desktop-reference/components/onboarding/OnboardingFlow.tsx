import { useState, useEffect } from "react";
import { useReduxOnboarding } from "@/hooks/useReduxOnboarding";
import { invoke } from "@tauri-apps/api/core";
import WelcomeStep from "./steps/WelcomeStep";
import CreateSuperUserStep from "./steps/CreateSuperUserStep";
import BusinessProfileStep from "./steps/BusinessProfileStep";
import CompletionStep from "./steps/CompletionStep";
import {
  IconSmartHome,
  IconUserPlus,
  IconBriefcase,
  IconCircleCheck,
} from "@tabler/icons-react";
import { useNavigate } from "react-router-dom";
import type { BusinessProfile } from "@/services/tauri/settings";

export interface SuperUserFormData {
  username: string;
  password: string;
  confirmPassword: string;
  email: string;
  full_name: string;
}

export interface BusinessProfileFormData {
  business_name: string;
  trading_name: string;
  owner_name: string;
  email: string;
  phone: string;
  tin: string;
  registration_number: string;
  address: string;
  city: string;
  country: string;
  currency: string;
  timezone: string;
}

const initialSuperUserForm: SuperUserFormData = {
  username: "",
  password: "",
  confirmPassword: "",
  email: "",
  full_name: "",
};

const initialBusinessProfileForm: BusinessProfileFormData = {
  business_name: "",
  trading_name: "",
  owner_name: "",
  email: "",
  phone: "",
  tin: "",
  registration_number: "",
  address: "",
  city: "",
  country: "Uganda",
  currency: "UGX",
  timezone: "Africa/Kampala",
};

const STEPS = [
  { id: 0, title: "Welcome", component: WelcomeStep, icon: IconSmartHome },
  {
    id: 1,
    title: "Admin Account",
    component: CreateSuperUserStep,
    icon: IconUserPlus,
  },
  {
    id: 2,
    title: "Business Profile",
    component: BusinessProfileStep,
    icon: IconBriefcase,
  },
  {
    id: 3,
    title: "Complete",
    component: CompletionStep,
    icon: IconCircleCheck,
  },
];

export default function OnboardingFlow() {
  const { completeOnboarding } = useReduxOnboarding();
  const navigate = useNavigate();
  const [localStep, setLocalStep] = useState(0);
  const [superUserForm, setSuperUserForm] = useState<SuperUserFormData>(initialSuperUserForm);
  const [businessProfileForm, setBusinessProfileForm] = useState<BusinessProfileFormData>(initialBusinessProfileForm);
  const [isLoadingProfile, setIsLoadingProfile] = useState(true);

  // Try to load existing business profile data when component mounts
  // This will fail during first-time onboarding (no auth), which is expected
  useEffect(() => {
    const loadExistingProfile = async () => {
      try {
        const profile = await invoke<BusinessProfile>("get_business_profile").catch(() => null);
        if (profile && profile.business_name) {
          setBusinessProfileForm({
            business_name: profile.business_name || "",
            trading_name: profile.trading_name || "",
            owner_name: profile.owner_name || "",
            email: profile.email || "",
            phone: profile.phone || "",
            tin: profile.tin || "",
            registration_number: profile.registration_number || "",
            address: profile.address || "",
            city: profile.city || "",
            country: profile.country || "Uganda",
            currency: profile.currency || "UGX",
            timezone: profile.timezone || "Africa/Kampala",
          });
        }
      } catch {
        // Expected during onboarding - no active session yet
        // Use default empty form values
      } finally {
        setIsLoadingProfile(false);
      }
    };

    loadExistingProfile();
  }, []);

  const handleNext = () => {
    if (localStep < STEPS.length - 1) {
      setLocalStep(localStep + 1);
    }
  };

  const handleBack = () => {
    if (localStep > 0) {
      setLocalStep(localStep - 1);
    }
  };

  const handleFinish = async () => {
    const success = await completeOnboarding();
    if (success) {
      navigate("/", { replace: true });
    }
  };

  const CurrentStepComponent = STEPS[localStep].component;

  return (
    <div className="min-h-screen bg-[#F4F5F9] dark:bg-[#121212] flex flex-col justify-center p-6 font-sans text-foreground transition-colors duration-300">
      {/* Main Branding Block */}
      <main className="max-w-6xl mx-auto text-center mb-10">
        <div className="inline-flex bg-white dark:bg-[#323232] rounded-2xl shadow-sm border border-border/40 mb-4">
          <img
            src="/icon.png"
            alt="AkiliBiz Logo"
            className="size-16 object-cover rounded-2xl"
          />
        </div>
        <h1 className="text-3xl font-bold tracking-tight mb-1 text-slate-800 dark:text-slate-100">
          Grow Your Business with AkiliBiz
        </h1>
        <p className="text-muted-foreground text-sm max-w-md mx-auto">
          Personalize your experience in just {STEPS.length} steps and take
          complete control of the business platform.
        </p>
      </main>

      {/* Split Side-by-Side Workspace Grid */}
      <div className="max-w-6xl w-full mx-auto grid grid-cols-1 md:grid-cols-[300px_1fr] gap-8 items-start">
        {/* Left Panel: Vertical Process Progression Timeline */}
        <aside className="bg-white dark:bg-[#323232] p-6 rounded-2xl shadow-sm border border-border/60 space-y-1 relative">
          {STEPS.map((step, idx) => {
            const isCompleted = idx < localStep;
            const isActive = idx === localStep;

            return (
              <div
                key={step.id}
                className="relative flex items-center gap-4 pb-10 last:pb-0 group"
              >
                {idx !== STEPS.length - 1 && (
                  <div
                    className={`absolute left-[23px] top-14 bottom-0 w-0.5 transition-colors duration-300 ${
                      idx < localStep
                        ? "bg-primary"
                        : "bg-muted/60 dark:bg-neutral-700"
                    }`}
                  />
                )}
                <div
                  className={`size-12 rounded-full border-2 flex items-center justify-center z-10 text-sm font-semibold transition-all duration-300 ${
                    isCompleted
                      ? "bg-primary border-primary text-primary-foreground shadow-sm"
                      : isActive
                        ? "border-primary text-primary bg-primary/10 shadow-sm"
                        : "border-muted dark:border-neutral-700 text-muted-foreground bg-background dark:bg-[#121212]"
                  }`}
                >
                  {isCompleted ? (
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="3"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      className="size-4"
                    >
                      <polyline points="20 6 9 17 4 12" />
                    </svg>
                  ) : (
                    idx + 1
                  )}
                </div>

                {/* Step Metadata labels */}
                <div className="flex flex-col text-left">
                  <span
                    className={`text-sm font-semibold transition-colors ${
                      isActive
                        ? "text-primary font-bold"
                        : "text-muted-foreground dark:text-neutral-400 group-hover:text-foreground"
                    }`}
                  >
                    {step.title}
                  </span>
                  <span className="text-[11px] text-muted-foreground/70 dark:text-neutral-500">
                    {isCompleted
                      ? "Completed"
                      : isActive
                        ? "Active Session"
                        : "Pending Action"}
                  </span>
                </div>
              </div>
            );
          })}
        </aside>

        <section className="bg-white dark:bg-[#323232] rounded-2xl shadow-sm border border-border/60 p-8 flex flex-col min-h-[500px]">
          {/* Context Switching Presentation Context Container */}
          <div className="flex-1 flex flex-col justify-between">
            {isLoadingProfile ? (
              <div className="flex items-center justify-center h-full">
                <p className="text-sm text-muted-foreground">Loading your profile...</p>
              </div>
            ) : (
              <CurrentStepComponent
                onNext={handleNext}
                onBack={handleBack}
                onFinish={handleFinish}
                isLastStep={localStep === STEPS.length - 1}
                isFirstStep={localStep === 0}
                superUserForm={superUserForm}
                setSuperUserForm={setSuperUserForm}
                businessProfileForm={businessProfileForm}
                setBusinessProfileForm={setBusinessProfileForm}
              />
            )}
          </div>
        </section>
      </div>
    </div>
  );
}
